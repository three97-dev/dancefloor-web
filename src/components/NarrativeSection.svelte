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

	// Scroll distance is proportional to narrative weight, so Fracture gets four
	// times the room Security does rather than every beat getting one thirteenth.
	const share = $derived(section.span[1] - section.span[0]);

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
	style="--focus: {focus}; --share: {share}; --copy-width: {section.layout.width}; --copy-width-mobile: {section.mobileLayout.width}"
	data-align={section.layout.align}
	data-align-mobile={section.mobileLayout.align}
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
		min-height: calc(var(--journey-vh, 1000) * var(--share, 0.077) * 1vh);
		display: flex;
		padding: clamp(4rem, 12vh, 9rem) var(--gutter);
	}

	/*
		Composition varies section to section. Repeating one arrangement for the
		whole page reads as a template, and the brief rules it out explicitly.
	*/
	section[data-align='left'] { align-items: center; justify-content: flex-start; }
	section[data-align='right'] { align-items: center; justify-content: flex-end; }
	section[data-align='center'] { align-items: center; justify-content: center; text-align: center; }
	section[data-align='lower-right'] { align-items: flex-end; justify-content: flex-end; }
	section[data-align='editorial-right'] { align-items: center; justify-content: flex-end; }
	section[data-align='split'] { align-items: center; justify-content: space-between; }

	.inner {
		max-width: calc(var(--copy-width, 40) * 1vw);
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
	/* Mobile is a single focal column; only the width and emphasis vary. */
	@media (max-width: 767px) {
		section,
		section[data-align] {
			align-items: flex-start;
			justify-content: flex-start;
			text-align: left;
			padding-top: calc(var(--nav-h) + 14vh);
		}

		section[data-align-mobile='center'] {
			text-align: center;
			justify-content: center;
		}

		.inner {
			max-width: calc(var(--copy-width-mobile, 88) * 1vw);
		}
	}
</style>
