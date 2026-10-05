import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyCommand } from '../src/sim/engine.ts';
import { reconcilePawnHealth } from '../src/sim/health.ts';
import { addResolvedInjury, createMedicalRecord } from '../src/sim/injury-state.ts';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { startingSkills } from '../src/sim/skills.ts';
import { SCHEMA_VERSION, type World } from '../src/sim/types.ts';

const fixtureUrl = new URL('../public/test-saves/v179/racines-et-soins.json', import.meta.url);
const manifestUrl = new URL('../public/test-saves/manifest.json', import.meta.url);
export const HEALROOT_CELL = { x: 127, z: 143 } as const;
export const MEDICINE_STORE = { x: 127, z: 126 } as const;

/** The terrain, plant, colonists and Crashlanded supplies come from the normal factory.
 * Only work policies, one reserve, one designation and Noé's bruise are prepared. */
export function prepareHealrootDemo(generation: 'current' | 'pre-v210' = 'current'): World {
  const world = createScenarioWorld(42, 250, 'crashlanded', { hilliness: 'small-hills', biome: 'boreal-forest' });
  // Reconstruct the published starters before this scene's own overrides.
  if (generation === 'pre-v210') world.pawns.forEach((pawn, index) => {
    delete pawn.background; pawn.skills = startingSkills(index);
  });
  delete world.relationships; // This historical scene predates family generation.
  const plant = world.resources.find(resource => resource.id === 7436 && resource.x === HEALROOT_CELL.x && resource.z === HEALROOT_CELL.z);
  assert.ok(plant && plant.species === 'healroot-wild' && plant.kind === 'wild-plant' && plant.growth === 1,
    'Seed 42 must retain its natural mature wild healroot at (127,143).');
  assert.equal(world.pawns.length, 3);
  assert.equal(world.piles.filter(pile => pile.item === 'herbal-medicine').length, 0);
  for (const pawn of world.pawns) {
    pawn.hunger = 100;
    pawn.rest = 100;
    pawn.recreation.level = 100;
    pawn.schedule.fill('work');
    pawn.needCooldown = 0;
    pawn.planCooldown = 0;
    for (const work of Object.keys(pawn.priorities) as (keyof typeof pawn.priorities)[]) pawn.priorities[work] = 0;
  }
  const [ada, noe] = world.pawns;
  assert.equal(ada!.name, 'Ada');
  assert.equal(noe!.name, 'Noé');
  ada!.priorities.gather = 1;
  noe!.medicalCare = 'herbal';
  noe!.health ??= createMedicalRecord(world.tick);
  assert.ok(addResolvedInjury(noe!.health, 'left-arm', 'bruise', 5000, () => .999999));
  reconcilePawnHealth(world, noe!);
  assert.equal(noe!.state, 'idle');
  for (const command of [
    { type: 'stockpile', ...MEDICINE_STORE, enabled: true, filters: { wood: false, food: false, medicine: true }, priority: 2, capacity: 75 },
    { type: 'designate', kind: 'harvest', ...HEALROOT_CELL },
  ] as const) {
    const result = applyCommand(world, command);
    assert.equal(result.ok, true, result.reason);
  }
  assert.equal(world.jobs.filter(job => job.kind === 'harvest' && job.x === HEALROOT_CELL.x && job.z === HEALROOT_CELL.z).length, 1);
  // Explicit historical preparation predates prospective mechanical raids.
  if (generation === 'pre-v210' && world.raids) delete world.raids.mechanoid;
  assert.deepEqual(validateWorld(world), []);
  return world;
}

export function healrootManifestEntry(world: World, sha256: string) {
  return {
    id: 'racines-et-soins-v179', release: 'v179', label: 'Racines et soins · 3 colons',
    description: 'Forêt boréale naturelle 250 × 250, racine mûre désignée, Ada Plantes 8, réserve médicale et contusion légère préparée chez Noé. La dose et le soin attendent les vrais travaux.',
    filename: 'racines-et-soins.json', pawns: world.pawns.length, colonists: 3,
    width: world.width, height: world.height, tick: world.tick,
    focus: ['racine de guérison sauvage', 'compétence Plantes', 'récolte', 'transport', 'réserve médicale', 'soin avec plante médicinale'],
    steps: [
      'À (127, 143), sélectionner la racine sauvage mûre déjà désignée. Inspecter Plantes 8 dans Bio d’Ada et sa priorité Récolte 1 dans Travail ; reprendre pour observer son trajet, le travail et une dose au sol.',
      'La réserve médicale filtrée est en (127, 126). Dans Travail, régler Transport d’Ada sur 1 puis ordonner le transport de la dose récoltée ; suivre sa cargaison jusqu’à la réserve.',
      'Noé porte une contusion légère au bras gauche, préparée dès le départ. Dans Santé, vérifier son plafond « Plantes médicinales », activer Auto-soin, puis régler Médecin de Noé sur 1 et ordonner son auto-soin ; observer la consommation de la dose physique.',
      'Sauvegarder puis recharger pendant une tâche pour vérifier sa continuation. Les autres travaux sont désactivés dans cette scène préparée ; rétablir leurs priorités pour poursuivre librement la colonie.',
    ],
    prepared: true,
    provenance: 'Création Crashlanded ordinaire au schéma 168, graine 42, petit relief boréal et profil Plantes initial, sans modification de la flore naturelle ni dose herbal ajoutée. Seuls une réserve, une désignation, les priorités et besoins de départ, ainsi qu’une contusion localisée déterministe sont préparés ; récolte, transport et soin restent à accomplir après reprise.',
    sha256,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  assert.equal(SCHEMA_VERSION, 168, 'Do not rewrite the V179 reference under a later schema.');
  const world = prepareHealrootDemo();
  const raw = serializeWorld(world);
  const sha256 = createHash('sha256').update(raw).digest('hex');
  const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8')) as { version: number; saves: { id: string }[] };
  assert.equal(manifest.version, 2);
  assert.ok(manifest.saves.length < 32 || manifest.saves.some(save => save.id === 'racines-et-soins-v179'));
  manifest.saves = manifest.saves.filter(save => save.id !== 'racines-et-soins-v179');
  manifest.saves.push(healrootManifestEntry(world, sha256));
  mkdirSync(dirname(fileURLToPath(fixtureUrl)), { recursive: true });
  writeFileSync(fixtureUrl, raw);
  writeFileSync(manifestUrl, JSON.stringify(manifest, null, 2) + '\n');
  assert.equal(readFileSync(fixtureUrl, 'utf8'), raw);
  assert.deepEqual(deserializeWorld(raw), world);
  process.stdout.write(JSON.stringify({ fixture: fileURLToPath(fixtureUrl), sha256, tick: world.tick }) + '\n');
}
