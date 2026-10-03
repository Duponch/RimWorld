import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createWorld } from '../src/sim/engine.ts';
import { adultAgeTicks } from '../src/sim/animal-life.ts';
import { faunaBiome } from '../src/sim/animal-species.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION, type Pawn, type World } from '../src/sim/types.ts';
import type { WildAnimal } from '../src/sim/wildlife-state.ts';

export const PREDATION_INITIAL_TICK = 2000;
export const PREDATION_FOX_CELL = { x: 10, z: 12 } as const;
export const PREDATION_HARE_CELL = { x: 15, z: 12 } as const;

/** Prepared healthy, living actors. No hunt, hit, corpse, meal or route is granted. */
export function preparePredationDemo({ domesticPrey = true }: { domesticPrey?: boolean } = {}): World {
  const world = createWorld(190, 32, 32);
  world.tick = PREDATION_INITIAL_TICK;
  world.tiles = world.tiles.map(() => ({ terrain: 'grass' }));
  world.resources = []; world.jobs = []; world.piles = []; world.structures = [];
  world.packed = []; world.stockpiles = []; world.growingZones = []; world.growingCursor = 0;
  for (const [i, pawn] of world.pawns.entries()) {
    pawn.x = 4 + i * 2; pawn.z = 4;
    pawn.hunger = 100; pawn.rest = 100; pawn.recreation.level = 100;
    pawn.health = createMedicalRecord(world.tick);
    pawn.schedule.fill('work'); pawn.apparelAutomation = false;
    pawn.needCooldown = 0; pawn.planCooldown = 0;
    for (const work of Object.keys(pawn.priorities) as (keyof Pawn['priorities'])[]) pawn.priorities[work] = 0;
  }
  const fox: WildAnimal = {
    id: world.nextId++, species: 'red-fox', sex: 'male', ageTicks: adultAgeTicks('red-fox'),
    ...PREDATION_FOX_CELL, food: .04, rest: 1, state: 'idle', path: [], nextDecision: world.tick,
    health: { ...createMedicalRecord(world.tick), body: 'red-fox' },
  };
  const hare: WildAnimal = {
    id: world.nextId++, species: 'hare', sex: 'female', ageTicks: adultAgeTicks('hare'),
    ...PREDATION_HARE_CELL, food: .2, rest: 1, state: 'idle', path: [], nextDecision: world.tick,
    health: { ...createMedicalRecord(world.tick), body: 'hare' },
    ...(domesticPrey ? { domestic: { since: world.tick, care: 'none' as const, tameness: 5, nextDecay: world.tick + 6000 } } : {}),
  };
  const biome = faunaBiome('temperate-forest', true);
  const fullTargetWeight = world.width * world.height * biome.animalDensity / 10000;
  world.wildlife = {
    profile: 'biome-fauna-v2', rng: (world.seed ^ 0x784caf31) >>> 0 || 1, animals: [fox, hare],
    eatenPlants: 0, eatenNutrition: 0, eatenItems: 0,
    population: {
      biome: 'temperate-forest', fullTargetWeight,
      targetWeight: fullTargetWeight * biome.entries.reduce((n, e) => n + e.commonality, 0) / biome.totalCommonality,
      nextCheck: world.tick + 122, checks: 0, arrivals: 0,
    },
  };
  refreshStock(world); assert.deepEqual(validateWorld(world), []);
  return world;
}

export function predationDemoEntry(world: World, sha256: string) { return {
  id: 'predation-v190', release: 'v190', label: 'Renard et prédation · 3 colons',
  description: 'Observer un renard sauvage affamé poursuivre un lièvre domestique sain, combattre puis manger sa dépouille au contact. Les colons restent disponibles pour une intervention manuelle.',
  filename: 'predation.json', pawns: world.pawns.length, colonists: 3,
  width: world.width, height: world.height, tick: world.tick,
  focus: ['renard roux', 'proie domestique', 'poursuite', 'combat anatomique', 'dépouille', 'ingestion partielle', 'sauvegarde et reprise'],
  steps: [
    'Charger en pause : le renard sain en (10,12) possède 0,04 nutrition sur 0,55 ; le lièvre domestique sain est en (15,12). Aucun aliment accessible, blessure, trajet ou chasse ne sont préparés.',
    'Reprendre à 1× : observer la sélection, la poursuite et les coups réels. Les trois colons au nord ont leurs travaux désactivés ; toute intervention défensive est un choix manuel.',
    'Après le décès et la fin du déplacement capturé, inspecter la dépouille. Le renard doit encore la rejoindre et accomplir son ingestion ; une partie consommée ne transforme pas le corps restant en viande abstraite.',
    'Sauvegarder pendant la poursuite, une récupération ou l’ingestion, puis recharger et reprendre. Le corps conserve son identité, son heure de décès et son anatomie restante.',
  ],
  prepared: true,
  provenance: 'Scène préparée 32×32 au schéma 178, graine 190, tick local 2000, environnement historique tempéré à 21 °C. Terrain aplani en grass, sans ressource végétale, objet, chantier ou bâtiment. Trois colons ordinaires repositionnés au nord, santé neutre et besoins hauts, habillement automatique et tous travaux désactivés. Renard roux sauvage adulte mâle sain, faim préparée à 0,04 nutrition, repos plein ; lièvre adulte femelle sain, nutrition 0,2, repos plein, propriété domestique préparée sans enclos ni soin. Profil biome-fauna-v2 tempéré : cible écologique complète et part implémentée calculées depuis les définitions courantes, ticket renard 0,07 conservé sans redistribution. Aucun décès, dégât, coup, déplacement, chasse, consommation ou compteur achevé. Scène préparée, pas campagne naturelle ni preuve de charge 250×250.',
  sha256,
}; }

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/create-test-save-predation-v190.ts')) {
  assert.equal(SCHEMA_VERSION, 178, 'Do not rewrite the V190 reference under a later schema.');
  const world = preparePredationDemo(), raw = serializeWorld(world);
  assert.deepEqual(deserializeWorld(raw), world);
  const sha256 = createHash('sha256').update(raw).digest('hex');
  mkdirSync('public/test-saves/v190', { recursive: true });
  writeFileSync('public/test-saves/v190/predation.json', raw);
  // Catalogue/manifest integration belongs to the central owner.
  console.log(JSON.stringify({ path: 'public/test-saves/v190/predation.json', entry: predationDemoEntry(world, sha256) }));
}
