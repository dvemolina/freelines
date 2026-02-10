import { Capacitor } from '@capacitor/core';

export const IS_MOBILE_APP =
	typeof window !== 'undefined' && Capacitor.isNativePlatform();

export const API_BASE_URL = IS_MOBILE_APP
	? 'https://api.freelines.app'
	: import.meta.env.DEV
		? ''
		: 'https://api.freelines.app';

export const config = {
	apiUrl: API_BASE_URL,
	isMobile: IS_MOBILE_APP,
	isDev: import.meta.env.DEV
};
