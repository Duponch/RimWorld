import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { applyCommand, createWorld } from '../src/sim/engine.ts';
import { newDoorState } from '../src/sim/door-rules.ts';
import { newBuildingFuel, WOOD_BURN_TICKS } from '../src/sim/fuel.ts';
import { addGroundMaterial, refreshStock } from '../src/sim/materials.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION, type Pawn, type World } from '../src/sim/types.ts';

export const GREENHOUSE_LAMP_CELL = { x: 13, z: 13 } as const;
export const GREENHOUSE_STEEL_CELL = { x: 11, z: 7 } as const;
export const GREENHOUSE_CROP_CELLS = [{ x: 12, z: 15 }, { x: 13, z: 15 }, { x: 14, z: 15 }] as const;
export const GREENHOUSE_INITIAL_GROWTH = .985;

/** Prepared walls, physical roofs, fueled generators and almost ripe crops.
 * Construction, delivery, startup, subsequent growth and harvest are unperformed. */
export function prepareGreenhouseDemo(): World {
  const world = createWorld(189, 32, 32);
  world.tick = 2000;
  world.tiles = world.tiles.map(() => ({ terrain: 'grass' }));
  world.resources = []; world.piles = []; world.structures = []; world.jobs = [];
  world.packed = []; world.stockpiles = []; world.growingZones = []; world.growingCursor = 0;
  for (const [i, pawn] of world.pawns.entries()) {
    pawn.x = [11, 14, 15][i]!; pawn.z = i === 0 ? 6 : 11;
    pawn.hunger = 100; pawn.rest = 100; pawn.recreation.level = 100;
    pawn.health = createMedicalRecord(world.tick);
    pawn.schedule.fill('work'); pawn.apparelAutomation = false;
    pawn.needCooldown = 0; pawn.planCooldown = 0;
    for (const work of Object.keys(pawn.priorities) as (keyof Pawn['priorities'])[]) pawn.priorities[work] = 0;
  }
  const [ada, noe] = world.pawns;
  assert.equal(ada!.name, 'Ada'); assert.equal(noe!.name, 'Noé');
  ada!.skills.construction = { level: 1, xp: 0, dailyXp: 0, passion: 0 };
  ada!.priorities.build = 1; ada!.priorities.basic = 2;
  noe!.skills.plants = { level: 8, xp: 0, dailyXp: 0, passion: 0 };
  noe!.priorities.grow = 1;

  for (let z = 8; z <= 19; z++) for (let x = 8; x <= 19; x++) {
    if (x !== 8 && x !== 19 && z !== 8 && z !== 19) continue;
    const doorway = x === 13 && z === 8;
    world.structures.push({ id: world.nextId++, kind: doorway ? 'door' : 'wall', x, z, orientation: 0, footprint: 'standard', material: 'wood', ...(doorway ? { door: newDoorState(world.tick) } : {}) });
  }
  const roofs: number[] = [];
  for (let z = 9; z <= 18; z++) for (let x = 9; x <= 18; x++) roofs.push(z * world.width + x);
  world.roofing = { constructed: roofs, build: [], remove: [], cursor: 0 };
  for (const x of [21, 23, 25]) {
    const fuel = newBuildingFuel('wood-generator'); fuel.ticks = 75 * WOOD_BURN_TICKS;
    world.structures.push({ id: world.nextId++, kind: 'wood-generator', x, z: 13, orientation: 0, footprint: 'standard', material: 'steel', fuel, power: newPowerState('wood-generator') });
  }
  for (let x = 16; x <= 20; x++) world.structures.push({ id: world.nextId++, kind: 'power-conduit', x, z: 14, orientation: 0, footprint: 'standard', material: 'steel', power: newPowerState('power-conduit') });
  for (const cell of GREENHOUSE_CROP_CELLS) world.resources.push({ id: world.nextId++, kind: 'rice', ...cell, amount: 6, growth: GREENHOUSE_INITIAL_GROWTH, growthTick: world.tick });
  addGroundMaterial(world, 'steel', 40, GREENHOUSE_STEEL_CELL, 'steel');
  for (const command of [
    { type: 'area', action: 'growing', from: GREENHOUSE_CROP_CELLS[0], to: GREENHOUSE_CROP_CELLS[2] },
    { type: 'designate', kind: 'sun-lamp', material: 'steel', ...GREENHOUSE_LAMP_CELL, orientation: 0 },
  ] as const) {
    const result = applyCommand(world, command); assert.equal(result.ok, true, result.reason);
  }
  const zone = world.growingZones[0]!;
  const result = applyCommand(world, { type: 'growing-policy', zoneId: zone.id, allowSow: false, allowCut: true });
  assert.equal(result.ok, true, result.reason);
  refreshStock(world); assert.deepEqual(validateWorld(world), []);
  return world;
}

export function greenhouseDemoEntry(world: World, sha256: string) { return {
  id: 'serre-electrique-v189', release: 'v189', label: 'Serre électrique · 3 colons',
  description: 'Construire une lampe horticole dans une pièce couverte, observer ses 2 900 W sur trois générateurs, puis la croissance et la récolte réelles du riz.',
  filename: 'serre-electrique.json', pawns: world.pawns.length, colonists: 3,
  width: world.width, height: world.height, tick: world.tick,
  focus: ['lampe horticole', 'construction', 'livraison acier', 'réseau électrique', 'toit', 'croissance', 'récolte', 'sauvegarde et reprise'],
  steps: [
    'Charger en pause : la pièce de 12 × 12 et son toit existent, mais la lampe en (13,13) est encore un plan. Les 40 acier attendent au sol en (11,7).',
    'Reprendre à 1× : Ada, Construction 1, livre l’acier par la porte nord puis construit la lampe. Les trois générateurs à droite ont chacun 75 bois préparés dans leur réservoir.',
    'Inspecter la lampe : vérifier son raccordement, sa demande de 2 900 W et sa couverture réelle. Les trois plants de riz en (12–14,15), préparés à 98,5 %, doivent encore croître sous le toit avant la récolte de Noé, Plantes 8.',
    'Sauvegarder pendant la livraison ou le travail au chantier, recharger puis reprendre. Les objets et le chantier continuent sans double livraison. La zone est réglée pour récolter sans ressemer ; réactiver le semis pour prolonger librement la scène.',
  ],
  prepared: true,
  provenance: 'Scène préparée 32×32 au schéma 177, graine 189, tick local 2000 et environnement historique tempéré à 21 °C. Terrain aplani en grass ; enceinte 12×12 avec 43 murs en bois, une porte nord et 100 cellules de toiture physique intérieure. Trois générateurs de 1 000 W préexistants, chacun chargé explicitement de 75 bois (45 000 unités de réserve), et cinq conduits contigus ; aucun démarrage de lampe accordé. Trois riz à 98,5 % et six unités de rendement de base chacun, ancrés au tick initial sous toit ; zone récolte seule. Une pile de 40 acier au sol et un plan de lampe non livré/non construit. Trois colons ordinaires repositionnés, santé neutre préparée sans blessure ni affection, besoins hauts, habillement automatique désactivé, Ada Construction 1/Construction et Manutention, Noé Plantes 8/Culture, autres travaux désactivés. Aucun transport, travail, récolte, repas ou compteur achevé. Ne démontre ni campagne naturelle ni charge 250×250.',
  sha256,
}; }

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/generate-greenhouse-demo-v189.ts')) {
  assert.equal(SCHEMA_VERSION, 177, 'Do not rewrite the V189 reference under a later schema.');
  const world = prepareGreenhouseDemo(), raw = serializeWorld(world);
  const sha256 = createHash('sha256').update(raw).digest('hex');
  assert.deepEqual(deserializeWorld(raw), world);
  mkdirSync('public/test-saves/v189', { recursive: true });
  writeFileSync('public/test-saves/v189/serre-electrique.json', raw);
  // Catalogue integration belongs to the central owner, never this generator.
  console.log(JSON.stringify({ path: 'public/test-saves/v189/serre-electrique.json', entry: greenhouseDemoEntry(world, sha256) }));
}
