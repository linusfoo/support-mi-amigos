import "server-only";
import { headers } from "next/headers";
import { db } from "./db";

// Throttling for log-in and sign-up, stored in Postgres (public.login_attempts) so it
// works on Workers with no extra Cloudflare setup. A Cloudflare WAF rate-limiting rule
// is a good optional extra layer in front (see README), but nothing here depends on it.
//
// Every attempt is recorded BEFORE it is checked, and the check counts that row too. So
// parallel requests see each other's rows, and a burst can't all slip in under the limit.

const MINUTE = 60 * 1000;

/** Failed log-ins allowed per username, and per client IP, inside the window. */
export const LOGIN_LIMITS = { perUsername: 5, perIp: 20, windowMs: 15 * MINUTE } as const;
/** Sign-up attempts (successful or not) allowed per client IP inside the window. */
export const SIGNUP_LIMITS = { perIp: 10, windowMs: 60 * MINUTE } as const;
/** Rows older than this are deleted now and then. Must be >= the longest window. */
const KEEP_MS = 24 * 60 * MINUTE;

/** Shown when the throttle itself can't reach its table: fail closed, but politely. */
const BROKEN = "Something went wrong, please try again in a minute.";

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

/** Logs a database error without dumping the whole object (which can include the query and its values). */
function logError(what: string, e: unknown) {
  const err = e as { code?: string; message?: string } | null;
  console.error(`rate-limit: ${what} failed`, err?.code, err?.message);
}

function tooMany(oldest: Date, windowMs: number) {
  const minutes = Math.max(1, Math.ceil((oldest.getTime() + windowMs - Date.now()) / MINUTE));
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

/** Inserts one attempt row and returns its id. Roughly one write in ten also prunes old rows. */
async function record(kind: Kind, ip: string, username: string | null): Promise<number> {
  const sql = db();
  const [row] = await sql<{ id: number }[]>`
    insert into login_attempts (kind, username, ip) values (${kind}, ${username}, ${ip}) returning id`;
  if (Math.random() < 0.1) {
    // Housekeeping only: it must never fail the request.
    try {
      await sql`delete from login_attempts where created_at < ${new Date(Date.now() - KEEP_MS)}`;
    } catch (e) {
      logError("prune", e);
    }
  }
  return row.id;
}

/**
 * Counts the rows of `kind` for `value` (in the username or ip column) inside the window, up to and
 * including row `id` (this request's own attempt, already recorded). More than `limit` of them means
 * this attempt is over the limit: returns a "try again in X minutes" message, else null.
 * Counting only up to our own id means that in a burst, exactly the first `limit` get through.
 */
async function check(kind: Kind, column: "username" | "ip", value: string, id: number, limit: number, windowMs: number) {
  const since = new Date(Date.now() - windowMs);
  const sql = db();
  const rows = await sql<{ created_at: Date }[]>`
    select created_at from login_attempts
    where kind = ${kind} and ${sql(column)} = ${value} and created_at > ${since} and id <= ${id}
    order by id desc
    limit ${limit + 1}`;
  if (rows.length <= limit) return null;
  // The next attempt is allowed once the `limit`-th most recent row (counting this one) ages out
  // of the window, leaving room for it.
  return tooMany(new Date(rows[limit - 1].created_at), windowMs);
}

/**
 * Call BEFORE checking the password: records this attempt as a failure, then checks the limits.
 * Returns an error message if this username or IP is over the limit (the row stays, so hammering
 * a locked account keeps it locked). On a correct password, call clearFailedLogins.
 */
export async function startLogin(username: string, ip: string): Promise<string | null> {
  const { perUsername, perIp, windowMs } = LOGIN_LIMITS;
  const name = normalize(username);
  try {
    const id = await record("login", ip, name);
    return (
      (await check("login", "username", name, id, perUsername, windowMs)) ??
      (await check("login", "ip", ip, id, perIp, windowMs))
    );
  } catch (e) {
    logError("login throttle", e);
    return BROKEN;
  }
}

/**
 * After a successful log-in, forget that username's failures. Those rows also count toward their
 * IP's limit, so this lowers the IP's count too (by that username's failures only).
 */
export async function clearFailedLogins(username: string) {
  try {
    await db()`delete from login_attempts where kind = 'login' and username = ${normalize(username)}`;
  } catch (e) {
    // The password was right; leftover failures only age out on their own.
    logError("clear failed logins", e);
  }
}

/** Records one sign-up attempt for this request's IP, then checks it. Returns an error message if over the limit. */
export async function throttleSignUp(): Promise<string | null> {
  const ip = await clientIp();
  try {
    const id = await record("signup", ip, null);
    return await check("signup", "ip", ip, id, SIGNUP_LIMITS.perIp, SIGNUP_LIMITS.windowMs);
  } catch (e) {
    logError("sign-up throttle", e);
    return BROKEN;
  }
}
