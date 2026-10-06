-- Make the ten-account cap race-safe.
--
-- The original trigger counted rows and then let the insert through. Under
-- READ COMMITTED two simultaneous sign-ups could each see 9 rows, both pass,
-- and leave the group with 11 accounts.
--
-- Fix: take a transaction-scoped advisory lock before counting. Concurrent
-- inserts into public.users now queue on that lock; the next one in line runs
-- its count only after the previous insert has committed (or rolled back), and
-- because each statement in a volatile plpgsql function takes a fresh snapshot
-- under READ COMMITTED, it sees the committed row. Plain reads of public.users
-- never touch the advisory lock, so they are not blocked.
--
-- The error message is unchanged: the app maps P0001 errors to their message
-- (dbMessage in app/actions.ts), and its own count is only a friendly pre-check.
--
-- Note: if a caller ever inserts users under REPEATABLE READ / SERIALIZABLE,
-- the count would use the transaction's earlier snapshot. The app and scripts
-- use the default READ COMMITTED; SERIALIZABLE would also be safe on its own.
--
-- Manual concurrency test (LOCAL database only; it inserts and deletes rows):
--   1. Get public.users to exactly 9 rows.
--   2. Session A:  begin;
--                  insert into public.users (username, display_name, password_hash)
--                    values ('captest_a', 'A', 'x');          -- succeeds (10th)
--   3. Session B:  begin;
--                  insert into public.users (username, display_name, password_hash)
--                    values ('captest_b', 'B', 'x');          -- blocks on the lock
--   4. Session A:  commit;
--   5. Session B:  now fails with "Support Mi Amigos is for ten amigos max".
--                  rollback;
--   6. select count(*) from public.users;                      -- 10, not 11
--   7. Clean up:   delete from public.users where username like 'captest\_%';
-- With the old trigger, step 3 would not block and step 6 would return 11.

create or replace function public.enforce_user_cap() returns trigger
language plpgsql as $$
begin
  -- Arbitrary app-wide constant identifying "the users cap" lock.
  -- Released automatically at commit/rollback.
  perform pg_advisory_xact_lock(7311001);
  if (select count(*) from public.users) >= 10 then
    raise exception 'Support Mi Amigos is for ten amigos max';
  end if;
  return new;
end $$;
