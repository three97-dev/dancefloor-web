/**
 * Architectural transformation across the acts.
 *
 * Owns everything that is not the tile field itself: the underfloor
 * infrastructure the return path travels through, and the towers that rise
 * during Fracture and resolve into city massing in Act VII.
 *
 * Phase 1 geometry is greybox. Blender replaces the meshes; the transform
 * choreography below stays.
 */

import {
	BoxGeometry,
	Color,
	CylinderGeometry,
	InstancedMesh,
	Matrix4,
	MeshBasicMaterial,
	MeshStandardMaterial,
	Object3D,
	SphereGeometry,
	type Scene
} from 'three';
import { GRID } from '$content/scene-data';
import type { QualitySettings } from '../quality';
import type { ExperienceState } from '../scroll/ExperienceTimeline';

export class EnvironmentSystem {
	#towers: InstancedMesh;
	#conduits: InstancedMesh;
	/** Luminous junctions along the underfloor routes. */
	#junctions: InstancedMesh;
	#junctionCount: number;
	#junctionMat: MeshBasicMaterial;
	#dummy = new Object3D();
	#towerCount: number;
	#conduitCount: number;

	constructor(scene: Scene, quality: QualitySettings) {
		const span = GRID.tileSize * quality.grid.rows * 0.5;

		// Isolated structures during Fracture; neighbourhoods during The city.
		this.#towerCount = Math.round(24 * quality.underfloorDensity + 8);
		const towerGeo = new BoxGeometry(1.6, 1, 1.6);
		// Medium-value cool concrete. Structures must be able to receive coloured
		// environmental light; near-black masses simply swallow it.
		const towerMat = new MeshStandardMaterial({
			color: '#4a525e',
			roughness: 0.62,
			metalness: 0.25
		});
		this.#towers = new InstancedMesh(towerGeo, towerMat, this.#towerCount);
		this.#towers.name = 'TOWERS';
		this.#towers.frustumCulled = false;
		this.#towers.castShadow = quality.shadows;
		scene.add(this.#towers);

		// Underfloor infrastructure the signals route through.
		this.#conduitCount = Math.round(18 * quality.underfloorDensity + 6);
		const conduitGeo = new CylinderGeometry(0.09, 0.09, span * 2, 6);
		const conduitMat = new MeshStandardMaterial({
			color: '#3d4a5c',
			roughness: 0.5,
			metalness: 0.45
		});
		this.#conduits = new InstancedMesh(conduitGeo, conduitMat, this.#conduitCount);
		this.#conduits.name = 'UNDERFLOOR';
		this.#conduits.frustumCulled = false;
		scene.add(this.#conduits);

		// §40: the underside is infrastructure, not a black tunnel. Luminous
		// junctions along the routes are what make it one of the richest colour
		// environments in the site rather than the darkest.
		this.#junctionCount = Math.round(60 * quality.underfloorDensity + 20);
		this.#junctionMat = new MeshBasicMaterial({ color: new Color('#31e0f0'), toneMapped: false });
		this.#junctions = new InstancedMesh(
			new SphereGeometry(0.42, 8, 6),
			this.#junctionMat,
			this.#junctionCount
		);
		this.#junctions.name = 'UNDERFLOOR_JUNCTIONS';
		this.#junctions.frustumCulled = false;
		scene.add(this.#junctions);

		this.#layoutConduits(span);
		this.#layoutJunctions(span);
	}

	#layoutJunctions(span: number) {
		for (let i = 0; i < this.#junctionCount; i++) {
			const a = fract(Math.sin(i * 19.31) * 43758.5453);
			const b = fract(Math.sin(i * 7.77) * 43758.5453);
			const c = fract(Math.sin(i * 41.3) * 43758.5453);
			this.#dummy.position.set(
				(a - 0.5) * span * 1.8,
				// Layered by depth: cyan and blue high, violet mid, amber deep.
				-2.4 - c * 26,
				(b - 0.5) * span * 1.8
			);
			this.#dummy.scale.setScalar(0.6 + c * 1.9);
			this.#dummy.updateMatrix();
			this.#junctions.setMatrixAt(i, this.#dummy.matrix);
		}
		this.#junctions.instanceMatrix.needsUpdate = true;
	}

	#layoutConduits(span: number) {
		for (let i = 0; i < this.#conduitCount; i++) {
			const t = (i / (this.#conduitCount - 1) - 0.5) * 2;
			this.#dummy.position.set(t * span * 0.8, -2.9, 0);
			this.#dummy.rotation.set(Math.PI / 2, 0, 0);
			this.#dummy.scale.setScalar(1);
			this.#dummy.updateMatrix();
			this.#conduits.setMatrixAt(i, this.#dummy.matrix);
		}
		this.#conduits.instanceMatrix.needsUpdate = true;
	}

	update(state: ExperienceState) {
		const span = GRID.tileSize * 18;

		for (let i = 0; i < this.#towerCount; i++) {
			// Deterministic scatter — the skyline is identical on every load.
			const a = Math.sin(i * 12.9898) * 43758.5453;
			const b = Math.sin(i * 78.233) * 43758.5453;
			const x = (fract(a) - 0.5) * span * 2.4;
			const z = (fract(b) - 0.5) * span * 2.4 - 10;

			// Towers appear in Fracture as isolated structures, subside as the
			// systems align, then return as city massing.
			const isolated = state.fracture * (0.6 + fract(a * 3) * 1.8);
			const massing = state.city * (2 + fract(b * 5) * 14);
			const height = Math.max(0.001, isolated + massing);

			this.#dummy.position.set(x, height * 0.5 - 0.06, z);
			this.#dummy.scale.set(1, height, 1);
			this.#dummy.rotation.set(0, fract(a * 7) * Math.PI, 0);
			this.#dummy.updateMatrix();
			this.#towers.setMatrixAt(i, this.#dummy.matrix);
		}
		this.#towers.instanceMatrix.needsUpdate = true;

		// The underfloor is only worth drawing while the return path is live.
		const underfloorVisible = state.returnPath > 0.02 || state.alignment > 0.4;
		this.#conduits.visible = underfloorVisible;
		this.#junctions.visible = underfloorVisible;
		// Junctions take the act's accent, so the deep infrastructure reads amber
		// and coral against the blue and violet structure above it.
		this.#junctionMat.color.copy(state.territory.accent);
	}

	dispose() {
		this.#junctionMat.dispose();
		for (const mesh of [this.#towers, this.#conduits, this.#junctions]) {
			mesh.geometry.dispose();
			(mesh.material as MeshStandardMaterial).dispose();
			mesh.removeFromParent();
		}
	}
}

const fract = (v: number) => v - Math.floor(v);
