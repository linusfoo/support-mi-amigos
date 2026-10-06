-- One superadmin, distinct from regular admins. Only the superadmin can grant or
-- revoke admin, or change/remove another admin (rules in lib/rules.ts).

alter table public.users add column is_superadmin boolean not null default false;

-- A superadmin is always an admin too.
alter table public.users add constraint users_superadmin_is_admin check (is_admin or not is_superadmin);

-- There is at most one superadmin.
create unique index users_one_superadmin on public.users ((true)) where is_superadmin;

-- Backfill: the first admin (the one scripts/create-admin.mjs made) becomes the superadmin.
-- Admins added later through the app stay regular admins.
update public.users set is_superadmin = true
where id = (select min(id) from public.users where is_admin);
