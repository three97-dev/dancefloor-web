<script lang="ts">
	import RoutePage from '$components/RoutePage.svelte';

	let { data } = $props();
	// $derived, so client-side navigation between entries re-renders.
	const campaign = $derived(data.campaign);
</script>

<!-- Paid search. Excluded from the sitemap and noindexed. -->
<RoutePage h1={campaign.h1} job={campaign.adHeadline} body={campaign.body} indexed={false} />
