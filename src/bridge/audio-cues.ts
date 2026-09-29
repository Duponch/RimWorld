import type { World } from '../sim/types.ts';
import { isConstruction } from '../sim/construction-rules.ts';
import { isTailoring, stationAccepts, taskRecipe } from '../sim/production-recipes.ts';
import { WORK_FRACTIONS } from '../sim/work-progress.ts';

export type AudioCueKind = 'mining.hit' | 'woodcutting.hit' | 'construction.hit'
  | 'cooking.work' | 'crafting.work' | 'tailoring.work' | 'butchering.work' | 'research.work'
  | 'weapon.gunshot' | 'weapon.melee';
export interface AudioCue {
  id: string;
  tick: number;
  kind: AudioCueKind;
  x: number;
  z: number;
  intensity?: number;
}

const MAX_CUES_PER_TICK = 32;
const MAX_PENDING_CUES = 128;
const WORK_CUE_INTERVAL_TICKS = 3;
const STATION_CUE_INTERVAL_TICKS = 8;

type WorkObservation = { key: string; progress: number; lastCueTick: number };

/** Presentation-only observer. Its state is neither simulation input nor saved. */
export class AudioCueRecorder {
  private initialized = false;
  private tick = -1;
  private tickCount = 0;
  private readonly pending: AudioCue[] = [];
  private work = new Map<number, WorkObservation>();
  private projectiles = new Set<number>();
  private shooting = new Map<number, number>();
  private melee = new Map<number, number>();

  reset(): void {
    this.initialized = false;
    this.tick = -1;
    this.tickCount = 0;
    this.pending.length = 0;
    this.work.clear();
    this.projectiles.clear();
    this.shooting.clear();
    this.melee.clear();
  }

  capture(world: World): void {
    if (world.tick !== this.tick) { this.tick = world.tick; this.tickCount = 0; }
    const previousWork = this.work;
    const previousProjectiles = this.projectiles;
    const previousShooting = this.shooting;
    const previousMelee = this.melee;
    const work = new Map<number, WorkObservation>();
    const projectiles = new Set<number>();
    const shooting = new Map<number, number>();
    const emittedShots = new Set<string>();
    const melee = new Map<number, number>();
    const jobs = new Map(world.jobs.map(job => [job.id, job]));
    let stations: Map<number, World['structures'][number]> | undefined;
    const stationFor = (id: number): World['structures'][number] | undefined => {
      stations ??= new Map(world.structures.map(station => [station.id, station]));
      return stations.get(id);
    };

    const recordWork = (pawnId: number, key: string, progress: number, kind: AudioCueKind,
      x: number, z: number, active: boolean, interval: number): void => {
      const previous = previousWork.get(pawnId);
      const sameTask = previous?.key === key;
      const lastCueTick = sameTask ? previous.lastCueTick : -Infinity;
      if (this.initialized && active && sameTask && progress > previous.progress
        && world.tick - lastCueTick >= interval) {
        this.add({ id: `${kind}:${world.tick}:${pawnId}:${key}`, tick: world.tick, kind, x, z });
        work.set(pawnId, { key, progress, lastCueTick: world.tick });
      } else work.set(pawnId, { key, progress, lastCueTick });
    };

    for (const pawn of world.pawns) {
      const job = pawn.jobId === null ? undefined : jobs.get(pawn.jobId);
      if (job && (job.kind === 'mine' || job.kind === 'chop' || isConstruction(job)) && !job.furniture
        && job.installationWork !== 'haul') {
        const kind = job.kind === 'mine' ? 'mining.hit' : job.kind === 'chop' ? 'woodcutting.hit' : 'construction.hit';
        recordWork(pawn.id, `job:${job.id}`, job.progress * WORK_FRACTIONS + (job.workRemainder ?? 0), kind,
          job.x, job.z, pawn.state === 'working', WORK_CUE_INTERVAL_TICKS);
      } else if (pawn.cooking) {
        const task = pawn.cooking, station = stationFor(task.stationId), recipe = taskRecipe(task);
        if (station && stationAccepts(station, recipe)) {
          const kind: AudioCueKind = recipe === 'simple-meal' || recipe === 'fine-meal' || recipe === 'vegetarian-fine-meal' || recipe === 'carnivore-fine-meal' || recipe === 'lavish-meal' || recipe === 'vegetarian-lavish-meal' || recipe === 'cook-carnivore-lavish-meal' ? 'cooking.work'
            : recipe === 'butcher-creature' ? 'butchering.work'
              : isTailoring(recipe) ? 'tailoring.work' : 'crafting.work';
          recordWork(pawn.id, `production:${station.id}:${task.billId}:${recipe}`, task.progress, kind,
            station.x, station.z, task.phase === 'work' && pawn.state === 'working', STATION_CUE_INTERVAL_TICKS);
        }
      } else if (pawn.research) {
        const task = pawn.research, station = stationFor(task.stationId);
        if (station && (station.kind === 'research-bench' || station.kind === 'hi-tech-research-bench'))
          recordWork(pawn.id, `research:${station.id}`, task.worked, 'research.work', station.x, station.z,
            pawn.state === 'working', STATION_CUE_INTERVAL_TICKS);
      }
      const strike = pawn.melee?.strike;
      if (strike) {
        melee.set(pawn.id, strike.atCore);
        if (this.initialized && previousMelee.get(pawn.id) !== strike.atCore)
          this.add({ id: `melee:${strike.atCore}:${pawn.id}`, tick: world.tick,
            kind: 'weapon.melee', x: pawn.x, z: pawn.z });
      }
      const stance = pawn.shooting?.stance;
      if (stance?.phase === 'cooldown') {
        shooting.set(pawn.id, stance.startedAtCore);
        emittedShots.add(`${pawn.id}:${stance.startedAtCore}`);
        if (this.initialized && previousShooting.get(pawn.id) !== stance.startedAtCore) {
          this.add({ id: `shot:${pawn.id}:${stance.startedAtCore}`, tick: world.tick,
            kind: 'weapon.gunshot', x: pawn.x + .5, z: pawn.z + .5 });
        }
      }
    }
    for (const projectile of world.projectiles ?? []) {
      projectiles.add(projectile.id);
      const launcher = projectile.flight.launcherKey;
      const shotKey = launcher?.startsWith('pawn:') ? `${launcher.slice(5)}:${projectile.emittedAtCore}` : undefined;
      if (this.initialized && !previousProjectiles.has(projectile.id) && (!shotKey || !emittedShots.has(shotKey)))
        this.add({ id: `shot:${projectile.id}`, tick: world.tick, kind: 'weapon.gunshot',
          x: projectile.flight.origin.x, z: projectile.flight.origin.z });
    }
    this.work = work;
    this.projectiles = projectiles;
    this.shooting = shooting;
    this.melee = melee;
    this.initialized = true;
  }

  drain(): AudioCue[] {
    const cues = this.pending.slice();
    this.pending.length = 0;
    return cues;
  }

  private add(cue: AudioCue): void {
    if (this.tickCount >= MAX_CUES_PER_TICK || this.pending.length >= MAX_PENDING_CUES) return;
    this.pending.push(cue);
    this.tickCount++;
  }
}
