"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { endSession, requireAdmin, requireUser, startSession, verifyPassword } from "@/lib/auth";
import {
  canDeleteAmigo,
  canEditAmigo,
  canEditProject,
  canPledge,
  canSetAdmin,
  MAX_AMIGOS,
  type AmigoCore,
  type ProjectCore,
} from "@/lib/rules";
import { fromDateInput } from "@/lib/format";

export type FormState = { error?: string; ok?: string } | undefined;

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/** "$25" or "25.50" -> 2550 cents, or null if not a sensible amount. */
function toCents(raw: string, max = 1_000_000) {
  const n = Number(raw.replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  const cents = Math.round(n * 100);
  return cents > 0 && cents <= max * 100 ? cents : null;
}

/** Turns database errors into sentences a person can act on. */
function dbMessage(e: unknown): string {
  const err = e as { code?: string; message?: string; constraint_name?: string };
  if (err.code === "23505") return "That username is already taken.";
  if (err.code === "P0001" && err.message) return `${err.message}.`;
  if (err.code === "23514") return "One of the values isn't allowed. Check the lengths and amounts.";
  console.error(e);
  return "Something went wrong saving that. Try again.";
}

async function loadProject(id: number) {
  const [p] = await db()<(ProjectCore & { id: number })[]>`
    select id, creator_id, goal_cents, deadline from projects where id = ${id}`;
  return p ?? null;
}

// ---------- Session ----------

export async function logIn(_: FormState, fd: FormData): Promise<FormState> {
  const user = await verifyPassword(text(fd, "username"), String(fd.get("password") ?? ""));
  if (!user) return { error: "That username and password don't match. Ask your admin if you've forgotten your password." };
  await startSession(user.id);
  redirect("/");
}

export async function logOut() {
  await endSession();
  redirect("/login");
}

// ---------- Projects (the one record) ----------

export async function saveProject(_: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireUser();
  const id = Number(fd.get("id")) || null;
  const title = text(fd, "title");
  const description = text(fd, "description");
  const goal = toCents(text(fd, "goal"));
  const deadlineRaw = text(fd, "deadline");

  if (title.length < 3) return { error: "Give the project a title of at least 3 characters." };
  if (!goal) return { error: "Set a goal in dollars, like 200." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadlineRaw)) return { error: "Pick a deadline date." };
  const deadline = fromDateInput(deadlineRaw);
  if (!id && deadline.getTime() <= Date.now()) return { error: "The deadline has to be in the future." };

  let projectId = id;
  try {
    if (id) {
      const existing = await loadProject(id);
      if (!existing) return { error: "That project no longer exists." };
      if (!canEditProject(viewer, existing)) return { error: "Only the creator can edit this project, and only before the deadline." };
      await db()`
        update projects set title = ${title}, description = ${description},
               goal_cents = ${goal}, deadline = ${deadline}
        where id = ${id}`;
    } else {
      const [row] = await db()<{ id: number }[]>`
        insert into projects (creator_id, title, description, goal_cents, deadline)
        values (${viewer.id}, ${title}, ${description}, ${goal}, ${deadline})
        returning id`;
      projectId = row.id;
    }
  } catch (e) {
    return { error: dbMessage(e) };
  }
  revalidatePath("/", "layout");
  redirect(`/projects/${projectId}`);
}

export async function deleteProject(fd: FormData) {
  const viewer = await requireUser();
  const project = await loadProject(Number(fd.get("id")));
  if (project && canEditProject(viewer, project)) {
    await db()`delete from projects where id = ${project.id}`;
  }
  revalidatePath("/", "layout");
  redirect("/");
}

// ---------- Pledges (the one shared action) ----------

export async function pledge(_: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireUser();
  const project = await loadProject(Number(fd.get("projectId")));
  if (!project) return { error: "That project no longer exists." };
  if (!canPledge(viewer, project)) {
    return {
      error: viewer.id === project.creator_id ? "You can't back your own project." : "Pledges for this project are closed.",
    };
  }
  const amount = toCents(text(fd, "amount"), 10_000);
  if (!amount) return { error: "Enter an amount between $1 and $10,000." };

  try {
    await db()`
      insert into pledges (project_id, backer_id, amount_cents)
      values (${project.id}, ${viewer.id}, ${amount})
      on conflict (project_id, backer_id)
      do update set amount_cents = excluded.amount_cents, updated_at = now()`;
  } catch (e) {
    return { error: dbMessage(e) };
  }
  revalidatePath("/", "layout");
  return { ok: "Pledge saved. Gracias, amigo!" };
}

export async function withdrawPledge(_: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireUser();
  const project = await loadProject(Number(fd.get("projectId")));
  if (!project || !canPledge(viewer, project)) return { error: "Pledges for this project are closed." };
  try {
    await db()`delete from pledges where project_id = ${project.id} and backer_id = ${viewer.id}`;
  } catch (e) {
    return { error: dbMessage(e) };
  }
  revalidatePath("/", "layout");
  return { ok: "Pledge taken back." };
}

// ---------- Amigos (admins; who may change whom is in lib/rules.ts) ----------

const USERNAME = /^[a-z0-9_]{3,20}$/;

/** Shared by the admin's "add amigo" form and public sign-up. Returns an error message, or null if all's well. */
async function checkNewAmigo(username: string, displayName: string, password: string) {
  if (!USERNAME.test(username)) return "Usernames are 3–20 lowercase letters, numbers or underscores.";
  if (!displayName) return "Add a display name, like Ana.";
  if (password.length < 8) return "Passwords need at least 8 characters.";
  const [{ count }] = await db()<{ count: number }[]>`select count(*) from users`;
  if (count >= MAX_AMIGOS) return `Support Mi Amigos is for ${MAX_AMIGOS} amigos max, and it's full.`;
  return null;
}

async function insertAmigo(username: string, displayName: string, password: string, isAdmin: boolean) {
  const [row] = await db()<{ id: number }[]>`
    insert into users (username, display_name, password_hash, is_admin)
    values (${username}, ${displayName}, extensions.crypt(${password}, extensions.gen_salt('bf')), ${isAdmin})
    returning id`;
  return row.id;
}

/** Anyone with the link can join until the group hits MAX_AMIGOS. Never creates an admin. */
export async function signUp(_: FormState, fd: FormData): Promise<FormState> {
  const username = text(fd, "username").toLowerCase();
  const displayName = text(fd, "displayName");
  const password = String(fd.get("password") ?? "");

  const problem = await checkNewAmigo(username, displayName, password);
  if (problem) return { error: problem };

  let id: number;
  try {
    id = await insertAmigo(username, displayName, password, false);
  } catch (e) {
    return { error: dbMessage(e) };
  }
  await startSession(id);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function createAmigo(_: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireAdmin();
  const username = text(fd, "username").toLowerCase();
  const displayName = text(fd, "displayName");
  const password = String(fd.get("password") ?? "");
  const isAdmin = fd.get("isAdmin") === "on";

  if (isAdmin && !canSetAdmin(viewer)) return { error: "Only the superadmin can make someone an admin." };
  const problem = await checkNewAmigo(username, displayName, password);
  if (problem) return { error: problem };

  try {
    await insertAmigo(username, displayName, password, isAdmin);
  } catch (e) {
    return { error: dbMessage(e) };
  }
  revalidatePath("/admin/users");
  return { ok: `Added ${displayName}. Share their username and password with them.` };
}

async function loadAmigo(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const [a] = await db()<AmigoCore[]>`select id, is_admin, is_superadmin from users where id = ${id}`;
  return a ?? null;
}

export async function updateAmigo(_: FormState, fd: FormData): Promise<FormState> {
  const viewer = await requireAdmin();
  const target = await loadAmigo(Number(fd.get("id")));
  const displayName = text(fd, "displayName");
  const password = String(fd.get("password") ?? "");

  if (!target) return { error: "That amigo no longer exists." };
  if (!canEditAmigo(viewer, target)) return { error: "Only the superadmin can change an admin's account." };
  // The admin checkbox only counts for someone allowed to set it; otherwise the role stays as it is.
  const isAdmin = canSetAdmin(viewer, target) ? fd.get("isAdmin") === "on" : target.is_admin;
  if (!displayName) return { error: "Display name can't be empty." };
  if (password && password.length < 8) return { error: "New passwords need at least 8 characters." };

  try {
    // The role check in the where clause stops a race with a concurrent promotion.
    const { count } = await db()`
      update users set display_name = ${displayName}, is_admin = ${isAdmin},
        password_hash = case when ${password} = '' then password_hash
                             else extensions.crypt(${password}, extensions.gen_salt('bf')) end
      where id = ${target.id} and is_admin = ${target.is_admin} and is_superadmin = ${target.is_superadmin}`;
    if (count === 0) return { error: "Their account just changed. Reload and try again." };
    // A password reset signs that person out everywhere.
    if (password) await db()`delete from sessions where user_id = ${target.id}`;
  } catch (e) {
    return { error: dbMessage(e) };
  }
  revalidatePath("/", "layout");
  return { ok: password ? `Saved ${displayName} and reset their password.` : `Saved ${displayName}.` };
}

export async function deleteAmigo(fd: FormData) {
  const viewer = await requireAdmin();
  const target = await loadAmigo(Number(fd.get("id")));
  if (target && canDeleteAmigo(viewer, target)) {
    await db()`
      delete from users
      where id = ${target.id} and is_admin = ${target.is_admin} and is_superadmin = false`;
  }
  revalidatePath("/", "layout");
}
