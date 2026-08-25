/**
 * Desktop composition — cinematic maximum.
 *
 * Wide lateral compositions: the visitor travels *across* the field.
 * Placeholder previs values; replace from CAM_MASTER_DESKTOP in Blender.
 */

import type { CameraComposition } from './types';

export const CAMERA_DESKTOP: CameraComposition = {
	master: 'CAM_MASTER_DESKTOP',
	parallax: 0.35,
	scrollVh: 1000,
	keyframes: [
		// Act I — begin very close to one tile; it reads as an abstract luminous object.
		{ anchor: 'CAM_D_HERO', act: 'ACT_I_FIELD_AT_REST', at: 0.0, position: [0.35, 0.22, 0.9], target: [0, 0.06, 0], fov: 32 },
		{ anchor: 'CAM_D_HERO_PULL', act: 'ACT_I_FIELD_AT_REST', at: 0.077, position: [2.4, 1.6, 6.5], target: [0, 0, 0], fov: 40 },
		// Act II — the field separates into regions; drift laterally across the seams.
		{ anchor: 'CAM_D_FRACTURE', act: 'ACT_II_FRACTURE', at: 0.192, position: [-9, 4.2, 12], target: [1.5, 0.4, 0], fov: 46 },
		// Act III — move across the coverage terrain.
		{ anchor: 'CAM_D_ROAD', act: 'ACT_III_THE_PATCH', at: 0.269, position: [-16, 3.1, 4], target: [-2, 1.2, -2], fov: 42 },
		// Act IV — follow the corridor that the winning path opens.
		{ anchor: 'CAM_D_GUIDANCE', act: 'ACT_IV_THE_RISE', at: 0.346, position: [-4, 2.4, -8], target: [-4, 3.2, -22], fov: 38 },
		// Act V — drop under the floor and travel the return path.
		{ anchor: 'CAM_D_CAPTURE', act: 'ACT_V_RETURN_PATH', at: 0.423, position: [-2, -2.6, -26], target: [3, -1.4, -34], fov: 50 },
		// Act VI — rise back through the plane as the systems align.
		{ anchor: 'CAM_D_MODEL', act: 'ACT_VI_ONE_PLANE', at: 0.5, position: [6, 6.5, -30], target: [0, 0.5, -18], fov: 44 },
		// Act VII — the city reveal.
		{ anchor: 'CAM_D_OBSERVATORY', act: 'ACT_VI_ONE_PLANE', at: 0.73, position: [2, 14, -6], target: [0, 0.5, -20], fov: 40 },
		{ anchor: 'CAM_D_CITY', act: 'ACT_VII_THE_CITY', at: 0.962, position: [10, 46, -6], target: [0, 0, -14], fov: 52 },
		// Footer — the world recedes but never stops.
		{ anchor: 'CAM_D_SETTLE', act: 'ACT_VII_THE_CITY', at: 1.0, position: [4, 62, 30], target: [0, 0, -8], fov: 48 }
	]
};
