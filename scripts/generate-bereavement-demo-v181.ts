import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reconcilePawnHealth } from '../src/sim/health.ts';
import { BLOOD_UNIT, MEDICAL_INTERVAL } from '../src/sim/injury-rules.ts';
import { createMedicalRecord, medicalBleed } from '../src/sim/injury-state.ts';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { addSocialMemory, opinionOf, socialSeed } from '../src/sim/social-state.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION, type Pawn, type World } from '../src/sim/types.ts';

const fixtureUrl = new URL('../public/test-saves/v181/deuil-et-souvenirs.json', import.meta.url);
export const BEREAVEMENT_DEMO_SEED = 13312;

export function bereavementDemoActors(world: World): { patient: Pawn; friend: Pawn; rival: Pawn } {
  const patient = world.pawns.find(pawn => pawn.name === 'Mina');
  const friend = world.pawns.find(pawn => pawn.name === 'Ada');
  const rival = world.pawns.find(pawn => pawn.name === 'Noé');
  assert.ok(patient && friend && rival, 'The seed must retain the three named Crashlanded colonists.');
  return { patient, friend, rival };
}

/** This is a prepared social/medical starting condition. The friendships and
 * hostility are not claimed as conversations played by this generator. */
export function prepareBereavementDemo(): World {
  const world = createScenarioWorld(BEREAVEMENT_DEMO_SEED, 250, 'crashlanded', { hilliness: 'small-hills', biome: 'arid-shrubland' });
  assert.equal(world.pawns.length, 3);
  const { patient, friend, rival } = bereavementDemoActors(world);
  assert.equal(world.tick, 0);
  assert.equal(patient.id % MEDICAL_INTERVAL, 1, 'The patient must bleed on the first real tick.');
  for (const pawn of world.pawns) {
    pawn.schedule.fill('work');
    pawn.needCooldown = 0;
    pawn.planCooldown = 0;
    for (const work of Object.keys(pawn.priorities) as (keyof Pawn['priorities'])[]) pawn.priorities[work] = 0;
  }
  for (const [survivor, kind, count] of [
    [friend, 'deep-talk', 3],
    [rival, 'fight-angering', 2],
  ] as const) {
    survivor.social ??= { rng: socialSeed(world.seed, survivor.id), memories: [] };
    for (let n = 0; n < count; n++) addSocialMemory(survivor.social, patient.id, kind, world.tick, 1);
  }
  assert.ok(opinionOf(friend, patient.id, world.tick) >= 20);
  assert.ok(opinionOf(rival, patient.id, world.tick) <= -20);
  const health = createMedicalRecord(world.tick);
  health.nextInjuryId = 2;
  health.injuries.push({ id: 1, part: 'torso', kind: 'cut', severity: 10_000, bornAt: world.tick });
  health.bloodLoss = BLOOD_UNIT - 1;
  patient.health = health;
  reconcilePawnHealth(world, patient);
  assert.equal(patient.state, 'downed');
  assert.equal(patient.health.death, undefined);
  assert.ok(medicalBleed(patient.health) > 0);
  assert.deepEqual(validateWorld(world), []);
  return world;
}

export function bereavementDemoManifestEntry(world: World, sha256: string) {
  const { patient, friend, rival } = bereavementDemoActors(world);
  return {
    id: 'deuil-et-souvenirs-v181', release: 'v181', label: 'Deuil et souvenirs · 3 colons',
    description: 'Une patiente à terre perd encore du sang. Deux survivants ont des opinions préparées opposées ; reprendre pour observer le décès réel et leurs pensées.',
    filename: 'deuil-et-souvenirs.json', pawns: world.pawns.length, colonists: 3,
    width: world.width, height: world.height, tick: world.tick,
    focus: ['décès', 'deuil', 'rivalité', 'opinion', 'pensées et humeur', 'dépouille', 'sauvegarde et reprise'],
    steps: [
      `Inspecter ${patient.name} dans Santé : elle est à terre, sa blessure saigne et son dossier n’indique encore aucun décès.`,
      `Inspecter Social de ${friend.name} puis ${rival.name} : leurs opinions dirigées envers ${patient.name} sont préparées et opposées.`,
      `Reprendre à 1× : ${patient.name} meurt de sa perte de sang au premier tick simulé. Mettre en pause et lire dans Besoins les pensées distinctes de ${friend.name} et ${rival.name}.`,
      'Sauvegarder puis recharger : vérifier la même dépouille, la même identité et les deux souvenirs avec leurs échéances.',
    ],
    prepared: true,
    provenance: `Départ Crashlanded Core adapté, graine ${BEREAVEMENT_DEMO_SEED}, broussailles arides naturelles 250 × 250, schéma 170. Blessure au torse et perte de sang presque fatale préparées sur ${patient.name}, encore vivante et à terre. Trois souvenirs de discussion de ${friend.name} et deux souvenirs de bagarre rageante de ${rival.name} envers elle sont injectés comme opinions initiales dirigées ; ces rencontres ne sont pas présentées comme jouées. Aucun stock, compétence, ressource, traitement ou décès rétroactif n’est accordé. La mort par hémorragie, le corps et les pensées de deuil proviennent uniquement d’un vrai stepWorld après chargement.`,
    sha256,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  assert.equal(SCHEMA_VERSION, 170, 'Write V181 only with strict schema 170.');
  const world = prepareBereavementDemo();
  const raw = serializeWorld(world);
  const sha256 = createHash('sha256').update(raw).digest('hex');
  mkdirSync(dirname(fileURLToPath(fixtureUrl)), { recursive: true });
  writeFileSync(fixtureUrl, raw);
  assert.deepEqual(deserializeWorld(raw), world);
  process.stdout.write(JSON.stringify({ fixture: fileURLToPath(fixtureUrl), sha256, tick: world.tick, entry: bereavementDemoManifestEntry(world, sha256) }) + '\n');
}
