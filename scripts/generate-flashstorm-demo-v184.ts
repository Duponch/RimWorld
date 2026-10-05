import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApparelWearCalendar, APPAREL_POLICY_INTERVAL } from '../src/sim/apparel-renewal.ts';
import { newBreakdownCalendar } from '../src/sim/breakdowns.ts';
import { adoptMiscIncidents, MISC_INTRO_TICK, MISC_RAW_WEIGHT } from '../src/sim/cassandra-misc.ts';
import { enableCassandraRaids } from '../src/sim/cassandra-raids.ts';
import { adoptColonyEconomy } from '../src/sim/colony-economy.ts';
import { adoptEnvironment } from '../src/sim/environment-step.ts';
import { adoptFluIncidents } from '../src/sim/flu-incidents.ts';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { startingSkills } from '../src/sim/skills.ts';
import { SCHEMA_VERSION, type Pawn, type World } from '../src/sim/types.ts';
import { enableVisitors } from '../src/sim/visitors.ts';
import { initializeWildFlora } from '../src/sim/wild-flora.ts';
import { enableBiomeWildlife } from '../src/sim/wildlife.ts';

const fixtureUrl = new URL('../public/test-saves/v184/orage-sec-et-incendies.json', import.meta.url);
export const FLASHSTORM_DEMO_SEED = 12456;
export const FLASHSTORM_DEMO_TICK = MISC_INTRO_TICK - 1;

function firstMiscTicket(seed: number): number {
  let rng = ((seed ^ 0x4c5ca180) >>> 0) || 1;
  rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5;
  return (rng >>> 0) / 0x100000000 * MISC_RAW_WEIGHT;
}

/** This is a prepared civil date, not a replay of four elapsed days. Each
 * independent owner starts prospectively at the prepared time. */
function prepareClock(world: World): void {
  world.tick = FLASHSTORM_DEMO_TICK;
  delete world.climate; delete world.weather; delete world.wind; delete world.fires;
  assert.equal(adoptEnvironment(world), true);
  delete world.flora;
  assert.ok(world.site?.revision === 2);
  initializeWildFlora(world, world.site);
  delete world.wildlife; enableBiomeWildlife(world, world.site.biome);
  delete world.raids; enableCassandraRaids(world);
  delete world.fluIncidents; adoptFluIncidents(world);
  delete world.visitors; enableVisitors(world);
  delete world.economy; adoptColonyEconomy(world);
  world.breakdown = newBreakdownCalendar(world.seed, world.tick);
  world.apparelWear = createApparelWearCalendar(world.tick, (world.seed ^ world.tick ^ 0x0a77e1) >>> 0);
  for (const pawn of world.pawns) {
    if (pawn.nextApparelCheckAt !== undefined) pawn.nextApparelCheckAt = world.tick + APPAREL_POLICY_INTERVAL.min + pawn.id % (APPAREL_POLICY_INTERVAL.max - APPAREL_POLICY_INTERVAL.min + 1);
    if (pawn.health && !pawn.health.death) pawn.health.tick = world.tick;
    pawn.hunger = 100; pawn.rest = 100; pawn.recreation.level = 100;
    pawn.schedule.fill('work'); pawn.needCooldown = 0; pawn.planCooldown = 0;
    for (const work of Object.keys(pawn.priorities) as (keyof Pawn['priorities'])[]) pawn.priorities[work] = 0;
  }
  delete world.heatwaves; delete world.miscIncidents; delete world.flashstorm;
  adoptMiscIncidents(world);
  assert.equal((world as World).miscIncidents?.introDone, false);
}

/** The fixture holds the unaltered natural map and starting stock. No flame,
 * damage, lightning timestamp, or additional resource is put in the save. */
export function prepareFlashstormDemo(generation: 'current' | 'pre-v210' = 'current'): World {
  const ticket = firstMiscTicket(FLASHSTORM_DEMO_SEED);
  assert.ok(ticket >= 1 && ticket < 1.4, `Flashstorm introductory ticket expected, got ${ticket}.`);
  const world = createScenarioWorld(FLASHSTORM_DEMO_SEED, 250, 'crashlanded', { hilliness: 'small-hills', biome: 'arid-shrubland' });
  // Reconstruct the published starters before this scene's own overrides.
  if (generation === 'pre-v210') world.pawns.forEach((pawn, index) => {
    delete pawn.background; pawn.skills = startingSkills(index);
  });
  assert.equal(world.pawns.length, 3);
  prepareClock(world);
  assert.equal(world.flashstorm, undefined);
  assert.equal(world.fires?.items.length ?? 0, 0);
  // prepareClock recreates the calendar; strip only this historical adoption.
  if (generation === 'pre-v210' && world.raids) delete world.raids.mechanoid;
  assert.deepEqual(validateWorld(world), []);
  return world;
}

export function flashstormDemoManifestEntry(world: World, sha256: string) {
  return {
    id: 'orage-sec-et-incendies-v184', release: 'v184', label: 'Orage sec et incendies · 3 colons',
    description: 'L’occasion Misc de Cassandra arrive au prochain tick ; l’orage sec localisé et ses frappes restent à jouer sur une carte naturelle 250 × 250.',
    filename: 'orage-sec-et-incendies.json', pawns: world.pawns.length, colonists: 3,
    width: world.width, height: world.height, tick: world.tick,
    focus: ['Cassandra', 'orage sec localisé', 'foudre', 'incendie', 'zone Foyer', 'Extinction', 'soins', 'sauvegarde et reprise'],
    steps: [
      'Charger en pause puis reprendre à 1× : la véritable occasion Misc est résolue au tick suivant. Lire la lettre Orage sec localisé.',
      'Suivre la zone indiquée, les frappes réellement confirmées et les feux éventuels. Une frappe peut laisser le terrain sans incendie ; ne pas confondre fin de la condition et fin des feux.',
      'Dans Architecte, placer une zone Foyer autour d’un feu accessible et vérifier la priorité Extinction dans Travail. Observer le trajet et les coups au contact avant de conclure à une extinction.',
      'Sauvegarder pendant la condition et recharger : vérifier centre, échéance, compteurs, dégâts, pertes et continuation sans nouvelle occasion.',
    ],
    prepared: true,
    provenance: `Départ Atterrissage/Cassandra Core adapté, graine ${FLASHSTORM_DEMO_SEED}, broussailles arides naturelles 250 × 250, schéma 173. Horloge civile préparée à ${FLASHSTORM_DEMO_TICK} ; calendriers météo, feu, raids, maladie, visiteurs, économie, faune, flore, vêtements et pannes réadoptés prospectivement, sans résolution rétroactive. Le premier tirage Misc vaut ${firstMiscTicket(FLASHSTORM_DEMO_SEED).toFixed(6)} sur 16,9 et vise le ticket Flashstorm [1 ; 1,4). Les trois colons et les stocks physiques sont ceux du départ ; aucun feu, impact, dommage, stock ou colon supplémentaire n’est précréé. L’incident, les frappes et les réactions physiques exigent les vrais ticks après chargement.`,
    sha256,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  assert.equal(SCHEMA_VERSION, 173, 'Write V184 only with strict schema 173.');
  const world = prepareFlashstormDemo();
  const raw = serializeWorld(world), sha256 = createHash('sha256').update(raw).digest('hex');
  mkdirSync(dirname(fileURLToPath(fixtureUrl)), { recursive: true });
  writeFileSync(fixtureUrl, raw);
  assert.deepEqual(deserializeWorld(raw), world);
  process.stdout.write(JSON.stringify({ fixture: fileURLToPath(fixtureUrl), sha256, tick: world.tick, entry: flashstormDemoManifestEntry(world, sha256) }) + '\n');
}
