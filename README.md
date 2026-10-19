# Shikhbo AI

**Live demo (prototype):** [ai-chat-vert-alpha.vercel.app](https://ai-chat-vert-alpha.vercel.app). On 2026-10-19 the page loaded, but every question returned a server error. That deployment is older than the code in this repository and needs a redeploy.

Shikhbo AI is a homework helper for students in Bangladesh. A student picks a class and a medium (Bangla or English) and asks a question. The app looks up matching pages in NCTB textbooks, then asks a hosted language model to explain the answer step by step.

**Status: prototype.** Textbook lookup covers four NCTB Class 1 books only. Questions about other classes or subjects are answered from the model's general knowledge, and the model is told to say that the answer does not come from the textbook.

## How it works

The app is a single Next.js 16 page plus one API route, `POST /api/teach`.

1. **Rate limit.** 10 requests per minute per client IP, keyed on the first `X-Forwarded-For` hop. It uses Upstash Redis when its credentials are set; otherwise an in-memory counter, which only works on a single long-running server.
2. **Validation.** A zod schema accepts `user` and `assistant` turns only, keeps the last 10, requires an integer class from 1 to 12 and a medium of `english` or `bengali`, and caps lengths. HTML tags are stripped from questions.
3. **Answer cache.** An exact-match cache for 5 minutes, keyed on class, medium and a SHA-256 hash of the latest question. It uses Redis through `KV_REST_API_*` when set, otherwise server memory.
4. **Retrieval.** The question is embedded with `sentence-transformers/all-MiniLM-L6-v2` on Hugging Face and matched against Upstash Vector (top 5 pages, filtered by class and medium). If the embedding call or the vector query fails, or takes more than 5 seconds, the tutor answers without textbook context instead of failing.
5. **Generation.** Providers are tried in order: OpenRouter, Hugging Face Inference Providers, Groq. The first non-empty answer wins. `<think>...</think>` reasoning blocks are removed before the answer is returned.

The chat renders Markdown with KaTeX math. The conversation is kept in the browser's `localStorage` and can be exported as a text file.

## Limitations

- Only four Class 1 textbooks are indexed (see `books/sources.json`). The class picker goes up to 12 and the subject cards include Physics, Chemistry and ICT, but there is no textbook data for them.
- Bangla retrieval is weak. The embedding model is English-only, and each OCR'd page is embedded as one chunk, so long pages are truncated.
- The cache key covers only the latest question. A short follow-up such as "explain more" can get an answer cached from another conversation within 5 minutes.
- Answers arrive in one piece (no streaming), and nothing checks them. The model can be wrong, and there is no content moderation.
- There is no sign-in. The rate limit is the only protection against someone using up your provider credits.
- Free-tier models change and get retired. Model IDs are read from environment variables so you can switch without a code change.
- The "Start learning" and "Syllabus" buttons do nothing yet.
- The Playwright specs in `e2e/` describe an older UI and are not run in CI.

## Privacy

This app is aimed at children, so be clear about where a question goes:

- **Model providers.** The question and the earlier turns of the conversation (up to 10 messages in all) go to the chat providers you configure: OpenRouter (and the model host it routes to), Hugging Face Inference Providers, and Groq. The question also goes to Hugging Face to be embedded. Each provider's own terms apply, and free tiers may log prompts. Read them before you deploy this for students.
- **Upstash Vector** receives the question's embedding (a list of numbers), not the text.
- **Answer cache.** The answer text is stored for 5 minutes in Redis or server memory. The key holds the class, the medium and a hash of the question, not the question itself.
- **Rate limit.** A hash of the client IP is stored for up to a minute.
- **Logs.** The server does not log questions or answers. Failures log one short line with the provider, the error type and the error message. Your host may keep its own request logs.
- **Browser.** The conversation stays in `localStorage` until the student clears it.
- There are no analytics or tracking scripts in the app.

Tell students not to type personal details into the chat.

## Getting started

Requirements: Node.js 22, npm, and [Bun](https://bun.sh/) for the unit tests.

```bash
git clone https://github.com/tahmidbintaslim/Shikhbo-AI.git
cd Shikhbo-AI
npm ci
cp .env.example .env.local   # then fill in your keys
npm run dev                  # http://localhost:3000
```

With no chat provider key set, the page loads but every question returns "currently overloaded" (HTTP 503). With a provider key but no Upstash Vector index, the tutor answers without textbook context.

## Environment variables

Set these in `.env.local` for local work, or in your host's settings. `.env.example` lists them all.

| Name | Needed for | Notes |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | Chat, first provider | Set at least one of the three chat keys |
| `HF_API_KEY` | Chat, second provider; question embeddings | Required for textbook retrieval |
| `GROQ_API_KEY` | Chat, third provider | |
| `OPENROUTER_MODEL` | Optional | Default `google/gemma-4-31b-it:free` |
| `HF_CHAT_MODEL` | Optional | Default `google/gemma-4-26B-A4B-it` |
| `GROQ_MODEL` | Optional | Default `openai/gpt-oss-120b` |
| `HF_EMBEDDING_MODEL` | Optional | Default `sentence-transformers/all-MiniLM-L6-v2`. Must match the model the index was built with |
| `UPSTASH_VECTOR_REST_URL` | Textbook retrieval | |
| `UPSTASH_VECTOR_REST_TOKEN` | Textbook retrieval | |
| `UPSTASH_REDIS_REST_URL` | Shared rate limit | Use this pair or the `KV_REST_API_*` pair |
| `UPSTASH_REDIS_REST_TOKEN` | Shared rate limit | |
| `KV_REST_API_URL` | Shared rate limit and answer cache | Set by the Vercel marketplace Upstash integration |
| `KV_REST_API_TOKEN` | Shared rate limit and answer cache | |
| `NEXT_PUBLIC_APP_URL` | Optional | Base URL for `sitemap.xml` and `robots.txt` |
| `GOOGLE_SITE_VERIFICATION` | Optional | Search Console verification tag |

The default model IDs were checked against each provider's model list on 2026-10-19.

## Textbook ingestion

The textbooks are not stored in this repository. `books/sources.json` lists each file with its NCTB download link, a mirror, and a SHA-256 checksum.

1. Create an Upstash Vector index with dimension 384 (the output size of `all-MiniLM-L6-v2`) and the cosine metric.
2. Install [Ghostscript](https://www.ghostscript.com/) so the `gs` command is on your `PATH`. The script uses it to turn PDF pages into images.
3. Put `HF_API_KEY`, `UPSTASH_VECTOR_REST_URL` and `UPSTASH_VECTOR_REST_TOKEN` in `.env.local`.
4. Download the books and check their hashes:

   ```bash
   npm run books:fetch
   ```

5. Run the ingest script from the repository root:

   ```bash
   npx tsx scripts/ingest.ts
   ```

The script OCRs every page with Tesseract (`ben` for `books/bengali/`, `eng` for `books/english/`), skips near-empty pages, embeds each page and upserts it with `text`, `source`, `language`, `grade` and `page` metadata. The class comes from the file name ("Class 1") and the medium from the folder. tesseract.js downloads its language data on the first run. OCR runs one page at a time, so a full run is slow.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (`bun test`, files in `__tests__/`) |
| `npm run books:fetch` | Download the NCTB textbooks listed in `books/sources.json` (add `-- --ocr` to also fetch the Tesseract data) |

CI (`.github/workflows/ci.yml`) runs install, lint, typecheck, unit tests and build on pushes and pull requests to `main`.

## Project layout

```
src/
  app/page.tsx              Landing page and chat layout
  app/api/teach/route.ts    The tutor API
  components/ChatProvider.tsx  One chat state shared by the header pickers, subject cards and chat box
  components/ChatInterface.tsx Chat box
  hooks/useChat.ts          Chat state and the request to /api/teach
  lib/teach.ts              Request schema, sanitizing, cache key, helpers
  lib/teach-limits.ts       Length and history limits shared by client and server
  lib/retrieval.ts          Embedding plus vector search with timeout and fallback
  lib/rate-limit.ts         Upstash rate limit with in-memory fallback
  lib/models.ts             Model IDs and their env overrides
  data/landing-content.ts   Landing page copy (Bangla and English)
scripts/
  ingest.ts                 OCR, embed and index the textbooks
  fetch-books.mjs           Download the textbooks listed in books/sources.json
books/sources.json          Textbook sources and checksums
__tests__/                  Unit tests
```

## Deploying

The project is set up for Vercel (`vercel.json` pins the `sin1` region). Import the repository in Vercel, add the environment variables above, and deploy. Other hosts that run a Next.js Node server should work too, but only Vercel has been used. A static export does not work, because the tutor is an API route.

## Tech stack

Next.js 16 (App Router), React 19, TypeScript, HeroUI, Tailwind CSS 4, Framer Motion, Vercel AI SDK with the OpenRouter and Groq providers, `@huggingface/inference`, Upstash Vector, Upstash Redis and Ratelimit, `@vercel/kv`, zod, react-markdown with KaTeX, tesseract.js and Ghostscript for ingestion, and Bun for unit tests.

## License

The code is licensed under CC BY-NC-SA 4.0; see [LICENSE](LICENSE). The textbooks are published by the National Curriculum and Textbook Board (NCTB), Government of Bangladesh, are not part of this repository, and are not covered by its license.

Issues and pull requests: https://github.com/tahmidbintaslim/Shikhbo-AI
