# AGENTS.md

## Cursor Cloud specific instructions

### Project structure

The main application lives in `emily-traveleditor/` (Next.js 16 + React 19 + Tailwind CSS v4). There is also a nested `emily-traveleditor/emily-traveleditor/` directory which is unused boilerplate — ignore it.

### Commands (run from `emily-traveleditor/`)

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (serves at `http://localhost:3000/traveleditor/`) |
| Lint | `npm run lint` (ESLint 9) |
| Build | `npm run build` (static export to `out/`) |
| No tests | No test framework is configured |

### Key caveats

- **basePath**: `next.config.ts` sets `basePath: '/traveleditor'` and `output: 'export'`. The dev server URL is `http://localhost:3000/traveleditor/`, not `http://localhost:3000/`.
- **API keys and `.env.local`**: Next.js only exposes `NEXT_PUBLIC_*` env vars to the client bundle, and they are inlined **at dev server startup**. The update script generates `emily-traveleditor/.env.local` from Cursor Secrets so the dev server picks them up automatically. Required secrets:
  - `NEXT_PUBLIC_GROQ_API_KEY` — Groq AI (core feature)
  - `NEXT_PUBLIC_OPENWEATHER_API_KEY` — weather data (optional, graceful fallback)
- **GitHub Secrets ≠ Cursor Secrets**: GitHub Secrets are only available in GitHub Actions workflows. For local/Cursor Cloud dev, keys must be added via the Cursor Secrets panel.
- **Lint errors**: The codebase has pre-existing lint errors in `groqMarket.ts` and `dataScraper.ts`. Lint exits non-zero due to these.
- **Python script**: `emily-traveleditor/scripts/update_data.py` is a data-collection cron job (needs `pip install requests`). It is not required for local development.
