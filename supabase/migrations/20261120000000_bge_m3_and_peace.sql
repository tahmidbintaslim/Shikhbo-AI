-- Free multilingual embeddings (bge-m3, 1024 dims) from the bangla-ai-engine
-- Cloudflare Worker, for Shikhbo/Bongo and for Peace AI's Quran and hadith
-- search. gte-small (384 dims) understood English only.

-- Engine address and secret, read only by the Edge Functions (they connect as
-- the database owner); no API role can see this table.
create table if not exists shikhbo.engine_config (
  id boolean primary key default true check (id),
  url text not null,
  secret text not null
);
alter table shikhbo.engine_config enable row level security;
revoke all on shikhbo.engine_config from public, anon, authenticated;

-- Shikhbo: a second embedding column, filled by the reindex op; searches use it.
alter table shikhbo.textbook_pages add column if not exists embedding_m3 extensions.vector(1024);
alter table shikhbo.centre_notes add column if not exists embedding_m3 extensions.vector(1024);
create index if not exists textbook_pages_m3 on shikhbo.textbook_pages using hnsw (embedding_m3 extensions.vector_cosine_ops);
create index if not exists centre_notes_m3 on shikhbo.centre_notes using hnsw (embedding_m3 extensions.vector_cosine_ops);

create or replace function shikhbo.match_pages_m3(
  query_embedding extensions.vector(1024), query_text text, match_grade int, match_medium text, match_count int default 5
) returns table (source text, text text, similarity float)
language sql stable security definer set search_path = '' as $$
  with pages as (
    select p.id, p.source, p.text, p.embedding_m3 as e from shikhbo.textbook_pages p
    where p.grade = match_grade and p.medium = match_medium and p.embedding_m3 is not null
  ),
  by_meaning as (
    select id, row_number() over (order by e operator(extensions.<=>) query_embedding) as r
    from pages order by e operator(extensions.<=>) query_embedding limit 30
  ),
  by_words as (
    select id, row_number() over (order by ts_rank_cd(to_tsvector('simple', text), q) desc) as r
    from pages, shikhbo.any_words(query_text) q where to_tsvector('simple', text) @@ q
    order by ts_rank_cd(to_tsvector('simple', text), q) desc limit 30
  ),
  fused as (
    select id, sum(1.0 / (60 + r)) as score from (select * from by_meaning union all select * from by_words) x group by id
  )
  select p.source, p.text, 1 - (p.e operator(extensions.<=>) query_embedding)
  from fused f join pages p using (id) order by f.score desc limit least(greatest(match_count, 1), 20);
$$;

create or replace function shikhbo.match_centre_notes_m3(
  match_centre text, query_embedding extensions.vector(1024), query_text text, match_count int default 5
) returns table (source text, text text, similarity float)
language sql stable security definer set search_path = '' as $$
  with notes as (
    select n.title || ', part ' || n.part as id, n.title || ', part ' || n.part as source, n.text, n.embedding_m3 as e
    from shikhbo.centre_notes n where n.centre = match_centre and n.embedding_m3 is not null
  ),
  by_meaning as (
    select id, row_number() over (order by e operator(extensions.<=>) query_embedding) as r
    from notes order by e operator(extensions.<=>) query_embedding limit 30
  ),
  by_words as (
    select id, row_number() over (order by ts_rank_cd(to_tsvector('simple', text), q) desc) as r
    from notes, shikhbo.any_words(query_text) q where to_tsvector('simple', text) @@ q
    order by ts_rank_cd(to_tsvector('simple', text), q) desc limit 30
  ),
  fused as (
    select id, sum(1.0 / (60 + r)) as score from (select * from by_meaning union all select * from by_words) x group by id
  )
  select n.source, n.text, 1 - (n.e operator(extensions.<=>) query_embedding)
  from fused f join notes n using (id) order by f.score desc limit least(greatest(match_count, 1), 20);
$$;

revoke all on function shikhbo.match_pages_m3(extensions.vector, text, int, text, int) from public, anon, authenticated;
revoke all on function shikhbo.match_centre_notes_m3(text, extensions.vector, text, int) from public, anon, authenticated;

-- Peace AI: a search index over Ramadan Planner's Quran and hadith tables.
-- Kept in its own schema so Prisma (which owns public.*) never touches it.
create schema if not exists peace;
revoke all on schema peace from public, anon, authenticated;

create table if not exists peace.passages (
  id text primary key,              -- 'q:2:153' or 'h:bukhari:6021'
  kind text not null check (kind in ('quran', 'hadith')),
  search_text text not null,        -- English text (plus surah/collection name) that was embedded
  embedding extensions.vector(1024)
);
alter table peace.passages enable row level security;
create index if not exists passages_m3 on peace.passages using hnsw (embedding extensions.vector_cosine_ops);
create index if not exists passages_fts on peace.passages using gin (to_tsvector('simple', search_text));

-- Fill the index rows once; embeddings are added later by peace-api's reindex op.
insert into peace.passages (id, kind, search_text)
select 'q:' || a.surah_no || ':' || a.ayah_no, 'quran',
  coalesce(a.text_english, '') || ' (Quran, ' || coalesce(s.name_english, '') || ')'
from public.quran_ayahs a join public.quran_surahs s on s.surah_no = a.surah_no
where coalesce(a.text_english, '') <> ''
on conflict (id) do nothing;

insert into peace.passages (id, kind, search_text)
select 'h:' || substr(h.edition_name, 5) || ':' || h.hadith_no, 'hadith', h.text
from public.hadith h
where h.edition_name like 'eng-%' and coalesce(h.text, '') <> ''
on conflict (id) do nothing;

create or replace function peace.search(
  query_embedding extensions.vector(1024), query_text text, kinds text[], match_count int default 5
) returns table (id text, kind text, similarity float)
language sql stable security definer set search_path = '' as $$
  with docs as (
    select p.id, p.kind, p.search_text, p.embedding from peace.passages p
    where p.kind = any(kinds) and p.embedding is not null
  ),
  by_meaning as (
    select id, row_number() over (order by embedding operator(extensions.<=>) query_embedding) as r
    from docs order by embedding operator(extensions.<=>) query_embedding limit 40
  ),
  by_words as (
    select id, row_number() over (order by ts_rank_cd(to_tsvector('simple', search_text), q) desc) as r
    from docs, shikhbo.any_words(query_text) q where to_tsvector('simple', search_text) @@ q
    order by ts_rank_cd(to_tsvector('simple', search_text), q) desc limit 40
  ),
  fused as (
    select id, sum(1.0 / (60 + r)) as score from (select * from by_meaning union all select * from by_words) x group by id
  )
  select d.id, d.kind, 1 - (d.embedding operator(extensions.<=>) query_embedding)
  from fused f join docs d using (id) order by f.score desc limit least(greatest(match_count, 1), 20);
$$;
revoke all on function peace.search(extensions.vector, text, text[], int) from public, anon, authenticated;
