import { Capacitor } from '@capacitor/core';

export const IS_MOBILE_APP =
	typeof window !== 'undefined' && Capacitor.isNativePlatform();

const explicitApiBase = (import.meta.env.PUBLIC_API_BASE_URL ?? '').trim();

// Priority:
// 1) Explicit env override (works for local/mobile testing)
// 2) Dev mode: same-origin API (/api/*)
// 3) Production fallback for native app
export const API_BASE_URL = explicitApiBase
	? explicitApiBase
	: import.meta.env.DEV
		? ''
		: IS_MOBILE_APP
			? 'https://api.freelines.app'
			: '';

export const config = {
	apiUrl: API_BASE_URL,
	isMobile: IS_MOBILE_APP,
	isDev: import.meta.env.DEV
};
