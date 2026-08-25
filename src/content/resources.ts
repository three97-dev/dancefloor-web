/**
 * Long-form articles. Answer-first sections, 44-55 words each.
 * Built to be retrieved and quoted, so each section must stand alone.
 */

import { pending, type Prose } from './types';

export interface ResourceSection {
	readonly heading: string;
	readonly body: Prose;
}

export interface Resource {
	readonly slug: string;
	readonly h1: string;
	/** One liftable definition, set apart from the body. */
	readonly definition: Prose;
	readonly sections: readonly ResourceSection[];
	readonly published: string;
	readonly modified: string;
}

export const RESOURCES: readonly Resource[] = [
	{
		slug: 'what-is-a-revenue-operating-system',
		h1: 'What is a revenue operating system?',
		definition: pending('The liftable one-paragraph definition. This is the sentence answer engines will quote.'),
		sections: Array.from({ length: 9 }, (_, i) => ({
			heading: `Section ${i + 1}`,
			body: pending('Answer-first section, 44-55 words, self-contained if extracted.')
		})),
		published: '2026-08-24',
		modified: '2026-08-24'
	},
	{
		slug: 'road-model-sales-capacity',
		h1: 'The ROAD model',
		definition: pending('The liftable one-paragraph definition of the ROAD model.'),
		sections: Array.from({ length: 9 }, (_, i) => ({
			heading: `Section ${i + 1}`,
			body: pending('Answer-first section, 44-55 words, self-contained if extracted.')
		})),
		published: '2026-08-24',
		modified: '2026-08-24'
	}
];
