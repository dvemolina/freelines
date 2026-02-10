import { pgTable, uuid, text, integer, decimal, timestamp, unique, index } from 'drizzle-orm/pg-core';

export * from './auth.schema';

// ── Runs ────────────────────────────────────────────────────────────────────

export const runs = pgTable(
	'runs',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id').notNull(),

		lineId: uuid('line_id'),

		startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
		endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),
		recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),

		durationSeconds: integer('duration_seconds').notNull(),
		distanceMeters: integer('distance_meters').notNull(),
		verticalDropMeters: integer('vertical_drop_meters').notNull(),
		maxSpeedKmh: decimal('max_speed_kmh', { precision: 5, scale: 2 }),
		avgSpeedKmh: decimal('avg_speed_kmh', { precision: 5, scale: 2 }),

		startLat: decimal('start_lat', { precision: 10, scale: 8 }).notNull(),
		startLng: decimal('start_lng', { precision: 11, scale: 8 }).notNull(),
		startElevation: integer('start_elevation'),
		endLat: decimal('end_lat', { precision: 10, scale: 8 }).notNull(),
		endLng: decimal('end_lng', { precision: 11, scale: 8 }).notNull(),
		endElevation: integer('end_elevation'),

		matchConfidence: decimal('match_confidence', { precision: 3, scale: 2 }),
		pathDeviation: integer('path_deviation'),

		notes: text('notes'),
		conditions: text('conditions'),
		visibility: text('visibility'),

		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('idx_runs_user_date').on(t.userId, t.recordedAt),
		index('idx_runs_line').on(t.lineId, t.recordedAt)
	]
);

// ── Run Points ──────────────────────────────────────────────────────────────

export const runPoints = pgTable(
	'run_points',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		runId: uuid('run_id')
			.notNull()
			.references(() => runs.id, { onDelete: 'cascade' }),

		sequence: integer('sequence').notNull(),
		lat: decimal('lat', { precision: 10, scale: 8 }).notNull(),
		lng: decimal('lng', { precision: 11, scale: 8 }).notNull(),
		elevation: integer('elevation'),
		accuracy: decimal('accuracy', { precision: 5, scale: 2 }),
		speedKmh: decimal('speed_kmh', { precision: 5, scale: 2 }),

		recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull()
	},
	(t) => [
		unique('uq_run_points_run_seq').on(t.runId, t.sequence),
		index('idx_run_points_run_seq').on(t.runId, t.sequence)
	]
);
