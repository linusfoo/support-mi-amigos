-- Demo data for local development only. Passwords are local test values:
--   admin / admin-amigos      (superadmin)
--   ana, mei, raj, sam, jo / amigos123
-- Triggers are paused so we can seed pledges on projects that already closed.
set session_replication_role = replica;

insert into public.users (username, display_name, password_hash, is_admin) values
  ('admin', 'Admin',  extensions.crypt('admin-amigos', extensions.gen_salt('bf')), true),
  ('ana',   'Ana',    extensions.crypt('amigos123',    extensions.gen_salt('bf')), false),
  ('mei',   'Mei',    extensions.crypt('amigos123',    extensions.gen_salt('bf')), false),
  ('raj',   'Raj',    extensions.crypt('amigos123',    extensions.gen_salt('bf')), false),
  ('sam',   'Sam',    extensions.crypt('amigos123',    extensions.gen_salt('bf')), false),
  ('jo',    'Jo',     extensions.crypt('amigos123',    extensions.gen_salt('bf')), false);

insert into public.projects (creator_id, title, description, goal_cents, deadline) values
  ((select id from users where username = 'ana'), 'Karaoke machine for Friday nights',
   'The bar karaoke is $15 a song. A decent machine with two mics is about $200 and lives at my place. Every Friday, forever.',
   20000, now() + interval '6 days'),
  ((select id from users where username = 'raj'), 'Mei''s birthday: cake and the good headphones',
   'Mei has been eyeing those headphones for a year. Cake is on me, the headphones are on us. Don''t tell her!',
   18000, now() + interval '3 days'),
  ((select id from users where username = 'sam'), 'Villa deposit for the December trip',
   'We need the deposit in by the 30th to hold the villa. Pledge what you can now and we''ll settle the rest later.',
   60000, now() + interval '20 days'),
  ((select id from users where username = 'jo'), 'Shared streaming plan for the year',
   'One family plan, six profiles, no more password begging.',
   6000, now() - interval '2 days'),
  ((select id from users where username = 'mei'), 'Board-game shelf for the clubhouse',
   'A proper shelf so the games stop living in a laundry basket.',
   15000, now() - interval '5 days');

insert into public.pledges (project_id, backer_id, amount_cents)
select p.id, u.id, v.amount
from (values
  ('Karaoke machine for Friday nights', 'mei', 4000),
  ('Karaoke machine for Friday nights', 'raj', 5000),
  ('Karaoke machine for Friday nights', 'jo',  3000),
  ('Karaoke machine for Friday nights', 'sam', 2000),
  ('Mei''s birthday: cake and the good headphones', 'ana', 3000),
  ('Mei''s birthday: cake and the good headphones', 'sam', 3000),
  ('Villa deposit for the December trip', 'ana', 10000),
  ('Shared streaming plan for the year', 'ana', 1500),
  ('Shared streaming plan for the year', 'mei', 1500),
  ('Shared streaming plan for the year', 'raj', 1500),
  ('Shared streaming plan for the year', 'sam', 1500),
  ('Board-game shelf for the clubhouse', 'jo',  3000),
  ('Board-game shelf for the clubhouse', 'ana', 2500)
) as v(title, username, amount)
join public.projects p on p.title = v.title
join public.users u on u.username = v.username;

set session_replication_role = origin;
