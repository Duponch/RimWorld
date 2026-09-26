import { FILTH_KINDS, type FilthKind, type FilthRecord } from '../sim/filth-rules';

export const FILTH_ATLAS = { tileSize: 128, columns: 8, rows: 3, variants: 4 } as const;
const colors: Record<FilthKind, readonly [number, number, number, number]> = {
  dirt: [91, 75, 65, 97], trash: [157, 139, 105, 255], blood: [131, 34, 34, 180],
  ash: [111, 108, 103, 220], vomit: [179, 185, 73, 180], 'corpse-bile': [87, 101, 48, 255],
};

/** Presentation hash only. Never advances either simulation random stream. */
function sample(seed: number, index: number): number {
  let n = Math.imul(seed ^ Math.imul(index + 1, 0x9e3779b9), 0x85ebca6b);
  n = Math.imul(n ^ (n >>> 16), 0xc2b2ae35);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
const smooth = (v: number): number => { const t = Math.max(0, Math.min(1, v)); return t * t * (3 - 2 * t); };

/** One stable layer per physical thickness; thinning removes the last layer.
 * Core's scatter/size ranges are retained, with our own hash and silhouettes. */
export function filthDecal(f: FilthRecord, layer: number) {
  const kind = FILTH_KINDS.indexOf(f.kind), seed = Math.imul(f.x, 73856093) ^ Math.imul(f.z, 19349663) ^ Math.imul(kind + 1, 83492791);
  const r = (i: number) => sample(seed, layer * 8 + i), size = f.kind === 'ash' ? 3 : 1;
  return { x: f.x + (r(0) - .5) * .9, z: f.z + (r(1) - .5) * .9,
    width: size * (.8 + r(2) * .4), height: size * (.8 + r(3) * .4),
    rotation: r(4) * Math.PI * 2, tile: kind * FILTH_ATLAS.variants + Math.floor(r(5) * FILTH_ATLAS.variants), flip: r(6) < .5 };
}

/** Original masks baked once, not noise evaluated for every GPU fragment.
 * Soft overlapping lobes, grain and satellite drops leave transparent margins.
 * RimWorld texture assets are neither extracted nor embedded. */
export function createFilthAtlas(): { data: Uint8Array; width: number; height: number } {
  const { tileSize, columns, rows, variants } = FILTH_ATLAS, width = tileSize * columns, height = tileSize * rows;
  const data = new Uint8Array(width * height * 4);
  for (const [kindIndex, kind] of FILTH_KINDS.entries()) for (let variant = 0; variant < variants; variant++) {
    const tile = kindIndex * variants + variant, seed = tile + 73, r = (i: number) => sample(seed, i);
    const powder = kind === 'dirt' || kind === 'ash', debris = kind === 'trash';
    const lobes = Array.from({ length: debris ? 15 : powder ? 13 : 9 }, (_, i) => {
      const angle = r(i * 6) * Math.PI * 2, distance = i === 0 ? 0 : !powder && !debris && i >= 5 ? .25 + r(i * 6 + 1) * .15 : r(i * 6 + 1) * .30;
      const radius = debris ? .025 + r(i * 6 + 2) * .045 : i < 5 ? .10 + r(i * 6 + 2) * .13 : .025 + r(i * 6 + 2) * .06;
      return { x: .5 + Math.cos(angle) * distance, y: .5 + Math.sin(angle) * distance,
        rx: radius, ry: radius * (.6 + r(i * 6 + 3) * .6), strength: .65 + r(i * 6 + 4) * .35 };
    });
    const [red, green, blue, opacity] = colors[kind];
    for (let y = 0; y < tileSize; y++) for (let x = 0; x < tileSize; x++) {
      const u = (x + .5) / tileSize, v = (y + .5) / tileSize;
      const warp = powder || debris ? 0 : .10 * Math.sin(u * 51 + v * 23 + seed) + .07 * Math.sin(u * 29 - v * 47 + seed);
      let coverage = 0;
      for (const lobe of lobes) {
        const distance = Math.hypot((u - lobe.x) / lobe.rx, (v - lobe.y) / lobe.ry) + warp;
        const edge = smooth((1 - distance) / (powder ? .85 : debris ? .35 : .4));
        coverage = 1 - (1 - coverage) * (1 - edge * lobe.strength);
      }
      const grain = sample(seed, 1000 + y * tileSize + x);
      coverage *= powder ? .24 + grain * .76 : debris ? .75 + grain * .25 : .94 + grain * .06;
      // Generous padding also prevents atlas neighbours leaking under minification.
      coverage *= smooth(Math.min(u, v, 1 - u, 1 - v) * 16 - 1);
      const i = (((Math.floor(tile / columns) * tileSize + y) * width) + (tile % columns * tileSize + x)) * 4;
      const shade = debris ? .76 + grain * .24 : 1;
      data[i] = Math.round(red * shade); data[i + 1] = Math.round(green * shade); data[i + 2] = Math.round(blue * shade);
      data[i + 3] = Math.round(opacity * coverage);
    }
  }
  return { data, width, height };
}
