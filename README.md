# Devart Metric Hub v6.4

KPI management system: Metric Map, KPI Profiles, KPI Tracker, Dashboard.

## Local development

```bash
npm install
npm run dev
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com), sign in with GitHub
3. Click "New Project" → Import this repo
4. Framework: Vite (auto-detected). Click Deploy.
5. Done. URL like `devart-metric-hub.vercel.app`

## Tech

- React 18 + Vite
- Recharts for charts
- localStorage for data persistence
- Zero backend, runs entirely in browser
