# System Architecture

## High-Level Design

```
┌─────────────────────────────────────────┐
│         Mobile App (Capacitor)          │
│  ┌───────────────────────────────────┐  │
│  │   SvelteKit Frontend (SPA)       │  │
│  │   - Svelte 5 components          │  │
│  │   - Client-side routing          │  │
│  │   - API client → VPS backend     │  │
│  └───────────────────────────────────┘  │
│                  ↕                       │
│  ┌───────────────────────────────────┐  │
│  │   Native Layer (Capacitor)        │  │
│  │   - Background Geolocation        │  │
│  │   - CapacitorHttp                 │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                   ↕
            HTTPS / REST API
                   ↕
┌─────────────────────────────────────────┐
│        VPS Backend (SvelteKit)          │
│  ┌───────────────────────────────────┐  │
│  │   API Routes (+server.ts)         │  │
│  │   - /api/runs (POST, GET)         │  │
│  │   - /api/runs/[id] (GET)          │  │
│  │   - /api/lines (GET, POST)        │  │
│  │   - /api/lines/[slug] (GET)       │  │
│  │   - /api/auth (better-auth)       │  │
│  └───────────────────────────────────┘  │
│                  ↕                       │
│  ┌───────────────────────────────────┐  │
│  │   Data Layer (Drizzle ORM)        │  │
│  │   - lines, runs, run_points       │  │
│  │   - auth tables (better-auth)     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                   ↕
┌─────────────────────────────────────────┐
│      PostgreSQL + PostGIS               │
│   - lines (freeride line catalog)        │
│   - runs (user activity)                │
│   - run_points (GPS data)               │
│   - user, session, account (auth)       │
└─────────────────────────────────────────┘
```

## Dual Build System

One codebase produces two build targets:

| Command | Adapter | Output | Use |
|---------|---------|--------|-----|
| `pnpm build` | adapter-node | `build/index.js` | VPS: Node.js server with SSR + API routes |
| `pnpm build:mobile` | adapter-static | `build/index.html` | Capacitor: Static SPA |

Controlled by `BUILD_TARGET` env var in `svelte.config.js`.

## Data Model

See `/docs/DATABASE.md` for complete schema.

**Key Relationships:**

- User → has many → Runs
- Line → has many → Runs (when matched)
- Run → has many → RunPoints (GPS coordinates)
- Run → may reference → Line (via auto-matching or user proposal)

## GPS Tracking Flow

```
1. User taps "Start Tracking"
   ↓
2. Request location permissions
   ↓
3. Start BackgroundGeolocation watcher (native)
   OR navigator.geolocation.watchPosition (web fallback)
   - Filters points with accuracy > 50m
   - Filters points < 5m from previous point
   - Saves to IndexedDB every 10 points (crash recovery)
   ↓
4. User can lock screen / switch apps (native only)
   ↓
5. User taps "Stop Tracking"
   ↓
6. UI shows stats + "Save Run" / "Discard" buttons
   ↓
7. User taps "Save Run"
   - POST /api/runs with points + stats
   - Server inserts run record
   - Server batch inserts GPS points (500 per batch)
   - Server runs line matching (non-blocking)
   - Clears IndexedDB crash recovery data
   - If offline: queued in IndexedDB for later sync
   ↓
8. Success → shows match result + link to /runs/{id} detail
```

## Authentication

- **Library:** better-auth with email/password
- **Session:** Cookie-based, HTTP-only
- **Server hook:** `hooks.server.ts` populates `event.locals.user`
- **API protection:** Endpoints check `locals.user`, return 401 if missing
- **Mobile CSRF:** Trusts `capacitor://localhost` and `https://localhost` origins

## Key Services

### GPS Tracker (`src/lib/services/gps-tracker.svelte.ts`)

Closure-based singleton using Svelte 5 runes for reactivity.

- `$state` for points array, tracking status, startedAt
- `$derived` for real-time stats (distance, speed, vertical drop)
- Native: `@capacitor-community/background-geolocation` via `registerPlugin()`
- Web: `navigator.geolocation.watchPosition()` fallback
- Crash recovery: `idb-keyval` for IndexedDB persistence

### Storage (`src/lib/services/storage.ts`)

IndexedDB wrapper using `idb-keyval` for crash recovery and offline run queue.

### API Client (`src/lib/api/client.ts`)

Environment-aware fetch wrapper:

- Dev/VPS: relative URLs (same server)
- Mobile native: absolute URL to `https://api.freelines.app`
- Always includes `credentials: 'include'` for auth cookies

### Geo Utils (`src/lib/utils/geo.ts`)

Pure functions: haversine distance, vertical drop, m/s→km/h, `computeStats()`.

## Line Matching Algorithm

```
Scoring criteria (0.0 - 1.0):
- Start point proximity (35%): haversine distance, linear decay within 500m
- End point proximity (30%): haversine distance, linear decay within 500m
- Vertical drop match (35%): percentage difference

Match threshold: 0.70 (70% confidence)
Candidate radius: 500m from start point (quick reject)
```

## Offline Support

**During Tracking:**

- GPS works completely offline (no network needed)
- Save points to IndexedDB every 10 points
- Show stats in real-time

**After Tracking:**

- If network fails on save, run is queued in IndexedDB (`QueuedRun`)
- On next visit to track page, queued runs auto-sync when online
- User can also manually trigger sync via "Sync now" button
- Queue count displayed as orange banner

## Performance Considerations

**GPS Points:**

- ~120 points per minute at 2-second intervals
- 10-minute run = ~1,200 points
- Batch insert in groups of 500

**Spatial Queries (Phase 3):**

- PostGIS indexes on line geometry
- Limit candidate lines to 200m radius

**Map Rendering:**

- MapLibre GL JS with satellite + OpenTopoMap topo overlay
- Shared style in `src/lib/utils/map-style.ts` (no API key needed)
- GPS track rendered as yellow polyline with start/end markers
- Run detail shows full GPS track; line detail shows start/end markers with dashed line
