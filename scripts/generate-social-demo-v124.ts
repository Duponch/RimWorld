import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION, type World } from '../src/sim/types.ts';

const sourceUrl = new URL('../public/test-saves/v103/salles.json', import.meta.url);
const fixtureUrl = new URL('../public/test-saves/v124/rencontre.json', import.meta.url);
const manifestUrl = new URL('../public/test-saves/manifest.json', import.meta.url);

/** Copy the historical room scene; all new furnishings and people belong to V124. */
export function prepareSocialDemo(): World {
  const world = deserializeWorld(readFileSync(sourceUrl, 'utf8'));
  const table = world.structures.find(s => s.kind === 'table' && s.x === 18 && s.z === 15);
  assert.ok(table, 'V103 dining table must exist');
  table.gatherSpot = true;
  assert.ok(world.structures.some(s => s.kind === 'stool' && s.x === 17 && s.z === 15));
  assert.ok(!world.structures.some(s => s.x === 17 && s.z === 16));
  world.structures.push({id: world.nextId++, kind: 'stool', x: 17, z: 16, orientation: 0, footprint: 'standard', material: 'wood', quality: 'normal'});

  const ada = world.pawns[0]!;
  const basile = structuredClone(ada);
  basile.id = world.nextId++;
  basile.name = 'Basile';
  basile.x = 16;
  basile.z = 16;
  basile.bedId = null;
  delete basile.social;
  world.pawns.push(basile);
  for (const pawn of [ada, basile]) {
    pawn.hunger = 100;
    pawn.rest = 100;
    pawn.recreation.level = 10;
    pawn.recreation.task = null;
    pawn.recreation.tolerance = {solitary: 70, dexterity: 70, cerebral: 70, social: 0};
    pawn.recreation.bored = {solitary: true, dexterity: true, cerebral: true, social: false};
    pawn.schedule = Array.from({length: 24}, () => 'recreation' as const);
    pawn.needCooldown = 0;
    pawn.planCooldown = 0;
    pawn.path = [];
    pawn.state = 'idle';
  }
  assert.deepEqual(validateWorld(world), []);
  return world;
}

export function socialManifestEntry(world: World, sha256: string) {
  return {
    id: 'rencontre-v124', release: 'v124', label: 'Rencontre autour d’une table · 2 colons',
    description: 'Ada et Basile disposent d’une table de rassemblement active et de deux tabourets physiques ; leurs loisirs sociaux commencent après reprise.',
    filename: 'rencontre.json', pawns: world.pawns.length, colonists: 2,
    width: world.width, height: world.height, tick: world.tick,
    focus: ['loisir social', 'table de rassemblement', 'places réservées', 'conversation', 'salle de loisirs'],
    steps: [
      'Repérer la table active à (18, 15) et ses deux tabourets à (17, 15) et (17, 16) ; inspecter le loisir d’Ada et de Basile.',
      'Reprendre la partie : les deux colons rejoignent chacun une place, gagnent du loisir social et peuvent converser.',
      'Désactiver le point de rassemblement ou retirer un tabouret pour constater l’interruption et la libération de la place.',
    ],
    prepared: true,
    provenance: 'Scène V124 préparée depuis les salles historiques V103 sans les modifier : un second colon, un tabouret, la table active et les besoins initiaux sont fixés explicitement. La détente et les conversations éventuelles se produisent seulement après reprise par le moteur.',
    sha256,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  assert.equal(Number(SCHEMA_VERSION), 124, 'The V124 fixture is immutable after schema V124; prepare a new-version scene instead.');
  const world = prepareSocialDemo();
  const raw = serializeWorld(world);
  const sha256 = createHash('sha256').update(raw).digest('hex');
  mkdirSync(dirname(fileURLToPath(fixtureUrl)), {recursive: true});
  writeFileSync(fixtureUrl, raw);
  const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8')) as {version: number; saves: {id: string}[]};
  assert.equal(manifest.version, 2);
  manifest.saves = manifest.saves.filter(save => save.id !== 'rencontre-v124');
  manifest.saves.push(socialManifestEntry(world, sha256));
  writeFileSync(manifestUrl, JSON.stringify(manifest, null, 2) + '\n');
  assert.deepEqual(deserializeWorld(raw), world);
  process.stdout.write(JSON.stringify({fixture: fileURLToPath(fixtureUrl), sha256, tick: world.tick}) + '\n');
}
