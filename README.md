# Support Mi Amigos

A tiny Kickstarter for ten friends: pitch a group purchase, pledge toward the goal, and only the project's creator can see who chipped in.

Built for a class exercise: take a familiar app and shrink it for a group of at most ten people.

| | |
|---|---|
| **The ten** | A friend group. Friends sign up themselves at `/signup`, or the superadmin adds them; either way, max 10 accounts. |
| **One record** | A **project**: title, story, $ goal, deadline. |
| **One shared action** | **Pledge** dollars toward a project. All-or-nothing: *Funded!* if the goal is reached by the deadline, *Missed it* if not. No real money moves. |
| **One rule** | **Only the project's creator (and the superadmin) can see who pledged and how much.** Everyone else sees the total, the backer count, and their own pledge. You can't back your own project, and pledges lock at the deadline. |

The rule lives in [`lib/rules.ts`](lib/rules.ts) and is applied in the query in [`lib/projects.ts`](lib/projects.ts): backer names never leave the database for anyone else. The database enforces the pledge rules and the 10-account cap again with triggers ([migration](supabase/migrations/20261006000000_init.sql)).

## Stack

- **Next.js 16** (App Router, server actions) + Tailwind
- **Postgres on Supabase**. The app talks to Postgres directly from the server. Row-level security is on with no policies, so Supabase's public REST API exposes nothing.
- **Login**: username + password, bcrypt-hashed with `pgcrypto` in the database, with an httpOnly session cookie.
- **Hosting**: Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare).

## Run it

```bash
npm install
cp .env.example .env.local      # then paste your DATABASE_URL
npm run db:migrate              # create the tables
npm run create-admin -- admin "Admin"   # prompts for a password
npm run dev
```

For a throwaway demo database, `npm run db:seed` adds 5 friends and 5 projects. Their passwords are in [`supabase/seed.sql`](supabase/seed.sql), which is public, so never seed a real deployment.

`DATABASE_URL`: in Supabase, open **Connect** and copy the **Transaction pooler** string (port 6543). Local Supabase CLI: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

## Deploy to Cloudflare

```bash
npx wrangler login
npx wrangler secret put DATABASE_URL    # paste the same pooler string
npm run db:migrate                      # BEFORE deploying, with .env.local pointing at the production database
npm run deploy
```

Always run `npm run db:migrate` against the production database before `npm run deploy`. New code that expects a table the database doesn't have yet (for example `login_attempts`) can't log anyone in until the migration has run.

`npm run preview` runs the Workers build locally first. It reads `DATABASE_URL` from `.dev.vars` (see `.dev.vars.example`).

### Login throttling

Log-in and sign-up are throttled in the app itself, using the `login_attempts` table (see [`lib/rate-limit.ts`](lib/rate-limit.ts)), so it works with no Cloudflare dashboard setup:

- 5 failed log-ins per username, or 20 per IP address, within 15 minutes locks that username or IP out until the oldest of those failures is 15 minutes old. Attempts made while locked out count too. A successful log-in deletes that username's failures, which also takes them off the IP's count (other usernames' failures from the same IP stay).
- 10 sign-up attempts per IP address per hour (successful or not, so friends on the same wifi share it).
- If the throttle can't reach its table (say, the migration hasn't been run), log-in and sign-up show "Something went wrong, please try again in a minute." and the error is logged.

Because the lockout is per username, anyone can lock a friend out for 15 minutes by typing their username with wrong passwords. That's an accepted trade-off for ten friends. To let them back in sooner, an admin can clear their failures in the Supabase SQL editor:

```sql
delete from login_attempts where kind = 'login' and username = 'their_username';
```

Optional extra layer: add a Cloudflare WAF **rate limiting rule** (Security → WAF → Rate limiting rules) on `POST` requests to `/login` and `/signup`, for example 10 requests per minute per IP. That stops floods at the edge before they reach the Worker or the database. The app doesn't depend on it.

## Planning

All the planning questions and answers are in [Q.md](Q.md). The build plan is in [docs/PLAN.md](docs/PLAN.md).
