import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { lines, runs } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params }) => {
	const [line] = await db
		.select()
		.from(lines)
		.where(and(eq(lines.nameSlug, params.slug), eq(lines.status, 'approved')));

	if (!line) {
		error(404, 'Line not found');
	}

	// Fetch recent runs for this line
	const recentRuns = await db
		.select({
			id: runs.id,
			recordedAt: runs.recordedAt,
			durationSeconds: runs.durationSeconds,
			maxSpeedKmh: runs.maxSpeedKmh,
			avgSpeedKmh: runs.avgSpeedKmh,
			conditions: runs.conditions
		})
		.from(runs)
		.where(eq(runs.lineId, line.id))
		.orderBy(desc(runs.recordedAt))
		.limit(10);

	return json({ line, runs: recentRuns });
};
