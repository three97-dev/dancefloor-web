<script lang="ts">
	/**
	 * The homepage: one argument in thirteen sections, over seven acts.
	 *
	 * The order is load-bearing — reading only the H2s top to bottom gives the
	 * whole pitch — so this renders SECTIONS in order and never reorders them.
	 */
	import NarrativeSection from '$components/NarrativeSection.svelte';
	import { HERO_H1, SECTIONS, SITE } from '$content/site';

	const [hero, ...rest] = SECTIONS;
</script>

<svelte:head>
	<title>{SITE.name} — {SITE.category}</title>
	<meta name="description" content={HERO_H1} />
</svelte:head>

<NarrativeSection section={hero} heading="h1" />

{#each rest as section (section.id)}
	<NarrativeSection {section} />
{/each}
