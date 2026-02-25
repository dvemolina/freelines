import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { lines } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { isAdmin } from '$lib/server/admin';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		error(401, 'Not authenticated');
	}
	if (!isAdmin(locals.user.email)) {
		error(403, 'Admin access required');
	}

	const status = url.searchParams.get('status') ?? 'pending';

	const result = await db
		.select()
		.from(lines)
		.where(eq(lines.status, status))
		.orderBy(desc(lines.createdAt));

	return json({ lines: result });
};
