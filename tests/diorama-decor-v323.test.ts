import { expect, test, vi } from 'vitest';
import type { BiomeId } from '../src/sim/biome-flora';
import type { DioramaSide } from '../src/render/diorama-geometry';
import { createDioramaDecor, DIORAMA_DECOR_LIMITS, type DioramaDecorPoint } from '../src/render/diorama-decor';

const biomes: BiomeId[] = ['temperate-forest', 'boreal-forest', 'arid-shrubland'];
const sides: DioramaSide[] = ['north', 'west', 'south', 'east'];
const options = { seed: 84602, biome: 'temperate-forest' as const, side: 'north' as const,
  span: 250, wallLength: 256.3 };

test('paper decor is repeatable, caller-owned and independent of ambient randomness', () => {
  const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Ambient random is forbidden'); });
  try {
    const input = Object.freeze({ ...options });
    const first = createDioramaDecor(input), second = createDioramaDecor(input);
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(second.cutouts[0]!.outline).not.toBe(first.cutouts[0]!.outline);
    (first.cutouts[0]!.outline[0] as [number, number])[0] = Infinity;
    expect(createDioramaDecor(input)).toEqual(second);
    expect(input).toEqual(options);
  } finally { random.mockRestore(); }
});

test.each(biomes)('%s decor depicts its implemented flora rather than a universal pine forest', biome => {
  const model = createDioramaDecor({ ...options, biome });
  const kinds = new Set(model.cutouts.map(cutout => cutout.kind));
  if (biome === 'temperate-forest') {
    expect(kinds.has('oak')).toBe(true); expect(kinds.has('poplar')).toBe(true);
    expect(kinds.has('pine')).toBe(false); expect(kinds.has('saguaro')).toBe(false);
  } else if (biome === 'boreal-forest') {
    expect(kinds.has('pine')).toBe(true); expect(kinds.has('birch')).toBe(true);
    expect(kinds.has('oak')).toBe(false); expect(kinds.has('agave')).toBe(false);
  } else {
    for (const kind of ['saguaro', 'drago', 'agave', 'grass'] as const) expect(kinds.has(kind)).toBe(true);
    expect(kinds.has('snow')).toBe(false); expect(kinds.has('pine')).toBe(false);
  }
});

test('silhouettes, placement and pigments vary across sides and seeds', () => {
  const signatures = new Set<string>();
  for (const seed of [1, 73, 4294967295]) for (const side of sides) {
    const model = createDioramaDecor({ ...options, seed, side });
    signatures.add(JSON.stringify(model.cutouts));
    const clouds = model.cutouts.filter(cutout => cutout.kind === 'cloud');
    expect(new Set(clouds.map(cutout => JSON.stringify(cutout.outline))).size).toBe(clouds.length);
  }
  expect(signatures.size).toBe(12);
});

test('cutouts and estimated triangles remain bounded on every side, biome and supported map aspect', () => {
  for (const seed of [0, 1, 73, 84602]) for (const biome of biomes) for (const side of sides)
    for (const ratio of [1.0252, 1.5252, 3.0252]) {
      const model = createDioramaDecor({ ...options, seed, biome, side, wallLength: options.span * ratio });
      expect(model.cutouts.length).toBeLessThanOrEqual(DIORAMA_DECOR_LIMITS.cutouts);
      expect(model.folds).toHaveLength(1);
      expect(model.triangleBudget).toBeGreaterThan(0);
      expect(model.triangleBudget).toBeLessThanOrEqual(DIORAMA_DECOR_LIMITS.triangles);
      for (const cutout of model.cutouts) {
        expect(cutout.outline.length).toBeGreaterThanOrEqual(3);
        expect(cutout.outline.length).toBeLessThanOrEqual(DIORAMA_DECOR_LIMITS.outlinePoints);
        expect(cutout.depth).toBeGreaterThan(0);
        expect(cutout.depth / options.span + .001625).toBeLessThan(.0126);
        expect(Number.isInteger(cutout.pigment)).toBe(true);
        for (const [u, y] of cutout.outline) {
          expect(Number.isFinite(u) && Number.isFinite(y)).toBe(true);
          expect(u).toBeGreaterThanOrEqual(options.span * .024 - 1e-8);
          expect(u).toBeLessThanOrEqual(options.span * ratio - options.span * .024 + 1e-8);
          expect(y).toBeGreaterThanOrEqual(-options.span * .011);
          expect(y).toBeLessThan(options.span * .214);
        }
        expect(Math.abs(area(cutout.outline))).toBeGreaterThan(1e-8);
      }
    }
});

test('north decorations preserve the moving sun/moon rail without hiding its noon silhouette', () => {
  for (let seed = 0; seed < 24; seed++) for (const biome of biomes) {
    const model = createDioramaDecor({ ...options, seed, biome });
    const left = options.wallLength * .68 - options.span * .06, right = options.wallLength * .68 + options.span * .06;
    for (const cutout of model.cutouts) {
      const min = Math.min(...cutout.outline.map(p => p[0])), max = Math.max(...cutout.outline.map(p => p[0]));
      if (max <= left || min >= right) continue;
      const top = Math.max(...cutout.outline.map(p => p[1]));
      if (cutout.kind === 'cloud' || cutout.kind === 'cloud-patch') expect(top).toBeLessThanOrEqual(options.span * .10);
      if (cutout.kind === 'background-ridge' || cutout.kind === 'foreground-ridge' || cutout.kind === 'snow') {
        expect(top).toBeLessThanOrEqual(options.span * .11 + 1e-8);
      }
    }
  }
});

test('biome palette and cold snow coverage remain distinct across prepared seeds', () => {
  const snowy: Record<BiomeId, number> = { 'temperate-forest': 0, 'boreal-forest': 0, 'arid-shrubland': 0 };
  const palettes = biomes.map(biome => createDioramaDecor({ ...options, biome }).cutouts
    .filter(cutout => cutout.kind === 'background-ridge').map(cutout => cutout.pigment));
  expect(new Set(palettes.map(palette => JSON.stringify(palette))).size).toBe(3);
  for (let seed = 0; seed < 32; seed++) for (const biome of biomes) {
    snowy[biome] += createDioramaDecor({ ...options, seed, biome }).cutouts.filter(cutout => cutout.kind === 'snow').length;
  }
  expect(snowy['arid-shrubland']).toBe(0);
  expect(snowy['boreal-forest']).toBeGreaterThan(snowy['temperate-forest']);
});

function area(points: readonly DioramaDecorPoint[]): number {
  return points.reduce((sum, p, i) => {
    const next = points[(i + 1) % points.length]!;
    return sum + p[0] * next[1] - next[0] * p[1];
  }, 0) / 2;
}
