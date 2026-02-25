import { env } from '$env/dynamic/private';

/**
 * Check if a user email is in the admin list.
 * Admins are defined via ADMIN_EMAILS env var (comma-separated).
 */
export function isAdmin(email: string | undefined): boolean {
	if (!email) return false;
	const adminEmails = env.ADMIN_EMAILS?.split(',').map((e) => e.trim().toLowerCase()) ?? [];
	return adminEmails.includes(email.toLowerCase());
}
