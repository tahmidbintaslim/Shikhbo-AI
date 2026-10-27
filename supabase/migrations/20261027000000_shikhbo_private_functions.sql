-- Moves the shikhbo_* functions out of `public` into the unexposed `shikhbo`
-- schema. In `public` they were SECURITY DEFINER with EXECUTE for anon and
-- authenticated, and shikhbo_match_pages needs no secret, so anyone could
-- call them through the Supabase API as soon as the project's `public`
-- schema regained its default USAGE grant. Only the shikhbo-api Edge
-- Function (which connects as the database owner through SUPABASE_DB_URL)
-- calls them now.

create or replace function shikhbo.match_pages(
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

create or replace function shikhbo.cache_get(p_secret text, p_key text) returns text
language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  perform shikhbo.check_secret(p_secret);
  select response into v from shikhbo.answer_cache where key = p_key and expires_at > now();
  return v;
end $$;

create or replace function shikhbo.cache_set(
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
create or replace function shikhbo.rate_limit_hit(
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

create or replace function shikhbo.upsert_page(
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

drop function if exists public.shikhbo_match_pages(extensions.vector, int, text, int);
drop function if exists public.shikhbo_cache_get(text, text);
drop function if exists public.shikhbo_cache_set(text, text, text, int);
drop function if exists public.shikhbo_rate_limit_hit(text, text, int, int);
drop function if exists public.shikhbo_upsert_page(text, text, int, text, text, text, extensions.vector);

revoke all on all functions in schema shikhbo from public, anon, authenticated;
alter default privileges in schema shikhbo revoke execute on functions from public, anon, authenticated;
