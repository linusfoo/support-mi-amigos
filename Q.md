# Q.md — Planning questions & answers

Questions were asked 3 at a time until we were ~90% sure what to build.

## Round 1
**Q1. Which familiar app do you want to shrink down for your group of ten?**
Options: Instagram for a party · Todoist + who owes what · Carousell borrow/lend · ESPN stats for a group
**A:** "You may suggest fresh ideas as an innovative product designer."

**Q2. Who are the (up to) ten people, and how do they know each other?**
Options: Friends · Family · Neighbours · Coworkers/club
**A:** Coworkers/club.

**Q3. How comfortable are you with code and tools?**
Options: Beginner · Some experience · Comfortable
**A:** Comfortable.

## Round 2
**Q4. Which idea for your coworkers/club appeals most?**
Options: Lunch Train (OpenTable) · Kudos Wall (LinkedIn) · Skill Swap (Fiverr) · Coffee Run (GrabFood)
**A:** "More ideas. Could be for friends."

**Q5. Which stack would you like?**
Options: Next.js + Supabase · Flask + SQLite · Node/Express + SQLite
**A:** Next.js + Supabase.

**Q6. Where should it run, and how do people log in?**
Options: Hosted + email login · Hosted + invite-only list · Local only (demo)
**A:** Local only (demo).

## Round 3
**Q7. Shortlist set A — which interest you?**
Options: Called It (Polymarket) · Gift Radar (Amazon wishlist) · Daily Drop (BeReal) · Hangout Board (Partiful)
**A:** Called It (Polymarket).

**Q8. Shortlist set B — which interest you?**
Options: IOU Jar (Splitwise-lite) · Blind Ratings (Letterboxd) · Lend Shelf (Carousell) · Challenge Ladder (ESPN)
**A:** No preference.

**Q9. For the local demo, how should Supabase run?**
Options: Supabase cloud free tier · Supabase CLI local (Docker)
**A:** Supabase CLI local (Docker).

## Round 4
**Q10. How should voting/scoring work in Called It?**
Options: Simple calls + leaderboard · Points wagering · Confidence %
**A:** Simple calls + leaderboard. *(Superseded by Q11.)*

**Q11. What's the one rule about who can view or change the data?**
Options: Creator resolves, votes lock · Hidden from the subject · Votes hidden until lock
**A:** "Cancel product. I want to create a Kickstarter but for 10 people. Call it Support Mi Amigos or something funny. The access control comes in such that only the creator of the vote can see who voted while the rest cannot see. You may suggest more."

**Q12. How should the ten friends log in?**
Options: Email + password · Pre-seeded 10 accounts · Magic link
**A:** "Just create a username and password that stores to the DB. Only a superadmin account can create accounts that has CRUD rights."

## Round 5
**Q13. What does 'backing' a project mean?**
Options: Pledge $ toward a goal · Pledge 'amigo points' · Supporter count goal
**A:** Pledge $ toward a goal (all-or-nothing by deadline, no real payments).

**Q14. Which name do you like?**
Options: Support Mi Amigos · KickAmigo · Chip In, Amigo · Kickstartito
**A:** Support Mi Amigos.

**Q15. Extra privacy/access details on top of "only the creator sees who backed"?**
Options: Others see totals only · Backers see their own pledge · Superadmin can't peek · No backing own project
**A:** Others see totals only · Backers see their own pledge · No backing own project. (Superadmin *can* see backers.)

## Round 6
**Q16. Who exactly are the ten amigos?**
Options: Friend group · Office/club crew · Mixed / generic
**A:** Friend group (karaoke machine, birthday gifts, trip deposits, shared subscriptions).

**Q17. What should the superadmin's CRUD rights cover?**
Options: Users + all projects · Users only
**A:** Users + all projects.

**Q18. GitHub repo setup?**
Options: New public repo via gh · New private repo · I'll create it myself
**A:** New public repo via gh (`support-mi-amigos`).

## Round 7 (during the build)
**Q19. Docker Desktop's engine won't start, so local Supabase can't run. How should we proceed?**
Options: I'll fix Docker, then retry · Switch to Supabase cloud · Embedded Postgres (PGlite)
**A:** "End goal is to deploy it online, so whichever is easier." → Supabase cloud (free tier) for the database and Vercel for hosting.

## Final scope
- **Record:** a project (title, story, $ goal, deadline).
- **Shared action:** pledge $ toward a project.
- **Rule:** only the project's creator (and the superadmin) can see who pledged and how much; everyone else sees totals only plus their own pledge. You can't back your own project.
- **Login:** username + password in the database; only the superadmin creates accounts (max 10).
- **Design:** riso-print fundraiser-flyer look (pink + blue overprint, navy ink, Bricolage Grotesque + Atkinson Hyperlegible).
