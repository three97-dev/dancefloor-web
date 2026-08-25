import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * GitHub Pages serves this from a project subpath, so BASE_PATH is set in CI.
 * Locally it is empty and the site runs at the root.
 */
const base = process.env.BASE_PATH ?? '';

/** @type {import('@sveltejs/kit').Config} */
export default {
	preprocess: vitePreprocess(),
	kit: {
		// Every route is prerendered, so the whole site is static files. Copy
		// stays readable with JavaScript disabled, which is the point.
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			// Pages has no server, so unmatched paths fall back to the 404 page.
			fallback: '404.html',
			precompress: false,
			strict: true
		}),
		paths: { base },
		alias: {
			$experience: 'src/experience',
			$content: 'src/content',
			$components: 'src/components'
		}
	}
};
