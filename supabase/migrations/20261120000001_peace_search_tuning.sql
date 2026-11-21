-- Tuned on scripts/eval/questions.json (Peace: 8/10 -> 9/10).
-- Word ranking is divided by document length (ts_rank_cd normalization 2):
-- very long hadith otherwise matched almost every question. Meaning (bge-m3)
-- counts twice as much as shared words.
create or replace function peace.search(
  query_embedding extensions.vector(1024), query_text text, kinds text[], match_count int default 5
) returns table (id text, kind text, similarity float)
language sql stable security definer set search_path = '' as $$
  with docs as (
    select p.id, p.kind, p.search_text, p.embedding from peace.passages p
    where p.kind = any(kinds) and p.embedding is not null
  ),
  by_meaning as (
    select id, 1.0 as w, row_number() over (order by embedding operator(extensions.<=>) query_embedding) as r
    from docs order by embedding operator(extensions.<=>) query_embedding limit 40
  ),
  by_words as (
    select id, 0.5 as w, row_number() over (order by ts_rank_cd(to_tsvector('simple', search_text), q, 2) desc) as r
    from docs, shikhbo.any_words(query_text) q where to_tsvector('simple', search_text) @@ q
    order by ts_rank_cd(to_tsvector('simple', search_text), q, 2) desc limit 40
  ),
  fused as (
    select id, sum(w / (60 + r)) as score from (select * from by_meaning union all select * from by_words) x group by id
  )
  select d.id, d.kind, 1 - (d.embedding operator(extensions.<=>) query_embedding)
  from fused f join docs d using (id) order by f.score desc limit least(greatest(match_count, 1), 20);
$$;
revoke all on function peace.search(extensions.vector, text, text[], int) from public, anon, authenticated;
