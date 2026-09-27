import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyCommand, deserializeWorld, serializeWorld, validateWorld } from '../src/sim/index.ts';
import { addGroundMaterial } from '../src/sim/materials.ts';
import { ADVANCED_FABRICATION_RESEARCH_COST } from '../src/sim/research.ts';
import type { World } from '../src/sim/types.ts';

const sourceUrl = new URL('../public/test-saves/v123/industrie.json', import.meta.url);
const fixtureUrl = new URL('../public/test-saves/v139/industrie-avancee.json', import.meta.url);
const manifestUrl = new URL('../public/test-saves/manifest.json', import.meta.url);

/** Prepared inputs only: actual transport, work and product happen after load. */
export function prepareAdvancedIndustryDemo(): World {
  const world = deserializeWorld(readFileSync(sourceUrl, 'utf8'));
  const bench = world.structures.find(s => s.kind === 'fabrication-bench');
  const pawn = world.pawns[0];
  assert.ok(bench?.power?.on && pawn, 'V123 industry scene must have its powered bench and colonist');
  assert.ok(world.research?.fabrication?.completedAt !== undefined, 'Fabrication must precede advanced fabrication');
  world.research.advancedFabrication = { points: ADVANCED_FABRICATION_RESEARCH_COST, completedAt: world.tick };
  bench.bills = [];
  addGroundMaterial(world, 'component', 1, {x:10,z:9}, 'component');
  addGroundMaterial(world, 'plasteel', 10, {x:10,z:10}, 'plasteel');
  addGroundMaterial(world, 'gold', 3, {x:9,z:10}, 'gold');
  const bill = applyCommand(world, { type:'bill-add', structureId:bench.id, recipe:'make-advanced-component' });
  assert.equal(bill.ok, true, bill.reason);
  assert.deepEqual(bench.bills?.map(b => b.recipe), ['make-advanced-component']);
  assert.equal(world.piles.some(p => p.item === 'advanced-component' || p.componentWork?.recipe === 'make-advanced-component'), false);
  assert.equal(world.structures.filter(s => s.kind === 'fabrication-bench').length, 1);
  assert.deepEqual(validateWorld(world), []);
  return world;
}

export function advancedIndustryManifestEntry(world: World, sha256: string) {
  return {
    id:'industrie-avancee-v139', release:'v139', label:'Composant avancé · 1 colon',
    description:'Fabrication avancée recherchée, établi alimenté, Ada Artisanat 10, quatre matières physiques et facture prête ; la production commence après reprise.',
    filename:'industrie-avancee.json', pawns:world.pawns.length, colonists:1,
    width:world.width, height:world.height, tick:world.tick,
    focus:['fabrication avancée','composant avancé','acier','plastacier','or','ouvrage physique'],
    steps:[
      'Repérer l’établi alimenté à (16, 8) et sa facture de composant avancé ; inspecter les quatre matières au sol.',
      'Reprendre la partie : Ada transporte 1 composant, 20 aciers, 10 plastaciers et 3 ors avant de travailler l’ouvrage.',
      'Sauvegarder et recharger pendant le travail pour vérifier l’auteur, les parts et la progression conservés.',
      'Après la production de deux composants avancés par les mêmes règles, les livrer à un deuxième établi avec ses autres matériaux.',
    ],
    prepared:true,
    provenance:'Scène V139 préparée depuis la sauvegarde V123 sans la modifier : recherche avancée acquise, trois nouvelles piles et facture avancée explicites. Aucun composant avancé, ouvrage ou second établi n’est préfabriqué ; le premier produit vient du moteur après reprise.',
    sha256,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const world = prepareAdvancedIndustryDemo();
  const raw = serializeWorld(world);
  const sha256 = createHash('sha256').update(raw).digest('hex');
  mkdirSync(dirname(fileURLToPath(fixtureUrl)), { recursive:true });
  writeFileSync(fixtureUrl, raw);
  const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8')) as {version:number;saves:{id:string}[]};
  assert.equal(manifest.version, 2);
  manifest.saves = manifest.saves.filter(save => save.id !== 'industrie-avancee-v139');
  manifest.saves.push(advancedIndustryManifestEntry(world, sha256));
  writeFileSync(manifestUrl, JSON.stringify(manifest, null, 2) + '\n');
  assert.deepEqual(deserializeWorld(raw), world);
  process.stdout.write(JSON.stringify({fixture:fileURLToPath(fixtureUrl),sha256,tick:world.tick}) + '\n');
}
