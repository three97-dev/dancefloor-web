/**
 * The single source for the argument.
 *
 * Headlines are verbatim from DancefloorContentArchitecture.pdf (2026-08-24).
 * Body prose is marked pending where the architecture documents a word count
 * but does not supply the words — see `PendingCopy` in ./types.
 */

import { pending, type Act, type ConversionEvent, type Route, type Section } from './types';

export const SITE = {
	name: 'Dancefloor',
	domain: 'dancefloor.ai',
	/** What the product is, in one line. */
	category: 'Revenue Operating System',
	tagline: 'A fragmented revenue organization becomes one intelligent operating system.'
} as const;

/** Hero H1. The only H1 on the homepage. */
export const HERO_H1 = "Your team's number is won in the hours between the forecast calls.";

/**
 * The thirteen sections, in order.
 *
 * The order is load-bearing: reading only the H2s top to bottom gives the whole
 * pitch. Seven of the thirteen sit against an act of the 3D scene behind them,
 * and the act depicts what the section is claiming.
 */
export const SECTIONS: readonly Section[] = [
	{
		id: 'hero',
		order: 1,
		act: 'ACT_I_FIELD_AT_REST',
		h2: HERO_H1,
		sourceConstant: 'HERO',
		productSurface: null,
		body: pending('Hero subcopy and the two hero CTAs (demo, secondary to /platform/road).')
	},
	{
		id: 'thesis',
		order: 2,
		act: 'ACT_I_FIELD_AT_REST',
		h2: 'Revenue leaders have to hit the number. Sellers need a better way to turn their hours into dollars.',
		sourceConstant: 'THESIS',
		productSurface: null,
		body: pending('Thesis body. Establishes the stakes before the product is named.')
	},
	{
		id: 'problem',
		order: 3,
		act: 'ACT_II_FRACTURE',
		h2: 'Three questions decide the quarter, and they get answered in three different systems, weeks apart.',
		sourceConstant: 'PROBLEM',
		productSurface: null,
		body: pending(
			'Problem body. Note: the architecture flags the stack-size statistic here as unsourced — substantiate or cut before launch.'
		)
	},
	{
		id: 'road',
		order: 4,
		act: 'ACT_III_THE_PATCH',
		h2: 'Dancefloor answers the first question before the quarter is spent.',
		sourceConstant: 'ROAD',
		productSurface: 'road-coverage',
		body: pending('ROAD body. Underlying question: does this rep have enough to work?')
	},
	{
		id: 'guidance',
		order: 5,
		act: 'ACT_IV_THE_RISE',
		h2: 'It answers the second one inside the deal, at the moment the decision gets made.',
		sourceConstant: 'GUIDANCE',
		productSurface: 'guidance-surface',
		body: pending('Guidance body. Underlying question: what do I do next, and how?')
	},
	{
		id: 'capture',
		order: 6,
		act: 'ACT_V_RETURN_PATH',
		h2: 'And it answers the third one in real time, in three directions.',
		sourceConstant: 'CAPTURE',
		productSurface: 'signal-routing',
		body: pending('Capture body. Underlying question: what did that just teach us?')
	},
	{
		id: 'model',
		order: 7,
		act: 'ACT_VI_ONE_PLANE',
		h2: 'All three run on one model of your revenue organization.',
		sourceConstant: 'MODEL',
		productSurface: 'model-ontology',
		body: pending('Model body. This is the main conceptual reveal.')
	},
	{
		id: 'audience',
		order: 8,
		act: null,
		h2: 'Built for the mid-market, where enterprise math still runs on spreadsheet instrumentation.',
		sourceConstant: 'AUDIENCE',
		productSurface: null,
		body: pending('Audience body.')
	},
	{
		id: 'differentiation',
		order: 9,
		act: null,
		h2: 'Every other tool owns one arc of the loop.',
		sourceConstant: 'DIFFERENTIATION',
		productSurface: null,
		body: pending('Differentiation body. Category comparison — do not name competitors.')
	},
	{
		id: 'security',
		order: 10,
		act: null,
		h2: 'Your instance is yours. Your data never leaves it.',
		sourceConstant: 'SECURITY',
		productSurface: null,
		body: pending(
			'Security body. SOC 2 and the subprocessor list must read "Documentation pending" rather than being implied.'
		)
	},
	{
		id: 'pricing',
		order: 11,
		act: null,
		h2: 'One flat annual price. Not per seat.',
		sourceConstant: 'PRICING',
		productSurface: null,
		body: pending(
			'Pricing body. The architecture flags a contradiction: "flat, not per seat" against "we’ll quote against your rep count." Reconcile with the real business model before launch.'
		)
	},
	{
		id: 'faq',
		order: 12,
		act: null,
		h2: 'Questions buyers ask first.',
		sourceConstant: 'FAQ',
		productSurface: null,
		body: pending(
			'Eight question-shaped H3s, answer-first, 47-56 words each, each self-contained if extracted.',
			8
		)
	},
	{
		id: 'close',
		order: 13,
		act: 'ACT_VII_THE_CITY',
		h2: "See what your reps' books actually support this quarter.",
		sourceConstant: 'FINAL_CTA',
		productSurface: null,
		body: pending('Final CTA body.')
	}
];

/**
 * The seven acts. One continuous camera journey through a single environment —
 * no hard cuts, no teleportation, no per-section backgrounds.
 */
export const ACTS: readonly Act[] = [
	{
		id: 'ACT_I_FIELD_AT_REST',
		numeral: 'I',
		name: 'Field at rest',
		sections: ['hero', 'thesis'],
		visualObjective: [
			'Begin very close to one infinity-mirror tile.',
			'The visitor initially sees an abstract luminous object.',
			'Slowly reveal more tiles; the Dancefloor extends into darkness.',
			'Different tiles exhibit independent low-level activity.',
			'The world is already alive when the site loads.'
		]
	},
	{
		id: 'ACT_II_FRACTURE',
		numeral: 'II',
		name: 'Fracture',
		sections: ['problem'],
		visualObjective: [
			'The continuous Dancefloor separates into system regions.',
			'Grid seams widen and clusters physically separate.',
			'Different areas develop distinct internal lighting behavior.',
			'Signals reach boundaries and stop.',
			'Some tiles rise into isolated architectural structures.',
			'The organization is active, but disconnected.'
		]
	},
	{
		id: 'ACT_III_THE_PATCH',
		numeral: 'III',
		name: 'The patch',
		sections: ['road'],
		visualObjective: [
			'Transform part of the floor into a capacity / coverage terrain.',
			'Tile height represents real coverage — height must have semantic meaning.',
			'Drive elevation from patches, intent accounts, opportunity coverage, deal stages.',
			'Elevation is never decorative.',
			'The camera moves across this changing terrain.'
		]
	},
	{
		id: 'ACT_IV_THE_RISE',
		numeral: 'IV',
		name: 'The rise',
		sections: ['guidance'],
		visualObjective: [
			'Multiple potential paths briefly emerge.',
			'The system evaluates them; most fade, one becomes dominant.',
			'Corresponding modules rise physically.',
			'The camera follows the resulting corridor.',
			'Recommendation becomes spatial.'
		]
	},
	{
		id: 'ACT_V_RETURN_PATH',
		numeral: 'V',
		name: 'Return path',
		sections: ['capture'],
		visualObjective: [
			'An action generates downstream information.',
			'Signals route: surface, underfloor, across infrastructure, back upward.',
			'Signals change the system as they travel.',
			'This communicates closed-loop learning.'
		]
	},
	{
		id: 'ACT_VI_ONE_PLANE',
		numeral: 'VI',
		name: 'One plane',
		sections: ['model'],
		visualObjective: [
			'Previously separate visual systems align.',
			'Coverage, guidance and capture resolve into one connected architecture.',
			'Different planes line up and relationships become obvious.',
			'Signals travel without boundaries.',
			'This is the main conceptual reveal.'
		]
	},
	{
		id: 'ACT_VII_THE_CITY',
		numeral: 'VII',
		name: 'The city',
		sections: ['close'],
		visualObjective: [
			'Resume major camera movement; the camera rises dramatically.',
			'Structures become modules, modules become neighborhoods.',
			'Neighborhoods resolve into one massive coordinated Dancefloor.',
			'Distinct regions remain visible, but signals now cross them.',
			'Nine modules become dominant and resolve into the Dancefloor 3x3 mark.'
		]
	}
];

/**
 * The commercial / proof layer. These sections need no new camera world —
 * the camera reaches a calm elevated state, an observatory above the operating
 * system, while the environment keeps running underneath.
 */
export const OBSERVATORY_SECTIONS = [
	'audience',
	'differentiation',
	'security',
	'pricing',
	'faq'
] as const;

/** Sixteen routes. Twelve indexed. */
export const ROUTES: readonly Route[] = [
	{ path: '/', job: 'The full argument, seven acts', h1: HERO_H1, indexed: true, primaryCta: 'Book a demo' },
	{ path: '/platform', job: 'Hub for the three arcs', h1: 'Three arcs of one loop, on one model.', indexed: true, primaryCta: 'Book a demo' },
	{ path: '/platform/road', job: 'Coverage. Declared SEO target: sales capacity planning', h1: 'Does this rep have enough to work?', indexed: true, primaryCta: 'Book a demo' },
	{ path: '/platform/guidance', job: 'Guided execution inside the deal', h1: 'What do I do next, and how?', indexed: true, primaryCta: 'Book a demo' },
	{ path: '/platform/signals', job: 'Closed-loop capture', h1: 'What did that just teach us?', indexed: true, primaryCta: 'Book a demo' },
	{ path: '/why-dancefloor', job: 'Category comparison, not competitor names', h1: 'Every other tool owns one arc of the loop.', indexed: true, primaryCta: 'Book a demo' },
	{ path: '/security', job: 'Enterprise trust. Closes deals.', h1: 'Your instance is yours. Your data never leaves it.', indexed: true, primaryCta: 'Book a demo' },
	{ path: '/pricing', job: 'Flat annual, not per seat', h1: 'One flat annual price. Not per seat.', indexed: true, primaryCta: 'Book a demo' },
	{ path: '/demo', job: 'Primary conversion', h1: "See what your reps' books actually support.", indexed: true, primaryCta: 'The form itself' },
	{ path: '/resources', job: 'Index of the GEO surface', h1: 'The arguments, written out in full.', indexed: true, primaryCta: 'Email capture' },
	{ path: '/resources/what-is-a-revenue-operating-system', job: 'Definitional. Built to be quoted.', h1: 'What is a revenue operating system?', indexed: true, primaryCta: 'Book a demo' },
	{ path: '/resources/road-model-sales-capacity', job: 'Definitional. Built to be quoted.', h1: 'The ROAD model', indexed: true, primaryCta: 'Book a demo' },
	{ path: '/lp/sales-capacity-planning', job: 'Paid search. Ad message-match.', h1: 'Find the coverage gap before the quarter ends.', indexed: false, primaryCta: 'Demo form' },
	{ path: '/lp/revenue-operating-system', job: 'Paid search. Ad message-match.', h1: 'One system that decides, guides, and remembers.', indexed: false, primaryCta: 'Demo form' },
	{ path: '/legal/privacy', job: 'Stub. Awaiting counsel.', h1: 'Privacy policy', indexed: false, primaryCta: '' },
	{ path: '/legal/terms', job: 'Stub. Awaiting counsel.', h1: 'Terms of service', indexed: false, primaryCta: '' }
];

/**
 * Navigation. Nav content comes from here, never duplicated in component code.
 */
export const NAV = {
	primary: [
		{ label: 'Platform', href: '/platform' },
		{ label: 'Why Dancefloor', href: '/why-dancefloor' },
		{ label: 'Security', href: '/security' },
		{ label: 'Pricing', href: '/pricing' },
		{ label: 'Resources', href: '/resources' }
	],
	cta: { label: 'Book a demo', href: '/demo' }
} as const;

/**
 * Four demo touchpoints, one email capture. Four and no more, by design.
 * Never consolidate these into one generic button-click event.
 */
export const CONVERSION_EVENTS: readonly ConversionEvent[] = [
	{ event: 'cta_demo_nav', placement: 'Nav, persistent', type: 'click', firesOn: 'intent' },
	{ event: 'cta_demo_hero', placement: 'Hero', type: 'click', firesOn: 'intent' },
	{ event: 'cta_demo_mid', placement: 'Mid-page, after Capture', type: 'click', firesOn: 'intent' },
	{ event: 'cta_demo_final', placement: 'Final section', type: 'click', firesOn: 'intent' },
	{ event: 'cta_road_hero', placement: 'Hero secondary to /platform/road', type: 'click', firesOn: 'intent' },
	{ event: 'cta_email_footer', placement: 'Email capture, single field', type: 'click', firesOn: 'intent' },
	{ event: 'conversion_demo_request', placement: 'Demo form submitted', type: 'conversion', firesOn: 'server-action success' },
	{ event: 'conversion_email_capture', placement: 'Email submitted', type: 'conversion', firesOn: 'server-action success' }
];

/** Lookup helpers so scene code can reference IDs without importing prose. */
export const sectionById = (id: Section['id']) => SECTIONS.find((s) => s.id === id);
export const actById = (id: Act['id']) => ACTS.find((a) => a.id === id);
export const actForSection = (id: Section['id']) => {
	const act = sectionById(id)?.act;
	return act ? actById(act) : undefined;
};
