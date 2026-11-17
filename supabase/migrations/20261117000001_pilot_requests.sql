-- Pilot requests from the Bongo landing page: a coaching-centre owner leaves
-- a name, a centre and a phone number so the team can call back. Read them in
-- the Supabase dashboard (Table Editor, schema shikhbo). Only the shikhbo-api
-- Edge Function writes here; the table is not exposed through the API.
create table if not exists shikhbo.pilot_requests (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (length(name) between 1 and 80),
  centre text not null check (length(centre) between 1 and 120),
  phone text not null check (phone ~ '^\+?[0-9 -]{7,20}$'),
  city text check (length(city) <= 80),
  students text check (length(students) <= 20)
);
alter table shikhbo.pilot_requests enable row level security;
revoke all on shikhbo.pilot_requests from public, anon, authenticated;
