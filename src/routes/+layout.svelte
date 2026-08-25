<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import ExperienceCanvas from '$components/ExperienceCanvas.svelte';
	import Navigation from '$components/Navigation.svelte';
	import Footer from '$components/Footer.svelte';

	let { children } = $props();

	/**
	 * ?debug=1 exposes experience state, act, camera and frame timing.
	 * Read on the client only — every route is prerendered, and prerendered
	 * pages have no meaningful query string at build time.
	 */
	const indexable = import.meta.env.VITE_INDEXABLE === 'true';

	let debug = $state(false);
	onMount(() => {
		debug = new URLSearchParams(window.location.search).get('debug') === '1';
	});
</script>

<svelte:head>
	{#if !indexable}
		<!--
			Preview deployments must not be indexed. The body copy is still pending
			and the content architecture flags claims that have not been signed off,
			so search and answer engines should not be quoting this yet.
			Set VITE_INDEXABLE=true at launch.
		-->
		<meta name="robots" content="noindex, nofollow" />
	{/if}
</svelte:head>

<a class="skip-link" href="{base}/#main">Skip to content</a>

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
