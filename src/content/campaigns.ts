/**
 * Paid-search landing definitions.
 * `adHeadline` must match the live ad verbatim. These routes are noindex.
 */

import { pending, type Prose } from './types';

export interface Campaign {
	readonly slug: string;
	readonly h1: string;
	/** Must match the live ad verbatim, or message-match breaks. */
	readonly adHeadline: string;
	readonly body: Prose;
}

export const CAMPAIGNS: readonly Campaign[] = [
	{
		slug: 'sales-capacity-planning',
		h1: 'Find the coverage gap before the quarter ends.',
		adHeadline: 'Find the coverage gap before the quarter ends.',
		body: pending('Paid landing body, message-matched to the ad.')
	},
	{
		slug: 'revenue-operating-system',
		h1: 'One system that decides, guides, and remembers.',
		adHeadline: 'One system that decides, guides, and remembers.',
		body: pending('Paid landing body, message-matched to the ad.')
	}
];
