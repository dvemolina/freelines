import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAdmin } from '$lib/server/admin';

export const GET: RequestHandler = async ({ locals }) => {
	return json({
		isAdmin: !!locals.user && isAdmin(locals.user.email)
	});
};
