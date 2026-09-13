import { describe, expect, test } from 'vitest';
import { applyCommand, createWorld, deserializeWorld, hashWorld, serializeWorld, stepWorld, validateWorld } from '../src/sim/index.ts';
import { blockedCells, reachableCells, routeToJob } from '../src/sim/pathfinding.ts';
import type { Terrain, World } from '../src/sim/types.ts';

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
  test('same seed reproduces every entity; rectangular boundary fixtures and saved edited maps remain valid', () => {
    for (const [width, height] of [[8, 8], [8, 128], [128, 8], [16, 12], [32, 64], [64, 32], [128, 128]]) {
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
    for (const dimension of [7, 129, 8.5, Infinity, NaN]) {
      expect(() => createWorld(42, dimension, 32)).toThrow();
      expect(() => createWorld(42, 32, dimension)).toThrow();
    }
    for (const seed of [0.5, Infinity, NaN]) expect(() => createWorld(seed)).toThrow();
  });

  test('many seeds produce continuous rivers, coherent patches, walkable starts and readable rock clusters', () => {
    let edgeRocks = 0; let decorativeRocks = 0; let grassTrees = 0; let soilTrees = 0; let grassArea = 0; let soilArea = 0;
    for (const size of [32, 64, 128]) {
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
    for (const size of [8, 24, 64]) for (const seed of [0, 7, 42]) {
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
      expect(world.resources.some(item => tutorialIds.includes(item.id)), context).toBe(false);
      expect(world.structures, context).toHaveLength(2);
      expect(world.stock, context).toEqual({ wood: 23, food: 32 });
      const storedWood = world.piles.filter(pile => pile.kind === 'wood' && pile.owner.type === 'ground'
        && pile.owner.x === cx + 2 && pile.owner.z === cz + 1).reduce((sum, pile) => sum + pile.quantity, 0);
      expect(storedWood, context).toBe(23);
    }
  });
});
