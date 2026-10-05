import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { medicalCamp } from './scenarios/health.ts';
import { familyOfferWorld } from './helpers/family-v214.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { addMaterial } from '../src/sim/materials.ts';
import { applyCommand, stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { captureRelationshipPeople } from '../src/sim/relationship-namespace.ts';
import { relationshipIndex, tryAddRelationship } from '../src/sim/relationship-runtime.ts';
import { validateRelationshipWorld } from '../src/sim/relationship-world-save.ts';
import { addRomanceMemory } from '../src/sim/romance-memories.ts';
import type { RelationshipLink } from '../src/sim/relationship-state.ts';
import { SCHEMA_VERSION, type World } from '../src/sim/types.ts';
import { SnapshotDecoder, SnapshotEncoder } from '../src/bridge/snapshots.ts';

function roundtrip(world: World): World {
  expect(validateWorld(world)).toEqual([]);
  const resumed = deserializeWorld(serializeWorld(world));
  expect(resumed).toEqual(world);
  return resumed;
}
const pair = (kind: RelationshipLink['kind'], aId: number, bId: number, recordedAt: number): RelationshipLink =>
  ({ kind, aId: kind === 'parent' ? aId : Math.min(aId, bId), bId: kind === 'parent' ? bId : Math.max(aId, bId), recordedAt });

test('authentic public194 save migrates by version alone, without relations, memories, offers or RNG draws', () => {
  const raw = JSON.parse(readFileSync(new URL('../public/test-saves/v213/scyther.json', import.meta.url), 'utf8'));
  expect(raw.schemaVersion).toBe(194);
  const before = structuredClone(raw), migrated = deserializeWorld(JSON.stringify(raw));
  expect(migrated).toEqual({ ...before, schemaVersion: SCHEMA_VERSION });
  expect(migrated.relationships).toBeUndefined();
  expect(migrated.pawns.every(p => p.familyBereavement === undefined && p.romanceMemories === undefined)).toBe(true);
  for (const corrupt of [
    { ...before, relationships: { links: [] } },
    { ...before, pawns: before.pawns.map((p: object, i: number) => i ? p : { ...p, familyBereavement: [] }) },
    { ...before, pawns: before.pawns.map((p: object, i: number) => i ? p : { ...p, romanceMemories: [] }) },
  ]) expect(() => deserializeWorld(JSON.stringify(corrupt))).toThrow(/Invalid version 194 save/);
  // Own undefined fields also remain future fields before a JSON encoding.
  for (const key of ['familyBereavement', 'romanceMemories'] as const) {
    const world = structuredClone(migrated); world.pawns[0]![key] = undefined;
    expect(validateRelationshipWorld(world, 194)).not.toEqual([]);
  }
});

test.each(['self', 'unknown', 'structure', 'cycle', 'three-parents', 'partner-conflict', 'noncanonical'] as const)(
  'whole save rejects %s graph and runtime refuses without changing the owner', fault => {
    const w = medicalCamp(6), ids = w.pawns.map(p => p.id), tick = w.tick;
    const structure = fixtureBuilding(w, 'wall', 2, 2);
    let links: RelationshipLink[];
    if (fault === 'self') links = [pair('parent', ids[0]!, ids[0]!, tick)];
    else if (fault === 'unknown') links = [pair('parent', ids[0]!, w.nextId + 1, tick)];
    else if (fault === 'structure') links = [pair('parent', ids[0]!, structure.id, tick)];
    else if (fault === 'cycle') links = [pair('parent', ids[0]!, ids[1]!, tick), pair('parent', ids[1]!, ids[0]!, tick)];
    else if (fault === 'three-parents') links = [1, 2, 3].map(i => pair('parent', ids[0]!, ids[i]!, tick));
    else if (fault === 'partner-conflict') links = [pair('lover', ids[0]!, ids[1]!, tick), pair('lover', ids[0]!, ids[2]!, tick)];
    else links = [{ kind: 'sibling', aId: ids[1]!, bId: ids[0]!, recordedAt: tick }];
    const corrupt = structuredClone(w); corrupt.relationships = { links };
    expect(() => serializeWorld(corrupt)).toThrow();
    const before = JSON.stringify(w);
    for (let i = 0; i < links.length - 1; i++) expect(tryAddRelationship(w, links[i]!)).toBe(true);
    const partial = JSON.stringify(w);
    expect(tryAddRelationship(w, links.at(-1)!)).toBe(false);
    expect(JSON.stringify(w)).toBe(partial);
    if (links.length === 1) expect(JSON.stringify(w)).toBe(before);
  });

test('original scout retains partner and separate memories, complete namespace and deterministic return across checkpoint', () => {
  const { world: w, otherId } = familyOfferWorld('arrival'), [scout, resident] = w.pawns;
  const announced = structuredClone(w.arrivals!.pending!.relationship);
  expect(announced?.otherId).toBe(otherId); expect(scout!.id).toBe(otherId);
  expect(tryAddRelationship(w, pair('lover', scout!.id, resident!.id, w.tick))).toBe(true);
  addRomanceMemory(scout!, resident!.id, 'rebuffed-mood', w.tick);
  addRomanceMemory(resident!, scout!.id, 'rebuffed-opinion', w.tick);
  addMaterial(w, 'food', 2, { type: 'ground', x: scout!.x, z: scout!.z + 1 }, 'survival-meal');
  const food = w.piles.find(p => p.item === 'survival-meal')!;
  expect(applyCommand(w, { type: 'scout-start', pawnId: scout!.id, pileId: food.id, quantity: 2 }).ok).toBe(true);
  for (let n = 0; n < 100 && w.scout?.phase !== 'travelling'; n++) stepWorld(w);
  expect(w.scout?.phase).toBe('travelling');
  expect(captureRelationshipPeople(w).get(scout!.id)?.status).toBe('away');
  expect(relationshipIndex(w).kinds(resident!.id, scout!.id)).toEqual(['lover']);
  expect(w.arrivals!.pending!.relationship).toEqual(announced);
  const resumed = roundtrip(w);
  const encoder = new SnapshotEncoder(), decoder = new SnapshotDecoder();
  expect(decoder.adopt(structuredClone(encoder.encode(w, 0, 0))).status).toBe('applied');
  stepWorld(w, 30); stepWorld(resumed, 30); expect(resumed).toEqual(w);
  roundtrip(w);
  const corrupt = structuredClone(w);
  if (!corrupt.scout || !('pawn' in corrupt.scout)) throw new Error('Expected real original off-map owner.');
  corrupt.scout.pawn.romanceMemories![0]!.otherId = food.id;
  expect(() => serializeWorld(corrupt)).toThrow();
});

test('cache follows a replaced graph and implied sibling parentage remains exact across checkpoint', () => {
  const w = medicalCamp(3), [a, b, c] = w.pawns;
  expect(relationshipIndex(w).kinds(a!.id, b!.id)).toEqual([]);
  expect(tryAddRelationship(w, pair('sibling', a!.id, b!.id, w.tick))).toBe(true);
  const old = relationshipIndex(w);
  expect(tryAddRelationship(w, pair('parent', a!.id, c!.id, w.tick))).toBe(true);
  expect(old.parents(b!.id)).toEqual([]);
  expect(relationshipIndex(w).parents(b!.id)).toEqual([c!.id]);
  roundtrip(w);
  const corrupt = structuredClone(w); corrupt.relationships!.links[0]!.recordedAt = w.tick + 1;
  expect(() => serializeWorld(corrupt)).toThrow();
});
