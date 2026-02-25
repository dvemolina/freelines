import { db } from '$lib/server/db';
import { lines, runs } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { LineMatchResult } from '$lib/types';

const EARTH_RADIUS_M = 6_371_000;
const MATCH_THRESHOLD = 0.7;
const CANDIDATE_RADIUS_M = 500; // search radius for candidate lines

// Scoring weights (total = 1.0)
// Without path similarity (Phase 3+), we redistribute the 35% path weight
const WEIGHT_START = 0.35;
const WEIGHT_END = 0.30;
const WEIGHT_VERTICAL = 0.35;

/** Haversine distance between two lat/lng points in meters */
function haversine(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number
): number {
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
	return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

function toRad(deg: number): number {
	return (deg * Math.PI) / 180;
}

/** Score proximity: 1.0 if within threshold, linear decay to 0.0 at 3x threshold */
function proximityScore(distanceM: number, thresholdM: number): number {
	if (distanceM <= thresholdM) return 1.0;
	const maxDist = thresholdM * 3;
	if (distanceM >= maxDist) return 0.0;
	return 1.0 - (distanceM - thresholdM) / (maxDist - thresholdM);
}

/** Score vertical drop similarity: 1.0 if within 10%, linear decay */
function verticalDropScore(runDrop: number, lineDrop: number): number {
	if (lineDrop === 0) return runDrop === 0 ? 1.0 : 0.0;
	const ratio = Math.abs(runDrop - lineDrop) / lineDrop;
	if (ratio <= 0.1) return 1.0;
	if (ratio >= 0.5) return 0.0;
	return 1.0 - (ratio - 0.1) / 0.4;
}

interface RunData {
	startLat: number;
	startLng: number;
	endLat: number;
	endLng: number;
	verticalDropMeters: number;
}

/**
 * Find the best matching line for a run.
 * Returns null if no line meets the confidence threshold.
 */
export async function matchRunToLine(run: RunData): Promise<LineMatchResult | null> {
	// Get all approved lines (for now, without PostGIS spatial index)
	// TODO: When dataset grows, use PostGIS ST_DWithin for spatial filtering
	const candidateLines = await db
		.select()
		.from(lines)
		.where(eq(lines.status, 'approved'));

	if (candidateLines.length === 0) return null;

	let bestMatch: LineMatchResult | null = null;
	let bestScore = 0;

	for (const line of candidateLines) {
		const startDist = haversine(
			run.startLat,
			run.startLng,
			Number(line.startLat),
			Number(line.startLng)
		);

		// Quick reject: if start point is too far, skip
		if (startDist > CANDIDATE_RADIUS_M) continue;

		const endDist = haversine(
			run.endLat,
			run.endLng,
			Number(line.endLat),
			Number(line.endLng)
		);

		// Quick reject: if end point is way too far
		if (endDist > CANDIDATE_RADIUS_M) continue;

		const startScore = proximityScore(startDist, 100); // 100m threshold
		const endScore = proximityScore(endDist, 150); // 150m threshold
		const vertScore = verticalDropScore(run.verticalDropMeters, line.verticalDrop);

		const totalScore =
			WEIGHT_START * startScore +
			WEIGHT_END * endScore +
			WEIGHT_VERTICAL * vertScore;

		if (totalScore > bestScore) {
			bestScore = totalScore;
			bestMatch = {
				lineId: line.id,
				lineName: line.name,
				confidence: Math.round(totalScore * 100) / 100,
				pathDeviation: Math.round((startDist + endDist) / 2)
			};
		}
	}

	if (!bestMatch || bestMatch.confidence < MATCH_THRESHOLD) return null;

	return bestMatch;
}

/**
 * Apply a match result to a run record and increment the line's run count.
 */
export async function applyMatch(runId: string, match: LineMatchResult): Promise<void> {
	await db
		.update(runs)
		.set({
			lineId: match.lineId,
			matchConfidence: String(match.confidence),
			pathDeviation: match.pathDeviation
		})
		.where(eq(runs.id, runId));

	await db
		.update(lines)
		.set({
			runCount: sql`COALESCE(${lines.runCount}, 0) + 1`,
			updatedAt: new Date()
		})
		.where(eq(lines.id, match.lineId));
}
