-- Step 3 of the rollout in 20261027000000: run only after the shikhbo-api
-- Edge Function that calls shikhbo.* is deployed. Drops the old public.*
-- copies of the store functions (their EXECUTE grants were already revoked).
drop function if exists public.shikhbo_match_pages(extensions.vector, int, text, int);
drop function if exists public.shikhbo_cache_get(text, text);
drop function if exists public.shikhbo_cache_set(text, text, text, int);
drop function if exists public.shikhbo_rate_limit_hit(text, text, int, int);
drop function if exists public.shikhbo_upsert_page(text, text, int, text, text, text, extensions.vector);
