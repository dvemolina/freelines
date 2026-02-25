# Database Schema

## Overview

PostgreSQL 16+ with PostGIS 3.4+ extension for geographic queries.

ORM: Drizzle. Schema source of truth: `src/lib/server/db/schema.ts`.

## Tables

### Auth tables (managed by better-auth)

Tables `user`, `session`, `account`, `verification` are generated and managed by
better-auth via `pnpm auth:schema`. See `src/lib/server/db/auth.schema.ts`.

User IDs are `text` (not UUID) — better-auth generates its own IDs.

### runs

Drizzle definition in `src/lib/server/db/schema.ts`.

```sql
CREATE TABLE runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id TEXT NOT NULL,  -- references better-auth user.id
  line_id UUID,           -- references lines.id

  -- Timing
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Calculated stats
  duration_seconds INTEGER NOT NULL,
  distance_meters INTEGER NOT NULL,
  vertical_drop_meters INTEGER NOT NULL,
  max_speed_kmh DECIMAL(5, 2),
  avg_speed_kmh DECIMAL(5, 2),

  -- Geographic
  start_lat DECIMAL(10, 8) NOT NULL,
  start_lng DECIMAL(11, 8) NOT NULL,
  start_elevation INTEGER,
  end_lat DECIMAL(10, 8) NOT NULL,
  end_lng DECIMAL(11, 8) NOT NULL,
  end_elevation INTEGER,

  -- Line matching
  match_confidence DECIMAL(3, 2),  -- 0.00-1.00
  path_deviation INTEGER,          -- meters

  -- User notes
  notes TEXT,
  conditions TEXT,   -- 'powder' | 'crud' | 'ice' | 'spring'
  visibility TEXT,   -- 'clear' | 'flat_light' | 'whiteout'

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_runs_user_date ON runs(user_id, recorded_at);
CREATE INDEX idx_runs_line ON runs(line_id, recorded_at);
```

### run_points

```sql
CREATE TABLE run_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,

  sequence INTEGER NOT NULL,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  elevation INTEGER,
  accuracy DECIMAL(5, 2),
  speed_kmh DECIMAL(5, 2),

  recorded_at TIMESTAMPTZ NOT NULL,

  UNIQUE(run_id, sequence)
);

CREATE INDEX idx_run_points_run_seq ON run_points(run_id, sequence);
```

### lines

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name TEXT NOT NULL UNIQUE,
  name_slug TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Location
  resort TEXT,
  area TEXT,
  country TEXT NOT NULL,

  -- Geographic reference (the canonical path)
  reference_path GEOGRAPHY(LINESTRING, 4326),

  -- Start/end points
  start_lat DECIMAL(10, 8) NOT NULL,
  start_lng DECIMAL(11, 8) NOT NULL,
  start_elevation INTEGER NOT NULL,
  end_lat DECIMAL(10, 8) NOT NULL,
  end_lng DECIMAL(11, 8) NOT NULL,
  end_elevation INTEGER NOT NULL,

  -- Stats
  vertical_drop INTEGER NOT NULL,
  distance INTEGER NOT NULL,

  -- Classification
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  type TEXT NOT NULL,      -- 'couloir' | 'face' | 'bowl' | 'tree_run' | 'ridge'
  exposure TEXT NOT NULL,  -- 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'

  -- Moderation
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  submitted_by TEXT,   -- references user.id
  approved_by TEXT,    -- references user.id

  -- Metadata
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lines_reference_path ON lines USING GIST(reference_path);
CREATE INDEX idx_lines_start_point ON lines USING GIST(
  ST_SetSRID(ST_MakePoint(start_lng, start_lat), 4326)::geography
);
CREATE INDEX idx_lines_status ON lines(status);
```

## Common Queries

### Get user's runs

```sql
SELECT *
FROM runs
WHERE user_id = $userId
ORDER BY recorded_at DESC;
```

### Get GPS points for a run

```sql
SELECT lat, lng, elevation, speed_kmh, recorded_at
FROM run_points
WHERE run_id = $runId
ORDER BY sequence ASC;
```

### Find nearby lines for matching

```sql
SELECT * FROM lines
WHERE ST_DWithin(
  ST_SetSRID(ST_MakePoint(start_lng, start_lat), 4326)::geography,
  ST_SetSRID(ST_MakePoint($userLng, $userLat), 4326)::geography,
  200  -- 200 meters
)
AND status = 'approved';
```

### Calculate path similarity (planned — PostGIS)

```sql
SELECT ST_FrechetDistance(
  (SELECT reference_path FROM lines WHERE id = $lineId),
  ST_GeomFromText($runPathWKT, 4326)
) as frechet_distance;
```

## Migrations

Schema is managed with Drizzle Kit:

```bash
pnpm db:generate   # Generate migration SQL from schema changes
pnpm db:push       # Push schema directly to DB (dev)
pnpm db:migrate    # Run generated migrations (production)
pnpm db:studio     # Open Drizzle Studio GUI
```
