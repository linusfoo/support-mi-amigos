import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const onWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

/**
 * The shared invite code friends type to sign up, from the INVITE_CODE secret
 * (`wrangler secret put` on Workers, .env.local in `next dev`). Empty means sign-up is closed.
 */
export function inviteCode(): string {
  const env = onWorkers ? (getCloudflareContext().env as { INVITE_CODE?: string }) : undefined;
  return (env?.INVITE_CODE ?? process.env.INVITE_CODE ?? "").trim();
}

export function signupOpen(): boolean {
  return inviteCode() !== "";
}

async function sha256(s: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}

/**
 * True only if sign-up is open and `attempt` matches the invite code. Both sides are
 * hashed first so the comparison is fixed-length and runs in constant time.
 */
export async function checkInviteCode(attempt: string): Promise<boolean> {
  const code = inviteCode();
  if (!code) return false;
  const [a, b] = await Promise.all([sha256(attempt.trim()), sha256(code)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
