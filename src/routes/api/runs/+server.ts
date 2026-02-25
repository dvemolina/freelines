import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { runs, runPoints, lines } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import type { GPSPoint } from '$lib/types';
import { matchRunToLine, applyMatch } from '$lib/server/services/line-matcher';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		error(401, 'Not authenticated');
	}

	const body = await request.json();

	const {
		points,
		startedAt,
		endedAt,
		durationSeconds,
		distanceMeters,
		verticalDropMeters,
		maxSpeedKmh,
		avgSpeedKmh,
		startLatitude,
		startLongitude,
		startElevation,
		endLatitude,
		endLongitude,
		endElevation,
		notes,
		conditions
	} = body as {
		points: GPSPoint[];
		startedAt: string;
		endedAt: string;
		durationSeconds: number;
		distanceMeters: number;
		verticalDropMeters: number;
		maxSpeedKmh: number;
		avgSpeedKmh: number;
		startLatitude: number;
		startLongitude: number;
		startElevation?: number;
		endLatitude: number;
		endLongitude: number;
		endElevation?: number;
		notes?: string;
		conditions?: string;
	};

	if (!points || points.length < 2) {
		error(400, 'At least 2 GPS points required');
	}

	// Insert the run
	const [run] = await db
		.insert(runs)
		.values({
			userId: locals.user.id,
			startedAt: new Date(startedAt),
			endedAt: new Date(endedAt),
			durationSeconds,
			distanceMeters,
			verticalDropMeters,
			maxSpeedKmh: String(maxSpeedKmh),
			avgSpeedKmh: String(avgSpeedKmh),
			startLat: String(startLatitude),
			startLng: String(startLongitude),
			startElevation: startElevation ? Math.round(startElevation) : null,
			endLat: String(endLatitude),
			endLng: String(endLongitude),
			endElevation: endElevation ? Math.round(endElevation) : null,
			notes: notes ?? null,
			conditions: conditions ?? null
		})
		.returning();

	// Batch insert GPS points
	const pointRows = points.map((p, i) => ({
		runId: run.id,
		sequence: i,
		lat: String(p.latitude),
		lng: String(p.longitude),
		elevation: p.elevation ? Math.round(p.elevation) : null,
		accuracy: p.accuracy ? String(p.accuracy) : null,
		speedKmh: p.speed !== null ? String(Math.round(p.speed * 3.6 * 100) / 100) : null,
		recordedAt: new Date(p.timestamp)
	}));

	// Insert in batches of 500 to avoid query size limits
	for (let i = 0; i < pointRows.length; i += 500) {
		await db.insert(runPoints).values(pointRows.slice(i, i + 500));
	}

	// Attempt line matching
	let match = null;
	try {
		match = await matchRunToLine({
			startLat: startLatitude,
			startLng: startLongitude,
			endLat: endLatitude,
			endLng: endLongitude,
			verticalDropMeters
		});

		if (match) {
			await applyMatch(run.id, match);
		}
	} catch (err) {
		// Line matching is non-critical — log but don't fail the save
		console.error('[LineMatcher]', err);
	}

	return json({ run, match });
};

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		error(401, 'Not authenticated');
	}

	const userRuns = await db
		.select({
			id: runs.id,
			userId: runs.userId,
			lineId: runs.lineId,
			lineName: lines.name,
			startedAt: runs.startedAt,
			endedAt: runs.endedAt,
			recordedAt: runs.recordedAt,
			durationSeconds: runs.durationSeconds,
			distanceMeters: runs.distanceMeters,
			verticalDropMeters: runs.verticalDropMeters,
			maxSpeedKmh: runs.maxSpeedKmh,
			avgSpeedKmh: runs.avgSpeedKmh,
			startLat: runs.startLat,
			startLng: runs.startLng,
			startElevation: runs.startElevation,
			endLat: runs.endLat,
			endLng: runs.endLng,
			endElevation: runs.endElevation,
			matchConfidence: runs.matchConfidence,
			pathDeviation: runs.pathDeviation,
			notes: runs.notes,
			conditions: runs.conditions,
			visibility: runs.visibility,
			createdAt: runs.createdAt
		})
		.from(runs)
		.leftJoin(lines, eq(runs.lineId, lines.id))
		.where(eq(runs.userId, locals.user.id))
		.orderBy(desc(runs.recordedAt));

	return json({ runs: userRuns });
};