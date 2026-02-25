You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

---

## Project: Freelines — Freeride Ski Line Tracker

### Current State

**Phase 1 (GPS Tracking): DONE**
**Phase 2 (Database + Run Persistence): DONE**
**Phase 3 (Line Matching): DONE**
**Phase 3+ (Run Detail, Offline Queue, Propose Line, Browse Lines): DONE**
**Phase 4 (Line Management): DONE**
**Phase 5 (Polish & Navigation): DONE**

### Tech Stack

- **Frontend:** SvelteKit v2 + Svelte 5 (runes: `$state`, `$derived`)
- **Mobile:** Capacitor 8 with `@capacitor-community/background-geolocation`
- **Database:** PostgreSQL 16 + PostGIS 3.4 (via `postgis/postgis:16-3.4` Docker image)
- **ORM:** Drizzle ORM
- **Auth:** better-auth (email/password, session-based)
- **CSS:** Tailwind CSS 4
- **Build:** Dual adapter — `adapter-node` (VPS) / `adapter-static` (Capacitor)

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/services/gps-tracker.svelte.ts` | GPS tracker singleton (Svelte 5 runes, background geo) |
| `src/lib/services/storage.ts` | IndexedDB crash recovery (idb-keyval) |
| `src/lib/utils/geo.ts` | Haversine distance, stats computation |
| `src/lib/api/client.ts` | Environment-aware API fetch wrapper |
| `src/lib/config.ts` | API URL config (relative for VPS, absolute for mobile) |
| `src/lib/types/index.ts` | GPSPoint, TrackingStats, TrackingSession, Run, Line |
| `src/lib/server/db/schema.ts` | Drizzle schema: lines, runs, run_points |
| `src/lib/server/db/auth.schema.ts` | better-auth generated tables |
| `src/lib/server/db/seed-lines.ts` | Seed script for freeride lines (approved + pending) |
| `src/lib/server/db/seed-runs.ts` | Seed script for test runs with GPS points |
| `src/lib/server/services/line-matcher.ts` | Line matching: haversine scoring, apply match |
| `src/lib/server/admin.ts` | Admin check helper (env-based ADMIN_EMAILS) |
| `src/routes/api/runs/+server.ts` | POST (save run + match) + GET (list with line name) |
| `src/routes/api/lines/+server.ts` | GET approved lines, POST propose new line |
| `src/routes/api/lines/[slug]/+server.ts` | GET single line by slug + recent runs |
| `src/routes/api/runs/[id]/+server.ts` | GET single run + GPS points |
| `src/routes/track/+page.svelte` | Tracking UI: start → record → stop → save/discard/propose |
| `src/routes/runs/+page.svelte` | Run history list (clickable → detail) |
| `src/routes/runs/[id]/+page.svelte` | Run detail: map, stats, GPS track |
| `src/routes/lines/+page.svelte` | Browse approved freeride lines |
| `src/routes/lines/[slug]/+page.svelte` | Line detail: map, stats, recent runs |
| `src/lib/utils/map-style.ts` | Shared MapLibre style (satellite + topo overlay) |
| `src/routes/api/admin/check/+server.ts` | GET admin status check |
| `src/routes/api/admin/lines/+server.ts` | GET pending/approved/rejected lines (admin) |
| `src/routes/api/admin/lines/[id]/+server.ts` | PATCH approve/reject line (admin) |
| `src/routes/admin/lines/+page.svelte` | Admin line review UI with tabs |
| `src/lib/components/BottomNav.svelte` | Fixed bottom tab bar (Track, Runs, Lines, Profile) |
| `src/lib/auth-client.ts` | better-auth client instance for sign-out |
| `src/routes/api/profile/+server.ts` | GET user info + aggregate run stats + isAdmin |
| `src/routes/profile/+page.svelte` | Profile page: stats grid, admin link, sign out |
| `svelte.config.js` | Dual adapter: BUILD_TARGET=mobile → static, default → node |
| `capacitor.config.ts` | Capacitor config for iOS/Android |

### Build Commands

```bash
pnpm dev              # Dev server at localhost:5173
pnpm build            # VPS build (adapter-node → build/index.js)
pnpm build:mobile     # Mobile build (adapter-static → build/index.html + cap sync)
pnpm cap:ios          # Build + open Xcode
pnpm cap:android      # Build + open Android Studio
```

### Database Commands

```bash
docker compose up -d  # Start PostgreSQL + PostGIS
pnpm auth:schema      # Generate better-auth Drizzle tables
pnpm db:push          # Push schema to DB (dev)
pnpm db:seed          # Seed freeride lines (approved + pending)
pnpm db:seed:runs     # Seed test runs with GPS points
pnpm db:studio        # Open Drizzle Studio
```

### Architecture Notes

- GPS tracker uses `.svelte.ts` extension (required for runes outside components)
- `@capacitor-community/background-geolocation` has no JS entry point — registered via `registerPlugin()` from `@capacitor/core`
- API endpoints require auth (`locals.user`), return 401 if not authenticated
- Mobile CSRF: trusts `capacitor://localhost` and `https://localhost`
- GPS points inserted in batches of 500 to avoid query size limits
- Line matching runs after each run save (non-blocking — errors logged, don't fail save)
- Matching uses haversine distance in JS; PostGIS spatial queries planned for scale
- Maps use satellite + OpenTopoMap overlay (contour lines, terrain shading) via MapLibre GL JS
- Offline queue: failed saves queued in IndexedDB, auto-sync on next page load
- Users can propose new lines from unmatched runs (status: 'pending')
- Admin role via `ADMIN_EMAILS` env var (comma-separated); checked in `src/lib/server/admin.ts`
- Admin pages under `/admin/*` — gated by admin check on mount
- `$app/state` used instead of deprecated `$app/stores` for page params

### Reference Documentation

- `/docs/ARCHITECTURE.md` — System design, services, tracking flow
- `/docs/ROADMAP.md` — Phase checklist with completion status
- `/docs/DATABASE.md` — Schema and common queries
- `/PROJECT_BRIEF.md` — Product vision and requirements
