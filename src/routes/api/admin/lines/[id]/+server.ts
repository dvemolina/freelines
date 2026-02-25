import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { lines } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { isAdmin } from '$lib/server/admin';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		error(401, 'Not authenticated');
	}
	if (!isAdmin(locals.user.email)) {
		error(403, 'Admin access required');
	}

	const body = await request.json();
	const { action } = body as { action: 'approve' | 'reject' };

	if (action !== 'approve' && action !== 'reject') {
		error(400, 'Action must be "approve" or "reject"');
	}

	const [line] = await db.select().from(lines).where(eq(lines.id, params.id));

	if (!line) {
		error(404, 'Line not found');
	}

	const [updated] = await db
		.update(lines)
		.set({
			status: action === 'approve' ? 'approved' : 'rejected',
			approvedBy: locals.user.id,
			updatedAt: new Date()
		})
		.where(eq(lines.id, params.id))
		.returning();

	return json({ line: updated });
};
