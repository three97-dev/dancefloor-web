import { error } from '@sveltejs/kit';
import { CAMPAIGNS } from '$content/campaigns';

export const prerender = true;

export const entries = () => CAMPAIGNS.map((c) => ({ campaign: c.slug }));

export function load({ params }) {
	const campaign = CAMPAIGNS.find((c) => c.slug === params.campaign);
	if (!campaign) throw error(404, 'Not found');
	return { campaign };
}
