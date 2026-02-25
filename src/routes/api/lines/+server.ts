import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { lines, runs } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
	const approvedLines = await db
		.select()
		.from(lines)
		.where(eq(lines.status, 'approved'));

	return json({ lines: approvedLines });
};

function slugify(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		error(401, 'Not authenticated');
	}

	const body = await request.json();
	const { runId, name, description, type, difficulty, exposure } = body as {
		runId: string;
		name: string;
		description?: string;
		type: string;
		difficulty: number;
		exposure: string;
	};

	if (!name || !name.trim()) {
		error(400, 'Line name is required');
	}
	if (!type) {
		error(400, 'Line type is required');
	}
	if (!difficulty || difficulty < 1 || difficulty > 5) {
		error(400, 'Difficulty must be between 1 and 5');
	}
	if (!exposure) {
		error(400, 'Exposure is required');
	}

	// Fetch the run to get geographic data
	const [run] = await db
		.select()
		.from(runs)
		.where(eq(runs.id, runId));

	if (!run) {
		error(404, 'Run not found');
	}

	if (run.userId !== locals.user.id) {
		error(403, 'Not your run');
	}

	const nameSlug = slugify(name.trim());

	const [line] = await db
		.insert(lines)
		.values({
			name: name.trim(),
			nameSlug,
			description: description?.trim() || null,
			country: 'Unknown',
			startLat: run.startLat,
			startLng: run.startLng,
			startElevation: run.startElevation ?? 0,
			endLat: run.endLat,
			endLng: run.endLng,
			endElevation: run.endElevation ?? 0,
			verticalDrop: run.verticalDropMeters,
			distance: run.distanceMeters,
			difficulty,
			type,
			exposure,
			status: 'pending',
			submittedBy: locals.user.id,
			runCount: 1
		})
		.returning();

	// Link the run to this new line
	await db
		.update(runs)
		.set({ lineId: line.id, matchConfidence: '1.00', pathDeviation: 0 })
		.where(eq(runs.id, runId));

	return json({ line });
};
