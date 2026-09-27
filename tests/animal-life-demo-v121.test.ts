import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { adultAgeTicks, animalBodySize, animalLifeStage, animalNutritionMax, gestationTicks } from '../src/sim/animal-life.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';

const fixtureUrl = new URL('../public/test-saves/v121/cycle-animal.json', import.meta.url);
const manifestUrl = new URL('../public/test-saves/manifest.json', import.meta.url);
const sourceUrl = new URL('../public/test-saves/v119/enclos.json', import.meta.url);

/** The V119 pen is historical and untouched. Only this new public scene is prepared. */
function preparedWorld() {
  const world = deserializeWorld(readFileSync(sourceUrl, 'utf8'));
  const [mother, father] = world.wildlife!.animals;
  expect(mother).toMatchObject({ species: 'deer', sex: 'female', domestic: expect.any(Object) });
  expect(father).toMatchObject({ species: 'deer' });
  expect(father!.domestic).toBeUndefined();
  father!.sex = 'male';
  father!.domestic = structuredClone(mother!.domestic!);
  mother!.pregnancy = { fatherId: father!.id, progress: gestationTicks('deer') - 2 };
  const junior = structuredClone(mother!);
  junior.id = world.nextId++;
  junior.x = 12; junior.z = 17;
  junior.ageTicks = adultAgeTicks('deer') - 80;
  junior.food = animalNutritionMax(junior);
  junior.parents = { motherId: mother!.id, fatherId: father!.id };
  delete junior.pregnancy;
  world.wildlife!.animals.push(junior);
  expect(validateWorld(world)).toEqual([]);
  return world;
}

const entry = (world: ReturnType<typeof preparedWorld>, sha256: string) => ({
  id: 'cycle-animal-v121', release: 'v121', label: 'Naissance et croissance · 2 colons',
  description: 'Un couple de cerfs domestiques attend une mise bas proche ; un jeune préparé devient adulte peu après la reprise. La naissance et la maturation sont effectuées par le moteur.',
  filename: 'cycle-animal.json', pawns: world.pawns.length, colonists: world.pawns.length,
  width: world.width, height: world.height, tick: world.tick,
  focus: ['couple domestique', 'gestation', 'naissance', 'croissance', 'enclos'],
  steps: [
    'Repérer la femelle à (10, 17), le mâle à (10, 15) et le jeune à (12, 17) dans Animaux ; examiner âge et gestation.',
    'Reprendre la partie : la femelle met bas près d’elle, puis le jeune déjà présent atteint le stade adulte et grandit visiblement.',
    'Sauvegarder et recharger pour poursuivre les âges, la parenté et les animaux physiques dans l’enclos.',
  ],
  prepared: true,
  provenance: 'Scène V121 préparée depuis l’enclos historique V119 : couple possédé, gestation presque achevée et jeune proche de l’âge adulte sont fournis. La naissance et la croissance observées après reprise sont de vraies transitions du moteur ; aucune naissance n’est précréditée.',
  sha256,
});

test('prepared V121 colony is directly loadable and its birth and growth continue exactly', () => {
  if (process.env.WRITE_V121_DEMO === '1') {
    const expected = preparedWorld();
    if(Number(expected.schemaVersion)!==121)throw new Error('The published V121 fixture is immutable under a newer schema.');
    const serialized = serializeWorld(expected);
    const sha256 = createHash('sha256').update(serialized).digest('hex');
    mkdirSync(new URL('../public/test-saves/v121/', import.meta.url), { recursive: true });
    writeFileSync(fixtureUrl, serialized);
    const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8')) as { version: number; saves: Record<string, unknown>[] };
    manifest.saves = manifest.saves.filter(save => save.id !== 'cycle-animal-v121');
    manifest.saves.push(entry(expected, sha256));
    writeFileSync(manifestUrl, JSON.stringify(manifest, null, 2) + '\n');
  }
  const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8')) as { saves: { id: string; release: string; filename: string; sha256: string; prepared: boolean }[] };
  const listed = manifest.saves.find(save => save.id === 'cycle-animal-v121');
  expect(listed).toMatchObject({ release: 'v121', filename: 'cycle-animal.json', prepared: true });
  const raw = readFileSync(fixtureUrl, 'utf8');
  expect(createHash('sha256').update(raw).digest('hex')).toBe(listed!.sha256);
  const world = deserializeWorld(raw);
  expect(validateWorld(world)).toEqual([]);
  const mother = world.wildlife!.animals.find(a => a.pregnancy)!;
  const father = world.wildlife!.animals.find(a => a.id === mother.pregnancy!.fatherId)!;
  const junior = world.wildlife!.animals.find(a => a.parents?.motherId === mother.id)!;
  expect(world.wildlife!.animals).toHaveLength(3);
  expect([mother.domestic, father.domestic, junior.domestic].every(Boolean)).toBe(true);
  expect(animalLifeStage(junior)).toBe('juvenile');
  const smallSize = animalBodySize(junior);
  stepWorld(world);
  const resumed = deserializeWorld(serializeWorld(world));
  expect(validateWorld(resumed)).toEqual([]);
  let birthAt: number | undefined;
  let matureAt: number | undefined;
  for (let i = 0; i < 115; i++) {
    stepWorld(world); stepWorld(resumed);
    if (birthAt === undefined && world.wildlife!.animals.length > 3) birthAt = world.tick;
    if (matureAt === undefined && animalLifeStage(junior) === 'adult') matureAt = world.tick;
  }
  expect(birthAt).toBeDefined();
  expect(matureAt).toBeDefined();
  expect(world.wildlife!.animals).toHaveLength(4);
  const baby = world.wildlife!.animals.find(a => a.id !== mother.id && a.id !== father.id && a.id !== junior.id)!;
  expect(baby).toMatchObject({ species: 'deer', ageTicks: expect.any(Number), parents: { motherId: mother.id, fatherId: father.id }, domestic: expect.any(Object) });
  expect(animalLifeStage(baby)).toBe('baby');
  expect(mother.pregnancy).toBeUndefined();
  expect(animalBodySize(junior)).toBeGreaterThan(smallSize);
  expect(validateWorld(world)).toEqual([]);
  expect(serializeWorld(resumed)).toBe(serializeWorld(world));
});
