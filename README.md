# Travel Editor

This repository contains one active application: `emily-traveleditor`.

## Active app

- App: `emily-traveleditor`
- Framework: Next.js static export
- Deployed path: `/traveleditor`
- GitHub Pages artifact: `emily-traveleditor/out`

## Local development

```bash
cd emily-traveleditor
npm install
NEXT_PUBLIC_GROQ_API_KEY="$GROQ_API_KEY" npm run dev
```

Open [http://localhost:3000/traveleditor/](http://localhost:3000/traveleditor/).

## Validation

```bash
cd emily-traveleditor
npm run lint
NEXT_PUBLIC_GROQ_API_KEY="$GROQ_API_KEY" npm run build
GROQ_API_KEY="$GROQ_API_KEY" python3 scripts/update_data.py
```

The old root-level React sample app was removed so the repository has a single app entry point.

## What the app does

1. Daily JSON collection via `.github/workflows/data-update.yml`
2. Theme-based place recommendations with official/source links
3. Trip guidebook generation from collected data (days/nights, transport, lodging, budget)
4. Deterministic budget estimates and map/search booking links
5. Groq is used only to arrange collected places into an itinerary JSON
