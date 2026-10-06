-- Support Mi Amigos: one record (projects), one shared action (pledges),
-- one rule (only a project's creator, or the superadmin, sees who pledged).

create extension if not exists pgcrypto with schema extensions;

create table public.users (
  id            bigint generated always as identity primary key,
  username      text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name  text not null check (length(display_name) between 1 and 40),
  password_hash text not null,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now()
);

create table public.sessions (
  token      text primary key,
  user_id    bigint not null references public.users (id) on delete cascade,
  expires_at timestamptz not null
);

create table public.projects (
  id          bigint generated always as identity primary key,
  creator_id  bigint not null references public.users (id) on delete cascade,
  title       text not null check (length(title) between 3 and 80),
  description text not null default '' check (length(description) <= 2000),
  goal_cents  integer not null check (goal_cents > 0),
  deadline    timestamptz not null,
  created_at  timestamptz not null default now()
);

create table public.pledges (
  id           bigint generated always as identity primary key,
  project_id   bigint not null references public.projects (id) on delete cascade,
  backer_id    bigint not null references public.users (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (project_id, backer_id)
);

create index on public.projects (deadline);
create index on public.pledges (project_id);

-- The app talks to Postgres directly from the server. RLS with no policies
-- means the public Supabase REST API (anon key) can read nothing at all.
alter table public.users    enable row level security;
alter table public.sessions enable row level security;
alter table public.projects enable row level security;
alter table public.pledges  enable row level security;

-- "Built for ten": hard cap on accounts.
create function public.enforce_user_cap() returns trigger
language plpgsql as $$
begin
  if (select count(*) from public.users) >= 10 then
    raise exception 'Support Mi Amigos is for ten amigos max';
  end if;
  return new;
end $$;

create trigger users_cap before insert on public.users
  for each row execute function public.enforce_user_cap();

-- Pledge rules, also checked in app code: no backing your own project,
-- and nothing changes after the deadline.
create function public.enforce_pledge_rules() returns trigger
language plpgsql as $$
declare
  p public.projects;
begin
  select * into p from public.projects where id = coalesce(new.project_id, old.project_id);
  if p.deadline <= now() then
    raise exception 'Pledges for this project are closed';
  end if;
  if tg_op <> 'DELETE' and p.creator_id = new.backer_id then
    raise exception 'You cannot back your own project';
  end if;
  return coalesce(new, old);
end $$;

create trigger pledges_rules before insert or update or delete on public.pledges
  for each row
  when (pg_trigger_depth() = 0)
  execute function public.enforce_pledge_rules();
