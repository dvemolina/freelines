# Freelines

Freelines is a freeride GPS tracker and logbook experiment for skiers who want to record lines, compare them with known routes and keep a personal history of runs.

The project is still in active prototype/work-in-progress state. It is not a safety tool and does not replace mountain judgment, avalanche education, local knowledge or professional guiding.

## What it does

- Tracks a ski/freeride run from the browser or a Capacitor mobile shell.
- Uses background geolocation on native builds and browser geolocation on web.
- Saves tracking progress locally so a session can recover from app/browser interruptions.
- Stores runs, run points and known freeride lines in PostgreSQL through Drizzle.
- Matches recorded runs against approved known lines using start/end proximity and vertical-drop similarity.
- Includes public line pages, run history, profile routes and admin routes for line management.

## Stack

- SvelteKit + Svelte 5
- TypeScript
- Tailwind CSS
- Capacitor + background geolocation
- MapLibre GL
- PostgreSQL + Drizzle ORM
- Better Auth
- Vite / Svelte check / ESLint / Prettier

## Main domain model

The database currently centers on three records:

- `lines`: known freeride lines with location, start/end points, elevation, difficulty, exposure and moderation status.
- `runs`: recorded user runs with timing, distance, vertical drop, speed, notes, conditions and optional matched line.
- `run_points`: ordered GPS points attached to a run.

The matching service currently scores candidate lines by:

- start-point proximity;
- end-point proximity;
- vertical-drop similarity.

It is intentionally simple for now. A real production version would need better path similarity, map editing, moderation, privacy controls and stronger mountain-safety boundaries.

## Local setup

Install dependencies:

```bash
pnpm install
```

Copy environment variables:

```bash
cp .env.example .env
```

Start the database:

```bash
pnpm db:start
```

Push or migrate the schema:

```bash
pnpm db:push
# or
pnpm db:migrate
```

Seed line/run data if needed:

```bash
pnpm db:seed
pnpm db:seed:runs
```

Run the app:

```bash
pnpm dev
```

## Useful commands

```bash
pnpm check
pnpm lint
pnpm build
pnpm build:mobile
pnpm cap:ios
pnpm cap:android
pnpm db:studio
```

## Current status

Freelines is a personal product/technical experiment, not a polished public service yet. The interesting parts are the GPS tracking workflow, offline/local session persistence, line/run data model, map-oriented UI and the first pass at route matching.
