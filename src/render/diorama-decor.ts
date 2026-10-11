import type { BiomeId } from '../sim/biome-flora';
import type { DioramaSide } from './diorama-geometry';

export type DioramaDecorPoint = readonly [number, number];
export type DioramaDecorFlora = 'oak' | 'poplar' | 'pine' | 'birch' | 'saguaro' | 'drago' | 'agave' | 'grass';
export type DioramaDecorKind = 'background-ridge' | 'foreground-ridge' | 'snow' | DioramaDecorFlora
  | 'trunk' | 'cloud' | 'cloud-patch';
export interface DioramaDecorCutout {
  readonly kind: DioramaDecorKind;
  readonly outline: readonly DioramaDecorPoint[];
  readonly pigment: number;
  /** Absolute local depth, toward the map; physical paper thickness stays V322. */
  readonly depth: number;
  readonly shadow: boolean;
}
export interface DioramaDecorFold {
  readonly outline: readonly [DioramaDecorPoint, DioramaDecorPoint, DioramaDecorPoint];
  readonly contactDepth: number;
  readonly backDepth: number;
  readonly baseDepth: number;
  readonly tipDepth: number;
}
export interface DioramaDecorOptions {
  readonly seed: number;
  readonly biome: BiomeId;
  readonly side: DioramaSide;
  readonly wallLength: number;
  readonly span: number;
}
export interface DioramaDecor {
  readonly cutouts: readonly DioramaDecorCutout[];
  readonly folds: readonly DioramaDecorFold[];
  /** Conservative triangles after V322 lower/upper clipping and baked shadows. */
  readonly triangleBudget: number;
}

/** Fixed ceilings, independent of cells and total map area. All cutouts batch
 * into the existing paper/cardboard lower and upper groups. */
export const DIORAMA_DECOR_LIMITS = Object.freeze({ cutouts: 64, outlinePoints: 32, triangles: 7000 });
const PROFILES: Record<BiomeId, {
  ridges: readonly number[]; foreground: readonly number[]; foliage: readonly number[];
  species: readonly DioramaDecorFlora[]; floraCount: number; snow: number;
}> = {
  'temperate-forest': { ridges: [0x83927b, 0x909d85, 0x758c77], foreground: [0x60765f, 0x6f805f],
    foliage: [0x466a4b, 0x5d7851, 0x708454], species: ['oak', 'poplar', 'oak', 'poplar'], floraCount: 13, snow: .22 },
  'boreal-forest': { ridges: [0x758a85, 0x879994, 0x697f7c], foreground: [0x4e6d65, 0x5c766c],
    foliage: [0x31584c, 0x456a59, 0x5d7967], species: ['pine', 'pine', 'birch', 'pine'], floraCount: 14, snow: .67 },
  'arid-shrubland': { ridges: [0xba9f7d, 0xae9271, 0xc3ad8e], foreground: [0x948565, 0xa49573],
    foliage: [0x79875a, 0x8d955f, 0x5f795b], species: ['saguaro', 'agave', 'drago', 'agave', 'grass'], floraCount: 11, snow: 0 },
};

const SHAPES: Record<DioramaDecorFlora, readonly DioramaDecorPoint[]> = {
  oak: [[.46, 0], [.55, 0], [.55, .21], [.76, .18], [.91, .29], [.98, .43], [.94, .55], [.84, .64],
    [.88, .77], [.77, .90], [.62, .92], [.54, 1], [.36, .98], [.29, .90], [.14, .91], [.05, .78],
    [.07, .66], [0, .54], [.02, .39], [.15, .27], [.33, .22], [.46, .22]],
  poplar: [[.44, 0], [.56, 0], [.55, .19], [.75, .29], [.85, .43], [.81, .58], [.74, .77], [.59, .95],
    [.49, 1], [.39, .93], [.24, .75], [.15, .59], [.17, .43], [.29, .29], [.45, .19]],
  pine: [[.46, 0], [.54, 0], [.54, .11], [.89, .11], [.74, .32], [.85, .32], [.65, .55], [.74, .55],
    [.50, 1], [.28, .55], [.36, .55], [.15, .32], [.27, .32], [.10, .11], [.46, .11]],
  birch: [[.44, 0], [.55, 0], [.56, .22], [.80, .24], [.93, .40], [.84, .57], [.90, .70], [.75, .87],
    [.62, .88], [.51, 1], [.33, .94], [.22, .81], [.07, .79], [.02, .59], [.12, .48], [.09, .35], [.26, .22], [.44, .22]],
  saguaro: [[.43, 0], [.59, 0], [.59, .42], [.86, .42], [.93, .49], [.93, .74], [.88, .81], [.80, .81],
    [.75, .74], [.75, .56], [.59, .56], [.59, .94], [.55, 1], [.47, 1], [.43, .94], [.43, .64],
    [.25, .64], [.25, .81], [.20, .86], [.12, .86], [.07, .81], [.07, .57], [.14, .49], [.43, .49]],
  drago: [[.43, 0], [.56, 0], [.54, .51], [.88, .39], [.69, .64], [1, .66], [.76, .76], [.94, .93],
    [.65, .85], [.61, 1], [.48, .90], [.31, .99], [.34, .82], [.07, .94], [.23, .75], [0, .67], [.31, .61], [.43, .51]],
  agave: [[.31, 0], [.67, 0], [.90, .24], [.69, .18], [1, .66], [.63, .35], [.78, .94], [.55, .53],
    [.46, 1], [.42, .53], [.18, .93], [.31, .33], [0, .59], [.24, .14], [.07, .20]],
  grass: [[.14, 0], [.85, 0], [.93, .66], [.75, .16], [.66, .94], [.61, .28], [.40, 1], [.44, .18],
    [.12, .85], [.28, .15], [0, .45]],
};
const CLOUD: readonly DioramaDecorPoint[] = [[.04, .06], [.02, .11], [0, .20], [.005, .31], [.04, .40], [.10, .44],
  [.13, .42], [.13, .60], [.16, .75], [.22, .86], [.30, .89], [.38, .85], [.44, .73], [.48, .91], [.55, 1],
  [.64, .99], [.72, .91], [.76, .77], [.78, .58], [.84, .63], [.91, .61], [.97, .50], [1, .37],
  [.99, .20], [.94, .09], [.88, .04], [.63, 0], [.30, .01]];

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  return (h ^ h >>> 16) >>> 0;
}

function paperTint(hex: number, variation: number): number {
  const amount = .025 + variation * .045;
  const channels = [hex >>> 16, hex >>> 8 & 255, hex & 255];
  const paper = [230, 220, 202];
  const [r, g, b] = channels.map((v, i) => Math.round(v * (1 - amount) + paper[i]! * amount));
  return r! << 16 | g! << 8 | b!;
}

/** Side-local deterministic art only. Never consumes the simulation PRNG,
 * inspects map cells, reads time, or produces additional scene/material owners. */
export function createDioramaDecor(options: DioramaDecorOptions): DioramaDecor {
  const { seed, biome, side, wallLength, span } = options;
  if (!Number.isSafeInteger(seed) || !Number.isFinite(wallLength) || !Number.isFinite(span)
    || span <= 0 || wallLength < span || !Object.hasOwn(PROFILES, biome)
    || !['north', 'west', 'south', 'east'].includes(side)) throw new RangeError('Invalid diorama decor parameters.');
  const profile = PROFILES[biome];
  const key = `${seed}/${biome}/${side}`;
  const sample = (kind: string, index = 0, channel = 0): number => hash(`${key}/${kind}/${index}/${channel}`) / 4294967296;
  const cutouts: DioramaDecorCutout[] = [], folds: DioramaDecorFold[] = [];
  const margin = span * .024, reserveU = wallLength * .68, reserveHalf = span * .06;
  const tint = (hex: number, kind: string, index: number) => paperTint(hex, sample(`pigment-${kind}`, index));
  const shape = (points: readonly DioramaDecorPoint[], x: number, y: number, w: number, h: number,
    kind: string, index: number, amount = .018): DioramaDecorPoint[] => points.map(([u, v], vertex) => {
    const dx = (sample(kind, index, vertex * 2) - .5) * amount * Math.sin(v * Math.PI);
    const dy = (sample(kind, index, vertex * 2 + 1) - .5) * amount * Math.sin(v * Math.PI);
    return [x + (u + dx) * w, y + (v + dy) * h];
  });
  const emit = (kind: DioramaDecorKind, outline: readonly DioramaDecorPoint[], pigment: number,
    depth: number, shadow = false): void => {
    const cropped = clip(clip(outline, margin, 0, true), wallLength - margin, 0, false);
    if (cropped.length >= 3) cutouts.push({ kind, outline: cropped, pigment, depth: span * depth, shadow });
  };

  const ridgeCount = 6 + Math.floor(sample('ridge-count') * 3), ridgeStep = (wallLength - margin * 2) / ridgeCount;
  for (let i = 0; i < ridgeCount; i++) {
    const w = ridgeStep * (1.14 + sample('ridge-width', i) * .12);
    const x = margin + ridgeStep * (i - .12 + (sample('ridge-position', i) - .5) * .025);
    let h = span * (.081 + sample('ridge-height', i) * .051);
    const y = -span * .006, summit = .38 + sample('summit', i) * .25;
    if (side === 'north' && x + w > reserveU - reserveHalf && x < reserveU + reserveHalf) h = Math.min(h, span * .116);
    const ridge: readonly DioramaDecorPoint[] = biome === 'arid-shrubland'
      ? [[0, 0], [.16, .24], [.29, .28], [.33, .75], [.42, .94], [.64, 1], [.71, .70], [.83, .41], [1, 0]]
      : [[0, 0], [.16, .25], [.29, .22], [summit, 1], [.72, .45 + sample('shoulder', i) * .16], [.85, .52], [1, 0]];
    const primary = shape(ridge, x, y, w, h, 'ridge-shape', i);
    emit('background-ridge', primary, tint(profile.ridges[i % profile.ridges.length]!, 'ridge', i), i % 2 ? .0019 : .0002);
    if (profile.snow && h > span * .099 && sample('snow', i) < profile.snow) {
      // Barycentric cuts remain within the actual handmade summit triangle,
      // even when its left/right slopes differ substantially between worlds.
      const peak = primary[3]!, left = primary[2]!, right = primary[4]!;
      const mix = (l: number, r: number): DioramaDecorPoint => [peak[0] * (1 - l - r) + left[0] * l + right[0] * r,
        peak[1] * (1 - l - r) + left[1] * l + right[1] * r];
      const cap = [mix(.34 + sample('snow-left', i) * .08, 0), peak,
        mix(0, .32 + sample('snow-right', i) * .13), mix(.055, .28),
        mix(.22 + sample('snow-notch', i) * .025, .22), mix(.29, .07)];
      emit('snow', cap, tint(0xe2e0ce, 'snow', i), .00365);
    }
    const front = shape([[0, 0], [.22, .33], [.35, .25], [.52 + sample('front-summit', i) * .14, 1],
      [.80, .38], [1, 0]], x + ridgeStep * .025, -span * .010, w * .91, h * (.51 + sample('front-height', i) * .12),
      'foreground-shape', i);
    emit('foreground-ridge', front, tint(profile.foreground[i % 2]!, 'foreground', i), i % 2 ? .0071 : .0054);
  }

  const floraCount = Math.min(16, profile.floraCount + Math.floor(sample('flora-count') * 3) - 1);
  const floraStep = (wallLength - margin * 2) / floraCount;
  const speciesOffset = Math.floor(sample('species-offset') * profile.species.length);
  for (let i = 0; i < floraCount; i++) {
    const species = profile.species[(i + speciesOffset) % profile.species.length]!;
    const center = margin + floraStep * (i + .5 + (sample('flora-position', i) - .5) * .12);
    const low = species === 'agave' || species === 'grass';
    const h = span * (low ? .023 + sample('flora-height', i) * .015 : .047 + sample('flora-height', i) * .032);
    const ratio = species === 'oak' ? .71 : species === 'birch' ? .58 : species === 'poplar' ? .36
      : species === 'agave' ? 1.25 : species === 'drago' ? .70 : species === 'grass' ? .68 : .46;
    // Leave a real gap between foliage solids in the same depth lane.
    const w = Math.min(h * ratio * (.91 + sample('flora-width', i) * .16), floraStep * .68);
    const y = span * (-.006 + sample('flora-base', i) * .004);
    const mirror = sample('flora-mirror', i) < .5;
    const stencil = SHAPES[species].map(([u, v]): DioramaDecorPoint => {
      const apex = species === 'pine' && v === 1 ? .47 + sample('pine-apex', i) * .06 : u;
      return [mirror ? 1 - apex : apex, v];
    });
    const points = shape(stencil, center - w / 2, y, w, h, `flora-${species}`, i, .023);
    emit(species, points, tint(profile.foliage[i % profile.foliage.length]!, species, i), .00885, true);
    if (species === 'oak' || species === 'poplar' || species === 'pine' || species === 'birch' || species === 'drago') {
      const trunkHeight = h * (species === 'drago' ? .49 : species === 'pine' ? .14 : .23);
      const half = w * (species === 'drago' ? .045 : .033);
      emit('trunk', [[center - half, y], [center + half, y], [center + half * .75, y + trunkHeight],
        [center - half * .70, y + trunkHeight]], tint(species === 'birch' ? 0xbcb7a1 : 0x987856, 'trunk', i), .0106);
    }
  }

  const cloudCount = biome === 'arid-shrubland' ? 2 : 2 + Math.floor(sample('cloud-count') * 2);
  for (let i = 0; i < cloudCount; i++) {
    const w = span * (.087 + sample('cloud-width', i) * .031), h = w * (.28 + sample('cloud-height', i) * .08);
    const northSlots = cloudCount === 3 ? [.15, .40, .87] : [.22, .86];
    let center = (side === 'north' ? northSlots[i]! : (i + .5) / cloudCount) * wallLength
      + (sample('cloud-position', i) - .5) * span * .040;
    if (side === 'north' && center + w / 2 > reserveU - reserveHalf && center - w / 2 < reserveU + reserveHalf) {
      center = center < reserveU ? reserveU - reserveHalf - w / 2 - span * .012 : reserveU + reserveHalf + w / 2 + span * .012;
    }
    center = Math.max(margin + w / 2, Math.min(wallLength - margin - w / 2, center));
    const y = Math.min(span * (.149 + sample('cloud-base', i) * .024), span * .207 - h);
    const cloudMirror = sample('cloud-mirror', i) < .5;
    const leftLobe = sample('cloud-lobe', i, 0), rightLobe = sample('cloud-lobe', i, 1);
    const cloudStencil = CLOUD.map(([u, v]): DioramaDecorPoint => [cloudMirror ? 1 - u : u,
      v * (.82 + .18 * (leftLobe * (1 - u) + rightLobe * u))]);
    const cloud = shape(cloudStencil, center - w / 2, y, w, h, 'cloud-shape', i, .015);
    emit('cloud', cloud, tint(0xede7d6, 'cloud', i), .0007, true);
    emit('cloud-patch', shape([[0, 0], [.62, -.035], [1, .04], [.88, .22], [.21, .27]],
      center - w * .31, y + h * .035, w * .52, h * .23, 'cloud-patch', i), tint(0xf4eede, 'cloud-patch', i), .0026);
    if (i === Math.floor(sample('fold-cloud') * cloudCount)) {
      folds.push({ outline: [[center + w * .26, y + h * .10], [center + w * .34, y + h * .065],
        [center + w * .335, y + h * .27]], contactDepth: span * .0045,
        backDepth: span * .0064, baseDepth: span * .00665, tipDepth: span * .010525 });
    }
  }

  const lip = span * .033;
  const splitCost = (outline: readonly DioramaDecorPoint[]): number => prismCost(clip(outline, lip, 1, true).length)
    + prismCost(clip(outline, lip, 1, false).length);
  const triangleBudget = cutouts.reduce((total, cutout) => total + splitCost(cutout.outline)
    + (cutout.shadow ? splitCost(cutout.outline.map(([u, y]) => [u + span * .0007, y - span * .00065])) : 0), 0)
    + folds.length * 16; // Eight triangles of contact paper + eight of the closed wedge.
  return { cutouts, folds, triangleBudget };
}

function prismCost(points: number): number { return points < 3 ? 0 : points * 4 - 4; }
function clip(points: readonly DioramaDecorPoint[], boundary: number, axis: 0 | 1, above: boolean): DioramaDecorPoint[] {
  const result: DioramaDecorPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!, b = points[(i + 1) % points.length]!;
    const aIn = above ? a[axis] >= boundary : a[axis] <= boundary;
    const bIn = above ? b[axis] >= boundary : b[axis] <= boundary;
    if (aIn) result.push(a);
    if (aIn !== bIn) {
      const t = (boundary - a[axis]) / (b[axis] - a[axis]);
      result.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return result;
}
