-- Coaching-centre pilot (Bongo AI): each centre has its own notes, a join
-- code for students and an owner code for its dashboard. Same private
-- `shikhbo` schema and the same rule as the textbook tables: no API role can
-- reach it, only the shikhbo-api Edge Function, which checks the store
-- secret on every request and then the centre's code.

create table if not exists shikhbo.centres (
  slug text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  name text not null check (length(name) between 1 and 80),
  -- SHA-256 (hex) of the codes; the codes themselves are never stored.
  join_sha256 text not null,
  owner_sha256 text not null,
  created_at timestamptz not null default now()
);

-- One row per chunk of a centre's notes, embedded with gte-small like the
-- textbook pages. Re-uploading a title replaces all of its parts.
create table if not exists shikhbo.centre_notes (
  centre text not null references shikhbo.centres (slug) on delete cascade,
  title text not null,
  part int not null,
  text text not null,
  embedding extensions.vector(384) not null,
  primary key (centre, title, part)
);
create index if not exists centre_notes_embedding on shikhbo.centre_notes
  using hnsw (embedding extensions.vector_cosine_ops);

-- What students asked, for the owner's dashboard. `student` is a hash of a
-- random id made in the student's browser, never a name. `source` is the
-- note the answer came from; null when the notes did not cover the question.
create table if not exists shikhbo.centre_questions (
  id bigint generated always as identity primary key,
  centre text not null references shikhbo.centres (slug) on delete cascade,
  student text not null,
  question text not null,
  source text,
  asked_at timestamptz not null default now()
);
create index if not exists centre_questions_centre_time on shikhbo.centre_questions (centre, asked_at desc);

alter table shikhbo.centres enable row level security;
alter table shikhbo.centre_notes enable row level security;
alter table shikhbo.centre_questions enable row level security;

-- Raises 42501 unless the code matches the centre's join code (students) or
-- owner code. An unknown centre fails the same way, so slugs cannot be probed.
create or replace function shikhbo.check_centre_code(p_centre text, p_code text, p_owner boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_code is null or not exists (
    select 1 from shikhbo.centres c
    where c.slug = p_centre
      and (case when p_owner then c.owner_sha256 else c.join_sha256 end)
        = encode(extensions.digest(p_code, 'sha256'), 'hex')
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end $$;

revoke execute on function shikhbo.check_centre_code(text, text, boolean) from public, anon, authenticated;
