# Development Roadmap

## Phase 1: GPS Tracking (Week 1) ✅ DONE

**Goal:** Record a ski run with background GPS tracking

### Tasks
- [x] Install Capacitor and configure for iOS/Android
- [x] Set up background geolocation plugin (`@capacitor-community/background-geolocation`)
- [x] Configure native permissions (iOS/Android) — in capacitor.config.ts
- [x] Create GPSTracker service (`src/lib/services/gps-tracker.svelte.ts`)
- [x] Implement crash recovery with IndexedDB (`src/lib/services/storage.ts`)
- [x] Build tracking UI with start/stop (`src/routes/track/+page.svelte`)
- [x] Calculate real-time stats via `$derived` (`src/lib/utils/geo.ts`)
- [x] Web fallback for browser development (navigator.geolocation)
- [ ] Test on physical device with locked screen (requires native build)

### Notes
- Tracker uses Svelte 5 runes (`$state`, `$derived`) in a closure-based singleton
- Background-geolocation plugin is native-only; registered via `registerPlugin()` (no JS entry point)
- Accuracy filter: >50m discarded, minimum 5m movement between points
- Crash recovery: saves to IndexedDB every 10 points

---

## Phase 2: Database & Run Persistence (Week 2) ✅ DONE

**Goal:** Save runs to database, view run history

### Tasks
- [x] Set up PostgreSQL with PostGIS extension (compose.yaml → `postgis/postgis:16-3.4`)
- [x] Create database schema with Drizzle (`runs`, `run_points` tables)
- [x] Build API endpoint: POST /api/runs (saves run + batch inserts GPS points)
- [x] Build API endpoint: GET /api/runs (list user's runs)
- [x] Implement save flow in tracking UI (Save Run / Discard after stop)
- [x] Create "My Runs" list page (`/runs`)
- [x] Configure dual build: adapter-node (VPS) + adapter-static (Capacitor)
- [x] Create API client helper (`src/lib/api/client.ts`)
- [x] Build run detail page with map (MapLibre GL, satellite + topo overlay)
- [x] Add offline queue (save when network returns)

### Notes
- Dual build via `BUILD_TARGET` env var in svelte.config.js
- `pnpm build` → Node.js server (VPS), `pnpm build:mobile` → static SPA (Capacitor)
- Auth via better-auth; API endpoints check `locals.user`
- Minimum 10 GPS points required to save a run (prevents empty records)
- GPS points inserted in batches of 500

---

## Phase 3: Line Matching (Week 3) ✅ DONE

**Goal:** Auto-match runs to existing lines

### Tasks
- [x] Create `lines` table in Drizzle schema (`src/lib/server/db/schema.ts`)
- [x] Seed initial lines — 8 famous freeride lines (`pnpm db:seed`)
- [x] Implement LineMatcher service (`src/lib/server/services/line-matcher.ts`)
- [x] Add matching step to POST /api/runs (match after save, non-blocking)
- [x] Show "You skied [Line Name]!" after recording
- [x] Show matched line name + confidence % in run history list
- [x] Add GET /api/lines endpoint
- [x] Add "Propose new line" flow for unmatched runs
- [ ] Add PostGIS reference_path column + Fréchet distance scoring

### Notes

- Line matching uses haversine distance in JS (no PostGIS spatial queries yet)
- Scoring: start proximity (35%), end proximity (30%), vertical drop (35%)
- Match threshold: 0.70 (70% confidence required)
- Candidate radius: 500m from start point (quick reject)
- Matching is non-critical — errors are logged but don't fail the save
- Seeded lines: Vallée Blanche, Bec des Rosses, Couloir des Cosmiques, Tortin, Col de la Chal, Pas de Chèvre, Nant Blanc Face, Olle Riksgränsen Bowl

### Deliverables

- [x] Runs automatically match to existing lines
- [x] Confidence score displayed
- [x] User can propose new line if no match (Phase 3+)

---

## Phase 4: Line Management (Week 4) ✅ DONE

**Goal:** Admin can approve/reject line proposals

### Tasks
- [x] Create admin role via `ADMIN_EMAILS` env var (`src/lib/server/admin.ts`)
- [x] Build admin line review UI (`/admin/lines`) with pending/approved/rejected tabs
- [x] Implement approve/reject API (`PATCH /api/admin/lines/[id]`)
- [x] Create public lines directory (`/lines`)
- [x] Add line detail pages (`/lines/[slug]`)
- [x] Show run count per line
- [x] Admin link on home page (conditionally visible)
- [x] Seed pending test lines (La Face de Bellevarde, Corbet's Couloir)

### Notes
- Admin is env-based: `ADMIN_EMAILS=email1@example.com,email2@example.com`
- Admin check endpoint: `GET /api/admin/check` (returns `{ isAdmin: boolean }`)
- Admin API endpoints gated by `isAdmin()` server-side check
- Approved lines visible in `/lines` browse page; pending/rejected only in admin

---

## Future Phases (Post-MVP)

### Phase 5: Social Features
- User profiles
- Follow other skiers
- Like/comment on runs
- Activity feed

### Phase 6: Safety Data
- Avalanche risk integration (avalanche.org API)
- Snow conditions per run
- Weather data

### Phase 7: Media
- Photo/video uploads per run
- Video embedding (YouTube, Vimeo)

### Phase 8: Monetization
- Pro tier: $4.99/month
- Advanced stats
- Export GPX
- Offline maps
