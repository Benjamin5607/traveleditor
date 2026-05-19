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
