# Security policy

Shikhbo AI is a prototype and has no production deployment in use. Security reports are still welcome, because people deploy their own copies and the app is aimed at children.

## Supported versions

Only the `main` branch gets fixes. There are no releases.

## Reporting a vulnerability

Please do not open a public issue, pull request or discussion for a vulnerability.

Email **tahmidbintaslimrafi@gmail.com** with:

- what the problem is and where (file, route or setting),
- steps to reproduce it or a proof of concept,
- what an attacker could do with it.

If private vulnerability reporting is enabled on this repository (Security tab, "Report a vulnerability"), you can use that instead.

There is no bug bounty.

## Scope

In scope: the code in this repository, including `src/app/api/`, `src/lib/`, the `shikhbo-api` Supabase Edge Function and the SQL migrations in `supabase/`.

Out of scope: the hosted model providers (OpenRouter, Hugging Face, Groq), Supabase and Vercel themselves, and the old Vercel deployment described in the README, which does not run current code.

## Known limits

These are documented in the README and are not new findings:

- There is no sign-in. The per-IP rate limit is the only protection for provider credits.
- The rate limit keys on the first `X-Forwarded-For` hop, so behind a proxy that passes a client's own header through, a client can choose its key.
- Nothing checks the model's answers and there is no content moderation.
