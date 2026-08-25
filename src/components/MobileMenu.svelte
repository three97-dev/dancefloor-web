<script lang="ts">
	/**
	 * A high-quality screen-space navigation layer — not a generic hamburger
	 * drawer on white. The ambient world stays faintly visible underneath, and
	 * strong camera movement pauses while the menu is open.
	 */
	import { base } from '$app/paths';
	import { NAV } from '$content/site';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let panel = $state<HTMLElement | null>(null);

	$effect(() => {
		document.body.style.overflow = open ? 'hidden' : '';
		if (open) panel?.querySelector<HTMLAnchorElement>('a')?.focus();
		return () => {
			document.body.style.overflow = '';
		};
	});

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) open = false;
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<div
		bind:this={panel}
		id="mobile-menu"
		class="menu"
		role="dialog"
		aria-modal="true"
		aria-label="Navigation"
	>
		<nav>
			{#each NAV.primary as link (link.href)}
				<a href="{base}{link.href}" onclick={() => (open = false)}>{link.label}</a>
			{/each}
		</nav>
		<a class="cta" href="{base}{NAV.cta.href}" data-event="cta_demo_nav" onclick={() => (open = false)}>
			{NAV.cta.label}
		</a>
	</div>
{/if}

<style>
	.menu {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.25rem;
		padding: var(--gutter);
		padding-top: calc(var(--nav-h) + env(safe-area-inset-top));
		padding-bottom: calc(var(--gutter) + env(safe-area-inset-bottom));
		/* Dark translucent surface; the world still reads underneath. */
		background: rgb(5 7 10 / 82%);
		backdrop-filter: blur(20px) saturate(115%);
	}

	nav {
		display: flex;
		flex-direction: column;
	}

	nav a {
		/* Large accessible targets, simple vertical hierarchy. */
		padding: 1rem 0;
		font-size: clamp(1.5rem, 7vw, 2.25rem);
		letter-spacing: -0.02em;
		text-decoration: none;
		border-bottom: 1px solid var(--line);
	}

	.cta {
		margin-top: 2rem;
		padding: 1rem 1.25rem;
		text-align: center;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: rgb(255 255 255 / 8%);
		text-decoration: none;
		font-size: 1.0625rem;
	}
</style>
