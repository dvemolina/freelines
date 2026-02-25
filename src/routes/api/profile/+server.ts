import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { runs } from '$lib/server/db/schema';
import { eq, sum, count } from 'drizzle-orm';
import { isAdmin } from '$lib/server/admin';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		error(401, 'Not authenticated');
	}

	const [agg] = await db
		.select({
			totalRuns: count(runs.id),
			totalVerticalMeters: sum(runs.verticalDropMeters),
			totalDistanceMeters: sum(runs.distanceMeters),
			totalDurationSeconds: sum(runs.durationSeconds)
		})
		.from(runs)
		.where(eq(runs.userId, locals.user.id));

	return json({
		user: {
			id: locals.user.id,
			name: locals.user.name,
			email: locals.user.email
		},
		stats: {
			totalRuns: Number(agg?.totalRuns ?? 0),
			totalVerticalMeters: Number(agg?.totalVerticalMeters ?? 0),
			totalDistanceMeters: Number(agg?.totalDistanceMeters ?? 0),
			totalDurationSeconds: Number(agg?.totalDurationSeconds ?? 0)
		},
		isAdmin: isAdmin(locals.user.email)
	});
};
