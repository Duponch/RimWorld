import { describe, expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { uniform } from 'three/tsl';
import { createWorld } from '../src/sim/engine';
import { ACTION_FX, ActionVfxLayer, actionFxForPawn } from '../src/render/ActionVfxLayer';

function source(capacity: number): THREE.InstancedBufferGeometry {
  const geometry = new THREE.InstancedBufferGeometry();
  for (const name of ['aFrom', 'aTo', 'aTravel'])
    geometry.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4));
  return geometry;
}

function classify(world: ReturnType<typeof createWorld>, index = 0) {
  return actionFxForPawn(world, world.pawns[index]!, new Map(world.pawns.map(p => [p.id, p])),
    new Map(world.jobs.map(j => [j.id, j])), new Map(world.structures.map(s => [s.id, s])));
}

describe('V126 resident action VFX', () => {
  test('chooses only confirmed work and sleep states, with no simulation mutation', () => {
    const world = createWorld(126, 32, 32), pawn = world.pawns[0]!;
    const before = structuredClone(world);
    expect(classify(world).kind).toBe(ACTION_FX.none);
    expect(world).toEqual(before);
    pawn.state = 'sleeping';
    expect(classify(world).kind).toBe(ACTION_FX.sleep);
    pawn.state = 'resting';
    expect(classify(world).kind).toBe(ACTION_FX.none);
    pawn.state = 'working';
    const job = { id: world.nextId++, kind: 'chop' as const, x: pawn.x + 1, z: pawn.z,
      orientation: 0 as const, footprint: 'standard' as const, status: 'active' as const,
      reservedBy: pawn.id, progress: 2, escrow: { wood: 0, food: 0 } };
    world.jobs.push(job); pawn.jobId = job.id;
    expect(classify(world)).toEqual({ kind: ACTION_FX.chop, x: job.x - .82, z: job.z });
    world.jobs[0]!.kind = 'mine';
    expect(classify(world)).toMatchObject({ kind: ACTION_FX.mine, x: job.x - .70, z: job.z });
    job.reservedBy = -1;
    expect(classify(world).kind).toBe(ACTION_FX.none);
  });

  test('one social fight emits one cloud only when the pair is close', () => {
    const world = createWorld(127, 32, 32), [a, b] = world.pawns;
    a!.social = { rng: 1, memories: [], fight: { opponentId: b!.id, startedAt: world.tick } };
    b!.social = { rng: 2, memories: [], fight: { opponentId: a!.id, startedAt: world.tick } };
    b!.x = a!.x + 1; b!.z = a!.z;
    const kinds = [classify(world, 0).kind, classify(world, 1).kind];
    expect(kinds.filter(kind => kind === ACTION_FX.brawl)).toHaveLength(1);
    b!.x = a!.x + 3;
    expect(classify(world, 0).kind).toBe(ACTION_FX.none);
    expect(classify(world, 1).kind).toBe(ACTION_FX.none);
  });

  test('borrows body pose buffers, sleeps when empty, and avoids unchanged uploads', () => {
    const world = createWorld(128, 32, 32), body = source(world.pawns.length);
    const layer = new ActionVfxLayer({ blend: uniform(1), travelTime: uniform(0) });
    const before = structuredClone(world);
    layer.update(world, body);
    expect(world).toEqual(before);
    expect(layer.mesh.visible).toBe(false);
    expect(layer.mesh.geometry.instanceCount).toBe(0);
    expect(layer.mesh.geometry.getAttribute('aFrom')).toBe(body.getAttribute('aFrom'));
    world.pawns[0]!.state = 'sleeping';
    layer.update(world, body);
    expect(layer.mesh.visible).toBe(true);
    const buffer = layer.mesh.geometry.getAttribute('actionFx') as THREE.InstancedBufferAttribute;
    const uploads = buffer.version;
    layer.update(world, body);
    expect(layer.mesh.geometry.getAttribute('actionFx')).toBe(buffer);
    expect(buffer.version).toBe(uploads);
    const replacement = source(world.pawns.length);
    layer.update(world, replacement);
    expect(layer.mesh.geometry.getAttribute('aFrom')).toBe(replacement.getAttribute('aFrom'));
    layer.setDetailVisible(false);
    expect(layer.mesh.visible).toBe(false);
    layer.setDetailVisible(true);
    expect(layer.mesh.visible).toBe(true);
    const restore = layer.prepareForCompile();
    restore();
    expect(layer.mesh.geometry.instanceCount).toBe(1);
    world.pawns[0]!.state = 'idle';
    layer.update(world, replacement);
    expect(layer.mesh.geometry.instanceCount).toBe(0);
    expect(layer.mesh.visible).toBe(false);
    layer.dispose(); body.dispose(); replacement.dispose();
  });
});
