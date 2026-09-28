import { expect, test } from 'vitest';
import { deserializeWorld, serializeWorld, stepWorld, validateWorld } from '../src/sim/index';
import { createScenarioWorld } from '../src/sim/new-game';
import { damageResource } from '../src/sim/thing-damage';
import { resourceMaxHp } from '../src/sim/thing-damage-rules';
import { validateFires } from '../src/sim/fire-save';
import { SCHEMA_VERSION } from '../src/sim/types';

function burnedGrass() {
  const world = createScenarioWorld(42, 32, 'crashlanded', { biome: 'arid-shrubland' });
  const grass = world.resources.find(resource => resource.species === 'grass')!;
  expect(grass).toBeDefined();
  expect(damageResource(world, grass, resourceMaxHp(grass), 'fire')).toBe(true);
  expect(world.resources).not.toContain(grass);
  expect(world.fires!.ledger.resources).toEqual({ 'wild-plant': 1 });
  return world;
}

test('burned wild vegetation remains savable and resumes exactly', () => {
  const world = burnedGrass();
  expect(validateWorld(world)).toEqual([]);
  const resumed = deserializeWorld(serializeWorld(world));
  expect(resumed.fires!.ledger).toEqual(world.fires!.ledger);
  stepWorld(world, 30);
  stepWorld(resumed, 30);
  expect(validateWorld(resumed)).toEqual([]);
  expect(serializeWorld(resumed)).toBe(serializeWorld(world));
});

test('wild-plant fire losses require V91 and retain strict identities and quantities', () => {
  const world = burnedGrass();
  for (const version of [87, 90])
    expect(validateFires(world, version)).toContain('Invalid fire loss ledger.');
  expect(validateFires(world, 91)).toEqual([]);
  expect(validateFires(world, SCHEMA_VERSION)).toEqual([]);
  for (const value of [0, -1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    const malformed = structuredClone(world);
    malformed.fires!.ledger.resources['wild-plant'] = value;
    expect(validateFires(malformed, SCHEMA_VERSION)).toContain('Invalid fire loss ledger.');
  }
  for (const key of ['rock', 'unknown-plant']) {
    const malformed = structuredClone(world);
    (malformed.fires!.ledger.resources as Record<string, number>)[key] = 1;
    expect(validateFires(malformed, SCHEMA_VERSION)).toContain('Invalid fire loss ledger.');
  }
  delete world.fires!.ledger.resources['wild-plant'];
  expect(validateFires(world, 90)).toEqual([]);
});
