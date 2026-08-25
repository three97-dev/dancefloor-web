/**
 * Lighting design, per space.
 *
 * The venue is a building, so its interiors cannot be lit by an environment they
 * are enclosed from. A single global rig lights open volumes and leaves the
 * arrival, the canyon and the Observatory unexposed — which is measurable, and
 * was measured.
 *
 * So each space gets a designed rig, the way a lighting designer would treat a
 * real venue: a key that gives the room its direction, fill that reveals shadow
 * architecture, practicals physically built into the coves and reveals, and a
 * backlight that separates architecture from what lies behind it.
 *
 * Positions are in runtime (Three.js) space. The venue is authored in Blender,
 * where Z is up, so a Blender coordinate (x, y, z) is (x, z, -y) here. Getting
 * that flip wrong puts a light on the opposite side of the building, which has
 * already happened once.
 */

import type { ActId } from '$content/types';

/** What a light is for. Roles read from the act's colour territory. */
export type LightRole =
	/** Primary directional illumination — gives the space its direction. */
	| 'key'
	/** Reveals shadow architecture so nothing crushes to black. */
	| 'fill'
	/** Visible physical sources: coves, reveals, rails, canopy panels. */
	| 'practical'
	/** Signals and Dancefloor activity. */
	| 'accent'
	/** Separates architecture from the space beyond it. */
	| 'backlight';

export interface PracticalSpec {
	readonly role: LightRole;
	readonly position: readonly [number, number, number];
	readonly intensity: number;
	readonly distance: number;
	/**
	 * Which territory colour to take, or a literal for warm hospitality light.
	 * Not everything should be blue or magenta — warm practicals are what stop
	 * the venue reading as a computer game.
	 */
	readonly color: 'key' | 'counter' | 'accent' | 'haze' | string;
}

const warm = '#ffc27a';
const warmDeep = '#ffb066';
const coolWhite = '#dce8ff';

/**
 * Rigs per act.
 *
 * Enclosed spaces carry more practicals because they receive nothing from the
 * environment. Open volumes carry fewer, because the atmosphere is already
 * doing the work.
 */
export const RIGS: Record<ActId, readonly PracticalSpec[]> = {
	// ARRIVAL — a compressed, human-scale threshold. Warm hospitality light in
	// the soffit, with a cool opening ahead so the hall reads as somewhere to
	// move toward. This is the most enclosed space in the venue.
	ACT_I_FIELD_AT_REST: [
		{ role: 'practical', position: [0, 5.0, -68], intensity: 17, distance: 92, color: warm },
		{ role: 'practical', position: [0, 5.2, -52], intensity: 16, distance: 88, color: warm },
		{ role: 'practical', position: [-9, 4.2, -60], intensity: 10, distance: 60, color: warmDeep },
		{ role: 'practical', position: [9, 4.2, -60], intensity: 10, distance: 60, color: warmDeep },
		// Grazing light down the threshold walls, revealing material.
		{ role: 'fill', position: [0, 2.2, -74], intensity: 8, distance: 68, color: 'haze' },
		// The opening into the hall: the brightest thing ahead of the visitor.
		{ role: 'backlight', position: [0, 13, -28], intensity: 30, distance: 240, color: 'key' }
	],

	// CENTRAL HALL — the main room. Lit from the canopy above, with gallery
	// coves picking out the edges of every level.
	ACT_II_FRACTURE: [
		{ role: 'key', position: [0, 30, -4], intensity: 1020, distance: 200, color: 'key' },
		{ role: 'practical', position: [-33, 9.5, 0], intensity: 270, distance: 70, color: 'counter' },
		{ role: 'practical', position: [33, 9.5, 0], intensity: 270, distance: 70, color: 'key' },
		{ role: 'practical', position: [0, 18.5, -33], intensity: 270, distance: 70, color: 'accent' },
		{ role: 'practical', position: [0, 18.5, 33], intensity: 270, distance: 70, color: 'counter' },
		{ role: 'fill', position: [0, 6, 0], intensity: 360, distance: 110, color: 'haze' }
	],

	// THE COVERAGE TERRACE — broad, horizontal, analytical. Cyan grazing the
	// tiers, with the central hall glowing behind so the district stays connected.
	ACT_III_THE_PATCH: [
		{ role: 'key', position: [-96, 26, 0], intensity: 676, distance: 150, color: 'key' },
		{ role: 'practical', position: [-84, 17, 0], intensity: 312, distance: 80, color: 'key' },
		{ role: 'practical', position: [-108, 13, 0], intensity: 286, distance: 70, color: 'counter' },
		{ role: 'practical', position: [-96, 20, -30], intensity: 208, distance: 60, color: 'accent' },
		{ role: 'backlight', position: [-40, 20, 0], intensity: 520, distance: 130, color: 'haze' },
		{ role: 'fill', position: [-90, 8, 0], intensity: 234, distance: 90, color: 'haze' }
	],

	// THE GUIDANCE CANYON — tall, narrow, vertical. Violet washing the modular
	// masses, with light falling from above to give the passage its direction.
	ACT_IV_THE_RISE: [
		{ role: 'key', position: [96, 34, 0], intensity: 780, distance: 160, color: 'key' },
		{ role: 'practical', position: [96, 20, -22], intensity: 338, distance: 70, color: 'counter' },
		{ role: 'practical', position: [96, 20, 22], intensity: 338, distance: 70, color: 'counter' },
		{ role: 'practical', position: [84, 10, 0], intensity: 286, distance: 60, color: 'key' },
		{ role: 'practical', position: [108, 26, 0], intensity: 260, distance: 60, color: 'accent' },
		// Warm accent low in the canyon, so it is not one hue top to bottom.
		{ role: 'practical', position: [92, 4, 8], intensity: 182, distance: 40, color: warmDeep },
		{ role: 'backlight', position: [56, 22, 0], intensity: 416, distance: 110, color: 'haze' }
	],

	// BACK-OF-HOUSE — the richest colour environment in the venue, layered by
	// depth: cool overhead, violet through the middle, amber far below.
	ACT_V_RETURN_PATH: [
		{ role: 'key', position: [0, -5, 0], intensity: 88, distance: 150, color: 'key' },
		{ role: 'practical', position: [0, -8, -34], intensity: 52, distance: 80, color: 'counter' },
		{ role: 'practical', position: [0, -8, 34], intensity: 52, distance: 80, color: 'counter' },
		{ role: 'practical', position: [-30, -16, 0], intensity: 56, distance: 80, color: 'accent' },
		{ role: 'practical', position: [30, -16, 0], intensity: 56, distance: 80, color: 'accent' },
		{ role: 'fill', position: [0, -12, 0], intensity: 44, distance: 120, color: 'haze' },
		// Daylight from the public levels, falling down a service shaft.
		{ role: 'backlight', position: [0, 4, 0], intensity: 72, distance: 90, color: coolWhite }
	],

	// THE CONVERGENCE ATRIUM — the climax, where every level is perceived at
	// once. Lit generously, because this is the space the argument resolves in.
	ACT_VI_ONE_PLANE: [
		{ role: 'key', position: [0, 32, 0], intensity: 190, distance: 240, color: 'key' },
		{ role: 'practical', position: [-48, 18, 0], intensity: 70, distance: 110, color: 'counter' },
		{ role: 'practical', position: [48, 18, 0], intensity: 70, distance: 110, color: 'key' },
		{ role: 'practical', position: [0, 9, 0], intensity: 75, distance: 120, color: 'accent' },
		// The Observatory deck, where the commercial sections happen. Warm, calm,
		// and deliberately the quietest lighting in the venue.
		{ role: 'practical', position: [0, 32.5, 80], intensity: 900, distance: 60, color: warm },
		{ role: 'practical', position: [-22, 32.5, 84], intensity: 540, distance: 48, color: warm },
		{ role: 'practical', position: [22, 32.5, 84], intensity: 540, distance: 48, color: warmDeep },
		// Cove under the terrace ceiling, grazing the soffit.
		{ role: 'practical', position: [0, 35, 90], intensity: 480, distance: 44, color: 'haze' },
		// The venue below, seen from the deck.
		{ role: 'backlight', position: [0, 20, 20], intensity: 288, distance: 170, color: 'haze' }
	],

	// THE CITY — the whole property, seen from above and coordinated.
	ACT_VII_THE_CITY: [
		{ role: 'key', position: [0, 44, 0], intensity: 630, distance: 320, color: 'key' },
		{ role: 'practical', position: [-96, 22, 0], intensity: 240, distance: 140, color: 'key' },
		{ role: 'practical', position: [96, 22, 0], intensity: 240, distance: 140, color: 'counter' },
		{ role: 'practical', position: [0, 32, 84], intensity: 270, distance: 90, color: warm },
		{ role: 'practical', position: [0, -8, 0], intensity: 210, distance: 130, color: 'accent' },
		{ role: 'fill', position: [0, 24, 0], intensity: 180, distance: 260, color: 'haze' }
	]
};

/**
 * Candela gain applied to every practical.
 *
 * Three.js treats point-light intensity as candela with inverse-square falloff,
 * so illuminance at a surface is intensity / distance². The values above are
 * authored as readable relative weights; at venue scale — coves lighting a 40 m
 * hall from 20-30 m away — they need a large multiplier to produce any real
 * illuminance. Without this the rigs are physically present and visually absent,
 * which is exactly how the first measured pass behaved.
 */
/**
 * Base candela gain. Individual rigs are calibrated against measured frame
 * luminance rather than sharing one figure — a camera standing among its
 * practicals and one looking across a 70 m hall at the same lights need very
 * different values. That is why the brief defines the hierarchy per camera
 * state rather than once for the venue.
 */
export const PRACTICAL_GAIN = 6;

/** How many practicals a tier can afford. */
/**
 * How many practicals a tier can afford simultaneously.
 *
 * Every additional point light is per-fragment work for every lit surface, and
 * inside an enclosed venue the whole frame is lit surface. The nearest lights
 * are chosen each frame, so a small pool still covers the space the visitor is
 * actually standing in.
 */
export const RIG_BUDGET = { HIGH: 5, MEDIUM: 4, LOW: 2 } as const;
