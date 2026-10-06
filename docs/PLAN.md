# Plan: "Support Mi Amigos": a Kickstarter for ten friends

## Context
Class project 3: shrink a familiar app down for a group of up to ten people, with exactly **one record type, one shared action, and one view/change rule**. It also needs simple login, a database, commits pushed to GitHub as the work goes, and a Padlet post. The user picked a mini-Kickstarter for a friend group after several rounds of questions (all logged in Q.md).

- **Record:** a *project*, i.e. something the friends want to fund (karaoke machine, birthday gift, trip deposit). It has a title, description, $ goal, and deadline.
- **Shared action:** *pledge* dollars toward a project. It's all-or-nothing: the project is funded if the goal is reached by the deadline. No real payments are involved.
- **Rule:** only the project's creator (and the superadmin) can see **who** pledged and how much. Everyone else sees only the total raised and the number of backers, plus their own pledge.
- **Who:** a friend group of up to 10 accounts. The **superadmin** creates every account (there is no self sign-up) and has CRUD over users and all projects.

## Step 0: Write Q.md (first action after approval)
Create `project3/Q.md` with all 5 rounds / 15 questions and answers, word for word:
- R1: base app → "suggest fresh ideas"; group → Coworkers/club; tech → Comfortable.
- R2: idea → "more ideas, could be for friends"; stack → Next.js + Supabase; run → Local only (demo).
- R3: set A → Called It; set B → no preference; Supabase → CLI local (Docker).
- R4: scoring → Simple calls + leaderboard; access rule → "cancel product… Kickstarter for 10… Support Mi Amigos… only the creator of the vote can see who voted… you may suggest more"; login → "username + password stored in DB; only a superadmin can create accounts, has CRUD rights".
- R5: backing → Pledge $ toward goal; name → Support Mi Amigos; extra rules → others see totals only, backers see/edit their own pledge, no backing your own project.
- R6: group → Friend group; superadmin → users + all projects; GitHub → new public repo via gh.

## Stack (Docker, Node 24, git, and gh are already installed)
- **Next.js (App Router, TypeScript, Tailwind)** in `project3/`, using server components and server actions.
- **Supabase CLI local** (`npx supabase init` / `start`). The app connects straight to local Postgres (`postgresql://postgres:postgres@127.0.0.1:54322/postgres`) with the `postgres` npm package, server-side only. RLS is enabled with no policies on every table, so the public anon REST key can't read anything. All access goes through the server code, where the rules are enforced.
- **Custom auth** (not Supabase Auth, per the user's request): passwords are hashed with **pgcrypto** `crypt(pw, gen_salt('bf'))` and checked in SQL. A `sessions` table holds random tokens, stored in an httpOnly cookie. Middleware redirects anyone not logged in to `/login`.

## Schema (`supabase/migrations/0001_init.sql`)
- `users(id, username unique, display_name, password_hash, is_admin bool, created_at)`
- `sessions(token pk, user_id → users on delete cascade, expires_at)`
- `projects(id, creator_id → users, title, description, goal_cents > 0, deadline timestamptz, created_at)`
- `pledges(id, project_id → projects cascade, backer_id → users cascade, amount_cents > 0, unique(project_id, backer_id))`
- Status is computed rather than stored: **Live** before the deadline, **Funded** if the sum ≥ goal after it, **Missed** otherwise.
- `supabase/seed.sql`: superadmin `admin` + 5 demo friends + 4 demo projects with pledges. The demo passwords are listed in README as local-only test credentials.

## Rules enforced in server code (`lib/rules.ts`, one place)
1. Backer names and amounts are returned only if `viewer.id === creator_id || viewer.is_admin`. Other viewers get `{total, backerCount, myPledge}` only.
2. Nobody can pledge to their own project. Pledges can be created, changed, or cancelled only before the deadline.
3. A creator can edit or delete their own project before the deadline. The admin can do this to any project, at any time.
4. Only the admin can create, edit, or delete users and reset passwords. The cap is 10 accounts total. The admin can't delete themselves.

## Pages
- `/login`: username + password; logout button in the header.
- `/`: project cards with a progress bar, % funded, days left, and status badge.
- `/projects/new`, `/projects/[id]`: details, pledge form, and your own pledge. The **backer list panel shows only for the creator or admin**; everyone else sees "🔒 Only the creator can see who chipped in".
- `/projects/[id]/edit`
- `/admin/users`: user CRUD table (admin only).
- A playful style: warm colours and amigo-themed copy ("¡Chip in, amigo!").

## Visual design (via the frontend-design skill; `/ui-front-end` doesn't exist, so this is the closest match)
**Subject:** a fundraiser flyer made by friends. Think of the riso-printed zine taped to the fridge saying "help us buy a karaoke machine". **Audience:** 10 friends on their phones. **Primary job:** see at a glance how close each project is, and chip in quickly.

- **Colour (riso inks on paper):** Paper `#FBFBF7` (cool white, not cream), Ink `#1E2A5A` (navy instead of black), Riso Pink `#FF48B0` (main action and progress fill), Riso Blue `#0078BF` (links and the second print layer), Sunflower `#FFE14D` (the "Funded" stamp only), and Muted `#6B7090` for secondary text. Dark mode uses an ink-blue background with the same inks.
- **Type:** *Bricolage Grotesque* (variable; chunky, quirky display) for titles and big numbers, and *Atkinson Hyperlegible* for body text and forms. Everything is sentence case: no all-caps labels, no monospace.
- **The one bold element:** a **riso misregistration overprint**. Project titles and the progress bar are printed twice: pink and blue layers offset 2–3 px with `mix-blend-mode: multiply`, so they look like a slightly off two-colour print. The progress bar is thick (18 px) and its pink fill "prints in" once when the page loads (disabled when the user prefers reduced motion). Everything else stays quiet.
- **Status:** a small rotated rubber stamp (Live / Funded! / Missed it) with a rough edge made from an SVG filter.
- **Layout:** left-aligned, max width 720 px, one column on mobile.
  ```
  [Support Mi Amigos]                     Hola, Mei · Log out
  Karaoke machine for Fridays        (stamp: Live)
  ████████████░░░░░░  $140 of $200 · 4 amigos · 6 days left
  ---------------------------------------------------------
  Mei's birthday cake ...
  ```
  The home page is a **list of rows divided by rules, not a grid of cards**. The detail page has the story on the left and the pledge panel on the right (stacked on mobile). Below that, the creator sees a backer table; everyone else sees a lock line: "Only Ana can see who chipped in."
- **Copy:** plain and friendly, e.g. "Chip in", "Change my pledge", "Take back my pledge", "Start a project". Empty home page: "Nothing to fund yet. Start the first project." Error example: "Pledges closed on 12 Oct."
- **Review against generic defaults:** no cream background or terracotta, no black-plus-acid-green, no broadsheet layout, no card kit (rows instead), no caps eyebrows, no mono labels, no "→" buttons. The riso look comes straight from the "friends made a flyer" subject.
- **Quality floor:** visible focus rings, AA contrast (navy on paper; white on pink for buttons is checked, falling back to navy text if needed), works at 375 px, `prefers-reduced-motion` respected. Pages are checked with screenshots in the built-in browser.

## Files
`lib/db.ts` (postgres client), `lib/auth.ts` (login, session, `requireUser`, `requireAdmin`), `lib/rules.ts`, `middleware.ts`, `app/**` pages + `actions.ts`, `supabase/migrations/*`, `supabase/seed.sql`, `.env.example`, `README.md` (setup + the rule + demo accounts), `Q.md`.

## Git / GitHub (commit as we go)
`git init` → `gh repo create support-mi-amigos --public --source . --push`. Planned commits: (1) Q.md + plan, (2) Next.js scaffold, (3) Supabase schema + seed, (4) auth + login, (5) projects + pledges + the privacy rule, (6) admin user CRUD, (7) README + polish. Each one is pushed, and `.env.local` is gitignored.

## Padlet
The user posts it themselves. I'll provide the repo URL plus this sentence: *"Support Mi Amigos is a tiny Kickstarter for ten friends: pitch a group purchase, pledge toward the goal, and only the project's creator can see who chipped in."*

## Verification
1. `npx supabase start` → `npx supabase db reset` (applies the migration + seed) → `npm run dev`.
2. In the built-in browser at localhost:3000:
   - Log in as the admin → create a user.
   - Log in as friend A → create a project.
   - Log in as friend B → pledge, and confirm the backer list is hidden (totals only) and that B can edit their own pledge.
   - Log in as A → see B's name and amount, and confirm the pledge form is blocked on A's own project.
   - Confirm a non-admin gets redirected away from `/admin/users`.
3. `npm run build` passes; `git log` shows incremental commits pushed to GitHub.
