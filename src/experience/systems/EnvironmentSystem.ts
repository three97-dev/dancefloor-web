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
	CylinderGeometry,
	InstancedMesh,
	Matrix4,
	MeshStandardMaterial,
	Object3D,
	type Scene
} from 'three';
import { GRID } from '$content/scene-data';
import type { QualitySettings } from '../quality';
import type { ExperienceState } from '../scroll/ExperienceTimeline';

export class EnvironmentSystem {
	#towers: InstancedMesh;
	#conduits: InstancedMesh;
	#dummy = new Object3D();
	#towerCount: number;
	#conduitCount: number;

	constructor(scene: Scene, quality: QualitySettings) {
		const span = GRID.tileSize * quality.grid.rows * 0.5;

		// Isolated structures during Fracture; neighbourhoods during The city.
		this.#towerCount = Math.round(24 * quality.underfloorDensity + 8);
		const towerGeo = new BoxGeometry(1.6, 1, 1.6);
		const towerMat = new MeshStandardMaterial({
			color: '#0e1216',
			roughness: 0.55,
			metalness: 0.7
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
			color: '#141a1f',
			roughness: 0.7,
			metalness: 0.5
		});
		this.#conduits = new InstancedMesh(conduitGeo, conduitMat, this.#conduitCount);
		this.#conduits.name = 'UNDERFLOOR';
		this.#conduits.frustumCulled = false;
		scene.add(this.#conduits);

		this.#layoutConduits(span);
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
		this.#conduits.visible = state.returnPath > 0.02 || state.alignment > 0.4;
	}

	dispose() {
		for (const mesh of [this.#towers, this.#conduits]) {
			mesh.geometry.dispose();
			(mesh.material as MeshStandardMaterial).dispose();
			mesh.removeFromParent();
		}
	}
}

const fract = (v: number) => v - Math.floor(v);
