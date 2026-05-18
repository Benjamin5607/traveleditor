# Emily Travel Editor

Groq-powered travel mood picker for Emily's themed recommendations. The active app lives in this directory and uses Next.js static export for GitHub Pages.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000/traveleditor/](http://localhost:3000/traveleditor/) in your browser.

## Environment

- `NEXT_PUBLIC_GROQ_API_KEY`: Groq key used by the static GitHub Pages build.
- `NEXT_PUBLIC_OPENWEATHER_API_KEY`: optional OpenWeather key for live weather context.

For local testing with the existing secret name:

```bash
NEXT_PUBLIC_GROQ_API_KEY="$GROQ_API_KEY" npm run dev
```

## Structure

- `src/app/page.tsx`: main Emily UI.
- `src/lib/themes.ts`: shared theme labels, descriptions, and prompt guidance.
- `src/lib/groqMarket.ts`: Groq model loading and chat completion calls.
- `scripts/update_data.py`: writes `public/data/market_db.json` for market context.

## Validation

```bash
npm run lint
NEXT_PUBLIC_GROQ_API_KEY="$GROQ_API_KEY" npm run build
python3 scripts/update_data.py
```

The GitHub Pages workflow builds from this directory and uploads `out/`.
