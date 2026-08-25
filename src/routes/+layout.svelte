<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import ExperienceCanvas from '$components/ExperienceCanvas.svelte';
	import Navigation from '$components/Navigation.svelte';
	import Footer from '$components/Footer.svelte';

	let { children } = $props();

	/**
	 * ?debug=1 exposes experience state, act, camera and frame timing.
	 * Read on the client only — every route is prerendered, and prerendered
	 * pages have no meaningful query string at build time.
	 */
	let debug = $state(false);
	onMount(() => {
		debug = new URLSearchParams(window.location.search).get('debug') === '1';
	});
</script>

<a class="skip-link" href="#main">Skip to content</a>

<ExperienceCanvas {debug} />

<Navigation />

<main id="main">
	{@render children()}
</main>

<Footer />

<style>
	main {
		position: relative;
		z-index: 1;
	}
</style>
