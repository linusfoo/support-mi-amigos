import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { db } from "./db";

export const SESSION_COOKIE = "sma_session";
const SESSION_DAYS = 7;

export type User = {
  id: number;
  username: string;
  display_name: string;
  is_admin: boolean;
  is_superadmin: boolean;
};

/** Checks a username/password against the bcrypt hash stored in Postgres. */
export async function verifyPassword(username: string, password: string): Promise<User | null> {
  const [user] = await db()<User[]>`
    select id, username, display_name, is_admin, is_superadmin
    from users
    where username = ${username.trim().toLowerCase()}
      and password_hash = extensions.crypt(${password}, password_hash)`;
  return user ?? null;
}

export async function startSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db()`insert into sessions (token, user_id, expires_at) values (${token}, ${userId}, ${expires})`;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db()`delete from sessions where token = ${token}`;
  store.delete(SESSION_COOKIE);
}

/** The logged-in user for this request, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [user] = await db()<User[]>`
    select u.id, u.username, u.display_name, u.is_admin, u.is_superadmin
    from sessions s join users u on u.id = s.user_id
    where s.token = ${token} and s.expires_at > now()`;
  return user ?? null;
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!user.is_admin) redirect("/");
  return user;
}
