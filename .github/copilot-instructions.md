## Copilot / AI Agent Instructions for Shikhbo AI

Quick summary

- Framework: Next.js (App Router) + TypeScript. UI is client-heavy and lives under `src/app`.
- Core flow: user -> `useChat` (client) -> POST `/api/teach` -> `src/app/api/teach/route.ts` (server) -> Hugging Face inference -> cached response -> client updates localStorage.
- Key env: `HF_API_KEY` (Hugging Face), optional `NEXT_PUBLIC_ANALYTICS_ID`, `NEXT_PUBLIC_APP_URL`.

What to know before editing

- UI pages & client logic: [src/app/page.tsx](src/app/page.tsx) and `useChat` in [src/hooks/useChat.ts](src/hooks/useChat.ts). Client stores conversation state in `localStorage` under `shikbo-ai-messages`.
- Server AI endpoint: [src/app/api/teach/route.ts](src/app/api/teach/route.ts). This file contains the system prompt, model selection (`Qwen/Qwen2.5-7B-Instruct`), caching, and simple rate-limiting. Edit the system prompt here to change tutor behavior.
- Data model & persistence helpers: [src/lib/database.ts](src/lib/database.ts) documents Redis/kv key patterns and contains a `ShikhboDatabase` class sketch used for production `@vercel/kv` integration.

Architecture notes (big picture)

- App Router: server components via `src/app/layout.tsx`, but main chat UI is a client component (`"use client"`) in `page.tsx` because it uses browser APIs (speech, localStorage).
- Server-side endpoint uses `@huggingface/inference` and attempts to use `@vercel/kv` for cache/Redis; in dev it falls back to in-memory Maps. Keep this dual-path in mind when modifying caching logic.
- Communication contract: client POSTs JSON { input, grade } to `/api/teach` and expects JSON { result } on success. Do not change this without updating `useChat`.

Developer workflows & commands

- Run dev: `npm run dev` (or `next dev`). The project README also references `bun dev`—`bun` may be used for tests (`bun test`) but `next dev` is the canonical dev server.
- Tests: unit via `bun test` (script `test`), e2e via Playwright: `npm run test:e2e` and `npm run test:e2e:ui`.
- Build: `npm run build`; start: `npm start`.

Project-specific patterns & conventions

- Localization: two locales supported (`en` / `bn`). Language switching logic and simple translation strings are embedded in `page.tsx` and `useChat` (see `translations` objects). Keep responses consistent with client locale when possible.
- Grade handling: client sends `grade` as the first value of a `Set` (`grade` is a `Set<string>` in `useChat`). Server expects a simple numeric string (1-12). When editing grade handling, update both places.
- Message shape: see `Message` type in [src/hooks/useChat.ts](src/hooks/useChat.ts) and the Redis `Message` type in [src/lib/database.ts](src/lib/database.ts). Client-side stores timestamps as `Date` objects when restoring from localStorage.
- Local dev fallbacks: `route.ts` exports helpers (`sanitizeInput`, `getCacheKey`, `getCachedResponse`, `setCachedResponse`) and uses in-memory Maps when `@vercel/kv` is not present—use these in tests and debugging.

Integration points to watch

- Hugging Face: `@huggingface/inference` used in `route.ts`. Requires `HF_API_KEY` in env for production. Model name is hard-coded—update with caution.
- Vercel KV: `@vercel/kv` is optional. Production deployments should configure KV; dev falls back to in-memory caching.
- Browser APIs: `SpeechSynthesis` and `SpeechRecognition` are used in `page.tsx`. Unit/test environments must mock these if running headless.
- UI library: uses `@heroui/*` (HeroUI) components extensively—updating components may require corresponding prop changes.

Quick edit examples

- To change tutor persona or curriculum rules: edit systemPrompt in [src/app/api/teach/route.ts](src/app/api/teach/route.ts).
- To change where conversations persist: edit `localStorage` key in [src/hooks/useChat.ts](src/hooks/useChat.ts) and adjust `ShikhboDatabase` in [src/lib/database.ts](src/lib/database.ts) for server persistence.
- To change model or inference parameters: modify `hf.chatCompletion` call in `route.ts` (model, temperature, max_tokens).

Testing & debugging tips

- When testing the server route locally without KV, rely on the in-memory caches defined in `route.ts`—they persist only for the process lifetime.
- To run unit tests: `bun test`. If not using Bun, run the test runner configured in your environment; ensure Playwright is installed for e2e tests.
- Mock `window.speechSynthesis` and `window.SpeechRecognition` in Jest/Playwright tests for client-side components.

If anything in this file is unclear or you'd like me to expand a section (examples of prompts, test mocks, or a diff template for modifying the system prompt), tell me which area to expand.
