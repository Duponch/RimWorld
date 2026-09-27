import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyCommand, deserializeWorld, serializeWorld, validateWorld } from '../src/sim/index.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { FABRICATION_RESEARCH_COST, MICROELECTRONICS_RESEARCH_COST, MULTI_ANALYZER_RESEARCH_COST } from '../src/sim/research.ts';
import type { World } from '../src/sim/types.ts';

const sourceUrl = new URL('../public/test-saves/v101/atelier.json', import.meta.url);
const fixtureUrl = new URL('../public/test-saves/v123/industrie.json', import.meta.url);
const manifestUrl = new URL('../public/test-saves/manifest.json', import.meta.url);

/** Prepare a new scene from the immutable V101 save. No component is supplied. */
export function prepareIndustryDemo(): World {
  const world = deserializeWorld(readFileSync(sourceUrl, 'utf8'));
  const pawn = world.pawns[0]!;
  const generator = world.structures.find(s => s.kind === 'wood-generator');
  assert.ok(generator?.power?.on && generator.fuel?.ticks, 'V101 generator must be running');
  world.structures = world.structures.filter(s => s.kind !== 'machining-table');
  world.piles = world.piles.filter(p => p.item !== 'component');
  world.research!.microelectronics = { points: MICROELECTRONICS_RESEARCH_COST, completedAt: world.tick };
  world.research!.multiAnalyzer = { points: MULTI_ANALYZER_RESEARCH_COST, completedAt: world.tick };
  world.research!.fabrication = { points: FABRICATION_RESEARCH_COST, completedAt: world.tick };
  const bench = {
    id: world.nextId++, kind: 'fabrication-bench' as const, x: 16, z: 8,
    orientation: 0 as const, footprint: 'standard' as const, material: 'steel' as const,
    power: { ...newPowerState('fabrication-bench'), on: true, parentId: generator.id }, bills: [],
  };
  world.structures.push(bench);
  pawn.x = 15;
  pawn.z = 6;
  delete pawn.motion;
  pawn.hunger = 100;
  pawn.rest = 100;
  pawn.recreation.level = 100;
  pawn.schedule.fill('work');
  pawn.priorities.research = 0;
  pawn.priorities.build = 0;
  pawn.priorities.craft = 1;
  pawn.skills.crafting!.level = 10;
  pawn.needCooldown = 0;
  pawn.planCooldown = 0;
  const bill = applyCommand(world, { type: 'bill-add', structureId: bench.id, recipe: 'make-component' });
  assert.equal(bill.ok, true, bill.reason);
  assert.equal(bench.bills.length, 1);
  assert.equal(world.piles.filter(p => p.item === 'component').length, 0);
  assert.ok(world.piles.filter(p => p.item === 'steel').reduce((n, p) => n + p.quantity, 0) >= 12);
  assert.deepEqual(validateWorld(world), []);
  return world;
}

export function industryManifestEntry(world: World, sha256: string) {
  return {
    id: 'industrie-v123', release: 'v123', label: 'Fabrication de composants · 1 colon',
    description: 'Établi de fabrication alimenté, Ada Artisanat 10, acier physique et facture pour un composant ; la fabrication commence après reprise.',
    filename: 'industrie.json', pawns: world.pawns.length, colonists: 1,
    width: world.width, height: world.height, tick: world.tick,
    focus: ['fabrication', 'composant', 'acier', 'ouvrage physique', 'énergie'],
    steps: [
      'Repérer l’établi de fabrication à (16, 8), son alimentation et sa facture de composant ; inspecter l’acier au sol.',
      'Reprendre la partie : Ada transporte 12 aciers, travaille à l’établi et produit un composant physique.',
      'Sauvegarder et recharger pendant l’ouvrage pour vérifier la reprise de sa progression.',
    ],
    prepared: true,
    provenance: 'Scène V123 préparée depuis la sauvegarde historique V101 sans la modifier : recherches achevées, établi et facture placés explicitement, composants initiaux retirés. Le premier composant et son travail sont produits après reprise par le moteur.',
    sha256,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const world = prepareIndustryDemo();
  const raw = serializeWorld(world);
  const sha256 = createHash('sha256').update(raw).digest('hex');
  mkdirSync(dirname(fileURLToPath(fixtureUrl)), { recursive: true });
  writeFileSync(fixtureUrl, raw);
  const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8')) as { version: number; saves: { id: string }[] };
  assert.equal(manifest.version, 2);
  manifest.saves = manifest.saves.filter(save => save.id !== 'industrie-v123');
  manifest.saves.push(industryManifestEntry(world, sha256));
  writeFileSync(manifestUrl, JSON.stringify(manifest, null, 2) + '\n');
  assert.equal(readFileSync(fixtureUrl, 'utf8'), raw);
  assert.deepEqual(deserializeWorld(raw), world);
  process.stdout.write(JSON.stringify({ fixture: fileURLToPath(fixtureUrl), sha256, tick: world.tick }) + '\n');
}
