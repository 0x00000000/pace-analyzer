# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev`: Vite dev server with HMR at http://localhost:5173/
- `npm run build`: type-checks (`tsc -b`, project references in `tsconfig.app.json` / `tsconfig.node.json`), then runs the production build into `dist/`
- `npm run lint`: ESLint (flat config with typescript-eslint, react-hooks and react-refresh rules)
- `npm run preview`: serves the built `dist/`
- `npm test`: Vitest in watch mode; `npm run test:run` runs the tests once. Tests sit next to the code as `*.test.ts(x)`; component tests use React Testing Library with jsdom.

## Project

This is a React 19 + TypeScript + Vite app for analysing a Runkeeper run. The user pastes the raw JSON of an activity into a textarea (`JsonInput`), adjusts the pace and smoothing settings (`Controls`), and presses **Process**. The app then shows a pace-by-distance chart (`Chart`) with stats and a track map (`TrackMap`) that follow the chart's zoom and hover. `InfoBox` is the help dialog.

### Data flow

- `App.tsx` owns all state: the JSON string, the settings (held as strings, as typed in the inputs), the current `Route`, and `loadError`. On Process it builds a new `Route`, applies the settings that parse as valid numbers (invalid ones keep the defaults), and calls `loadData`. The settings must be set **before** `loadData`, which computes the pace. A failed load still replaces the route, so the chart is cleared, and the error message goes to `JsonInput`'s `error` prop.
- `src/models/route.ts` (`Route`, default export; `TrackData` type export) parses and validates the JSON, then builds `TrackData[]` (`time` ms, `distance` m, `pace` min/km, `lat`, `lon`). `loadData` throws an `Error` with a user-facing message on empty input, invalid JSON, a missing or empty `points` list, or a point without numeric `deltaTime`/`deltaDistance`/`latitude`/`longitude` (see `isRunkeeperPoint`).
- Pace is computed over a sliding time window (`paceWindow`, seconds), then smoothed by averaging `smoothNeighboursCount` points on each side, unless the neighbours deviate by more than `smoothMaxDeviation` (%). A pace of 0 means "no distance covered" and isn't plotted. `paceLimit` (min/km) caps the chart's Y axis.
- Pure helpers live in `src/utils/`: `chart.ts` (Y range, nearest point by binary search, window clamping), `trackMap.ts` (equirectangular projection, highlighted segment) and `format.ts` (`formatKilometers`, `formatPace`, `formatTime`).
- `Chart` zooms with the mouse wheel (a native non-passive listener, so it can call `preventDefault`) and pans by dragging with pointer capture. Its zoom and last-hovered point are stored together with the `Route` they belong to, so a new route resets them.
- Test helpers are in `src/test/fixtures.ts`: `makeRun(steps)` builds a Runkeeper-shaped JSON string, `steady(...)` makes uniform steps, and `trackPoint(...)` makes a `TrackData`. `src/test/setup.ts` loads jest-dom matchers and adds a minimal stand-in for `<dialog>`'s `showModal()`/`close()`, which jsdom lacks (it only toggles `open` and fires `close`). Vitest globals are off, so component tests must call `cleanup()` in `afterEach`.

### Input data format

The data comes from Runkeeper's `https://runkeeper.com/ajax/pointData?tripUuid=<uuid>` endpoint (noted in `rdme.txt`). The real samples `example.json` (about 180 points, a 16-minute run) and `example-big.json` (about 2,300 points, a 2.5-hour run) are not in the repository. Ask the user for them if needed, and use `makeRun` from `src/test/fixtures.ts` in tests. The top-level object contains:

- `points[]`: the GPS track. Each point has `latitude`, `longitude`, `altitude`, `accuracy`, `timestamp` (ms since start), `deltaTime`, `deltaDistance` (meters), `deltaPause` and `type`. `type` is one of `StartPoint`, `TripPoint`, `PausePoint`, `ResumePoint` or `EndPoint`, so any pace or duration calculation has to account for pauses.
- Summary stats stored as **strings**: `statsDistance` (km), `statsSpeed`, `statsPace`, `statsElevation`, `statsCalories`, `statsDuration` (e.g. `"16:12"`). `unAdulteratedStatsDuration` is the duration in seconds as a number.
- `activityType` (e.g. `"RUN"`), `distanceSplits`, `trainingSplits`, `chartData`, `feedData`.

## Conventions

- Components live in `src/components/<Name>/index.tsx` and export a named function. Styles sit next to them in `styles.module.css` (CSS Modules), imported as `styles`.
- Components are controlled: the parent owns the state and passes `value` and `onChange`.
- The TS config enables `verbatimModuleSyntax` (use `import type` for type-only imports), `erasableSyntaxOnly` (no `enum`s or parameter properties), and `noUnusedLocals` / `noUnusedParameters`.
