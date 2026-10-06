import "server-only";
import postgres from "postgres";

// postgres.js connects lazily, so a missing URL only fails on the first query
// (keeps `next build` working without a database).
const url = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);

// Reuse one pool across hot reloads in dev.
const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

export const sql =
  globalForDb.sql ??
  postgres(url, {
    max: 5,
    ssl: isLocal ? false : "require",
    // Supabase's pooler (port 6543, transaction mode) doesn't support prepared statements.
    prepare: false,
    // ids, counts and sums are bigint; at ten-friend scale a JS number is plenty.
    types: {
      bigint: { to: 20, from: [20], serialize: (x: number) => String(x), parse: (x: string) => Number(x) },
    },
    transform: { undefined: null },
  });

if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;
