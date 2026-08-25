/**
 * Tablet composition — cinematic compressed.
 *
 * Not the desktop path scaled down: closer, with less lateral travel, so the
 * visitor moves *through* the environment rather than across it.
 * Placeholder previs values; replace from CAM_MASTER_TABLET in Blender.
 */

import type { CameraComposition } from './types';

export const CAMERA_TABLET: CameraComposition = {
	master: 'CAM_MASTER_TABLET',
	parallax: 0,
	scrollVh: 800,
	keyframes: [
		{ anchor: 'CAM_T_HERO', act: 'ACT_I_FIELD_AT_REST', at: 0.0, position: [0.28, 0.2, 0.72], target: [0, 0.06, 0], fov: 36 },
		{ anchor: 'CAM_T_HERO_PULL', act: 'ACT_I_FIELD_AT_REST', at: 0.077, position: [1.5, 1.4, 5.2], target: [0, 0, 0], fov: 44 },
		{ anchor: 'CAM_T_FRACTURE', act: 'ACT_II_FRACTURE', at: 0.192, position: [-5, 3.6, 9], target: [0.8, 0.4, 0], fov: 50 },
		{ anchor: 'CAM_T_ROAD', act: 'ACT_III_THE_PATCH', at: 0.269, position: [-9, 2.8, 3], target: [-1.5, 1.1, -3], fov: 46 },
		{ anchor: 'CAM_T_GUIDANCE', act: 'ACT_IV_THE_RISE', at: 0.346, position: [-3, 2.2, -7], target: [-3, 3, -20], fov: 42 },
		{ anchor: 'CAM_T_CAPTURE', act: 'ACT_V_RETURN_PATH', at: 0.423, position: [-1.5, -2.4, -24], target: [2, -1.3, -32], fov: 54 },
		{ anchor: 'CAM_T_MODEL', act: 'ACT_VI_ONE_PLANE', at: 0.5, position: [4, 5.6, -28], target: [0, 0.5, -18], fov: 48 },
		{ anchor: 'CAM_T_OBSERVATORY', act: 'ACT_VI_ONE_PLANE', at: 0.73, position: [1.5, 12, -5], target: [0, 0.5, -19], fov: 44 },
		{ anchor: 'CAM_T_CITY', act: 'ACT_VII_THE_CITY', at: 0.962, position: [6, 40, -8], target: [0, 0, -15], fov: 56 },
		{ anchor: 'CAM_T_SETTLE', act: 'ACT_VII_THE_CITY', at: 1.0, position: [2, 54, 22], target: [0, 0, -9], fov: 52 }
	]
};
