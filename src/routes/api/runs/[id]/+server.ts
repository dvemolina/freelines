import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { runs, runPoints, lines } from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		error(401, 'Not authenticated');
	}

	// Fetch run with line name
	const [run] = await db
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
		.where(and(eq(runs.id, params.id), eq(runs.userId, locals.user.id)));

	if (!run) {
		error(404, 'Run not found');
	}

	// Fetch GPS points ordered by sequence
	const points = await db
		.select({
			sequence: runPoints.sequence,
			lat: runPoints.lat,
			lng: runPoints.lng,
			elevation: runPoints.elevation,
			accuracy: runPoints.accuracy,
			speedKmh: runPoints.speedKmh,
			recordedAt: runPoints.recordedAt
		})
		.from(runPoints)
		.where(eq(runPoints.runId, params.id))
		.orderBy(asc(runPoints.sequence));

	return json({ run, points });
};
