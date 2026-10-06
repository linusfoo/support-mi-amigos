import "server-only";
import { headers } from "next/headers";
import { db } from "./db";

// Throttling for log-in and sign-up, stored in Postgres (public.login_attempts) so it
// works on Workers with no extra Cloudflare setup. A Cloudflare WAF rate-limiting rule
// is a good optional extra layer in front (see README), but nothing here depends on it.

const MINUTE = 60 * 1000;

/** Failed log-ins allowed per username, and per client IP, inside the window. */
export const LOGIN_LIMITS = { perUsername: 5, perIp: 20, windowMs: 15 * MINUTE } as const;
/** Sign-up attempts (successful or not) allowed per client IP inside the window. */
export const SIGNUP_LIMITS = { perIp: 5, windowMs: 60 * MINUTE } as const;
/** Rows older than this are deleted now and then. Must be >= the longest window. */
const KEEP_MS = 24 * 60 * MINUTE;

type Kind = "login" | "signup";

/** The client's IP. Cloudflare always sets cf-connecting-ip on Workers; the rest are for local dev / other proxies. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const ip =
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0] ??
    h.get("x-real-ip") ??
    "unknown";
  return ip.trim().slice(0, 100) || "unknown";
}

const normalize = (username: string) => username.trim().toLowerCase().slice(0, 100);

function tooMany(oldest: Date, windowMs: number) {
  const minutes = Math.max(1, Math.ceil((oldest.getTime() + windowMs - Date.now()) / MINUTE));
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

/**
 * If `value` (in the username or ip column) has `limit` or more rows of `kind` inside the window,
 * returns a "try again in X minutes" message, else null.
 */
async function check(kind: Kind, column: "username" | "ip", value: string, limit: number, windowMs: number) {
  const since = new Date(Date.now() - windowMs);
  const sql = db();
  const [row] = await sql<{ count: number; oldest: Date | null }[]>`
    select count(*) as count, min(created_at) as oldest from (
      select created_at from login_attempts
      where kind = ${kind} and ${sql(column)} = ${value} and created_at > ${since}
      order by created_at desc
      limit ${limit}
    ) recent`;
  // With `limit` rows, the oldest of the most recent `limit` attempts is the one that has to
  // age out of the window before another attempt is allowed.
  return row && row.count >= limit && row.oldest ? tooMany(new Date(row.oldest), windowMs) : null;
}

async function record(kind: Kind, ip: string, username: string | null) {
  const sql = db();
  await sql`insert into login_attempts (kind, username, ip) values (${kind}, ${username}, ${ip})`;
  // Opportunistic cleanup: roughly one write in ten prunes rows nobody will count again.
  if (Math.random() < 0.1) {
    await sql`delete from login_attempts where created_at < ${new Date(Date.now() - KEEP_MS)}`;
  }
}

/** Call BEFORE checking the password. Returns an error message if this username or IP is locked out. */
export async function loginBlocked(username: string, ip: string): Promise<string | null> {
  const { perUsername, perIp, windowMs } = LOGIN_LIMITS;
  return (
    (await check("login", "username", normalize(username), perUsername, windowMs)) ??
    (await check("login", "ip", ip, perIp, windowMs))
  );
}

export async function recordFailedLogin(username: string, ip: string) {
  await record("login", ip, normalize(username));
}

/** After a successful log-in, forget that username's failures (the IP's count stays). */
export async function clearFailedLogins(username: string) {
  await db()`delete from login_attempts where kind = 'login' and username = ${normalize(username)}`;
}

/** Checks and records one sign-up attempt for this request's IP. Returns an error message if over the limit. */
export async function throttleSignUp(): Promise<string | null> {
  const ip = await clientIp();
  const blocked = await check("signup", "ip", ip, SIGNUP_LIMITS.perIp, SIGNUP_LIMITS.windowMs);
  if (blocked) return blocked;
  await record("signup", ip, null);
  return null;
}
