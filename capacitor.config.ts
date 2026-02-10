import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'com.freelines.app',
	appName: 'Freelines',
	webDir: 'build',
	server: {
		androidScheme: 'https',
		iosScheme: 'capacitor'
		// For development: point to your dev server
		// url: 'http://YOUR_LOCAL_IP:5173',
		// cleartext: true
	},
	plugins: {
		CapacitorHttp: {
			enabled: true
		}
	}
};

export default config;
