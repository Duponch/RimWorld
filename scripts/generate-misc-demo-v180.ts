import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApparelWearCalendar, APPAREL_POLICY_INTERVAL } from '../src/sim/apparel-renewal.ts';
import { newBreakdownCalendar } from '../src/sim/breakdowns.ts';
import { adoptMiscIncidents, eligibleMiscHeatwave, MISC_INTRO_TICK } from '../src/sim/cassandra-misc.ts';
import { enableCassandraRaids } from '../src/sim/cassandra-raids.ts';
import { adoptColonyEconomy } from '../src/sim/colony-economy.ts';
import { newDoorState } from '../src/sim/door-rules.ts';
import { adoptEnvironment } from '../src/sim/environment-step.ts';
import { adoptFluIncidents } from '../src/sim/flu-incidents.ts';
import { newBuildingFuel } from '../src/sim/fuel.ts';
import { initializeWildFlora } from '../src/sim/wild-flora.ts';
import { enableBiomeWildlife } from '../src/sim/wildlife.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { serializeWorld, deserializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { reconcileTemperature, outdoorTemperature } from '../src/sim/temperature.ts';
import { SCHEMA_VERSION, type Cell, type Structure, type World } from '../src/sim/types.ts';
import { enableVisitors } from '../src/sim/visitors.ts';

const fixtureUrl = new URL('../public/test-saves/v180/canicule-et-refuge.json', import.meta.url);
export const MISC_DEMO_SEED = 13312;
export const MISC_DEMO_TICK = MISC_INTRO_TICK - 1;
export interface Refuge { x: number; z: number; door: Cell; inside: Cell }

/** A prepared civil date, not simulated elapsed days. Every prospective owner
 * starts or restarts at this date; no old visit, disease, raid, weather, plant
 * growth, animal episode, apparel wear, wealth or skill is awarded. */
function prepareClock(world: World): void {
  world.tick = MISC_DEMO_TICK;
  delete world.climate; delete world.weather; delete world.wind; delete world.fires;
  assert.equal(adoptEnvironment(world), true);
  delete world.flora;
  assert.ok(world.site?.revision === 2);
  initializeWildFlora(world, world.site);
  delete world.wildlife;
  enableBiomeWildlife(world, world.site.biome);
  delete world.raids; enableCassandraRaids(world);
  delete world.fluIncidents; adoptFluIncidents(world);
  delete world.visitors; enableVisitors(world);
  delete world.economy; adoptColonyEconomy(world);
  world.breakdown = newBreakdownCalendar(world.seed, world.tick);
  world.apparelWear = createApparelWearCalendar(world.tick, (world.seed ^ world.tick ^ 0x0a77e1) >>> 0);
  for (const pawn of world.pawns) {
    if (pawn.nextApparelCheckAt !== undefined) pawn.nextApparelCheckAt = world.tick + APPAREL_POLICY_INTERVAL.min + pawn.id % (APPAREL_POLICY_INTERVAL.max - APPAREL_POLICY_INTERVAL.min + 1);
    pawn.hunger = 100; pawn.rest = 100; pawn.recreation.level = 100;
    pawn.schedule.fill('work'); pawn.needCooldown = 0; pawn.planCooldown = 0;
    for (const work of Object.keys(pawn.priorities) as (keyof typeof pawn.priorities)[]) pawn.priorities[work] = 0;
  }
  delete world.miscIncidents; adoptMiscIncidents(world);
  assert.equal((world as World).miscIncidents?.introDone, false);
  assert.equal(eligibleMiscHeatwave(world), true, 'Arid season must admit the introductory heat wave.');
}

function clearRefuge(world: World): Refuge {
  const landing = world.scenario!.landing;
  const occupied = new Set([
    ...world.resources.map(r => r.z * world.width + r.x),
    ...world.pawns.map(p => p.z * world.width + p.x),
    ...world.wildlife!.animals.map(a => a.z * world.width + a.x),
    ...world.piles.flatMap(p => p.owner.type === 'ground' ? [p.owner.z * world.width + p.owner.x] : []),
  ]);
  const candidates: Cell[] = [];
  for (let dz = -25; dz <= 25; dz++) for (let dx = -25; dx <= 25; dx++) {
    const x = landing.x + dx, z = landing.z + dz;
    if (x < 2 || z < 2 || x + 5 >= world.width - 2 || z + 5 >= world.height - 2) continue;
    if (Math.abs(dx) + Math.abs(dz) < 7) continue;
    let free = true;
    for (let zz = z; zz < z + 6 && free; zz++) for (let xx = x; xx < x + 6; xx++) {
      const i = zz * world.width + xx;
      if (occupied.has(i) || world.tiles[i]!.terrain === 'rock' || world.tiles[i]!.terrain === 'water') { free = false; break; }
    }
    if (free) candidates.push({ x, z });
  }
  candidates.sort((a, b) => Math.abs(a.x - landing.x) + Math.abs(a.z - landing.z) - Math.abs(b.x - landing.x) - Math.abs(b.z - landing.z) || a.z - b.z || a.x - b.x);
  const anchor = candidates[0];
  assert.ok(anchor, 'Seed must keep an unobstructed six by six refuge site near the landing.');
  return { ...anchor, door: { x: anchor.x + 5, z: anchor.z + 2 }, inside: { x: anchor.x + 3, z: anchor.z + 2 } };
}

function prepareRefuge(world: World, refuge: Refuge): void {
  // 19 wooden walls (95), a wooden door (25), two beds (90), and the passive
  // cooler (50 including its initial 30,000 fuel units) consume 260 of the
  // factory's 300 physical wood. Forty wood remains in ground stacks.
  let consumed = 0;
  for (const pile of world.piles.filter(p => p.item === 'wood' && p.owner.type === 'ground')) {
    const take = Math.min(260 - consumed, pile.quantity);
    pile.quantity -= take; consumed += take;
    if (consumed === 260) break;
  }
  assert.equal(consumed, 260);
  world.piles = world.piles.filter(p => p.quantity > 0);
  const base = (kind: Structure['kind'], x: number, z: number): Structure => ({ id: world.nextId++, kind, material: 'wood', x, z, orientation: 0, footprint: 'standard' });
  for (let z = refuge.z; z < refuge.z + 6; z++) for (let x = refuge.x; x < refuge.x + 6; x++) {
    if (x !== refuge.x && x !== refuge.x + 5 && z !== refuge.z && z !== refuge.z + 5) continue;
    const door = x === refuge.door.x && z === refuge.door.z;
    const structure = base(door ? 'door' : 'wall', x, z);
    if (door) structure.door = newDoorState(world.tick);
    world.structures.push(structure);
  }
  for (const x of [refuge.x + 1, refuge.x + 3]) {
    const bed = base('bed', x, refuge.z + 1); bed.quality = 'normal';
    world.structures.push(bed);
  }
  const cooler = base('passive-cooler', refuge.x + 1, refuge.z + 4);
  cooler.fuel = newBuildingFuel('passive-cooler'); world.structures.push(cooler);
  const roofs: number[] = [];
  for (let z = refuge.z + 1; z < refuge.z + 5; z++) for (let x = refuge.x + 1; x < refuge.x + 5; x++) roofs.push(z * world.width + x);
  world.roofing = { constructed: roofs, build: [], remove: [], cursor: 0 };
  refreshStock(world);
  reconcileTemperature(world);
  assert.ok(world.thermal?.regions.some(region => region.cells.includes(refuge.inside.z * world.width + refuge.inside.x)));
}

/** The saved state is one tick before a real storyteller transition. The
 * shelter is an explicitly built starting condition, not a claimed played
 * construction. No heatstroke, canicule, retrospective event or extra stock. */
export function prepareMiscDemo(): World {
  const world = createScenarioWorld(MISC_DEMO_SEED, 250, 'crashlanded', { hilliness: 'small-hills', biome: 'arid-shrubland' });
  assert.equal(world.pawns.length, 3);
  prepareClock(world);
  const refuge = clearRefuge(world);
  prepareRefuge(world, refuge);
  assert.ok(outdoorTemperature(world) > 15);
  assert.deepEqual(validateWorld(world), []);
  return world;
}

export function miscDemoManifestEntry(world: World, sha256: string) {
  const refuge = world.structures.find(s => s.kind === 'passive-cooler')!;
  return {
    id: 'canicule-et-refuge-v180', release: 'v180', label: 'Canicule et refuge · 3 colons',
    description: 'Broussailles arides naturelles 250 × 250. L’occasion d’introduction de Cassandra arrive au prochain tick ; un refuge couvert avec refroidisseur passif, deux lits et des provisions est préparé.',
    filename: 'canicule-et-refuge.json', pawns: world.pawns.length, colonists: 3,
    width: world.width, height: world.height, tick: world.tick,
    focus: ['Cassandra', 'canicule naturelle', 'alerte', 'température', 'refuge couvert', 'refroidisseur passif', 'Santé', 'sauvegarde et reprise'],
    steps: [
      'Reprendre à 1× depuis le tick 26 399. La véritable occasion d’introduction de Cassandra est résolue au tick suivant ; vérifier la lettre Canicule et son conseil de refuge.',
      `Repérer le refuge couvert autour de (${refuge.x}, ${refuge.z}), son refroidisseur passif alimenté, les deux lits et les 40 bois restants ; comparer la température intérieure et extérieure pendant la rampe.`,
      'Inspecter Santé des trois colons, surveiller les coups de chaleur et leurs déplacements réels vers le refuge. La nourriture et le bois sont des piles physiques de départ.',
      'Sauvegarder pendant la canicule puis recharger : vérifier que la lettre, la rampe thermique, les stocks et les personnes continuent sans second incident.',
    ],
    prepared: true,
    provenance: 'Départ Crashlanded ordinaire, graine 13312, broussailles arides 250 × 250, schéma 169. Date civile préparée à 26 399 : calendriers Cassandra, maladie, visiteurs, économie, météo, vent, flore, faune, vêtements et pannes réancrés prospectivement par leurs fabriques ; aucun historique de ressource, XP ou maladie accordé. Refuge en bois déjà construit et couvert, deux lits et refroidisseur initial : 260 bois déduits des 300 de départ, 40 bois conservés en piles. Le billet d’introduction déterministe et la canicule elle-même sont résolus uniquement par stepWorld après chargement.',
    sha256,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  assert.equal(SCHEMA_VERSION, 169, 'Write V180 only with strict schema 169.');
  const world = prepareMiscDemo();
  const raw = serializeWorld(world), sha256 = createHash('sha256').update(raw).digest('hex');
  mkdirSync(dirname(fileURLToPath(fixtureUrl)), { recursive: true });
  writeFileSync(fixtureUrl, raw);
  assert.deepEqual(deserializeWorld(raw), world);
  process.stdout.write(JSON.stringify({ fixture: fileURLToPath(fixtureUrl), sha256, tick: world.tick, entry: miscDemoManifestEntry(world, sha256) }) + '\n');
}
