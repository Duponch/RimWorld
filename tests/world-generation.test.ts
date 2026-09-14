import { describe, expect, test } from 'vitest';
import { addGroundMaterial, applyCommand, createWorld, deserializeWorld, hashWorld, refreshStock, serializeWorld, stepWorld, validateWorld } from '../src/sim/index.ts';
import { blockedCells, reachableCells, routeToJob } from '../src/sim/pathfinding.ts';
import type { Terrain, World } from '../src/sim/types.ts';
import { geologicalField, siteStones, STONE_KINDS } from '../src/sim/geology.ts';

function neighbors(world: World, index: number): number[] {
  const x = index % world.width; const z = Math.floor(index / world.width);
  return [z > 0 ? index - world.width : -1, x < world.width - 1 ? index + 1 : -1,
    z < world.height - 1 ? index + world.width : -1, x > 0 ? index - 1 : -1].filter(next => next >= 0);
}

function components(world: World, terrain: Terrain): number[][] {
  const visited = new Uint8Array(world.tiles.length); const result: number[][] = [];
  world.tiles.forEach((tile, index) => {
    if (tile.terrain !== terrain || visited[index]) return;
    const component = [index]; visited[index] = 1;
    for (let head = 0; head < component.length; head++) {
      for (const next of neighbors(world, component[head]!)) {
        if (visited[next] || world.tiles[next]!.terrain !== terrain) continue;
        visited[next] = 1; component.push(next);
      }
    }
    result.push(component);
  });
  return result;
}

describe('seeded temperate valley generation', () => {
  test('regional Core geology is persistent, coherent, independent of work RNG and strictly migrated', () => {
    const seen = new Set<string>(); let equal = 0, pairs = 0, mixedSites = 0;
    for (const seed of [0, 1, 7, 19, 42, 65, 75, 85, 114, 271]) {
      const w = createWorld(seed, 250, 250), before = serializeWorld(w), rng = w.rng;
      const field = geologicalField(seed), choices = siteStones(seed), localTypes = new Set<string>();
      expect([2, 3]).toContain(choices.length); expect(new Set(choices).size).toBe(choices.length);
      for (let i = 0; i < w.tiles.length; i++) {
        const tile = w.tiles[i]!;
        if (tile.terrain !== 'rock') { expect(tile.stone).toBeUndefined(); continue; }
        expect(tile.stone).toBe(field(i % w.width, Math.floor(i / w.width)));
        expect(choices).toContain(tile.stone); seen.add(tile.stone!); localTypes.add(tile.stone!);
        for (const j of neighbors(w, i)) if (j > i && w.tiles[j]!.terrain === 'rock') { pairs++; if (tile.stone === w.tiles[j]!.stone) equal++; }
      }
      if (localTypes.size > 1) mixedSites++;
      for (const resource of w.resources) expect(resource.stone).toBe(resource.kind === 'rock' ? field(resource.x, resource.z) : undefined);
      expect(w.rng).toBe(rng); expect(serializeWorld(w)).toBe(before);
      expect(deserializeWorld(before)).toEqual(w);
    }
    expect(mixedSites).toBeGreaterThan(0); // Reject a constant type per map, even if seeds cover the catalogue.
    expect(seen).toEqual(new Set(STONE_KINDS)); expect(equal / pairs).toBeGreaterThan(.9);

    const modern = createWorld(42, 32, 32), raw = JSON.parse(serializeWorld(modern));
    raw.schemaVersion = 26;
    // V26 cannot smuggle a modern geological identity through migration.
    expect(() => deserializeWorld(JSON.stringify(raw))).toThrow(/version 26/);
    for (const tile of raw.tiles) delete tile.stone;
    for (const resource of raw.resources) delete resource.stone;
    const migrated = deserializeWorld(JSON.stringify(raw));
    expect(migrated).toEqual({ ...raw, schemaVersion: 27 });
    const control = deserializeWorld(JSON.stringify(raw)); stepWorld(migrated, 251); stepWorld(control, 251);
    expect(serializeWorld(migrated)).toBe(serializeWorld(control));
    for (const change of [(w: any) => w.tiles.find((t: any) => t.terrain === 'rock').stone = 'vacstone',
      (w: any) => w.tiles.find((t: any) => t.terrain === 'grass').stone = 'granite',
      (w: any) => w.resources.find((r: any) => r.kind === 'tree').stone = 'slate',
      (w: any) => w.resources.find((r: any) => r.kind === 'rock').stone = null]) {
      const invalid = structuredClone(modern); change(invalid);
      expect(validateWorld(invalid).length).toBeGreaterThan(0);
      expect(() => deserializeWorld(JSON.stringify(invalid))).toThrow();
    }
  });
  test('same seed reproduces every entity; rectangular boundary fixtures and saved edited maps remain valid', () => {
    for (const [width, height] of [[8, 8], [8, 128], [128, 8], [16, 12], [32, 64], [64, 32], [128, 128], [8, 250], [250, 8], [249, 250], [250, 249], [200, 200], [250, 250]]) {
      const fingerprints = new Set<string>();
      for (const seed of [0, 1, 7, 42, -1, 0xffffffff, 0x100000000]) {
        const world = createWorld(seed, width, height);
        expect(validateWorld(world), `${seed}: ${width}×${height}`).toEqual([]);
        expect(hashWorld(world)).toBe(hashWorld(createWorld(seed, width, height)));
        expect(hashWorld(world)).toBe(hashWorld(createWorld(seed >>> 0, width, height)));
        expect(world.rng).toBeGreaterThan(0);
        fingerprints.add(hashWorld(world));
        // Loading must use serialized terrain, never regenerate from seed after an algorithm update.
        const center = Math.floor(height! / 2) * width! + Math.floor(width! / 2);
        world.tiles[center] = { terrain: 'soil' };
        expect(deserializeWorld(serializeWorld(world))).toEqual(world);
      }
      expect(fingerprints.size).toBe(5); // 0 wraps to 2^32; -1 wraps to uint32 max.
    }
    for (const dimension of [7, 251, 8.5, Infinity, NaN]) {
      expect(() => createWorld(42, dimension, 32)).toThrow();
      expect(() => createWorld(42, 32, dimension)).toThrow();
    }
    for (const seed of [0.5, Infinity, NaN]) expect(() => createWorld(seed)).toThrow();
  });

  test('many seeds produce continuous rivers, coherent patches, walkable starts and readable rock clusters', () => {
    let edgeRocks = 0; let decorativeRocks = 0; let grassTrees = 0; let soilTrees = 0; let grassArea = 0; let soilArea = 0;
    for (const size of [32, 64, 128, 200, 250]) {
      for (const seed of [0, 1, 7, 19, 42, 65, 75, 85, 114, 271, 65535, 0xffffffff]) {
        const world = createWorld(seed, size, size); const context = `seed=${seed} map=${size}`;
        expect(validateWorld(world), context).toEqual([]);
        const water = components(world, 'water');
        expect(water, context).toHaveLength(1);
        const channel = water[0]!;
        const northSouth = channel.some(index => index < size) && channel.some(index => index >= size * (size - 1));
        const eastWest = channel.some(index => index % size === 0) && channel.some(index => index % size === size - 1);
        expect(northSouth || eastWest, context).toBe(true);
        expect(channel.length, context).toBeGreaterThanOrEqual(size);
        expect(channel.length, context).toBeLessThan(size * size * 0.20);
        const rock = components(world, 'rock');
        expect(rock.every(component => component.length >= 4), context).toBe(true);
        expect(rock.reduce((sum, component) => sum + component.length, 0), context).toBeLessThanOrEqual(size * size * 0.22);
        const reachable = reachableCells(world, world.pawns[0]!, blockedCells(world), new Set());
        expect(reachable.parents.filter(parent => parent !== -2).length, context).toBeGreaterThan(size * size * 0.35);
        const cx = size / 2; const cz = size / 2;
        for (let z = cz - 3; z <= cz + 3; z++) for (let x = cx - 3; x <= cx + 3; x++) {
          expect(world.tiles[z * size + x]!.terrain, context).toBe('grass');
          expect(reachable.parents[z * size + x], context).not.toBe(-2);
        }
        for (const target of world.resources.slice(-3)) expect(routeToJob(world, target, reachable), context).not.toBeNull();
        // Compare local agreement to the independent-noise baseline with the SAME terrain shares.
        const counts = { grass: 0, soil: 0, rock: 0, water: 0 }; let same = 0; let pairs = 0;
        world.tiles.forEach((tile, index) => {
          counts[tile.terrain]++;
          for (const next of neighbors(world, index)) if (next > index) { pairs++; if (world.tiles[next]!.terrain === tile.terrain) same++; }
        });
        const independentAgreement = Object.values(counts).reduce((sum, count) => sum + (count / world.tiles.length) ** 2, 0);
        expect(same / pairs - independentAgreement, context).toBeGreaterThan(0.12);
        grassArea += counts.grass; soilArea += counts.soil;
        for (const item of world.resources) {
          const index = item.z * size + item.x; const terrain = world.tiles[index]!.terrain;
          expect(['grass', 'soil'], context).toContain(terrain);
          if (item.kind === 'rock') {
            decorativeRocks++;
            if (neighbors(world, index).some(next => world.tiles[next]!.terrain === 'rock')) edgeRocks++;
          } else if (item.kind === 'tree') {
            if (terrain === 'grass') grassTrees++; else soilTrees++;
          }
        }
      }
    }
    // Population-level ecological relationships; a particular seed need not look average.
    expect(edgeRocks / decorativeRocks).toBeGreaterThan(0.45);
    expect(grassTrees / grassArea).toBeGreaterThan(soilTrees / soilArea * 1.25);
  });

  test('tutorial resources actually support a first camp on small and larger generated maps, including save during work', () => {
    for (const size of [8, 24, 64, 250]) for (const seed of [0, 7, 42]) {
      const world = createWorld(seed, size, size); const cx = size / 2; const cz = size / 2;
      const context = `seed=${seed} map=${size}`;
      const tutorialIds = world.resources.slice(-3).map(item => item.id);
      for (const item of world.resources.slice(-3)) {
        expect(applyCommand(world, { type: 'designate', kind: item.kind === 'tree' ? 'chop' : 'harvest', x: item.x, z: item.z }), context).toEqual({ ok: true });
      }
      expect(applyCommand(world, { type: 'designate', kind: 'wall', x: cx, z: cz + 2 }), context).toEqual({ ok: true });
      // The old bed cell now contains the physical starting wood pile. Keep its 1x2 footprint clear.
      expect(applyCommand(world, { type: 'designate', kind: 'bed', x: cx - 2, z: cz + 1 }), context).toEqual({ ok: true });
      expect(applyCommand(world, { type: 'stockpile', x: cx + 2, z: cz + 1, enabled: true, filters: { wood: true, food: false }, capacity: 75 }), context).toEqual({ ok: true });
      stepWorld(world, 17);
      const resumed = deserializeWorld(serializeWorld(world));
      stepWorld(world, 983);
      for (let i = 0; i < 983; i++) stepWorld(resumed);
      expect(hashWorld(world), context).toBe(hashWorld(resumed));
      expect(validateWorld(world), context).toEqual([]);
      expect(world.jobs, context).toHaveLength(0);
      expect(world.resources.filter(item => tutorialIds.includes(item.id)), context).toMatchObject([{kind:'berries',growth:.3}]);
      expect(world.structures, context).toHaveLength(2);
      expect(world.stock, context).toEqual({ wood: 23, food: 28 });
      const storedWood = world.piles.filter(pile => pile.kind === 'wood' && pile.owner.type === 'ground'
        && pile.owner.x === cx + 2 && pile.owner.z === cz + 1).reduce((sum, pile) => sum + pile.quantity, 0);
      expect(storedWood, context).toBe(23);
    }
    // A long route crosses the last partial 16-cell rendering chunk, but physics
    // knows only valid grid cells. Topology changes between calls must be seen immediately.
    const long = createWorld(42, 250, 250);
    long.tiles = long.tiles.map(() => ({ terrain: 'rock' }));
    for (let x = 0; x < 250; x++) long.tiles[125 * 250 + x] = { terrain: 'grass' };
    for (let x = 100; x <= 102; x++) long.tiles[124 * 250 + x] = { terrain: 'grass' };
    long.resources = [{ id: long.nextId++, x: 249, z: 125, kind: 'tree', amount: 12 }];
    long.piles = []; refreshStock(long);
    long.pawns = long.pawns.slice(0, 1);
    const pawn = long.pawns[0]!; pawn.x = 0; pawn.z = 125; pawn.priorities = { gather: 1, build: 0, haul: 0, grow: 0 , cook: 0 };
    addGroundMaterial(long, 'food', 18, pawn);
    expect(applyCommand(long, { type: 'designate', kind: 'chop', x: 249, z: 125 })).toEqual({ ok: true });
    stepWorld(long);
    expect(pawn.path.length).toBeGreaterThan(240);
    const resumed = deserializeWorld(serializeWorld(long));
    for (const world of [long, resumed]) expect(applyCommand(world, { type: 'designate', kind: 'wall', x: 101, z: 125 })).toEqual({ ok: true });
    let usedDetour = false, crossedPlan = false;
    for (let tick = 0; tick < 350; tick++) {
      stepWorld(long); usedDetour ||= pawn.z === 124; crossedPlan ||= pawn.x===101&&pawn.z===125;
      expect(long.tiles[pawn.z * 250 + pawn.x]!.terrain).toBe('grass');
      // A blueprint is traversable since V16; only a completed wall blocks.
    }
    stepWorld(resumed, 350);
    expect(usedDetour).toBe(false);expect(crossedPlan).toBe(true);
    expect(hashWorld(long)).toBe(hashWorld(resumed));
    for (const world of [long, resumed]) {
      expect(applyCommand(world, { type: 'cancel', x: 101, z: 125 })).toEqual({ ok: true });
      expect(applyCommand(world, { type: 'cancel', x: 249, z: 125 })).toEqual({ ok: true });
      expect(world.pawns[0]!.path).toEqual([]);
      expect(applyCommand(world, { type: 'designate', kind: 'chop', x: 249, z: 125 })).toEqual({ ok: true });
    }
    stepWorld(long, 650);
    for (let tick = 0; tick < 650; tick++) stepWorld(resumed);
    expect(hashWorld(long)).toBe(hashWorld(resumed));
    expect(validateWorld(long)).toEqual([]);
    expect(long.resources).toEqual([]);
    expect(long.jobs).toEqual([]);
    expect(long.piles.find(pile => pile.kind === 'wood')?.owner).toEqual({ type: 'ground', x: 249, z: 125 });
    expect(long.stock.wood).toBe(12);
    expect(() => deserializeWorld(JSON.stringify({ ...long, width: 251 }))).toThrow('Invalid dimensions.');
  });
});
