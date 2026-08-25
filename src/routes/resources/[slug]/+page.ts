import { error } from '@sveltejs/kit';
import { RESOURCES } from '$content/resources';

export const prerender = true;

// Definitional articles, built to be quoted. Both are known at build time.
export const entries = () => RESOURCES.map((r) => ({ slug: r.slug }));

export function load({ params }) {
	const resource = RESOURCES.find((r) => r.slug === params.slug);
	if (!resource) throw error(404, 'Not found');
	return { resource };
}
