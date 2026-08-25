<script lang="ts">
	/**
	 * Secondary routes occupy the same Dancefloor universe rather than replaying
	 * the homepage. Each one is a different location inside the same world, so
	 * the persistent canvas keeps running behind ordinary semantic content.
	 */
	import { isPending, type Prose } from '$content/types';
	import { base } from '$app/paths';
	import { NAV, SITE } from '$content/site';

	interface Props {
		h1: string;
		job: string;
		body?: Prose;
		indexed?: boolean;
		cta?: boolean;
		children?: import('svelte').Snippet;
	}

	let { h1, job, body, indexed = true, cta = true, children }: Props = $props();
</script>

<svelte:head>
	<title>{h1} — {SITE.name}</title>
	<meta name="description" content={job} />
	{#if !indexed}
		<meta name="robots" content="noindex, nofollow" />
	{/if}
</svelte:head>

<article>
	<h1>{h1}</h1>

	{#if body && !isPending(body)}
		<p class="lede">{body}</p>
	{/if}

	{#if children}
		{@render children()}
	{/if}

	{#if cta}
		<a class="cta" href="{base}{NAV.cta.href}" data-event="cta_demo_mid">{NAV.cta.label}</a>
	{/if}
</article>

<style>
	article {
		position: relative;
		z-index: 1;
		max-width: var(--measure);
		margin: 0 auto;
		padding: calc(var(--nav-h) + 14vh) var(--gutter) 14vh;
		min-height: 80svh;
	}

	h1 {
		font-size: var(--step-h2);
		line-height: 1.08;
	}

	.lede {
		margin-top: 1.25rem;
		color: var(--text-dim);
	}

	.cta {
		display: inline-block;
		margin-top: 2.5rem;
		padding: 0.7rem 1.25rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: rgb(255 255 255 / 6%);
		text-decoration: none;
	}
</style>
