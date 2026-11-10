# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev`: Vite dev server with HMR at http://localhost:5173/
- `npm run build`: type-checks (`tsc -b`, project references in `tsconfig.app.json` / `tsconfig.node.json`), then runs the production build into `dist/`
- `npm run lint`: ESLint (flat config with typescript-eslint, react-hooks and react-refresh rules)
- `npm run preview`: serves the built `dist/`

There is no test runner set up yet.

## Project

This is an early-stage React 19 + TypeScript + Vite app. Right now the user pastes the raw JSON of a Runkeeper activity into a textarea (`JsonInput`), and `App.tsx` holds it as a string in state. Nothing parses or displays the data yet.

### Input data format

The data comes from Runkeeper's `https://runkeeper.com/ajax/pointData?tripUuid=<uuid>` endpoint (noted in `rdme.txt`). `example.json` (about 180 points, a 16-minute run) and `example-big.json` (about 2,300 points, a 2.5-hour run) are real samples to use for development and testing. The top-level object contains:

- `points[]`: the GPS track. Each point has `latitude`, `longitude`, `altitude`, `accuracy`, `timestamp` (ms since start), `deltaTime`, `deltaDistance` (meters), `deltaPause` and `type`. `type` is one of `StartPoint`, `TripPoint`, `PausePoint`, `ResumePoint` or `EndPoint`, so any pace or duration calculation has to account for pauses.
- Summary stats stored as **strings**: `statsDistance` (km), `statsSpeed`, `statsPace`, `statsElevation`, `statsCalories`, `statsDuration` (e.g. `"16:12"`). `unAdulteratedStatsDuration` is the duration in seconds as a number.
- `activityType` (e.g. `"RUN"`), `distanceSplits`, `trainingSplits`, `chartData`, `feedData`.

## Conventions

- Components live in `src/components/<Name>/index.tsx` and export a named function. Styles sit next to them in `style.module.css` (CSS Modules), imported as `styles`.
- Components are controlled: the parent owns the state and passes `value` and `onChange`.
- The TS config enables `verbatimModuleSyntax` (use `import type` for type-only imports), `erasableSyntaxOnly` (no `enum`s or parameter properties), and `noUnusedLocals` / `noUnusedParameters`.
