import adapterNode from '@sveltejs/adapter-node';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const isMobileBuild = process.env.BUILD_TARGET === 'mobile';

const adapter = isMobileBuild
	? adapterStatic({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			precompress: false,
			strict: false
		})
	: adapterNode({
			out: 'build',
			precompress: false,
			envPrefix: ''
		});

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter,
		csrf: isMobileBuild ? { trustedOrigins: ['capacitor://localhost', 'https://localhost'] } : {}
	}
};

export default config;
