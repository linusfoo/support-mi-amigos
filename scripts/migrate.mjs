// Applies supabase/migrations/*.sql to DATABASE_URL, once each (tracked in a small table).
// Usage: node --env-file=.env.local scripts/migrate.mjs [--seed]
//   --seed also loads supabase/seed.sql (demo accounts with PUBLIC passwords: local/demo only).
import postgres from "postgres";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (put it in .env.local).");
  process.exit(1);
}
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const sql = postgres(url, { ssl: isLocal ? false : "require", prepare: false, max: 1, onnotice: () => {} });

try {
  await sql`create table if not exists public._migrations (name text primary key, applied_at timestamptz default now())`;
  await sql`alter table public._migrations enable row level security`;
  const dir = path.join(import.meta.dirname, "..", "supabase", "migrations");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  const done = new Set((await sql`select name from public._migrations`).map((r) => r.name));

  for (const file of files) {
    if (done.has(file)) continue;
    const body = await readFile(path.join(dir, file), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into public._migrations (name) values (${file})`;
    });
    console.log(`Applied ${file}`);
  }

  if (process.argv.includes("--seed")) {
    await sql.unsafe(await readFile(path.join(dir, "..", "seed.sql"), "utf8"));
    console.log("Loaded demo seed (passwords are public: don't use on a real deployment).");
  }
  console.log("Database is up to date.");
} finally {
  await sql.end();
}
