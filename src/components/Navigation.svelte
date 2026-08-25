<script lang="ts">
	/**
	 * Navigation is part of the art direction, not a SaaS navbar pasted on top.
	 * It reads as an instrumentation layer above the environment: transparent at
	 * rest, gaining a restrained smoked-glass treatment as content moves beneath.
	 *
	 * All labels come from $content/site — never duplicated here.
	 */
	import { base } from '$app/paths';
	import { NAV } from '$content/site';
	import MobileMenu from './MobileMenu.svelte';

	let scrolled = $state(false);
	let menuOpen = $state(false);

	function onScroll() {
		scrolled = window.scrollY > 24;
	}
</script>

<svelte:window onscroll={onScroll} />

<header class="nav" class:scrolled>
	<a class="mark" href="{base}/" aria-label="Dancefloor home">
		<!-- Nine modules resolving into the 3x3 mark. -->
		<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
			{#each [0, 1, 2] as r (r)}
				{#each [0, 1, 2] as c (c)}
					<rect
						x={2 + c * 7.5}
						y={2 + r * 7.5}
						width="5.5"
						height="5.5"
						rx="1"
						fill="currentColor"
						opacity={0.35 + ((r + c) % 3) * 0.32}
					/>
				{/each}
			{/each}
		</svg>
		<span class="wordmark">Dancefloor</span>
	</a>

	<nav class="links" aria-label="Primary">
		{#each NAV.primary as link (link.href)}
			<a href="{base}{link.href}">{link.label}</a>
		{/each}
	</nav>

	<a class="cta" href="{base}{NAV.cta.href}" data-event="cta_demo_nav">{NAV.cta.label}</a>

	<button
		class="menu-trigger"
		aria-expanded={menuOpen}
		aria-controls="mobile-menu"
		onclick={() => (menuOpen = !menuOpen)}
	>
		<span class="visually-hidden">{menuOpen ? 'Close menu' : 'Open menu'}</span>
		<span class="bars" class:open={menuOpen} aria-hidden="true"></span>
	</button>
</header>

<MobileMenu bind:open={menuOpen} />

<style>
	.nav {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 50;
		height: var(--nav-h);
		padding: 0 var(--gutter);
		padding-top: env(safe-area-inset-top);
		display: flex;
		align-items: center;
		gap: clamp(1rem, 3vw, 2.5rem);
		background: transparent;
		border-bottom: 1px solid transparent;
		transition:
			background 0.4s ease,
			border-color 0.4s ease,
			backdrop-filter 0.4s ease;
	}

	/* Smoked glass, limited blur, an extremely faint lower border. */
	.nav.scrolled {
		background: rgb(8 11 15 / 62%);
		backdrop-filter: blur(14px) saturate(120%);
		border-bottom-color: var(--line);
	}

	.mark {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		text-decoration: none;
		color: var(--text);
		font-weight: 500;
		letter-spacing: -0.015em;
	}

	.links {
		display: flex;
		gap: clamp(1rem, 2.2vw, 2rem);
		margin-left: auto;
	}

	.links a {
		text-decoration: none;
		color: var(--text-dim);
		font-size: 0.9375rem;
		transition: color 0.2s ease;
	}

	.links a:hover {
		color: var(--text);
	}

	.cta {
		padding: 0.55rem 1.05rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: rgb(255 255 255 / 6%);
		text-decoration: none;
		font-size: 0.9375rem;
		white-space: nowrap;
		transition:
			background 0.2s ease,
			border-color 0.2s ease;
	}

	.cta:hover {
		background: rgb(255 255 255 / 11%);
		border-color: rgb(255 255 255 / 20%);
	}

	.menu-trigger {
		display: none;
		width: 2.5rem;
		height: 2.5rem;
		align-items: center;
		justify-content: center;
		background: none;
		border: 1px solid var(--line);
		border-radius: 8px;
		color: inherit;
		cursor: pointer;
	}

	.bars,
	.bars::before,
	.bars::after {
		display: block;
		width: 16px;
		height: 1.5px;
		background: currentColor;
		transition: transform 0.25s ease;
	}

	.bars::before,
	.bars::after {
		content: '';
		position: relative;
	}

	.bars::before {
		top: -5px;
	}

	.bars::after {
		top: 3.5px;
	}

	.bars.open {
		background: transparent;
	}

	.bars.open::before {
		transform: translateY(5px) rotate(45deg);
	}

	.bars.open::after {
		transform: translateY(-3.5px) rotate(-45deg);
	}

	/* Tablet: reduce visible labels rather than shrinking the desktop nav. */
	@media (max-width: 1023px) {
		.links {
			gap: 1rem;
		}

		.links a:nth-child(n + 4) {
			display: none;
		}
	}

	@media (max-width: 767px) {
		.links {
			display: none;
		}

		.menu-trigger {
			display: inline-flex;
		}

		.cta {
			margin-left: auto;
		}
	}
</style>
