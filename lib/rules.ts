// Every "who can see / change what" decision lives here, so the rule is easy to find.
import type { User } from "./auth";

export type Status = "live" | "funded" | "missed";

export type ProjectCore = {
  creator_id: number;
  goal_cents: number;
  deadline: Date;
};

export function isOpen(project: ProjectCore, now = new Date()) {
  return project.deadline.getTime() > now.getTime();
}

/** All-or-nothing: funded only if the goal was reached by the deadline. */
export function statusOf(project: ProjectCore, totalCents: number, now = new Date()): Status {
  if (isOpen(project, now)) return "live";
  return totalCents >= project.goal_cents ? "funded" : "missed";
}

/** THE rule: only the creator (or the superadmin) sees who chipped in and how much. */
export function canSeeBackers(viewer: User, project: ProjectCore) {
  return viewer.is_superadmin || viewer.id === project.creator_id;
}

/** You can't back your own project, and pledges close at the deadline. */
export function canPledge(viewer: User, project: ProjectCore) {
  return viewer.id !== project.creator_id && isOpen(project);
}

/** Creators can edit until the deadline; the superadmin can always edit. */
export function canEditProject(viewer: User, project: ProjectCore) {
  return viewer.is_superadmin || (viewer.id === project.creator_id && isOpen(project));
}

export const MAX_AMIGOS = 10;

// ---------- Accounts ----------
// The one superadmin manages admins; admins manage regular members only.
// Nobody but the superadmin can change the superadmin's account.

export type AmigoCore = { id: number; is_admin: boolean; is_superadmin: boolean };

/** Change someone's display name or reset their password. Anyone may edit themselves. */
export function canEditAmigo(viewer: User, target: AmigoCore) {
  if (viewer.id === target.id) return true;
  if (!viewer.is_admin || target.is_superadmin) return false;
  return viewer.is_superadmin || !target.is_admin;
}

/** Grant or revoke admin: superadmin only, and never on the superadmin (so they can't demote themselves). */
export function canSetAdmin(viewer: User, target?: AmigoCore) {
  return viewer.is_superadmin && !target?.is_superadmin;
}

/** Remove an account: like editing, but never yourself and never the superadmin. */
export function canDeleteAmigo(viewer: User, target: AmigoCore) {
  return viewer.id !== target.id && !target.is_superadmin && canEditAmigo(viewer, target);
}
