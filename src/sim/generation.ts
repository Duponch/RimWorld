import { initialRecreation } from './recreation-rules.ts';
import { defaultSchedule } from './schedule.ts';
import { initialFoodPolicies } from './food-policy.ts';
import { emptySpoilage } from './food-preservation.ts';
import type { ResourceKind, Terrain, World } from './types.ts';
import { addGroundMaterial } from './materials.ts';
import { MAX_MAP_SIZE, MIN_MAP_SIZE, validMapDimension } from './map-config.ts';

/** Coordinate-based randomness: adding a presentation sample cannot shift later terrain rolls. */
function sample(seed: number, x: number, z: number, layer: number): number {
  let value = seed ^ Math.imul(x, 0x1f123bb5) ^ Math.imul(z, 0x5f356495) ^ Math.imul(layer, 0x6c8e9cf5);
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function noise(seed: number, x: number, z: number, wavelength: number, layer: number): number {
  const gx = Math.floor(x / wavelength); const gz = Math.floor(z / wavelength);
  const fx = x / wavelength - gx; const fz = z / wavelength - gz;
  const sx = fx * fx * (3 - 2 * fx); const sz = fz * fz * (3 - 2 * fz);
  const north = sample(seed, gx, gz, layer) * (1 - sx) + sample(seed, gx + 1, gz, layer) * sx;
  const south = sample(seed, gx, gz + 1, layer) * (1 - sx) + sample(seed, gx + 1, gz + 1, layer) * sx;
  return north * (1 - sz) + south * sz;
}

function field(seed: number, x: number, z: number, scale: number, layer: number): number {
  return noise(seed, x, z, scale, layer) * 0.6 + noise(seed, x, z, scale * 0.43, layer + 1) * 0.28
    + noise(seed, x, z, scale * 0.17, layer + 2) * 0.12;
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const isClearing = (x: number, z: number, cx: number, cz: number): boolean => Math.abs(x - cx) <= 3 && Math.abs(z - cz) <= 3;

/** One connected channel, joining two opposite borders without cutting the starting clearing. */
function riverMask(seed: number, width: number, height: number): Uint8Array {
  const mask = new Uint8Array(width * height);
  // A narrow rectangular fixture uses its short axis for the channel's width.
  const vertical = width === height ? sample(seed, 0, 0, 40) < 0.5 : width < height;
  const across = vertical ? width : height; const along = vertical ? height : width;
  const center = Math.floor(across / 2);
  const lowSpace = center - 3; const highSpace = across - center - 4;
  const high = highSpace > 0 && sample(seed, 0, 0, 41) > 0.5;
  const span = high ? highSpace : lowSpace;
  const start = high ? center + 4 : 0;
  const maxRadius = Math.min(2, Math.floor((span - 1) / 5));
  const low = start + maxRadius; const highBound = start + span - 1 - maxRadius;
  let previous = -1;
  for (let t = 0; t < along; t++) {
    const bend = field(seed, t, 13, Math.max(8, along * 0.3), 42);
    const middle = Math.round(low + (highBound - low) * (0.18 + bend * 0.64));
    const radius = maxRadius === 0 ? 0 : Math.max(1, Math.round(maxRadius * (0.6 + noise(seed, t, 9, 12, 45) * 0.4)));
    // Fill between successive centers: diagonal joins alone are impassable in our 4-neighbor grid.
    const from = Math.min(middle, previous < 0 ? middle : previous) - radius;
    const to = Math.max(middle, previous < 0 ? middle : previous) + radius;
    for (let p = Math.max(start, from); p <= Math.min(start + span - 1, to); p++) {
      const x = vertical ? p : t; const z = vertical ? t : p;
      mask[z * width + x] = 1;
    }
    previous = middle;
  }
  return mask;
}

function neighbors(index: number, width: number, height: number): number[] {
  const x = index % width; const z = Math.floor(index / width);
  return [z > 0 ? index - width : -1, x + 1 < width ? index + 1 : -1,
    z + 1 < height ? index + width : -1, x > 0 ? index - 1 : -1];
}

/** Tiny outcrops become stony ground, leaving actual obstacles as readable rock formations. */
function removeRockSpeckles(terrain: Terrain[], width: number, height: number): void {
  const visited = new Uint8Array(terrain.length);
  for (let start = 0; start < terrain.length; start++) {
    if (terrain[start] !== 'rock' || visited[start]) continue;
    const component = [start]; visited[start] = 1;
    for (let head = 0; head < component.length; head++) {
      for (const next of neighbors(component[head]!, width, height)) {
        if (next < 0 || terrain[next] !== 'rock' || visited[next]) continue;
        visited[next] = 1; component.push(next);
      }
    }
    if (component.length < 4) for (const index of component) terrain[index] = 'soil';
  }
}

/** Open a narrow pass only when rock has isolated the camp from its bank's main lowland. */
function connectStartingValley(terrain: Terrain[], width: number, height: number, start: number): void {
  const bank = new Uint8Array(terrain.length); const queue = [start]; bank[start] = 1;
  for (let head = 0; head < queue.length; head++) {
    for (const next of neighbors(queue[head]!, width, height)) {
      if (next < 0 || bank[next] || terrain[next] === 'water') continue;
      bank[next] = 1; queue.push(next);
    }
  }
  const regions = new Int32Array(terrain.length).fill(-1);
  let largest: number[] = []; let largestId = -1; let nextId = 0;
  for (let index = 0; index < terrain.length; index++) {
    if (!bank[index] || terrain[index] === 'rock' || regions[index] !== -1) continue;
    const component = [index]; const id = nextId++; regions[index] = id;
    for (let head = 0; head < component.length; head++) {
      for (const next of neighbors(component[head]!, width, height)) {
        if (next < 0 || !bank[next] || terrain[next] === 'rock' || regions[next] !== -1) continue;
        regions[next] = id; component.push(next);
      }
    }
    if (component.length > largest.length) { largest = component; largestId = id; }
  }
  if (regions[start] === largestId) return;
  // Integer 0/1-cost flood: crossing land costs 0, cutting a rock cell costs 1.
  // A destination's cost is identical from every incoming edge, so first discovery is minimal.
  const parents = new Int32Array(terrain.length).fill(-2); parents[start] = -1;
  let current = [start]; let goal = -1;
  while (current.length > 0 && goal < 0) {
    const following: number[] = [];
    for (let head = 0; head < current.length && goal < 0; head++) {
      const index = current[head]!;
      if (regions[index] === largestId) { goal = index; break; }
      for (const next of neighbors(index, width, height)) {
        if (next < 0 || !bank[next] || parents[next] !== -2) continue;
        parents[next] = index;
        if (terrain[next] === 'rock') following.push(next);
        else current.push(next);
      }
    }
    current = following;
  }
  while (goal !== -1) {
    if (terrain[goal] === 'rock') {
      terrain[goal] = 'soil';
      // A pass has width, instead of a hidden one-cell crack between tall placeholders.
      for (const next of neighbors(goal, width, height)) if (next >= 0 && terrain[next] === 'rock') terrain[next] = 'soil';
    }
    goal = parents[goal]!;
  }
}

/**
 * Temperate valley prototype. Height/moisture/density are construction fields only;
 * the resulting tiles and resources, not a regenerated seed, remain save authority.
 */
export function generateWorld(seed: number, width: number, height: number): World {
  if (!Number.isInteger(seed) || !Number.isFinite(seed)) throw new Error('Seed must be a finite integer.');
  if (![width, height].every(validMapDimension)) {
    throw new Error(`World dimensions must be integers between ${MIN_MAP_SIZE} and ${MAX_MAP_SIZE}.`);
  }
  const world: World = { schemaVersion: 16, foodPolicies: initialFoodPolicies(), nextFoodPolicyId: 5, restRules: 'adult', spoiled: emptySpoilage(), foodRules: 'adult', seed: seed >>> 0, rng: (seed >>> 0) || 0x9e3779b9,
    tick: 0, width, height, tiles: [], pawns: [], resources: [], structures: [], jobs: [],
    piles: [], stockpiles: [], growingZones: [], growingCursor: 0, environment: 'temperate-equinox-v1', stock: { wood: 0, food: 0 }, events: [], nextId: 1, logisticsCursor: 0 };
  const cx = Math.floor(width / 2); const cz = Math.floor(height / 2);
  const terrain: Terrain[] = new Array(width * height);
  const moisture = new Float64Array(terrain.length); const forest = new Float64Array(terrain.length);
  const rockCandidates: { index: number; relief: number }[] = [];
  const water = riverMask(world.seed, width, height);
  const scale = clamp(Math.min(width, height) * 0.55, 8, 26);
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const index = z * width + x;
      const wetness = field(world.seed, x + 137, z + 91, scale * 1.25, 10);
      moisture[index] = wetness;
      forest[index] = field(world.seed, x + 47, z + 193, scale * 0.8, 20);
      const distance = Math.max(Math.abs(x - cx), Math.abs(z - cz));
      const campValley = clamp((8 - distance) / 5, 0, 1) * 0.22;
      const relief = field(world.seed, x + 263, z + 71, scale, 1) - campValley;
      const bank = neighbors(index, width, height).some(next => next >= 0 && water[next]);
      terrain[index] = water[index] ? 'water' : isClearing(x, z, cx, cz) ? 'grass'
        : !bank && relief > 0.64 ? 'rock' : bank || wetness < 0.38 ? 'soil' : 'grass';
      if (terrain[index] === 'rock') rockCandidates.push({ index, relief });
    }
  }
  // Preserve the highest parts of broad landforms when a seed raises the whole local field.
  // This prototype is a temperate valley, not a mountain-map preset.
  const rockLimit = Math.floor(terrain.length * 0.22);
  if (rockCandidates.length > rockLimit) {
    rockCandidates.sort((a, b) => a.relief - b.relief || a.index - b.index);
    for (let i = 0; i < rockCandidates.length - rockLimit; i++) {
      const index = rockCandidates[i]!.index;
      terrain[index] = moisture[index]! < 0.38 ? 'soil' : 'grass';
    }
  }
  connectStartingValley(terrain, width, height, cz * width + cx);
  removeRockSpeckles(terrain, width, height);
  world.tiles = terrain.map(value => ({ terrain: value }));
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const index = z * width + x; const ground = terrain[index]!;
      if (isClearing(x, z, cx, cz) || ground === 'water' || ground === 'rock') continue;
      const rockyEdge = neighbors(index, width, height).some(next => next >= 0 && terrain[next] === 'rock');
      const density = forest[index]!; const wetness = moisture[index]!;
      const treeChance = (0.025 + density * density * 0.52) * (ground === 'soil' ? 0.58 : 1);
      // Berries favor open woodland; scattered rocks belong mainly to massif margins.
      const berryChance = 0.025 + wetness * 0.04 + (1 - Math.abs(density - 0.48) * 2) * 0.025;
      const rockChance = rockyEdge ? 0.32 : ground === 'soil' ? 0.018 : 0.005;
      const roll = sample(world.seed, x, z, 60);
      const kind: ResourceKind | null = roll < rockChance ? 'rock' : roll < rockChance + treeChance ? 'tree'
        : roll < rockChance + treeChance + berryChance ? 'berries' : null;
      if (kind) world.resources.push({ id: world.nextId++, x, z, kind, amount: kind === 'berries' ? 10 : 7 + Math.floor(sample(world.seed, x, z, 61) * 7) });
    }
  }
  for (const [offset, name] of ['Ada', 'Noé', 'Mina'].entries()) {
    world.pawns.push({ recreation: initialRecreation(50 + sample(world.seed, offset, 0, 101)*10), foodPolicyId: 1, schedule: defaultSchedule(), restZeroTicks: 0, collapsePending: false, id: world.nextId++, name, x: cx + offset - 1, z: cz, hunger: 90 - offset * 5,
      rest: 90 - offset * 3, mood: 80, comfort: 50, memories: [], jobId: null, haul: null, cooking: null, need: null, bedId: null, needCooldown: 0, state: 'idle', priorities: { gather: 2, build: 2, haul: 3, grow: 2, cook: 2 },
      path: [], moveCooldown: 0, planCooldown: 0 });
  }
  // Preserved tutorial targets, with a guaranteed adjacent walkable work cell.
  for (const [x, z, kind] of [[cx - 2, cz - 2, 'tree'], [cx + 2, cz - 2, 'berries'], [cx - 3, cz + 2, 'tree']] as const) {
    world.resources.push({ id: world.nextId++, x, z, kind, amount: kind === 'tree' ? 12 : 10 });
  }
  addGroundMaterial(world, 'wood', 12, { x: cx - 1, z: cz + 1 });
  addGroundMaterial(world, 'food', 18, { x: cx + 1, z: cz + 1 }, 'survival-meal');
  return world;
}
