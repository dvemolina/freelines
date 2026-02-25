import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'com.freelines.app',
	appName: 'Freelines',
	webDir: 'build',
	// Bundled/native mode (no server.url): app loads local built assets on device.
	// If you want live-reload dev-server mode later, uncomment and set your laptop IP:
	// server: {
	// 	androidScheme: 'https',
	// 	iosScheme: 'capacitor',
	// 	url: 'http://172.20.10.4:5173',
	// 	cleartext: true
	// },
	plugins: {
		CapacitorHttp: {
			enabled: true
		}
	}
};

export default config;
