# Support Mi Amigos

A tiny Kickstarter for ten friends: pitch a group purchase, pledge toward the goal, and only the project's creator can see who chipped in.

Built for a class exercise: take a familiar app and shrink it for a group of at most ten people.

| | |
|---|---|
| **The ten** | A friend group. Friends sign up themselves at `/signup` with a shared invite code, or the superadmin adds them; either way, max 10 accounts. |
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
cp .env.example .env.local      # then paste your DATABASE_URL (and INVITE_CODE to open sign-up)
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
npx wrangler secret put INVITE_CODE     # the code friends type at /signup
npm run deploy
```

`npm run preview` runs the Workers build locally first. It reads `DATABASE_URL` and `INVITE_CODE` from `.dev.vars` (see `.dev.vars.example`).

`INVITE_CODE` gates `/signup`: friends must type it to create an account. If it is unset or empty, sign-up is closed and only the superadmin can add amigos. To change it, run `npx wrangler secret put INVITE_CODE` again; existing accounts are unaffected.

## Planning

All the planning questions and answers are in [Q.md](Q.md). The build plan is in [docs/PLAN.md](docs/PLAN.md).
