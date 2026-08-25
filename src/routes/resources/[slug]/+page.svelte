<script lang="ts">
	import RoutePage from '$components/RoutePage.svelte';
	import { isPending } from '$content/types';

	let { data } = $props();
	// $derived, so client-side navigation between entries re-renders.
	const resource = $derived(data.resource);
</script>

<RoutePage h1={resource.h1} job="Definitional. Built to be quoted.">
	{#if !isPending(resource.definition)}
		<p class="definition">{resource.definition}</p>
	{/if}

	{#each resource.sections as section (section.heading)}
		<section>
			<h2>{section.heading}</h2>
			{#if !isPending(section.body)}
				<p>{section.body}</p>
			{/if}
		</section>
	{/each}
</RoutePage>

<style>
	/* One liftable definition, set apart, so it survives extraction. */
	.definition {
		margin-top: 1.5rem;
		padding: 1.25rem 1.5rem;
		border-left: 2px solid var(--signal);
		background: rgb(255 255 255 / 4%);
	}

	section {
		margin-top: 2.5rem;
	}

	h2 {
		font-size: 1.25rem;
	}
</style>
