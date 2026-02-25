import { config } from '$lib/config';

interface FetchOptions extends RequestInit {
	params?: Record<string, string>;
}

export async function apiClient<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
	const { params, ...fetchOptions } = options;

	let url = `${config.apiUrl}/api${endpoint}`;

	if (params) {
		const searchParams = new URLSearchParams(params);
		url += `?${searchParams.toString()}`;
	}

	const headers: HeadersInit = {
		'Content-Type': 'application/json',
		...fetchOptions.headers
	};

	const response = await fetch(url, {
		...fetchOptions,
		headers,
		credentials: 'include'
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ message: 'Request failed' }));
		throw new Error(error.message || `HTTP ${response.status}`);
	}

	return response.json();
}

export const api = {
	get: <T>(endpoint: string, params?: Record<string, string>) =>
		apiClient<T>(endpoint, { method: 'GET', params }),

	post: <T>(endpoint: string, data: unknown) =>
		apiClient<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),

	put: <T>(endpoint: string, data: unknown) =>
		apiClient<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),

	patch: <T>(endpoint: string, data: unknown) =>
		apiClient<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),

	delete: <T>(endpoint: string) => apiClient<T>(endpoint, { method: 'DELETE' })
};
