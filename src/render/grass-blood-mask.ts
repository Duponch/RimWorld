import type { FilthRecord } from '../sim/filth-rules';
import { createFilthAtlas, filthDecal, FILTH_ATLAS } from './filth-appearance';

export const GRASS_BLOOD_SLOTS = 224;
export const GRASS_BLOOD_WORDS = GRASS_BLOOD_SLOTS / 16;
type Decal = ReturnType<typeof filthDecal>;
type PreparedDecal = {
  x: number; z: number; width: number; height: number;
  cos: number; sin: number; flip: boolean; data: Uint8Array; signature: string;
};
type Stain = Pick<FilthRecord, 'x' | 'z' | 'thickness'>;
let masks: Uint8Array[] | undefined;

/** Reuse the ground decal atlas during loading, before the first live injury.
 * The standalone fallback serves pure tools without a FilthLayer owner. */
export function prepareGrassBloodMasks(atlas?: ReturnType<typeof createFilthAtlas>): void {
  if (masks) return;
  const source = atlas ?? createFilthAtlas();
  const size = FILTH_ATLAS.tileSize;
  masks = Array.from({ length: FILTH_ATLAS.variants }, (_, variant) => {
    const tile = 2 * FILTH_ATLAS.variants + variant, data = new Uint8Array(size * size);
    for (let z = 0; z < size; z++) for (let x = 0; x < size; x++)
      data[z * size + x] = source.data[((Math.floor(tile / FILTH_ATLAS.columns) * size + z) * source.width +
        tile % FILTH_ATLAS.columns * size + x) * 4 + 3]!;
    return data;
  });
}

function bloodMasks(): Uint8Array[] {
  prepareGrassBloodMasks();
  return masks!;
}

/** The CPU counterpart of the pinned Three r186 PCG hash, including float32
 * operations. It addresses existing GPU roots; it creates no second scatter. */
function rootHash(seed: number): number {
  const state = (Math.imul(seed, 747796405) + 2891336453) >>> 0;
  const word = Math.imul((state >>> ((state >>> 28) + 4)) ^ state, 277803737) >>> 0;
  return Math.fround(Math.fround(((word >>> 22) ^ word) >>> 0) * (1 / 2 ** 32));
}
function rootOffset(seed: number): number {
  return Math.fround(Math.fround(rootHash(seed) * Math.fround(.96)) - Math.fround(.48));
}
export function grassRoot(x: number, z: number, slot: number): readonly [number, number] {
  const key = (Math.imul(x, 73856093) ^ Math.imul(z, 19349663) ^ Math.imul(slot, 83492791)) >>> 0;
  return [Math.fround(x + rootOffset(key)), Math.fround(z + rootOffset((key + 11) >>> 0))];
}

function prepareDecal(decal: Decal): PreparedDecal {
  const rotation = Math.fround(decal.rotation);
  return { x: Math.fround(decal.x), z: Math.fround(decal.z),
    width: Math.fround(decal.width), height: Math.fround(decal.height),
    cos: Math.cos(rotation), sin: Math.sin(rotation), flip: decal.flip,
    data: bloodMasks()[decal.tile % FILTH_ATLAS.variants]!,
    signature: `${decal.x},${decal.z},${decal.width},${decal.height},${decal.rotation},${decal.tile},${decal.flip}` };
}

/** Invert the real ground quad and read the same padded mask with bilinear
 * filtering at LOD0. Its flip, rotation and anisotropic dimensions all matter. */
export function bloodDecalAlpha(decal: Decal, x: number, z: number): number {
  return preparedDecalAlpha(prepareDecal(decal), x, z);
}

function preparedDecalAlpha(decal: PreparedDecal, x: number, z: number): number {
  const dx = x - decal.x, dz = z - decal.z, c = decal.cos, s = decal.sin;
  // Keep divisions and operation order unchanged: reciprocal multiplication
  // could move a root across the quantisation boundary or the alpha support.
  let u = (dx * c + dz * s) / decal.width + .5;
  const v = (-dx * s + dz * c) / decal.height + .5;
  if (decal.flip) u = 1 - u;
  if (u <= 0 || v <= 0 || u >= 1 || v >= 1) return 0;
  const size = FILTH_ATLAS.tileSize, data = decal.data;
  const px = u * size - .5, pz = v * size - .5, ix = Math.floor(px), iz = Math.floor(pz);
  const tx = px - ix, tz = pz - iz;
  const x0 = Math.max(0, Math.min(size - 1, ix)), x1 = Math.max(0, Math.min(size - 1, ix + 1));
  const z0 = Math.max(0, Math.min(size - 1, iz)) * size, z1 = Math.max(0, Math.min(size - 1, iz + 1)) * size;
  return (data[z0 + x0]! / 255 * (1 - tx) + data[z0 + x1]! / 255 * tx) * (1 - tz) +
    (data[z1 + x0]! / 255 * (1 - tx) + data[z1 + x1]! / 255 * tx) * tz;
}

/** Four pigment levels per fixed blade root in a resident 56-byte/cell field.
 * Only adoption of changed blood bakes roots, including neighbours reached by
 * a rotated decal. There is no camera/frame work or simulation mutation. */
export class GrassBloodMask {
  words: Uint32Array<ArrayBuffer> = new Uint32Array(0);
  readonly cells = new Set<number>();
  private previous: Stain[] = [];
  private signatures = new Map<number, string>();
  private width = 0;
  private height = 0;

  adopt(items: readonly FilthRecord[], width: number, height: number): { cells: number[]; changed: boolean; resized: boolean } {
    let ordinal = 0, same = this.width === width && this.height === height;
    for (const f of items) if (f.kind === 'blood') {
      const previous = this.previous[ordinal++];
      if (!previous || previous.x !== f.x || previous.z !== f.z || previous.thickness !== f.thickness) same = false;
    }
    if (same && ordinal === this.previous.length) return { cells: [], changed: false, resized: false };
    const resized = this.width !== width || this.height !== height;
    this.width = width; this.height = height;
    if (resized) { this.words = new Uint32Array(width * height * GRASS_BLOOD_WORDS); this.cells.clear(); this.signatures.clear(); }
    this.previous = [];
    const byCell = new Map<number, PreparedDecal[]>();
    for (const f of items) if (f.kind === 'blood') {
      this.previous.push({ x: f.x, z: f.z, thickness: f.thickness });
      for (let layer = 0; layer < f.thickness; layer++) {
        const decal = filthDecal(f, layer), c = Math.abs(Math.cos(decal.rotation)), s = Math.abs(Math.sin(decal.rotation));
        const prepared = prepareDecal(decal);
        const rx = (c * decal.width + s * decal.height) / 2, rz = (s * decal.width + c * decal.height) / 2;
        for (let z = Math.max(0, Math.floor(decal.z - rz + .5)); z <= Math.min(height - 1, Math.floor(decal.z + rz + .5)); z++)
          for (let x = Math.max(0, Math.floor(decal.x - rx + .5)); x <= Math.min(width - 1, Math.floor(decal.x + rx + .5)); x++) {
            const i = z * width + x, list = byCell.get(i);
            if (list) list.push(prepared); else byCell.set(i, [prepared]);
          }
      }
    }
    const nextSignatures = new Map<number, string>();
    for (const [i, decals] of byCell) nextSignatures.set(i, decals.map(decal => decal.signature).sort().join(';'));
    const dirty = new Set([...this.signatures.keys(), ...nextSignatures.keys()]);
    const changedCells: number[] = [];
    let changed = resized;
    for (const i of dirty) {
      if (this.signatures.get(i) === nextSignatures.get(i)) continue;
      const oldCovered = this.cells.has(i), decals = byCell.get(i) ?? [], next = new Uint32Array(GRASS_BLOOD_WORDS);
      const cellX = i % width, cellZ = Math.floor(i / width);
      const cellKey = Math.imul(cellX, 73856093) ^ Math.imul(cellZ, 19349663);
      for (let slot = 0; slot < GRASS_BLOOD_SLOTS && decals.length; slot++) {
        const key = (cellKey ^ Math.imul(slot, 83492791)) >>> 0;
        const x = Math.fround(cellX + rootOffset(key)), z = Math.fround(cellZ + rootOffset((key + 11) >>> 0));
        let clear = 1;
        for (const decal of decals) clear *= 1 - preparedDecalAlpha(decal, x, z);
        // Keep zero exactly outside the decal. Three nonzero levels retain
        // faint edges without inventing any pigment beyond the ground mask.
        const pigment = Math.min(3, Math.ceil((1 - clear) * 3 / .8));
        next[slot >>> 4] = (next[slot >>> 4]! | (pigment << ((slot & 15) * 2))) >>> 0;
      }
      const covered = next.some(value => value !== 0);
      if (covered) this.cells.add(i); else this.cells.delete(i);
      if (oldCovered !== covered) changedCells.push(i);
      const offset = i * GRASS_BLOOD_WORDS;
      for (let word = 0; word < GRASS_BLOOD_WORDS; word++) if (this.words[offset + word] !== next[word]) {
        this.words[offset + word] = next[word]!; changed = true;
      }
    }
    this.signatures = nextSignatures;
    return { cells: changedCells, changed, resized };
  }
}
