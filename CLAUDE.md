# CLAUDE.md - Devart Metric Hub

## Project Overview

**Devart Metric Hub v6.4** is a browser-based KPI management system for Devart's business units. It is a zero-backend React SPA that persists all data in `localStorage`. The entire application lives in a single monolithic JSX file (`App.jsx`, ~2,080 lines).

## Tech Stack

- **React 18** with Vite 5 (dev server + build)
- **Recharts** for bar chart visualizations (Dashboard module)
- **CSS-in-JS** via inline styles (no CSS files, no component library)
- **localStorage** for persistence (no backend, no API calls)
- **System fonts** (`system-ui, -apple-system, sans-serif`)

## Project Structure

```
/
├── App.jsx          # Entire application (all components, data, logic)
├── main.jsx         # React entry point (renders <App />)
├── index.html       # HTML shell with global reset styles
├── vite.config.js   # Vite config (react plugin only)
├── package.json     # Dependencies and scripts
└── README.md        # Brief project description
```

There is no `src/` directory. All source files are in the project root.

## Commands

```bash
npm run dev      # Start Vite dev server (HMR)
npm run build    # Production build to dist/
npm run preview  # Preview production build locally
```

There are **no tests, no linter, no formatter, no CI/CD, no pre-commit hooks**.

## Architecture

### Single-File Structure (App.jsx)

The file is organized in sequential sections separated by comment banners (`═══`):

1. **Constants & Config** (~lines 1-35) - Color palette (`C`), BU config (`BU_CFG`), enums (`BSC`, `CATS`, `FREQ`, `DIRECTIONS`, `KPI_TYPES`), storage keys
2. **Seed Data** (~lines 40-300) - `SEED_METRICS` (40+ metrics), `SEED_PROFILES` (20 profiles), `SEED_TRACKERS` (14 tracker records)
3. **Utility Functions** (~lines 300-380) - `loadS`/`saveS` (localStorage), `calcIndicator`, `indColor`, `fmtPct`, `fmtNum`, ID generators
4. **Shared UI Components** (~lines 380-500) - `Badge`, `OrgFilter`, `Confirm` dialog
5. **Module 1: Metric Map** (~lines 500-850) - Define KPI metrics per BU/dept
6. **Module 2: KPI Profiles** (~lines 850-1300) - Role-based KPI profile CRUD with weighted metrics
7. **Module 3: KPI Tracker** (~lines 1300-1750) - Track actual vs baseline/target values (personal + team types)
8. **Module 4: Dashboard** (~lines 1750-1994) - Company overview, BU detail, coverage & health analytics
9. **Main App Component** (~lines 2000-2079) - State management, localStorage sync, tab navigation

### Key Patterns

- **Color constants**: All UI colors use the `C` object (e.g., `C.dk`, `C.grn`, `C.red`)
- **BU config**: `BU_CFG` maps BU codes (`DEV`, `SKY`, `OTX`, `MOB`, `CORE`) to names and department lists
- **Storage abstraction**: `loadS(key, fallback)` / `saveS(key, data)` wrap localStorage with JSON parse/stringify
- **Seed data factories**: `SEED_PROFILES` uses factory functions `K()` (KPI entry) and `P()` (profile) for concise construction
- **Indicator calculation**: `calcIndicator(actual, baseline, target, direction, maxIndicator)` computes performance indicators respecting direction logic ("Higher is better", "Lower is better", "Target is exact")
- **Cascading org filter**: `OrgFilter` component provides BU -> Department -> Team drill-down, shared across modules
- **Modal/form CRUD**: Each module uses modal overlays for create/edit operations
- **Tab-based navigation**: Main App renders one of four module components based on `tab` state

### Data Model

- **Metrics**: `{id, name, bu, dept, bsc, cat, unit, dir, desc, scope, parent, targetSrc, actualSrc, targetCalc, baseCalc, actualCalc}`
- **Profiles**: `{id, bu, dept, team, role, period, scope, frequency, indicatorLimit, kpiScoreLimit, kpis: [{metric_id, weight, scope, kpiType, targetMethod, baseRules, maxIndicator, benchmark, estimatedTarget, strategicLink, projectLink}]}`
- **Trackers**: `{id, profile_id, type ("personal"|"team"), period, members[], entries: [{metric_id, kpi_index, baseline, target, actual, indicator, weightedScore, memberData[]}], totalScore}`

### Storage Keys

- `devart-metric-hub-v5` - Metrics
- `devart-kpi-profiles-v3` - Profiles
- `devart-kpi-tracker-v1` - Trackers

## Business Context

The app manages KPIs for 5 Devart business units:
- **DEV** (Devart BU) - Developer tools (dbForge, etc.)
- **SKY** (Skyvia) - Cloud data integration platform
- **OTX** (OnTaxi) - Ride-hailing platform
- **MOB** (Mobion) - Mobile/IoT platform
- **CORE** - Shared services (HR, IT, Finance, Analytics, OpEx)

KPIs use Balanced Scorecard categories: Financial, Customer, Internal Process, Learning & Growth.

## Development Conventions

- **No module splitting**: The codebase is intentionally a single file. Do not refactor into multiple files unless explicitly asked.
- **Inline styles only**: All styling is done via inline `style={{}}` objects. Do not introduce CSS files or styled-components.
- **Seed data is immutable config**: Seed arrays (`SEED_METRICS`, `SEED_PROFILES`, `SEED_TRACKERS`) serve as defaults when localStorage is empty. They should not be modified at runtime.
- **ID format**: Metrics use `{BU_PREFIX}-{NNN}` (e.g., `D-001`, `S-003`). Profiles use `P-{NNN}`. Trackers use `T-{NNN}`.
- **Version in header comment**: Update the version comment block at the top of App.jsx when adding features.
- **No external API calls**: Everything runs client-side with localStorage.
