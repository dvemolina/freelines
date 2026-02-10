# Development Roadmap

## Phase 1: GPS Tracking (Week 1) 🔄 IN PROGRESS

**Goal:** Record a ski run with background GPS tracking

### Tasks
- [ ] Install Capacitor and configure for iOS/Android
- [ ] Set up background geolocation plugin
- [ ] Configure native permissions (iOS/Android)
- [ ] Create GPSTracker service
- [ ] Implement crash recovery (IndexedDB)
- [ ] Build tracking UI (start/stop)
- [ ] Calculate real-time stats
- [ ] Test on physical device with locked screen

**Deliverables:**
- User can start tracking
- App records GPS points in background (screen locked)
- Stats display in real-time
- Points saved locally for crash recovery

**Definition of Done:**
- App tested on real device while skiing
- Background tracking verified with locked screen
- Accuracy consistently < 50m
- No crashes during 15+ minute tracking session

---

## Phase 2: Database & Run Persistence (Week 2) ⏳ NEXT

**Goal:** Save runs to database, view run history

### Tasks
- [ ] Set up PostgreSQL with PostGIS extension
- [ ] Create database schema with Drizzle
- [ ] Build API endpoint: POST /api/runs
- [ ] Implement run save flow
- [ ] Create "Your Runs" list page
- [ ] Build run detail page with map
- [ ] Add offline queue (save when network returns)

**Deliverables:**
- Runs persist to database
- View list of all your runs
- Click run to see map + stats
- Offline runs upload when network returns

---

## Phase 3: Line Matching (Week 3) ⏳ PLANNED

**Goal:** Auto-match runs to existing lines

### Tasks
- [ ] Seed initial lines (manually add 5-10 famous Verbier lines)
- [ ] Implement LineMatcher service
- [ ] Write spatial queries (PostGIS)
- [ ] Calculate Fréchet distance for path similarity
- [ ] Show "You skied [Line Name]!" after recording
- [ ] Add "Propose new line" flow for unmatched runs

**Deliverables:**
- Runs automatically match to existing lines
- Confidence score displayed
- User can propose new line if no match

---

## Phase 4: Line Management (Week 4) ⏳ PLANNED

**Goal:** Admin can approve/reject line proposals

### Tasks
- [ ] Create admin role and auth
- [ ] Build line proposal review UI
- [ ] Implement approve/reject workflow
- [ ] Create public lines directory
- [ ] Add line detail pages
- [ ] Show run count per line

**Deliverables:**
- Admin dashboard for pending lines
- Approved lines browsable by all users
- Line pages show all runs on that line

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