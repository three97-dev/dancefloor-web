<script lang="ts">
	/**
	 * One of the thirteen sections.
	 *
	 * Structural only — it holds no prose. Copy arrives from $content/site so
	 * the argument can be edited without touching page or scene code.
	 *
	 * Each section is a scroll anchor the scene reads by ID; it never tells the
	 * scene what to do directly.
	 */
	import { isPending, type Section } from '$content/types';

	let { section, heading = 'h2' }: { section: Section; heading?: 'h1' | 'h2' } = $props();

	let el: HTMLElement;
	/**
	 * Only one argument should be legible at a time.
	 *
	 * Sections are shorter than the viewport so the journey stays a sane length,
	 * which means neighbours overlap on screen. Fading by proximity to centre
	 * keeps a single claim in focus without ever removing copy from the DOM —
	 * the text stays selectable, searchable and readable to a screen reader.
	 */
	let focus = $state(1);

	$effect(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		const update = () => {
			const rect = el.getBoundingClientRect();
			const centre = rect.top + rect.height / 2;
			const distance = Math.abs(centre - window.innerHeight / 2);
			// Full strength within a quarter-screen of centre, gone by one screen.
			const t = (distance - window.innerHeight * 0.25) / (window.innerHeight * 0.75);
			focus = Math.min(1, Math.max(0.06, 1 - Math.max(0, t)));
		};

		update();
		window.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update, { passive: true });
		return () => {
			window.removeEventListener('scroll', update);
			window.removeEventListener('resize', update);
		};
	});
</script>

<section
	bind:this={el}
	id={section.id}
	data-act={section.act ?? 'none'}
	data-order={section.order}
	style="--focus: {focus}"
>
	<div class="inner">
		{#if heading === 'h1'}
			<h1>{section.h2}</h1>
		{:else}
			<h2>{section.h2}</h2>
		{/if}

		{#if isPending(section.body)}
			<!--
				Copy pending. The content architecture measured this prose but did
				not supply it, and inventing replacement copy would contradict
				"do not rewrite the copy". Renders nothing for visitors.
				TODO: {section.body.note}
			-->
		{:else}
			<p>{section.body}</p>
		{/if}
	</div>
</section>

<style>
	/*
		The thirteen sections divide the journey between them, so total scroll
		distance is --journey-vh: ~1000vh on desktop, ~650vh on mobile. Each
		section is deliberately allowed to be shorter than the viewport — the
		world is the visual, and the copy sits inside it.
	*/
	section {
		position: relative;
		z-index: 1;
		min-height: calc(var(--journey-vh, 1000) * 1vh / 13);
		display: flex;
		align-items: center;
		padding: clamp(4rem, 12vh, 9rem) var(--gutter);
	}

	.inner {
		max-width: var(--measure);
		opacity: var(--focus, 1);
		/* Recede slightly as well as fade, so the copy sits in the world. */
		transform: translateY(calc((1 - var(--focus, 1)) * 1.25rem));
		will-change: opacity, transform;
	}

	@media (prefers-reduced-motion: reduce) {
		.inner {
			opacity: 1;
			transform: none;
		}
	}

	h1 {
		font-size: var(--step-hero);
		line-height: 1.02;
	}

	h2 {
		font-size: var(--step-h2);
		line-height: 1.1;
	}

	p {
		margin-top: 1.25rem;
		color: var(--text-dim);
		max-width: 32rem;
	}

	/*
		Mobile keeps shorter line lengths and leaves the lower half of the frame
		free, because each mobile camera position composes negative space there.
	*/
	@media (max-width: 767px) {
		section {
			align-items: flex-start;
			padding-top: calc(var(--nav-h) + 14vh);
		}

		.inner {
			max-width: 22rem;
		}
	}
</style>
