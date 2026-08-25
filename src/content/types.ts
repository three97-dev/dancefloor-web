/**
 * Content types for Dancefloor.ai.
 *
 * Copy lives here and only here. Components are structural and hold no prose,
 * so the argument can be edited without touching page or scene code.
 * Scene code references section IDs — never the strings themselves.
 */

/** The seven cinematic acts of the homepage. Order is load-bearing. */
export type ActId =
	| 'ACT_I_FIELD_AT_REST'
	| 'ACT_II_FRACTURE'
	| 'ACT_III_THE_PATCH'
	| 'ACT_IV_THE_RISE'
	| 'ACT_V_RETURN_PATH'
	| 'ACT_VI_ONE_PLANE'
	| 'ACT_VII_THE_CITY';

/** The thirteen homepage sections. Order is load-bearing — do not reorder. */
export type SectionId =
	| 'hero'
	| 'thesis'
	| 'problem'
	| 'road'
	| 'guidance'
	| 'capture'
	| 'model'
	| 'audience'
	| 'differentiation'
	| 'security'
	| 'pricing'
	| 'faq'
	| 'close';

/** Product surfaces referenced by the acts. */
export type ProductSurfaceId =
	| 'road-coverage'
	| 'guidance-surface'
	| 'signal-routing'
	| 'model-ontology';

/**
 * Body prose that the content architecture documents but does not supply.
 *
 * The architecture PDF measured 4,916 live words from the rendered DOM but only
 * reproduces the H1s and H2s. Rather than invent replacement marketing copy, a
 * pending slot renders nothing and reports itself to `npm run check:copy`.
 */
export interface PendingCopy {
	readonly __pending: true;
	/** What belongs here, for whoever fills it in. */
	readonly note: string;
	/** Word count the architecture measured, where known. */
	readonly words?: number;
}

export const pending = (note: string, words?: number): PendingCopy => ({
	__pending: true,
	note,
	words
});

export const isPending = (value: unknown): value is PendingCopy =>
	typeof value === 'object' && value !== null && '__pending' in value;

export type Prose = string | PendingCopy;

/** Where a section sits on the normalized 0-1 timeline, as [start, end]. */
export type Span = readonly [number, number];

/** Where the copy sits in the frame. Composition must vary section to section. */
export type ContentAlign = 'left' | 'right' | 'center' | 'split' | 'editorial-right' | 'lower-right';

export interface SectionLayout {
	readonly align: ContentAlign;
	/** Copy column width, as a viewport-width percentage. */
	readonly width: number;
}

export interface Section {
	readonly id: SectionId;
	/** 1-13. Reading the H2s in order should communicate the entire argument. */
	readonly order: number;
	/**
	 * Share of the journey this section owns.
	 *
	 * Deliberately uneven: the cinematic acts need room to breathe and the
	 * commercial sections do not. Section heights are derived from this, so the
	 * scroll distance a visitor travels matches the narrative weight.
	 */
	readonly span: Span;
	/** Desktop composition. Repeating one layout for every section is forbidden. */
	readonly layout: SectionLayout;
	/** Mobile composition — a single focal column, but width still varies. */
	readonly mobileLayout: SectionLayout;
	/** Which act of the 3D scene sits behind this section, if any. */
	readonly act: ActId | null;
	/** The argument. Verbatim from the content architecture. */
	readonly h2: string;
	/** Stable constant name used by the content architecture. */
	readonly sourceConstant: string;
	/** Product imagery this section carries, if any. */
	readonly productSurface: ProductSurfaceId | null;
	readonly body: Prose;
}

export interface Act {
	readonly id: ActId;
	/** Roman numeral, for display and debug. */
	readonly numeral: string;
	readonly name: string;
	/** Sections that sit against this act. */
	readonly sections: readonly SectionId[];
	/** What the act must depict, from the master execution prompt. */
	readonly visualObjective: readonly string[];
}

export interface Route {
	readonly path: string;
	readonly job: string;
	readonly h1: string;
	readonly indexed: boolean;
	readonly primaryCta: string;
}

/** Conversion events. Each CTA has a distinct name — never consolidate these. */
export interface ConversionEvent {
	readonly event: string;
	readonly placement: string;
	readonly type: 'click' | 'conversion';
	/** Conversions fire on server-action success, not on button click. */
	readonly firesOn: 'intent' | 'server-action success';
}
