# System Architecture

## High-Level Design
```
┌─────────────────────────────────────────┐
│         Mobile App (Capacitor)          │
│  ┌───────────────────────────────────┐  │
│  │   SvelteKit Frontend              │  │
│  │   - Svelte 5 components           │  │
│  │   - File-based routing            │  │
│  │   - SSR + CSR                     │  │
│  └───────────────────────────────────┘  │
│                  ↕                       │
│  ┌───────────────────────────────────┐  │
│  │   Native Layer (Capacitor)        │  │
│  │   - Background Geolocation        │  │
│  │   - Filesystem                    │  │
│  │   - Preferences                   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                   ↕
            HTTPS / REST API
                   ↕
┌─────────────────────────────────────────┐
│           Backend (SvelteKit)           │
│  ┌───────────────────────────────────┐  │
│  │   API Routes (+server.ts)         │  │
│  │   - /api/runs                     │  │
│  │   - /api/lines                    │  │
│  │   - /api/auth                     │  │
│  └───────────────────────────────────┘  │
│                  ↕                       │
│  ┌───────────────────────────────────┐  │
│  │   Business Logic (services/)      │  │
│  │   - LineMatcher                   │  │
│  │   - StatsCalculator               │  │
│  │   - GeoUtils                      │  │
│  └───────────────────────────────────┘  │
│                  ↕                       │
│  ┌───────────────────────────────────┐  │
│  │   Data Layer (Drizzle ORM)        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                   ↕
┌─────────────────────────────────────────┐
│      PostgreSQL + PostGIS               │
│   - lines (reference routes)            │
│   - runs (user activity)                │
│   - run_points (GPS data)               │
│   - users (auth)                        │
└─────────────────────────────────────────┘
```

## Data Model

See `/docs/DATABASE.md` for complete schema.

**Key Relationships:**
- User → has many → Runs
- Line → has many → Runs (when matched)
- Run → has many → RunPoints (GPS coordinates)
- Run → may reference → Line (via line matching)

## GPS Tracking Flow
```
1. User taps "Start Run"
   ↓
2. Request location permissions
   ↓
3. Start BackgroundGeolocation watcher
   - Records point every ~2 seconds OR every 5 meters
   - Filters points with accuracy > 50m
   - Saves to IndexedDB every 10 points (crash recovery)
   ↓
4. User can lock screen / switch apps (tracking continues)
   ↓
5. User taps "Stop"
   ↓
6. Calculate stats from all GPS points
   - Total distance (haversine)
   - Vertical drop (elevation difference)
   - Max/avg speed
   - Duration
   ↓
7. Match to existing Lines
   - Query nearby lines (PostGIS spatial query)
   - Score each candidate (start/end proximity, path similarity)
   - If confidence > 0.7, auto-match
   ↓
8. Save Run to database
   - Create run record
   - Bulk insert GPS points
   - Update line.runCount if matched
   ↓
9. Show result to user
   - "You skied [Line Name]!" if matched
   - "Propose new line?" if no match
```

## Line Matching Algorithm
```typescript
Scoring criteria (0.0 - 1.0):
- Start point proximity (25%): within 100m = 1.0
- End point proximity (20%): within 150m = 1.0  
- Vertical drop match (20%): within 10% = 1.0
- Path similarity (35%): Fréchet distance < 50m = 1.0

Match threshold: 0.7 (70% confidence)
```

## Offline Support

**During Tracking:**
- GPS works completely offline (no network needed)
- Save points to IndexedDB every 10 points
- Show stats in real-time

**After Tracking:**
- Keep run in IndexedDB until uploaded
- Retry upload when network returns (Background Sync API)
- Show pending runs in UI

## Security

**Authentication:**
- Session-based auth (Lucia)
- HTTP-only cookies
- CSRF protection

**Authorization:**
- Users can only view/edit their own runs
- Line proposals require admin approval
- Admin role for line moderation

## Performance Considerations

**GPS Points:**
- ~120 points per minute at 2-second intervals
- 10-minute run = ~1,200 points
- Store compressed in database (PostGIS handles this)

**Spatial Queries:**
- PostGIS indexes on line geometry
- Limit candidate lines to 200m radius
- Lazy-load GPS points (only when viewing run detail)

**Map Rendering:**
- Simplify GPS track for display (Douglas-Peucker algorithm)
- Render max 500 points on map
- Use vector tiles for base layer