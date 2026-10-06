import "server-only";
import { cache } from "react";
import postgres from "postgres";

const onWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

function connect(max: number) {
  // postgres.js connects lazily, so a missing URL only fails on the first query
  // (keeps `next build` working without a database).
  const url = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  return postgres(url, {
    max,
    ssl: isLocal ? false : "require",
    // Supabase's pooler (port 6543, transaction mode) doesn't support prepared statements.
    prepare: false,
    // ids, counts and sums are bigint; at ten-friend scale a JS number is plenty.
    types: {
      bigint: { to: 20, from: [20], serialize: (x: number) => String(x), parse: (x: string) => Number(x) },
    },
    transform: { undefined: null },
  });
}

// Cloudflare Workers can't reuse a socket across requests, so there we open one
// small client per request. In Node (next dev) one shared pool survives hot reloads.
const globalForDb = globalThis as unknown as { sql?: postgres.Sql };
const perRequest = cache(() => connect(1));

export function db(): postgres.Sql {
  if (onWorkers) return perRequest();
  return (globalForDb.sql ??= connect(5));
}
