import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld } from '../src/sim/index';
import { ensureFireState } from '../src/sim/fire-rules';
import type { World } from '../src/sim/types';
import { PawnLayer } from '../src/render/PawnLayer';
import { WildlifeLayer } from '../src/render/WildlifeLayer';
import { animalCombatCamp } from './scenarios/animal-combat';

function attachedFires(world: World, kind: 'pawn' | 'animal', ids: readonly number[]): void {
  const core = world.tick * 10;
  ensureFireState(world).items = ids.map(id => ({
    id: world.nextId++, x: 0, z: 0, size: .2,
    bornCore: core, nextPulseCore: core + 15, complexCore: 0, spreadCore: 0,
    ...(kind === 'pawn' ? { attachedPawnId: id } : { attachedAnimalId: id }),
  }));
}

function flameMesh(group: THREE.Group): THREE.Mesh<THREE.InstancedBufferGeometry> {
  return group.children.find(child => child.name === 'Attached fire — body GPU poses') as THREE.Mesh<THREE.InstancedBufferGeometry>;
}

function expectShared(body: THREE.BufferGeometry, fire: THREE.BufferGeometry): void {
  for (const name of ['aFrom', 'aTo', 'aTravel', 'aFire', ...(body.hasAttribute('aMotion') ? ['aMotion'] : ['aScale'])])
    expect(fire.getAttribute(name)).toBe(body.getAttribute(name));
}

test('human attached flames retain actor indices through extinction, reactivation and buffer growth', () => {
  let world = createWorld(42, 32, 32);
  const base = structuredClone(world.pawns[0]!);
  world.pawns = Array.from({ length: 3 }, (_, i) => ({ ...structuredClone(base), id: world.nextId++, x: 4 + i * 3, z: 8, state: 'idle' as const, path: [] }));
  const ids = world.pawns.map(p => p.id), layer = new PawnLayer();
  try {
    layer.update(world, 1, true);
    const fire = flameMesh(layer.group), originalMaterial = fire.material;
    let body = layer.feedbackSource!, geometry = fire.geometry;
    expect(geometry.instanceCount).toBe(0);
    expect(fire.frustumCulled).toBe(false); expect(fire.castShadow).toBe(false); expect(fire.receiveShadow).toBe(false);
    expectShared(body, geometry);
    const restoreEmpty = layer.prepareFiresForCompile();
    try {
      expect(geometry.instanceCount).toBe(1);
      expect(geometry.getAttribute('aFire').getX(0)).toBe(0); // The shader collapses this warm-up slot.
    } finally { restoreEmpty(); }
    expect(geometry.instanceCount).toBe(0);

    world = structuredClone(world); attachedFires(world, 'pawn', [ids[1]!]);
    const before = structuredClone(world);
    layer.update(world, 1, false);
    expect(world).toEqual(before);
    expect(fire.geometry).toBe(geometry); expect(fire.material).toBe(originalMaterial);
    expect(geometry.instanceCount).toBe(2);
    expect(Array.from({ length: 3 }, (_, i) => geometry.getAttribute('aFire').getX(i))).toEqual([0, .5, 0]);
    for (let i = 0; i < ids.length; i++) expect(body.getAttribute('aTo').getX(i)).toBe(world.pawns[i]!.x);
    expect([...layer.visuals.keys()]).toEqual(ids);
    const restoreBurning = layer.prepareFiresForCompile();
    expect(geometry.instanceCount).toBe(2); restoreBurning(); expect(geometry.instanceCount).toBe(2);

    world = structuredClone(world); attachedFires(world, 'pawn', []); layer.update(world, 1, false);
    expect(geometry.instanceCount).toBe(0);
    expect(Array.from({ length: 3 }, (_, i) => geometry.getAttribute('aFire').getX(i))).toEqual([0, 0, 0]);
    world = structuredClone(world); attachedFires(world, 'pawn', [ids[2]!]); layer.update(world, 1, false);
    expect(geometry.instanceCount).toBe(3); expect(geometry.getAttribute('aFire').getX(2)).toBe(.5);

    const oldCapacity = body.getAttribute('aFrom').count;
    world = structuredClone(world);
    for (let i = 3; i <= oldCapacity; i++) world.pawns.push({ ...structuredClone(base), id: world.nextId++, x: 4 + i, z: 14, state: 'idle', path: [] });
    const last = world.pawns.length - 1;
    attachedFires(world, 'pawn', [world.pawns[last]!.id]); layer.update(world, 1, false);
    body = layer.feedbackSource!;
    expect(body.getAttribute('aFrom').count).toBeGreaterThan(oldCapacity);
    expect(fire.geometry).not.toBe(geometry); geometry = fire.geometry;
    expect(fire.material).toBe(originalMaterial); expectShared(body, geometry);
    expect(geometry.instanceCount).toBe(last + 1);
    expect(geometry.getAttribute('aFire').getX(last)).toBe(.5);
    expect(world.pawns.slice(0, 3).map(p => p.id)).toEqual(ids);
    for (let i = 0; i < world.pawns.length; i++) expect(body.getAttribute('aTo').getX(i)).toBe(world.pawns[i]!.x);
    world = structuredClone(world); attachedFires(world, 'pawn', [ids[0]!]); layer.update(world, 1, false);
    expect(geometry.instanceCount).toBe(1); expect(geometry.getAttribute('aFire').getX(last)).toBe(0);
    world = structuredClone(world); world.pawns = []; attachedFires(world, 'pawn', []); layer.update(world, 1, false);
    expect(geometry.instanceCount).toBe(0);
    const restoreVacant = layer.prepareFiresForCompile();
    expect(geometry.instanceCount).toBe(1); expect(geometry.getAttribute('aFire').getX(0)).toBe(0);
    restoreVacant(); expect(geometry.instanceCount).toBe(0);
  } finally { layer.dispose(); }
});

test('wildlife fire prefixes keep per-species actor slots and restore all empty warm-up draws', () => {
  let world = animalCombatCamp();
  const base = structuredClone(world.wildlife!.animals[0]!);
  world.wildlife!.animals = Array.from({ length: 6 }, (_, i) => ({
    ...structuredClone(base), id: world.nextId++, species: i % 2 ? 'deer' as const : 'hare' as const,
    x: 5 + i * 3, z: 8, state: 'idle' as const, motion: undefined, path: [],
  }));
  const layer = new WildlifeLayer();
  const bodies = layer.mesh.children.filter(child => child.name.startsWith('Wild ')) as THREE.Mesh<THREE.InstancedBufferGeometry>[];
  const flames = layer.flames.children as THREE.Mesh<THREE.InstancedBufferGeometry>[];
  expect(bodies).toHaveLength(7);expect(flames).toHaveLength(7); // V190 includes the empty resident red-fox rig.
  const geometries = flames.map(f => f.geometry), capacities = bodies.map(b => b.geometry.getAttribute('aFrom').count);
  try {
    layer.update(world, undefined, true);
    expect(flames.map(f => f.geometry.instanceCount)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    const bodyCounts = bodies.map(b => b.geometry.instanceCount);
    const restore = layer.prepare();
    try {
      expect(flames.every(f => f.geometry.instanceCount === 1)).toBe(true);
      expect(bodies.every(b => b.geometry.instanceCount >= 1)).toBe(true);
      for (let i = 0; i < flames.length; i++) {
        expectShared(bodies[i]!.geometry, flames[i]!.geometry);
        expect(flames[i]!.geometry.getAttribute('aFire').getX(0)).toBe(0);
        expect(flames[i]!.frustumCulled).toBe(false); expect(flames[i]!.castShadow).toBe(false); expect(flames[i]!.receiveShadow).toBe(false);
      }
    } finally { restore(); }
    expect(bodies.map(b => b.geometry.instanceCount)).toEqual(bodyCounts);
    expect(flames.map(f => f.geometry.instanceCount)).toEqual([0, 0, 0, 0, 0, 0, 0]);

    world = structuredClone(world); attachedFires(world, 'animal', [world.wildlife!.animals[2]!.id, world.wildlife!.animals[1]!.id]);
    const ids = world.wildlife!.animals.map(a => a.id), before = structuredClone(world);
    layer.update(world, undefined);
    expect(world).toEqual(before);
    expect(flames.map(f => f.geometry.instanceCount)).toEqual([2, 0, 1, 0, 0, 0, 0]);
    expect(flames[0]!.geometry.getAttribute('aFire').getX(0)).toBe(0);
    expect(flames[0]!.geometry.getAttribute('aFire').getX(1)).toBe(.5);
    expect(flames[2]!.geometry.getAttribute('aFire').getX(0)).toBe(.5);
    const restoreBurning = layer.prepare(); restoreBurning();
    expect(flames.map(f => f.geometry.instanceCount)).toEqual([2, 0, 1, 0, 0, 0, 0]);

    world = structuredClone(world); attachedFires(world, 'animal', []); layer.update(world, undefined);
    expect(flames.map(f => f.geometry.instanceCount)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    world = structuredClone(world);
    world.wildlife!.animals.push({ ...structuredClone(base), id: world.nextId++, species: 'hare', x: 25, z: 8, state: 'idle', motion: undefined, path: [] });
    attachedFires(world, 'animal', [world.wildlife!.animals[6]!.id]); layer.update(world, undefined);
    expect(flames[0]!.geometry.instanceCount).toBe(4); expect(flames[0]!.geometry.getAttribute('aFire').getX(3)).toBe(.5);
    expect(world.wildlife!.animals.slice(0, 6).map(a => a.id)).toEqual(ids);
    const shown = new Map<number, number>(); layer.forEachPose((id, _species, x) => shown.set(id, x));
    for (const actor of world.wildlife!.animals) expect(shown.get(actor.id)).toBe(actor.x);
    for (let i = 0; i < bodies.length; i++) {
      expect(flames[i]!.geometry).toBe(geometries[i]); expect(bodies[i]!.geometry.getAttribute('aFrom').count).toBe(capacities[i]);
      expectShared(bodies[i]!.geometry, flames[i]!.geometry);
    }
    world = structuredClone(world); attachedFires(world, 'animal', [ids[0]!]); layer.update(world, undefined);
    expect(flames[0]!.geometry.instanceCount).toBe(1); expect(flames[0]!.geometry.getAttribute('aFire').getX(3)).toBe(0);
    world = structuredClone(world); world.wildlife!.animals = []; attachedFires(world, 'animal', []); layer.update(world, undefined);
    const restoreVacant = layer.prepare();
    expect(flames.every(f => f.geometry.instanceCount === 1 && f.geometry.getAttribute('aFire').getX(0) === 0)).toBe(true);
    restoreVacant(); expect(flames.every(f => f.geometry.instanceCount === 0)).toBe(true);
    expect(bodies.every(b => b.geometry.instanceCount === 0)).toBe(true);
  } finally { layer.dispose(); }
});
