import { createAuthClient } from 'better-auth/svelte';
import { config } from '$lib/config';

export const auth = createAuthClient({
	baseURL: config.apiUrl || window.location.origin
});
