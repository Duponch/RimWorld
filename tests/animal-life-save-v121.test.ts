import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { adultAgeTicks, gestationTicks } from '../src/sim/animal-life.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { BLOOD_UNIT } from '../src/sim/injury-rules.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION, type World } from '../src/sim/types.ts';

const v120 = () => JSON.parse(readFileSync('public/test-saves/v120/produits-animaux.json', 'utf8')) as World;
const migrated = () => deserializeWorld(JSON.stringify(v120()));

test('strict V120 validation precedes neutral adult-age migration', () => {
  const original = v120();
  const world = migrated();
  expect(SCHEMA_VERSION).toBe(121);
  expect(world.schemaVersion).toBe(121);
  expect(world.wildlife?.animals.map(a => [a.id, a.ageTicks, a.parents, a.pregnancy])).toEqual(
    original.wildlife?.animals.map(a => [a.id, adultAgeTicks(a.species), undefined, undefined]),
  );
  expect(world.wildlife?.animals.map(a => a.domestic?.productFullness)).toEqual(
    original.wildlife?.animals.map(a => a.domestic?.productFullness),
  );
  expect(world.rng).toBe(original.rng);
  expect(world.wildlife?.rng).toBe(original.wildlife?.rng);
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);

  for (const field of ['ageTicks', 'parents', 'pregnancy', 'mating'] as const) {
    const future = v120();
    Object.assign(future.wildlife!.animals[0]!, { [field]: field === 'ageTicks' ? 0 : {} });
    expect(() => deserializeWorld(JSON.stringify(future))).toThrow(/Invalid version 120 save/);
  }
});

test('V120 animal corpses gain adult age only after strict validation', () => {
  const old = v120();
  const animal = old.wildlife!.animals.shift()!;
  const health = { ...createMedicalRecord(old.tick), body: animal.species, bloodLoss: BLOOD_UNIT,
    death: { tick: old.tick, cause: 'blood-loss' as const } };
  old.piles.push({ id: animal.id, kind: 'corpse', item: 'dromedary-corpse', quantity: 1,
    owner: { type: 'ground', x: animal.x, z: animal.z },
    corpse: { animalId: animal.id, species: animal.species, sex: animal.sex, health },
    rot: { progress: 0, atTick: old.tick } } as unknown as World['piles'][number]);
  const world = deserializeWorld(JSON.stringify(old));
  expect(world.piles.find(p => p.corpse?.animalId === animal.id)?.corpse?.ageTicks).toBe(adultAgeTicks(animal.species));
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  old.piles.at(-1)!.corpse!.ageTicks = 0;
  expect(() => deserializeWorld(JSON.stringify(old))).toThrow(/Invalid version 120 save/);
});

test('V121 validates physical age, parent identity and bounded pregnancy', () => {
  const world = migrated();
  const mother = world.wildlife!.animals.find(a => a.species === 'dromedary')!;
  const father = world.wildlife!.animals.find(a => a.species === 'muffalo')!;
  father.species = 'dromedary';
  father.food = Math.min(father.food, 2.1);
  delete father.domestic!.productFullness;
  mother.pregnancy = { fatherId: father.id, progress: gestationTicks(mother.species) };
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);

  const badAge = structuredClone(world);
  badAge.wildlife!.animals[0]!.ageTicks = -1;
  expect(validateWorld(badAge)).toContain('Invalid animal age.');
  const badProgress = structuredClone(world);
  badProgress.wildlife!.animals[0]!.pregnancy!.progress++;
  expect(validateWorld(badProgress)).toContain('Invalid animal pregnancy.');
  const badFather = structuredClone(world);
  badFather.wildlife!.animals[1]!.species = 'muffalo';
  expect(validateWorld(badFather)).toContain('Invalid animal pregnancy.');
  const absentFather = structuredClone(world);
  absentFather.wildlife!.animals.splice(1, 1);
  expect(validateWorld(absentFather)).toEqual([]);

  delete mother.pregnancy;
  father.mating = { femaleId: mother.id, progress: 49 };
  expect(validateWorld(world)).toEqual([]);
  const badMating = structuredClone(world);
  badMating.wildlife!.animals[1]!.mating!.progress = 50;
  expect(validateWorld(badMating)).toContain('Invalid animal mating.');
  const unavailableMate = structuredClone(world);
  unavailableMate.wildlife!.animals[0]!.pregnancy = { fatherId: father.id, progress: 0 };
  expect(validateWorld(unavailableMate)).toContain('Invalid animal mating.');
  delete father.mating;

  const child = structuredClone(mother);
  child.id = world.nextId++;
  child.ageTicks = 0;
  child.parents = { motherId: mother.id, fatherId: father.id };
  delete child.pregnancy;
  delete child.domestic!.productFullness;
  child.x = mother.x + 1;
  world.wildlife!.animals.push(child);
  expect(validateWorld(world)).toEqual([]);
  const badParents = structuredClone(world);
  badParents.wildlife!.animals.at(-1)!.parents!.fatherId = child.id;
  expect(validateWorld(badParents)).toContain('Invalid animal parentage.');
});
