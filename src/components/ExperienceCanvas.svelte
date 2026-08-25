<script lang="ts">
	/**
	 * The one persistent WebGL canvas.
	 *
	 * Fixed behind everything, mounted for the life of the page. The scroll
	 * track is a sibling whose height defines the journey's length, so the DOM
	 * narrative scrolls over a world that never unmounts.
	 */
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import {
		Experience,
		WebGLUnavailableError,
		type ExperienceState,
		type ExperienceStats
	} from '$experience/Experience';

	interface Props {
		/** Show the ?debug=1 overlay. */
		debug?: boolean;
	}

	let { debug = false }: Props = $props();

	let canvas: HTMLCanvasElement;
	let failed = $state(false);
	/** Which act's fallback still to show when WebGL is unavailable. */
	let fallbackAct = $state(1);
	let snapshot = $state<ExperienceState | null>(null);
	let stats = $state<ExperienceStats | null>(null);

	onMount(() => {
		let experience: Experience | undefined;
		try {
			const params = new URLSearchParams(window.location.search);
			experience = new Experience({
				canvas,
				lightingQA: params.get('lighting') === '1',
				// Read from the URL rather than the prop: child components mount
				// before their parent, so the prop is still false at this point.
				debug: params.get('debug') === '1',
				base,
				onState: (next, s) => {
					if (!debug) return;
					snapshot = next;
					stats = s;
				}
			});
		} catch (error) {
			// Never let a rendering failure produce a blank background: the DOM
			// narrative above is the site, and it must stay readable.
			if (error instanceof WebGLUnavailableError) failed = true;
			else throw error;
		}
		return () => experience?.dispose();
	});

	/**
	 * Fallback still selection.
	 *
	 * If WebGL cannot initialise the visitor still travels the seven acts, just
	 * through pre-rendered Blender stills rather than a live world. A rendering
	 * failure must never produce a blank background.
	 */
	$effect(() => {
		if (!failed) return;

		const update = () => {
			const scrollable = document.documentElement.scrollHeight - window.innerHeight;
			const progress = scrollable <= 0 ? 0 : window.scrollY / scrollable;
			// Seven acts across the journey, matching the act boundaries.
			fallbackAct = Math.min(7, Math.max(1, Math.ceil(progress * 7) || 1));
		};

		update();
		window.addEventListener('scroll', update, { passive: true });
		return () => window.removeEventListener('scroll', update);
	});
</script>

<!-- Decorative: the argument lives in the DOM, not in here. -->
<canvas bind:this={canvas} class="webgl" class:failed aria-hidden="true"></canvas>

{#if failed}
	<picture class="fallback" aria-hidden="true">
		<source media="(max-width: 767px)" srcset="{base}/fallback/act-{fallbackAct}-mobile.jpg" />
		<img src="{base}/fallback/act-{fallbackAct}.jpg" alt="" decoding="async" />
	</picture>
{/if}

{#if debug && snapshot}
	<aside class="debug">
		<div><b>act</b> {snapshot.activeAct}</div>
		<div><b>progress</b> {snapshot.progress.toFixed(4)}</div>
		<div><b>act progress</b> {snapshot.actProgress.toFixed(3)}</div>
		<div><b>elapsed</b> {snapshot.elapsed.toFixed(1)}s</div>
		<div><b>fps</b> {stats?.fps.toFixed(0) ?? '-'}</div>
		<div><b>anchor</b> {stats?.anchor ?? '-'}</div>
		<div><b>viewport</b> {stats?.viewport ?? '-'}</div>
		<div><b>tier / dpr</b> {stats?.tier ?? '-'} / {stats?.pixelRatio.toFixed(2) ?? '-'}</div>
		<div><b>draws / tris</b> {stats?.drawCalls ?? 0} / {((stats?.triangles ?? 0) / 1000).toFixed(0)}k</div>
		<div><b>ambient events</b> {stats?.ambientEvents ?? 0}</div>
		<div><b>world</b> {stats?.assets ?? '-'}</div>
		<div class:warn={(stats?.luminance ?? 0) < 0.12}>
			<b>luminance</b> {((stats?.luminance ?? 0) * 100).toFixed(1)}%{(stats?.luminance ?? 0) < 0.12 ? ' — too dark' : ''}
		</div>
		{#if stats?.lightingQA}
			<div><b>mode</b> lighting QA</div>
		{/if}
		<hr />
		<div><b>fracture</b> {snapshot.fracture.toFixed(2)}</div>
		<div><b>terrain</b> {snapshot.terrain.toFixed(2)}</div>
		<div><b>corridor</b> {snapshot.corridor.toFixed(2)}</div>
		<div><b>return</b> {snapshot.returnPath.toFixed(2)}</div>
		<div><b>alignment</b> {snapshot.alignment.toFixed(2)}</div>
		<div><b>city</b> {snapshot.city.toFixed(2)}</div>
	</aside>
{/if}

<style>
	.webgl {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
		z-index: 0;
		/* The canvas never takes pointer events; the DOM above owns interaction. */
		pointer-events: none;
	}

	.webgl.failed {
		display: none;
	}

	/* Art-directed Blender stills rather than an empty void. */
	.fallback {
		position: fixed;
		inset: 0;
		z-index: 0;
		display: block;
		background: var(--ink-900);
	}

	.fallback img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0.85;
		transition: opacity 0.4s ease;
	}

	.debug {
		position: fixed;
		right: 0.75rem;
		bottom: 0.75rem;
		z-index: 90;
		padding: 0.75rem 0.9rem;
		font: 500 11px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
		background: rgb(5 7 10 / 88%);
		border: 1px solid var(--line);
		border-radius: 6px;
		color: var(--text-dim);
		min-width: 13rem;
	}

	.debug b {
		color: var(--text);
		font-weight: 500;
		display: inline-block;
		min-width: 6.5rem;
	}

	.debug .warn,
	.debug .warn b {
		color: #ff8f7a;
	}

	.debug hr {
		border: 0;
		border-top: 1px solid var(--line);
		margin: 0.5rem 0;
	}
</style>
