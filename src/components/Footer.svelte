<script lang="ts">
	/**
	 * The footer is part of the same environment, not a flat block bolted on.
	 * The camera has settled and the world recedes, but keeps running behind
	 * this quiet, ordinary, accessible HTML.
	 */
	import { NAV, ROUTES, SITE } from '$content/site';

	const platform = ROUTES.filter((r) => r.path.startsWith('/platform'));
	const resources = ROUTES.filter((r) => r.path.startsWith('/resources'));
	const company = ROUTES.filter((r) => r.path.startsWith('/legal') || r.path === '/security');
</script>

<footer>
	<div class="grid">
		<div class="brand">
			<strong>{SITE.name}</strong>
			<p>{SITE.category}</p>
		</div>

		<nav aria-label="Platform">
			<h2>Platform</h2>
			{#each platform as route (route.path)}
				<a href={route.path}>{route.h1}</a>
			{/each}
		</nav>

		<nav aria-label="Resources">
			<h2>Resources</h2>
			{#each resources as route (route.path)}
				<a href={route.path}>{route.h1}</a>
			{/each}
		</nav>

		<nav aria-label="Company">
			<h2>Company</h2>
			{#each company as route (route.path)}
				<a href={route.path}>{route.h1}</a>
			{/each}
			<a href={NAV.cta.href}>{NAV.cta.label}</a>
		</nav>

		<form class="capture" method="POST" action="/?/capture">
			<h2><label for="email">Stay in the loop</label></h2>
			<div class="row">
				<input id="email" name="email" type="email" autocomplete="email" required placeholder="you@company.com" />
				<button type="submit" data-event="cta_email_footer">Submit</button>
			</div>
		</form>
	</div>

	<p class="legal">&copy; {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
</footer>

<style>
	footer {
		position: relative;
		z-index: 1;
		padding: clamp(4rem, 10vh, 7rem) var(--gutter) calc(2rem + env(safe-area-inset-bottom));
		border-top: 1px solid var(--line);
		background: linear-gradient(180deg, transparent, rgb(5 7 10 / 72%) 40%);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
		gap: clamp(1.5rem, 4vw, 3rem);
	}

	h2 {
		font-size: 0.8125rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-dim);
		margin-bottom: 0.9rem;
	}

	nav {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	nav a {
		font-size: 0.9375rem;
		text-decoration: none;
		color: var(--text);
		opacity: 0.82;
	}

	nav a:hover {
		opacity: 1;
	}

	.brand strong {
		font-size: 1.125rem;
		font-weight: 500;
	}

	.brand p {
		margin: 0.4rem 0 0;
		color: var(--text-dim);
		font-size: 0.9375rem;
	}

	.row {
		display: flex;
		gap: 0.5rem;
	}

	input {
		flex: 1;
		min-width: 0;
		padding: 0.65rem 0.85rem;
		background: rgb(255 255 255 / 5%);
		border: 1px solid var(--line);
		border-radius: 6px;
		color: var(--text);
		font: inherit;
		font-size: 0.9375rem;
	}

	button {
		padding: 0.65rem 1rem;
		background: rgb(255 255 255 / 9%);
		border: 1px solid var(--line);
		border-radius: 6px;
		color: var(--text);
		font: inherit;
		font-size: 0.9375rem;
		cursor: pointer;
	}

	.legal {
		margin: clamp(2.5rem, 6vh, 4rem) 0 0;
		color: var(--text-dim);
		font-size: 0.8125rem;
	}
</style>
