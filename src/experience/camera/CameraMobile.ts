/**
 * Mobile composition — cinematic focused.
 *
 * Depth rather than width. This is critical: the phone camera travels forward
 * and upward between a few strategically chosen tiles rather than flying across
 * a huge field. Every position must leave deliberate negative space for copy,
 * so text never lands on a visually busy area.
 *
 * Placeholder previs values; replace from CAM_MASTER_MOBILE in Blender.
 */

import type { CameraComposition } from './types';

export const CAMERA_MOBILE: CameraComposition = {
	master: 'CAM_MASTER_MOBILE',
	// No mouse-look on touch, and no gyroscope dependency by default.
	parallax: 0,
	scrollVh: 650,
	keyframes: [
		// Intimate framing: one tile fills the lower third, copy sits above it.
		{ anchor: 'CAM_M_HERO', act: 'ACT_I_FIELD_AT_REST', at: 0.0, position: [0.12, 0.16, 0.5], target: [0, 0.05, -0.1], fov: 44 },
		{ anchor: 'CAM_M_HERO_PULL', act: 'ACT_I_FIELD_AT_REST', at: 0.077, position: [0.4, 0.9, 3.0], target: [0, 0.1, -1.2], fov: 52 },
		// Travel between tiles, not over them. Seams open ahead of the camera.
		{ anchor: 'CAM_M_FRACTURE', act: 'ACT_II_FRACTURE', at: 0.192, position: [0, 1.5, 5.5], target: [0, 0.3, -3], fov: 58 },
		{ anchor: 'CAM_M_ROAD', act: 'ACT_III_THE_PATCH', at: 0.269, position: [0.6, 1.9, 1.5], target: [0.2, 0.9, -6], fov: 54 },
		{ anchor: 'CAM_M_GUIDANCE', act: 'ACT_IV_THE_RISE', at: 0.346, position: [0, 1.7, -6], target: [0, 2.6, -19], fov: 48 },
		{ anchor: 'CAM_M_CAPTURE', act: 'ACT_V_RETURN_PATH', at: 0.423, position: [0, -2.1, -22], target: [0.4, -1.2, -31], fov: 60 },
		// Upward through architecture before the field is revealed again.
		{ anchor: 'CAM_M_MODEL', act: 'ACT_VI_ONE_PLANE', at: 0.5, position: [1.2, 4.4, -26], target: [0, 0.6, -19], fov: 54 },
		{ anchor: 'CAM_M_OBSERVATORY', act: 'ACT_VI_ONE_PLANE', at: 0.73, position: [0.5, 9.5, -8], target: [0, 0.6, -21], fov: 50 },
		{ anchor: 'CAM_M_CITY', act: 'ACT_VII_THE_CITY', at: 0.962, position: [1.5, 34, -12], target: [0, 0, -17], fov: 62 },
		{ anchor: 'CAM_M_SETTLE', act: 'ACT_VII_THE_CITY', at: 1.0, position: [0, 46, 14], target: [0, 0, -10], fov: 58 }
	]
};
