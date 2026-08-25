/**
 * The single environment.
 *
 * One scene, built once, that evolves continuously. Nothing here is recreated
 * when the visitor enters a new section — the acts are states of this world,
 * not separate worlds.
 */

import { Scene } from 'three';
import type { QualitySettings } from './quality';
import type { ExperienceState } from './scroll/ExperienceTimeline';
import { AmbientSystem } from './systems/AmbientSystem';
import { DancefloorSystem } from './systems/DancefloorSystem';
import { EnvironmentSystem } from './systems/EnvironmentSystem';
import { LightingSystem } from './systems/LightingSystem';
import { SignalSystem } from './systems/SignalSystem';

export class World {
	readonly scene = new Scene();
	readonly dancefloor: DancefloorSystem;
	readonly signals: SignalSystem;
	readonly environment: EnvironmentSystem;
	readonly lighting: LightingSystem;
	readonly ambient = new AmbientSystem();

	constructor(quality: QualitySettings) {
		this.scene.name = 'DANCEFLOOR_WORLD';
		this.lighting = new LightingSystem(this.scene, quality);
		this.dancefloor = new DancefloorSystem(this.scene, quality);
		this.environment = new EnvironmentSystem(this.scene, quality);
		this.signals = new SignalSystem(this.scene, quality);
	}

	update(dt: number, state: ExperienceState) {
		this.ambient.update(dt);
		this.dancefloor.update(state, (i, phase) => this.ambient.activityAt(i, phase));
		this.environment.update(state);
		this.signals.update(dt, state);
		this.lighting.update(state);
	}

	dispose() {
		this.dancefloor.dispose();
		this.signals.dispose();
		this.environment.dispose();
		this.lighting.dispose();
	}
}
