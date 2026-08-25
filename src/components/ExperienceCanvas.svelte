<script lang="ts">
	/**
	 * The one persistent WebGL canvas.
	 *
	 * Fixed behind everything, mounted for the life of the page. The scroll
	 * track is a sibling whose height defines the journey's length, so the DOM
	 * narrative scrolls over a world that never unmounts.
	 */
	import { onMount } from 'svelte';
	import { Experience, WebGLUnavailableError, type ExperienceState } from '$experience/Experience';

	interface Props {
		/** Show the ?debug=1 overlay. */
		debug?: boolean;
	}

	let { debug = false }: Props = $props();

	let canvas: HTMLCanvasElement;
	let failed = $state(false);
	let snapshot = $state<ExperienceState | null>(null);
	let fps = $state(0);

	onMount(() => {
		let experience: Experience | undefined;
		try {
			experience = new Experience({
				canvas,
				onState: (next, f) => {
					if (!debug) return;
					snapshot = next;
					fps = f;
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
</script>

<!-- Decorative: the argument lives in the DOM, not in here. -->
<canvas bind:this={canvas} class="webgl" class:failed aria-hidden="true"></canvas>

{#if failed}
	<div class="fallback" aria-hidden="true"></div>
{/if}

{#if debug && snapshot}
	<aside class="debug">
		<div><b>act</b> {snapshot.activeAct}</div>
		<div><b>progress</b> {snapshot.progress.toFixed(4)}</div>
		<div><b>act progress</b> {snapshot.actProgress.toFixed(3)}</div>
		<div><b>elapsed</b> {snapshot.elapsed.toFixed(1)}s</div>
		<div><b>fps</b> {fps.toFixed(0)}</div>
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

	/* Art-directed stand-in rather than an empty void. */
	.fallback {
		position: fixed;
		inset: 0;
		z-index: 0;
		background:
			radial-gradient(60% 40% at 50% 62%, rgb(57 198 214 / 12%), transparent 70%),
			linear-gradient(180deg, #05070a 0%, #0a0d11 55%, #05070a 100%);
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

	.debug hr {
		border: 0;
		border-top: 1px solid var(--line);
		margin: 0.5rem 0;
	}
</style>
