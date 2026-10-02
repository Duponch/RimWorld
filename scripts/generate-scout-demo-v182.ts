import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureStandability } from '../src/sim/furniture-travel.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { createScenarioWorld } from '../src/sim/new-game.ts';
import { blockedCells, hasReachableCell, reachableCells } from '../src/sim/pathfinding.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION, type Cell, type MaterialPile, type Pawn, type World } from '../src/sim/types.ts';

const fixtureUrl = new URL('../public/test-saves/v182/reconnaissance-et-retour.json', import.meta.url);
export const SCOUT_DEMO_SEED = 13312;

export function scoutDemoActors(world: World): { pawn: Pawn; pile: MaterialPile } {
  const pawn = world.pawns.find(person => person.name === 'Ada');
  const pile = world.piles.find(item => item.item === 'survival-meal' && item.owner.type === 'ground' && item.quantity === 4 && item.id === world.nextId - 1);
  assert.ok(pawn && pile, 'The prepared colon and four-ration pile must remain identifiable.');
  return { pawn, pile };
}

function borderPreparation(world: World, pawn: Pawn): { pawnCell: Cell; pileCell: Cell; edge: Cell } {
  const blocked = blockedCells(world), stand = captureStandability(world);
  const occupied = new Set(world.pawns.filter(person => person !== pawn).map(person => person.z * world.width + person.x));
  const used = new Set<number>([
    ...world.resources.map(resource => resource.z * world.width + resource.x),
    ...world.piles.flatMap(pile => pile.owner.type === 'ground' ? [pile.owner.z * world.width + pile.owner.x] : []),
    ...world.packed.flatMap(piece => piece.owner.type === 'ground' ? [piece.owner.z * world.width + piece.owner.x] : []),
  ]);
  const reach = reachableCells(world, pawn, blocked, occupied);
  const other = world.pawns.find(person => person !== pawn)!;
  const returnReach = reachableCells(world, other, blocked, new Set(world.pawns.filter(person => person !== other).map(person => person.z * world.width + person.x)));
  const candidates: { pawnCell: Cell; pileCell: Cell; edge: Cell; distance: number }[] = [];
  for (let x = 0; x < world.width; x++) for (const z of [0, world.height - 1]) {
    const dz = z === 0 ? 1 : -1;
    const edge = { x, z }, pileCell = { x, z: z + dz }, pawnCell = { x, z: z + 2 * dz };
    const cells = [edge, pileCell, pawnCell];
    if (cells.some(cell => cell.z < 0 || cell.z >= world.height || blocked[cell.z * world.width + cell.x] || occupied.has(cell.z * world.width + cell.x) || used.has(cell.z * world.width + cell.x) || !stand(cell))) continue;
    if (!hasReachableCell(reach, z * world.width + x) || !hasReachableCell(returnReach, z * world.width + x)) continue;
    candidates.push({ pawnCell, pileCell, edge, distance: Math.abs(x - pawn.x) + Math.abs(z - pawn.z) });
  }
  for (let z = 1; z < world.height - 1; z++) for (const x of [0, world.width - 1]) {
    const dx = x === 0 ? 1 : -1;
    const edge = { x, z }, pileCell = { x: x + dx, z }, pawnCell = { x: x + 2 * dx, z };
    const cells = [edge, pileCell, pawnCell];
    if (cells.some(cell => cell.x < 0 || cell.x >= world.width || blocked[cell.z * world.width + cell.x] || occupied.has(cell.z * world.width + cell.x) || used.has(cell.z * world.width + cell.x) || !stand(cell))) continue;
    if (!hasReachableCell(reach, z * world.width + x) || !hasReachableCell(returnReach, z * world.width + x)) continue;
    candidates.push({ pawnCell, pileCell, edge, distance: Math.abs(x - pawn.x) + Math.abs(z - pawn.z) });
  }
  candidates.sort((a, b) => a.distance - b.distance || a.edge.z - b.edge.z || a.edge.x - b.edge.x);
  const selected = candidates[0];
  assert.ok(selected, 'The ordinary generated map needs a safe three-cell corridor to a reachable border.');
  return selected;
}

/** Prepared walking distance and ration placement; the player still initiates
 * loading, reaches the pile/edge, travels, eats and returns in real steps. */
export function prepareScoutDemo(): World {
  const world = createScenarioWorld(SCOUT_DEMO_SEED, 250, 'crashlanded', { hilliness: 'small-hills', biome: 'arid-shrubland' });
  assert.equal(world.pawns.length, 3);
  assert.equal(world.tick, 0);
  delete world.miscIncidents; delete world.heatwaves;
  delete world.visitors; delete world.weather;
  for (const person of world.pawns) {
    person.schedule.fill('work');
    person.needCooldown = 0; person.planCooldown = 0;
    person.rest = 90; person.hunger = person.name === 'Ada' ? 45 : 90;
    for (const work of Object.keys(person.priorities) as (keyof Pawn['priorities'])[]) person.priorities[work] = 0;
  }
  const pawn = world.pawns.find(person => person.name === 'Ada')!;
  const { pawnCell, pileCell } = borderPreparation(world, pawn);
  pawn.x = pawnCell.x; pawn.z = pawnCell.z;
  const source = world.piles.find(pile => pile.item === 'survival-meal' && pile.owner.type === 'ground' && pile.quantity >= 5)!;
  source.quantity -= 4;
  world.piles.push({ ...source, id: world.nextId++, quantity: 4, owner: { type: 'ground', ...pileCell } });
  refreshStock(world);
  const prepared = scoutDemoActors(world);
  assert.equal(prepared.pawn.id, pawn.id);
  assert.deepEqual(validateWorld(world), []);
  return world;
}

export function scoutDemoManifestEntry(world: World, sha256: string) {
  const { pawn, pile } = scoutDemoActors(world);
  const position = pile.owner;
  assert.equal(position.type, 'ground');
  return {
    id: 'reconnaissance-et-retour-v182', release: 'v182', label: 'Reconnaissance et retour · 3 colons',
    description: 'Ada et une pile de quatre rations sont préparées près d’une bordure. Choisissez-en trois dans Monde, puis observez leur chargement, la sortie réelle et le retour après six heures de jeu.',
    filename: 'reconnaissance-et-retour.json', pawns: world.pawns.length, colonists: 3,
    width: world.width, height: world.height, tick: world.tick,
    focus: ['Monde', 'reconnaissance', 'caravane', 'chargement', 'sortie', 'faim', 'provisions', 'retour', 'sauvegarde et reprise'],
    steps: [
      `Dans Monde, choisir ${pawn.name}, la pile de quatre repas près du bord (${position.x}, ${position.z}) et trois rations, puis lancer la préparation.`,
      'Reprendre à 1× : voir le colon rejoindre la pile, charger trois portions au contact et marcher jusqu’à une bordure libre. Une portion reste au sol à la source.',
      'Pendant les six heures de jeu du circuit abstrait, suivre les besoins et le nombre exact de rations ; une portion est consommée depuis le manifeste du voyageur.',
      'Au retour, retrouver le même colon, ses vêtements/équipement et les portions restantes déposées au bord ; sauvegarder et reprendre à chaque phase pour vérifier la continuité.',
    ],
    prepared: true,
    provenance: `Départ Crashlanded Core adapté, graine ${SCOUT_DEMO_SEED}, broussailles arides naturelles 250 × 250, schéma 171. ${pawn.name} est préparée saine, libre, nourrie à 45 % et reposée à 90 % à deux cases d’une bordure accessible. Quatre rations de survie déjà présentes sont déplacées près d’elle par division d’une pile initiale, sans création nette ; les deux autres colons restent au foyer, leurs travaux ordinaires désactivés pour cette observation. Les calendriers Core de raids et de maladie sont conservés, sans occasion pendant ce court circuit ; visites, météo et canicule sont écartées de cette scène préparée. Aucune reconnaissance n’a encore eu lieu : chargement, contact, sortie, consommation et retour exigent les commandes et transitions réelles après chargement.`,
    sha256,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  assert.equal(SCHEMA_VERSION, 171, 'Write V182 only with strict schema 171.');
  const world = prepareScoutDemo();
  const raw = serializeWorld(world), sha256 = createHash('sha256').update(raw).digest('hex');
  mkdirSync(dirname(fileURLToPath(fixtureUrl)), { recursive: true });
  writeFileSync(fixtureUrl, raw);
  assert.deepEqual(deserializeWorld(raw), world);
  process.stdout.write(JSON.stringify({ fixture: fileURLToPath(fixtureUrl), sha256, tick: world.tick, entry: scoutDemoManifestEntry(world, sha256) }) + '\n');
}
