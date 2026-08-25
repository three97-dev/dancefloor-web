/**
 * Camera composition types.
 *
 * Blender remains the visual composition source of truth. These keyframes are
 * the runtime representation of the Blender previs cameras
 * (CAM_MASTER_DESKTOP / TABLET / MOBILE plus per-act anchors), and are intended
 * to be replaced wholesale by exported previs data — not hand-tuned forever.
 */

import type { ActId } from '$content/types';

export type Vec3 = readonly [number, number, number];

export interface CameraKeyframe {
	/** Blender object name this keyframe corresponds to, e.g. CAM_D_HERO. */
	readonly anchor: string;
	/** Act this anchor belongs to. */
	readonly act: ActId;
	/** Normalized master progress, 0-1, at which the camera is exactly here. */
	readonly at: number;
	readonly position: Vec3;
	readonly target: Vec3;
	readonly fov: number;
}

export interface CameraComposition {
	/** Blender master camera name. */
	readonly master: string;
	readonly keyframes: readonly CameraKeyframe[];
	/** Pointer parallax strength in world units. Zero disables it. */
	readonly parallax: number;
	/** Total scroll distance for this class, in viewport heights. */
	readonly scrollVh: number;
}
