/**
 * The luminous cyberpunk palette.
 *
 * A pristine computational metropolis at night — not dark cyberpunk, not
 * dystopian, not a nightclub, not a dirty alley. Darkness creates contrast; it
 * does not define the environment.
 *
 * The failure test this palette exists to pass: if a screenshot reads as
 * *black background with neon objects*, the art direction has failed. It has to
 * read as a luminous architectural environment that happens to contain
 * intelligent illuminated systems.
 *
 * An earlier revision of this project deliberately desaturated everything to
 * avoid a nightclub look. That was correct for the brief at the time and is
 * wrong now: the colour has to come back, but as *environment* rather than as
 * decoration on the tiles.
 */

import { Color } from 'three';
import type { ActId } from '$content/types';

/**
 * Environmental darks. None of these are neutral black — every shadow in the
 * world is tinted, so shadowed regions still carry chromatic information.
 */
export const DARKS = {
	deepIndigo: new Color('#151a3a'),
	midnightBlue: new Color('#101a33'),
	blueBlack: new Color('#0b1120'),
	violetBlack: new Color('#150f26'),
	plum: new Color('#22132b'),
	darkTeal: new Color('#0d2129'),
	coolGraphite: new Color('#1d232b')
} as const;

/**
 * Illumination. Saturated, but distributed as territories rather than sprayed
 * evenly — an equal rainbow is explicitly not the target.
 */
export const LIGHT = {
	electricCyan: new Color('#31e0f0'),
	saturatedBlue: new Color('#2f6cf0'),
	ultraviolet: new Color('#7a4bff'),
	violet: new Color('#a55cf5'),
	magenta: new Color('#e0479f'),
	coral: new Color('#ff6f5e'),
	amber: new Color('#ffab3d'),
	acidGreen: new Color('#8ef06a')
} as const;

/** Medium-value structural materials. If everything is black, colour cannot register. */
export const SURFACES = {
	graphite: new Color('#39414c'),
	coolConcrete: new Color('#4a525e'),
	darkSilver: new Color('#5b636e'),
	gunmetal: new Color('#333b47'),
	blueGrey: new Color('#3d4a5c'),
	violetComposite: new Color('#3a3350')
} as const;

export interface ColorTerritory {
	/** The broad ambient wash the act sits in. */
	readonly ambient: Color;
	/** Dominant illumination for this act. */
	readonly key: Color;
	/** Complementary counter-light, so the frame is never one hue. */
	readonly counter: Color;
	/** Accent used sparingly for signals and highlights. */
	readonly accent: Color;
	/** Colour far architecture dissolves into, rather than disappearing. */
	readonly haze: Color;
	/** Shadow tint. Never neutral black. */
	readonly shadow: Color;
}

/**
 * Narrative colour territories.
 *
 * Colour carries the argument: the districts start chromatically isolated and
 * end coordinated, so the palette itself communicates fragmentation resolving
 * into one system.
 */
export const TERRITORIES: Record<ActId, ColorTerritory> = {
	// Rich but restrained multi-colour — a place, already running.
	ACT_I_FIELD_AT_REST: {
		ambient: new Color('#2b3576'),
		key: LIGHT.electricCyan,
		counter: LIGHT.magenta,
		accent: LIGHT.amber,
		haze: new Color('#4a63c8'),
		shadow: DARKS.violetBlack
	},
	// Districts pull apart chromatically as well as physically.
	ACT_II_FRACTURE: {
		ambient: new Color('#243a80'),
		key: LIGHT.electricCyan,
		counter: LIGHT.violet,
		accent: LIGHT.coral,
		haze: new Color('#3f5bbe'),
		shadow: DARKS.plum
	},
	// Cyan / aqua / electric blue dominant: wide, analytical, legible.
	ACT_III_THE_PATCH: {
		ambient: new Color('#1d5570'),
		key: LIGHT.electricCyan,
		counter: LIGHT.saturatedBlue,
		accent: LIGHT.violet,
		haze: new Color('#2f93b8'),
		shadow: DARKS.midnightBlue
	},
	// Violet / ultraviolet / magenta dominant: vertical, directional, intimate.
	ACT_IV_THE_RISE: {
		ambient: new Color('#43287e'),
		key: LIGHT.ultraviolet,
		counter: LIGHT.magenta,
		accent: LIGHT.electricCyan,
		haze: new Color('#7a4bcf'),
		shadow: DARKS.plum
	},
	// Amber / coral moving through blue and violet infrastructure.
	ACT_V_RETURN_PATH: {
		ambient: new Color('#2a3272'),
		key: LIGHT.amber,
		counter: LIGHT.saturatedBlue,
		accent: LIGHT.coral,
		haze: new Color('#5a4a9e'),
		shadow: DARKS.midnightBlue
	},
	// Previously separated palettes begin sharing surfaces.
	ACT_VI_ONE_PLANE: {
		ambient: new Color('#2f3c8e'),
		key: LIGHT.electricCyan,
		counter: LIGHT.violet,
		accent: LIGHT.amber,
		haze: new Color('#5470d8'),
		shadow: DARKS.violetBlack
	},
	// Full coordinated palette — the most luminous state of the site.
	ACT_VII_THE_CITY: {
		ambient: new Color('#37469e'),
		key: LIGHT.electricCyan,
		counter: LIGHT.magenta,
		accent: LIGHT.amber,
		haze: new Color('#6484e8'),
		shadow: DARKS.deepIndigo
	}
};

/**
 * Blends between two acts' territories.
 *
 * Colour has to progress continuously with the camera: a hard palette swap at
 * an act boundary would read as the scene cut the whole experience forbids.
 */
export function blendTerritory(from: ColorTerritory, to: ColorTerritory, t: number): ColorTerritory {
	const mix = (a: Color, b: Color) => a.clone().lerp(b, t);
	return {
		ambient: mix(from.ambient, to.ambient),
		key: mix(from.key, to.key),
		counter: mix(from.counter, to.counter),
		accent: mix(from.accent, to.accent),
		haze: mix(from.haze, to.haze),
		shadow: mix(from.shadow, to.shadow)
	};
}

/**
 * Shadow tint for a given illumination colour.
 *
 * Cyan-lit surfaces fall to violet/indigo, amber falls to blue-black, magenta
 * falls to deep plum. Letting shadows collapse to neutral black is what drains
 * an environment of colour.
 */
export function shadowFor(light: Color): Color {
	const hsl = { h: 0, s: 0, l: 0 };
	light.getHSL(hsl);
	// Rotate roughly toward the complement, keep saturation, drop luminance hard.
	const shifted = new Color();
	shifted.setHSL((hsl.h + 0.46) % 1, Math.min(0.85, hsl.s * 0.9 + 0.15), 0.09);
	return shifted;
}
