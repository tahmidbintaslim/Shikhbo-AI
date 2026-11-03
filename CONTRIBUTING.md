# Contributing to Shikhbo AI

Thanks for helping. Shikhbo AI is a prototype homework tutor for students in Bangladesh, so changes that make answers more correct, make Bangla work better or make the project easier to run are the most useful. The README's [Status and roadmap](README.md#status-and-roadmap) and [Limitations](README.md#limitations) sections list the open work.

## Before you start

- For anything larger than a small fix, open an issue first so we can agree on the approach.
- Security problems go to [SECURITY.md](SECURITY.md), not a public issue.
- Never commit secrets. `.env.local` is gitignored, and `.env.example` holds variable names only.

## Set up

You need Node.js 22, npm 10 and [Bun](https://bun.sh/) 1.4 or later (Bun runs the unit tests).

```bash
git clone https://github.com/<your-username>/Shikhbo-AI.git
cd Shikhbo-AI
npm ci
cp .env.example .env.local
npm run dev
```

The app runs without any keys: the tutor answers `503 not_configured`. Add one chat provider key to get answers, and the `SHIKHBO_STORE_*` settings for textbook lookup. The README's [Environment variables](README.md#environment-variables) table explains each one.

## Checks

Run these before you open a pull request. CI (`.github/workflows/ci.yml`) runs the same steps in this order.

```bash
npm run lint
npm run typecheck
npm test                          # unit tests in __tests__/ (bun test)
npm run build
npx playwright install chromium   # once per machine
npm run test:e2e                  # smoke tests against the production build
```

The smoke tests pass with or without provider keys.

## Making a change

- Branch from `main` and keep each pull request to one change.
- Add or update a unit test in `__tests__/` when you change logic in `src/lib/` or the API routes.
- User-facing text needs both Bangla and English. Landing page copy lives in `src/data/landing-content.ts`.
- Keep the README true. If you add an environment variable, route, script or limit, document it in the README and `.env.example`.
- Do not add claims to the README that the code does not support.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/), for example `fix(teach): ...` or `feat(store): ...`, matching the existing history.

## Pull requests

Fill in the pull request template: what changed, why, and which checks you ran. Attach screenshots for visible UI changes, in both the dark and light themes.

## License

By contributing, you agree that your contributions are licensed under the project's [CC BY-NC-SA 4.0](LICENSE) license.
