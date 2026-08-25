import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	// GLSL lives in .glsl files so shaders stay readable and lintable.
	assetsInclude: ['**/*.glsl'],
	server: { port: 5173 }
});
