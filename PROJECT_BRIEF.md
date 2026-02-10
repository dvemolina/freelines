# Freelines - Project Brief

## Vision
Strava for freeriders. Record and share your gnarliest ski lines.

## Problem
Freeride skiers have no good way to log off-piste descents. Existing apps (Slopes, Strava) don't capture freeride culture or match runs to named lines.

## Solution
Mobile app that tracks GPS descents, automatically matches them to known lines (couloirs, faces, bowls), and builds your personal logbook.

## Core Concepts

### Lines (Static Routes)
Named geographic features that exist on the mountain.
- Example: "Northwest Couloir - Tête des Établons"
- Like Strava segments
- Community-submitted, admin-approved
- Have reference GPS path, difficulty, stats

### Runs (User Activity)  
Individual tracked descents.
- "I skied [Line Name] on [Date]"
- Contains GPS track, stats, conditions
- Automatically matched to lines (if confidence > 0.7)
- Can propose new line if no match

## Target Users
Advanced/expert skiers who regularly ski off-piste, ages 25-45, already use Strava/tracking apps.

## MVP Features (Ship by End of Season)
1. ✅ Record GPS track while skiing (background tracking)
2. ✅ Automatic stats (vertical, speed, distance)
3. ✅ Save and name your run
4. ✅ Auto-match to existing lines
5. ✅ View your run logbook
6. ✅ Propose new lines (admin approval)

## Must NOT Have in V1
- Social features (likes, comments, following)
- Photos/videos
- Route planning
- Competitions/leaderboards
- Ascent tracking

## Success Metrics
- 50 active users logging lines weekly (by end of season)
- 20% of users log 5+ lines
- 30% retention after first line logged

## Tech Stack
- SvelteKit + Svelte 5
- Capacitor (native mobile)
- PostgreSQL + PostGIS
- Drizzle ORM
- MapLibre GL JS