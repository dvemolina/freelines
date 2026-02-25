import { pgTable, uuid, text, integer, decimal, timestamp, unique, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export * from './auth.schema';

// ── Lines ───────────────────────────────────────────────────────────────────

export const lines = pgTable(
	'lines',
	{
		id: uuid('id').primaryKey().defaultRandom(),

		// Identity
		name: text('name').notNull().unique(),
		nameSlug: text('name_slug').notNull().unique(),
		description: text('description'),

		// Location
		resort: text('resort'),
		area: text('area'),
		country: text('country').notNull(),

		// Start/end points
		startLat: decimal('start_lat', { precision: 10, scale: 8 }).notNull(),
		startLng: decimal('start_lng', { precision: 11, scale: 8 }).notNull(),
		startElevation: integer('start_elevation').notNull(),
		endLat: decimal('end_lat', { precision: 10, scale: 8 }).notNull(),
		endLng: decimal('end_lng', { precision: 11, scale: 8 }).notNull(),
		endElevation: integer('end_elevation').notNull(),

		// Stats
		verticalDrop: integer('vertical_drop').notNull(),
		distance: integer('distance').notNull(),

		// Classification
		difficulty: integer('difficulty').notNull(),
		type: text('type').notNull(), // 'couloir' | 'face' | 'bowl' | 'tree_run' | 'ridge'
		exposure: text('exposure').notNull(), // 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'

		// Moderation
		status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
		submittedBy: text('submitted_by'),
		approvedBy: text('approved_by'),

		// Metadata
		runCount: integer('run_count').default(0),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
	},
	(t) => [
		index('idx_lines_status').on(t.status),
		check('difficulty_range', sql`${t.difficulty} BETWEEN 1 AND 5`)
	]
);

// ── Runs ────────────────────────────────────────────────────────────────────

export const runs = pgTable(
	'runs',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id').notNull(),

		lineId: uuid('line_id').references(() => lines.id),

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
