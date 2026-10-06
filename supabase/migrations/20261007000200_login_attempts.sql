-- Throttling for log-in and sign-up (see lib/rate-limit.ts).
-- One row per log-in attempt (kind = 'login'; a successful log-in deletes its username's rows) or per sign-up attempt (kind = 'signup').
-- Rows are counted inside a short window and pruned by the app once they're old.

create table public.login_attempts (
  id         bigint generated always as identity primary key,
  kind       text not null check (kind in ('login', 'signup')),
  username   text check (length(username) <= 100),
  ip         text not null check (length(ip) <= 100),
  created_at timestamptz not null default now()
);

create index on public.login_attempts (kind, username, created_at);
create index on public.login_attempts (kind, ip, created_at);
create index on public.login_attempts (created_at);

-- Same as every other table: RLS on, no policies, so the public REST API sees nothing.
alter table public.login_attempts enable row level security;
