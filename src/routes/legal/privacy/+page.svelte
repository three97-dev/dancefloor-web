<script lang="ts">
	import RoutePage from '$components/RoutePage.svelte';
	import { ROUTES } from '$content/site';

	const route = ROUTES.find((r) => r.path === '/legal/privacy')!;
</script>

<RoutePage h1={route.h1} job={route.job} indexed={route.indexed} cta={route.primaryCta !== ''} />
