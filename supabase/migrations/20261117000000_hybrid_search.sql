-- Hybrid search: gte-small is an English model, so Bangla questions found
-- poor matches by meaning alone. Postgres full-text search with the 'simple'
-- config splits Bangla words correctly, so each search now also ranks rows by
-- shared words and fuses both rankings (reciprocal rank fusion, k = 60).
-- No re-embedding needed; the existing vectors stay.

create index if not exists textbook_pages_fts on shikhbo.textbook_pages
  using gin (to_tsvector('simple', text));
create index if not exists centre_notes_fts on shikhbo.centre_notes
  using gin (to_tsvector('simple', text));

-- Any shared word counts ("a | b"), not all of them ("a & b").
create or replace function shikhbo.any_words(q text) returns tsquery
language sql immutable set search_path = '' as $$
  select replace(plainto_tsquery('simple', q)::text, ' & ', ' | ')::tsquery;
$$;

create or replace function shikhbo.match_pages_hybrid(
  query_embedding extensions.vector(384),
  query_text text,
  match_grade int,
  match_medium text,
  match_count int default 5
) returns table (source text, text text, similarity float)
language sql stable security definer set search_path = '' as $$
  with pages as (
    select p.id, p.source, p.text, p.embedding from shikhbo.textbook_pages p
    where p.grade = match_grade and p.medium = match_medium
  ),
  by_meaning as (
    select id, row_number() over (order by embedding operator(extensions.<=>) query_embedding) as r
    from pages order by embedding operator(extensions.<=>) query_embedding limit 30
  ),
  by_words as (
    select id, row_number() over (order by ts_rank_cd(to_tsvector('simple', text), q) desc) as r
    from pages, shikhbo.any_words(query_text) q
    where to_tsvector('simple', text) @@ q
    order by ts_rank_cd(to_tsvector('simple', text), q) desc limit 30
  ),
  fused as (
    select id, sum(1.0 / (60 + r)) as score
    from (select * from by_meaning union all select * from by_words) x group by id
  )
  select p.source, p.text, 1 - (p.embedding operator(extensions.<=>) query_embedding)
  from fused f join pages p using (id)
  order by f.score desc
  limit least(greatest(match_count, 1), 20);
$$;

create or replace function shikhbo.match_centre_notes(
  match_centre text,
  query_embedding extensions.vector(384),
  query_text text,
  match_count int default 5
) returns table (source text, text text, similarity float)
language sql stable security definer set search_path = '' as $$
  with notes as (
    -- (title, part) is the key; source is built from it, so it is unique too.
    select n.title || ', part ' || n.part as id, n.title || ', part ' || n.part as source, n.text, n.embedding
    from shikhbo.centre_notes n where n.centre = match_centre
  ),
  by_meaning as (
    select id, row_number() over (order by embedding operator(extensions.<=>) query_embedding) as r
    from notes order by embedding operator(extensions.<=>) query_embedding limit 30
  ),
  by_words as (
    select id, row_number() over (order by ts_rank_cd(to_tsvector('simple', text), q) desc) as r
    from notes, shikhbo.any_words(query_text) q
    where to_tsvector('simple', text) @@ q
    order by ts_rank_cd(to_tsvector('simple', text), q) desc limit 30
  ),
  fused as (
    select id, sum(1.0 / (60 + r)) as score
    from (select * from by_meaning union all select * from by_words) x group by id
  )
  select n.source, n.text, 1 - (n.embedding operator(extensions.<=>) query_embedding)
  from fused f join notes n using (id)
  order by f.score desc
  limit least(greatest(match_count, 1), 20);
$$;

revoke all on function shikhbo.match_pages_hybrid(extensions.vector, text, int, text, int) from public, anon, authenticated;
revoke all on function shikhbo.match_centre_notes(text, extensions.vector, text, int) from public, anon, authenticated;
