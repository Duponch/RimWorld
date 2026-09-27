import * as THREE from 'three/webgpu';
import { Fn, If, attribute, atan, cos, float, mix, sin, smoothstep, uniform, uv, vec2, vec3, vec4 } from 'three/tsl';
import type { Pawn, World } from '../sim/types';
import { TICKS_PER_SECOND } from '../sim/types';
import { footprintCells } from '../sim/definitions';
import type { PawnLayer } from './PawnLayer';
import { pawnPresentationPose } from './pawn-presentation';

/** These are presentation codes, never saved in the world or consumed by AI. */
export const ACTION_FX = {
  none: 0, brawl: 1, sleep: 2, chop: 3, mine: 4, build: 5,
  cook: 6, craft: 7, research: 8, extinguish: 9,
} as const;

export type ActionFx = { kind: number; x: number; z: number };
const NONE: ActionFx = { kind: ACTION_FX.none, x: 0, z: 0 };

function nearestStationCell(pawn: Pawn, station: World['structures'][number] | undefined): { x: number; z: number } | undefined {
  if (!station) return undefined;
  const cells = footprintCells(station);
  let closest = cells[0];
  let best = Infinity;
  for (const cell of cells) {
    const distance = (cell.x - pawn.x) ** 2 + (cell.z - pawn.z) ** 2;
    if (distance < best) { best = distance; closest = cell; }
  }
  return closest;
}

/** Selection is evaluated only for confirmed snapshots. No random numbers or
 * presentation objects enter the authoritative world. */
export function actionFxForPawn(
  world: World,
  pawn: Pawn,
  pawnsById: ReadonlyMap<number, Pawn>,
  jobsById: ReadonlyMap<number, World['jobs'][number]>,
  structuresById: ReadonlyMap<number, World['structures'][number]>,
  firesById?: ReadonlyMap<number, NonNullable<World['fires']>['items'][number]>,
): ActionFx {
  if (pawn.state === 'dead' || pawn.body?.pileId !== undefined || pawn.body?.lostAt !== undefined) return NONE;
  const opponentId = pawn.social?.fight?.opponentId;
  const opponent = opponentId === undefined ? undefined : pawnsById.get(opponentId);
  if (opponent && pawn.id < opponent.id && opponent.social?.fight?.opponentId === pawn.id && opponent.state !== 'dead') {
    const distance = Math.hypot(opponent.x - pawn.x, opponent.z - pawn.z);
    if (distance <= 1.6) return { kind: ACTION_FX.brawl, x: opponent.x, z: opponent.z };
  }
  const strike = pawn.melee?.strike;
  const meleeTarget = strike && !strike.structure ? pawnsById.get(strike.targetId) : undefined;
  if (meleeTarget && meleeTarget.state !== 'dead' &&
    (meleeTarget.melee?.strike?.targetId !== pawn.id || pawn.id < meleeTarget.id) &&
    Math.hypot(meleeTarget.x - pawn.x, meleeTarget.z - pawn.z) <= 1.6)
    return { kind: ACTION_FX.brawl, x: meleeTarget.x, z: meleeTarget.z };
  if (pawn.state === 'sleeping') return { kind: ACTION_FX.sleep, x: pawn.x, z: pawn.z };
  if (pawn.state !== 'working' || pawn.stun) return NONE;

  if (pawn.firefighting?.phase === 'beat') {
    const fire = firesById?.get(pawn.firefighting.fireId) ??
      (!firesById ? world.fires?.items.find(item => item.id === pawn.firefighting!.fireId) : undefined);
    if (fire) return { kind: ACTION_FX.extinguish, x: fire.x, z: fire.z };
  }
  if (pawn.cooking?.phase === 'work') {
    const station = structuresById.get(pawn.cooking.stationId);
    const contact = nearestStationCell(pawn, station) ?? pawn.cooking.actionCell;
    const recipe = pawn.cooking.recipe;
    const isMeal = !recipe || recipe === 'butcher-creature';
    return { kind: isMeal ? ACTION_FX.cook : ACTION_FX.craft,
      x: contact.x, z: contact.z };
  }
  if (pawn.research) {
    const station = structuresById.get(pawn.research.stationId);
    const contact = nearestStationCell(pawn, station) ?? pawn;
    return { kind: ACTION_FX.research, x: contact.x, z: contact.z };
  }
  if (pawn.jobId !== null) {
    const job = jobsById.get(pawn.jobId);
    if (job?.status === 'active' && job.reservedBy === pawn.id) {
      const kind = job.kind === 'chop' || job.kind === 'cut' || job.clearance ? ACTION_FX.chop
        : job.kind === 'mine' ? ACTION_FX.mine : ACTION_FX.build;
      if (kind === ACTION_FX.mine) {
        const dx = pawn.x - job.x, dz = pawn.z - job.z, distance = Math.hypot(dx, dz);
        // The rock fills most of its cell. Put the sparks at the near face so
        // they remain visible instead of being depth-tested inside the rock.
        if (distance > .001) return { kind, x: job.x + dx / distance * .43, z: job.z + dz / distance * .43 };
      }
      return { kind, x: job.x, z: job.z };
    }
  }
  return NONE;
}

const SPRITES_PER_PAWN = 12;
const sourceNames = ['aFrom', 'aTo', 'aTravel'] as const;

function spriteGeometry(): THREE.InstancedBufferGeometry {
  const geometry = new THREE.InstancedBufferGeometry();
  const positions: number[] = [], uvs: number[] = [], parts: number[] = [], indices: number[] = [];
  for (let part = 0; part < SPRITES_PER_PAWN; part++) {
    const base = positions.length / 3;
    positions.push(-.5, -.5, 0, .5, -.5, 0, -.5, .5, 0, .5, .5, 0);
    uvs.push(0, 0, 1, 0, 0, 1, 1, 1);
    parts.push(part, part, part, part);
    indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('actionPart', new THREE.Float32BufferAttribute(parts, 1));
  geometry.setIndex(indices);
  for (const name of sourceNames)
    geometry.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(4), 4));
  geometry.setAttribute('actionFx', new THREE.InstancedBufferAttribute(new Float32Array(4), 4).setUsage(THREE.StaticDrawUsage));
  geometry.instanceCount = 0;
  return geometry;
}

/** One resident instanced sprite draw for actor action symbols. Positions and
 * cycles run in the vertex shader, shapes in the fragment shader. The only
 * CPU work is choosing an effect when a confirmed world snapshot arrives. */
export class ActionVfxLayer {
  readonly group = new THREE.Group();
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.SpriteNodeMaterial>;
  private readonly time = uniform(0);
  private capacity = 1;
  private active = false;
  private detailVisible = true;

  constructor(private readonly clock: Pick<PawnLayer, 'travelTime' | 'blend'>) {
    const geometry = spriteGeometry();
    // Comic marks belong in front of the hand/contact silhouette. All active
    // marks are anchored to confirmed actors/targets, so disabling depthTest
    // avoids half-glyphs being clipped by a bed, rock or torso.
    const material = new THREE.SpriteNodeMaterial({ transparent: true, depthTest: false, depthWrite: false, alphaTest: .08 });
    material.positionNode = Fn(() => {
      const fx = attribute('actionFx', 'vec4'), part = attribute('actionPart', 'float');
      const pose = pawnPresentationPose(this.clock);
      const brawl = fx.x.equal(ACTION_FX.brawl), sleeping = fx.x.equal(ACTION_FX.sleep);
      const angle = part.mul(2.39996323).add(fx.w.mul(.13));
      const cycle = this.time.mul(1.65).add(part.mul(.137)).fract();
      const pulse = sin(this.time.mul(2 * Math.PI * .75).add(part.mul(1.9))).mul(.045);
      const target = vec3(fx.y, 0, fx.z);
      const center = brawl.select(mix(pose.xyz, target, .5), sleeping.select(pose.xyz, target));
      const spread = brawl.select(part.greaterThanEqual(8).select(float(.92), part.lessThan(3).select(float(.20), float(.43))), float(.15).add(cycle.mul(.33)));
      const contactY = fx.x.greaterThanEqual(ACTION_FX.cook).and(fx.x.lessThanEqual(ACTION_FX.research)).select(float(1.02), float(.71));
      const offset = vec3(cos(angle).mul(spread),
        brawl.select(float(1.28).add(sin(angle.mul(2)).mul(.17)).add(pulse),
          sleeping.select(float(1.10).add(part.mul(.16)).add(cycle.mul(.18)),
            contactY.add(cycle.mul(.52)).sub(cycle.mul(cycle).mul(.38)))),
        sin(angle).mul(spread));
      const sleepOffset = vec3(sin(pose.w).mul(-.88).add(part.mul(.12)).add(cycle.mul(.08)), 0,
        cos(pose.w).mul(-.88).add(part.mul(.07)));
      return center.add(offset).add(sleeping.select(sleepOffset, vec3(0)));
    })();
    material.scaleNode = Fn(() => {
      const kind = attribute('actionFx', 'vec4').x, part = attribute('actionPart', 'float');
      const brawl = kind.equal(ACTION_FX.brawl), sleeping = kind.equal(ACTION_FX.sleep);
      const visible = brawl.or(sleeping.and(part.lessThan(3))).or(kind.greaterThanEqual(ACTION_FX.chop).and(part.lessThan(8)));
      const size = brawl.select(part.greaterThanEqual(8).select(float(.43),
        float(1.02).add(sin(part.mul(2.1)).mul(.14))),
        sleeping.select(float(.384).add(part.mul(.044)), float(.16)));
      return vec2(size.mul(visible.select(1, 0)));
    })();
    material.colorNode = Fn(() => {
      const fx = attribute('actionFx', 'vec4'), part = attribute('actionPart', 'float');
      const pixel = uv().sub(vec2(.5));
      const radius = pixel.length();
      const cycle = this.time.mul(1.65).add(part.mul(.137)).fract();
      const color = vec3(.95, .9, .76).toVar();
      const alpha = float(0).toVar();
      const isBrawl = fx.x.equal(ACTION_FX.brawl), isStar = isBrawl.and(part.greaterThanEqual(8));
      If(isBrawl, () => {
        // Soft overlapping parchment clouds with a dark comic outline.
        alpha.assign(float(1).sub(smoothstep(.45, .49, radius)).mul(.98));
        color.assign(mix(vec3(.98, .95, .85), vec3(.13, .10, .075), smoothstep(.29, .38, radius)));
      });
      If(isStar, () => {
        const theta = atan(pixel.y, pixel.x);
        const edge = cos(theta.mul(5)).mul(.095).add(.30);
        alpha.assign(float(1).sub(smoothstep(edge.sub(.018), edge.add(.018), radius)));
        color.assign(mix(vec3(1, .7, .1), vec3(.35, .23, .12), smoothstep(edge.sub(.065), edge.sub(.025), radius)));
      });
      If(fx.x.equal(ACTION_FX.sleep), () => {
        // Three connected strokes form each Z; its diagonal rises toward the
        // top right in the sprite plane. All are evaluated as GPU shapes.
        const p = uv();
        const inX = smoothstep(.10, .16, p.x).mul(float(1).sub(smoothstep(.84, .90, p.x)));
        const inY = smoothstep(.16, .23, p.y).mul(float(1).sub(smoothstep(.77, .84, p.y)));
        const topStroke = float(1).sub(smoothstep(.045, .085, p.y.sub(.77).abs()));
        const bottomStroke = float(1).sub(smoothstep(.045, .085, p.y.sub(.23).abs()));
        const diagonal = float(1).sub(smoothstep(.055, .095, p.y.sub(p.x).abs()));
        alpha.assign(topStroke.max(bottomStroke).mul(inX).max(diagonal.mul(inX).mul(inY))
          .mul(smoothstep(0, .08, cycle)).mul(float(1).sub(smoothstep(.89, 1, cycle))));
        color.assign(vec3(.045, .105, .075));
      });
      If(fx.x.greaterThanEqual(ACTION_FX.chop), () => {
        // Angular chips/sparks cover the hand-contact area without image files.
        const cut = pixel.x.abs().mul(.65).add(pixel.y.abs());
        alpha.assign(float(1).sub(smoothstep(.29, .37, cut)).mul(float(1).sub(smoothstep(.63, .99, cycle))));
        If(fx.x.equal(ACTION_FX.mine), () => color.assign(vec3(.81, .78, .68)));
        If(fx.x.equal(ACTION_FX.chop), () => color.assign(vec3(.85, .55, .24)));
        If(fx.x.equal(ACTION_FX.build), () => color.assign(vec3(.95, .8, .44)));
        If(fx.x.equal(ACTION_FX.cook), () => color.assign(vec3(.96, .92, .76)));
        If(fx.x.equal(ACTION_FX.craft), () => color.assign(vec3(1, .66, .18)));
        If(fx.x.equal(ACTION_FX.research), () => color.assign(vec3(.53, .81, 1)));
        If(fx.x.equal(ACTION_FX.extinguish), () => color.assign(vec3(.74, .84, .96)));
      });
      return vec4(color, alpha);
    })();
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'Action VFX — shared comic GPU sprites';
    this.mesh.renderOrder = 4;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.group.add(this.mesh);
  }

  update(world: World, source: THREE.InstancedBufferGeometry): void {
    const geometry = this.mesh.geometry;
    for (const name of sourceNames) {
      const borrowed = source.getAttribute(name);
      if (geometry.getAttribute(name) !== borrowed) geometry.setAttribute(name, borrowed);
    }
    if (world.pawns.length > this.capacity) {
      this.capacity = 2 ** Math.ceil(Math.log2(world.pawns.length));
      geometry.setAttribute('actionFx', new THREE.InstancedBufferAttribute(new Float32Array(this.capacity * 4), 4).setUsage(THREE.StaticDrawUsage));
    }
    let fighting = false, working = false, hasJob = false, hasStation = false, hasFirefight = false, sleeping = false;
    for (const pawn of world.pawns) {
      fighting ||= pawn.social?.fight !== undefined || pawn.melee?.strike != null;
      sleeping ||= pawn.state === 'sleeping';
      if (pawn.state === 'working') {
        working = true;
        hasJob ||= pawn.jobId !== null;
        hasStation ||= pawn.cooking?.phase === 'work' || pawn.research !== undefined;
        hasFirefight ||= pawn.firefighting?.phase === 'beat';
      }
    }
    if (!fighting && !working && !sleeping) {
      this.active = false;
      geometry.instanceCount = 0;
      this.mesh.visible = false;
      return;
    }
    const pawnsById = fighting ? new Map(world.pawns.map(p => [p.id, p])) : new Map<number, Pawn>();
    const jobsById = hasJob ? new Map(world.jobs.filter(j => j.status === 'active').map(j => [j.id, j])) : new Map<number, World['jobs'][number]>();
    const structuresById = hasStation ? new Map(world.structures.map(s => [s.id, s])) : new Map<number, World['structures'][number]>();
    const firesById = hasFirefight ? new Map((world.fires?.items ?? []).map(fire => [fire.id, fire])) : undefined;
    const values = geometry.getAttribute('actionFx') as THREE.InstancedBufferAttribute;
    let dirty = false, lastActive = -1;
    world.pawns.forEach((pawn, index) => {
      const effect = actionFxForPawn(world, pawn, pawnsById, jobsById, structuresById, firesById);
      if (effect.kind) lastActive = index;
      // The resident buffer is Float32; compare the encoded values so a
      // stable confirmed snapshot does not upload every frame/tick merely
      // because an irrational seed or fractional contact was rounded.
      const x = Math.fround(effect.x), z = Math.fround(effect.z), seed = Math.fround(pawn.id * .61803398875);
      if (values.getX(index) !== effect.kind || values.getY(index) !== x || values.getZ(index) !== z || values.getW(index) !== seed) {
        values.setXYZW(index, effect.kind, x, z, seed);
        dirty = true;
      }
    });
    if (dirty) values.needsUpdate = true;
    this.active = lastActive >= 0;
    geometry.instanceCount = this.active ? lastActive + 1 : 0;
    this.mesh.visible = this.active && this.detailVisible;
  }

  present(tick: number): void {
    // 1.65 cycles/s for sprite drift and .75 cycles/s for cloud bob complete
    // exactly 330 and 150 cycles over 1200 ticks. The bounded clock therefore
    // preserves phase at the wrap even in very old colonies.
    this.time.value = (tick % 1200) / TICKS_PER_SECOND;
  }
  setDetailVisible(visible: boolean): void { this.detailVisible = visible; this.mesh.visible = visible && this.active; }
  prepareForCompile(): () => void {
    const count = this.mesh.geometry.instanceCount, visible = this.mesh.visible;
    this.mesh.geometry.instanceCount = Math.max(1, count);
    this.mesh.visible = true;
    return () => { this.mesh.geometry.instanceCount = count; this.mesh.visible = visible; };
  }
  dispose(): void { this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}
