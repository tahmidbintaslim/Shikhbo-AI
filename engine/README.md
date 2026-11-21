# bangla-ai-engine

A Cloudflare Worker that gives Shikhbo, Bongo and Peace AI free models through
Cloudflare Workers AI (free tier: 10,000 "neurons" a day):

- `POST /embed { texts }` → `bge-m3` vectors (1024 dimensions, multilingual: a
  Bangla question and its English translation score about 0.85).
- `POST /chat { system, messages, max_tokens? }` → Llama 3.3 70B (fast, fp8).

Every call needs `Authorization: Bearer <ENGINE_SECRET>`. The Worker uses its
own Workers AI binding, so no Cloudflare API token is stored anywhere.

Who calls it:

| Caller | Setting |
|---|---|
| Shikhbo app (`/api/teach`, chat) | `ENGINE_URL`, `ENGINE_SECRET` env vars on Vercel |
| `shikhbo-api` and `peace-api` Edge Functions (embeddings) | the `shikhbo.engine_config` table |

Deploy: upload `worker.js` as a module Worker named `bangla-ai-engine` with an
`ai` binding named `AI` and a secret `ENGINE_SECRET` (Cloudflare dashboard, or
`wrangler deploy` with those bindings). When the free quota runs out the Worker
answers 503 and the app falls through to its next chat provider.
