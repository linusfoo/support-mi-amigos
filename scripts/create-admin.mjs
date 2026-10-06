// Creates (or resets) a superadmin account.
// Usage: node --env-file=.env.local scripts/create-admin.mjs <username> "<Display Name>"
// The password is read from the ADMIN_PASSWORD env var or prompted, so it never lands in shell history.
import postgres from "postgres";
import { createInterface } from "node:readline/promises";

const [username, displayName = username] = process.argv.slice(2);
if (!username || !/^[a-z0-9_]{3,20}$/.test(username)) {
  console.error('Usage: node --env-file=.env.local scripts/create-admin.mjs <username> "<Display Name>"');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (put it in .env.local).");
  process.exit(1);
}

let password = process.env.ADMIN_PASSWORD;
if (!password) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question("Password for the superadmin (8+ characters): ");
  rl.close();
}
if (!password || password.length < 8) {
  console.error("Password needs at least 8 characters.");
  process.exit(1);
}

const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL);
const sql = postgres(process.env.DATABASE_URL, { ssl: isLocal ? false : "require", prepare: false, max: 1 });
try {
  await sql`
    insert into users (username, display_name, password_hash, is_admin)
    values (${username}, ${displayName}, extensions.crypt(${password}, extensions.gen_salt('bf')), true)
    on conflict (username) do update
      set password_hash = excluded.password_hash, is_admin = true, display_name = excluded.display_name`;
  console.log(`Superadmin "${username}" is ready.`);
} finally {
  await sql.end();
}
