-- Shikhbo AI's storage in Supabase Postgres: the textbook vector index, the
-- answer cache and the rate limiter, in their own schema.
--
-- The schema is not exposed through the Supabase API (no role has USAGE on
-- it). The app reaches it only through the shikhbo-api Edge Function
-- (supabase/functions/shikhbo-api), which connects with SUPABASE_DB_URL and
-- calls the public.shikhbo_* functions below. The cache, rate-limit and page
-- functions need the server secret (SHIKHBO_STORE_SECRET), checked against
-- its SHA-256 in shikhbo.app_secret; the function checks it on every request.
--
-- After applying, store the secret's hash once:
--   insert into shikhbo.app_secret (sha256) values ('<sha256 hex of the secret>')
--   on conflict (id) do update set sha256 = excluded.sha256;

create extension if not exists vector with schema extensions;

create schema if not exists shikhbo;

-- One row per OCR'd textbook page, embedded with
-- Supabase gte-small (384 dimensions, mean-pooled and normalized).
create table if not exists shikhbo.textbook_pages (
  id text primary key,
  grade int not null check (grade between 1 and 12),
  medium text not null check (medium in ('english', 'bengali')),
  source text not null,
  text text not null,
  embedding extensions.vector(384) not null
);
create index if not exists textbook_pages_grade_medium on shikhbo.textbook_pages (grade, medium);
create index if not exists textbook_pages_embedding on shikhbo.textbook_pages
  using hnsw (embedding extensions.vector_cosine_ops);

create table if not exists shikhbo.answer_cache (
  key text primary key,
  response text not null,
  expires_at timestamptz not null
);

create table if not exists shikhbo.rate_limit (
  key text not null,
  window_start timestamptz not null,
  hits int not null,
  primary key (key, window_start)
);

-- Exactly one row: the SHA-256 (hex) of SHIKHBO_STORE_SECRET.
create table if not exists shikhbo.app_secret (
  id boolean primary key default true check (id),
  sha256 text not null
);

alter table shikhbo.textbook_pages enable row level security;
alter table shikhbo.answer_cache enable row level security;
alter table shikhbo.rate_limit enable row level security;
alter table shikhbo.app_secret enable row level security;

create or replace function shikhbo.check_secret(p_secret text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_secret is null or not exists (
    select 1 from shikhbo.app_secret
    where sha256 = encode(extensions.digest(p_secret, 'sha256'), 'hex')
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end $$;

create or replace function public.shikhbo_match_pages(
  query_embedding extensions.vector(384),
  match_grade int,
  match_medium text,
  match_count int default 5
) returns table (source text, text text, similarity float)
language sql stable security definer set search_path = '' as $$
  select p.source, p.text, 1 - (p.embedding operator(extensions.<=>) query_embedding)
  from shikhbo.textbook_pages p
  where p.grade = match_grade and p.medium = match_medium
  order by p.embedding operator(extensions.<=>) query_embedding
  limit least(greatest(match_count, 1), 20);
$$;

create or replace function public.shikhbo_cache_get(p_secret text, p_key text) returns text
language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  perform shikhbo.check_secret(p_secret);
  select response into v from shikhbo.answer_cache where key = p_key and expires_at > now();
  return v;
end $$;

create or replace function public.shikhbo_cache_set(
  p_secret text, p_key text, p_response text, p_ttl_seconds int
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform shikhbo.check_secret(p_secret);
  insert into shikhbo.answer_cache (key, response, expires_at)
  values (p_key, p_response, now() + make_interval(secs => least(greatest(p_ttl_seconds, 1), 86400)))
  on conflict (key) do update set response = excluded.response, expires_at = excluded.expires_at;
end $$;

-- Fixed window: true while the key has made at most p_limit calls in the
-- current window. One atomic upsert, so concurrent instances share the count.
create or replace function public.shikhbo_rate_limit_hit(
  p_secret text, p_key text, p_limit int, p_window_seconds int
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits int;
begin
  perform shikhbo.check_secret(p_secret);
  insert into shikhbo.rate_limit (key, window_start, hits) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = shikhbo.rate_limit.hits + 1
  returning hits into v_hits;
  return v_hits <= p_limit;
end $$;

-- Used by scripts/ingest.ts to load the index.
create or replace function public.shikhbo_upsert_page(
  p_secret text, p_id text, p_grade int, p_medium text, p_source text, p_text text,
  p_embedding extensions.vector(384)
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform shikhbo.check_secret(p_secret);
  insert into shikhbo.textbook_pages (id, grade, medium, source, text, embedding)
  values (p_id, p_grade, p_medium, p_source, p_text, p_embedding)
  on conflict (id) do update set grade = excluded.grade, medium = excluded.medium,
    source = excluded.source, text = excluded.text, embedding = excluded.embedding;
end $$;

grant execute on function public.shikhbo_match_pages(extensions.vector, int, text, int) to anon, authenticated, service_role;
grant execute on function public.shikhbo_cache_get(text, text) to anon, authenticated, service_role;
grant execute on function public.shikhbo_cache_set(text, text, text, int) to anon, authenticated, service_role;
grant execute on function public.shikhbo_rate_limit_hit(text, text, int, int) to anon, authenticated, service_role;
grant execute on function public.shikhbo_upsert_page(text, text, int, text, text, text, extensions.vector) to anon, authenticated, service_role;
