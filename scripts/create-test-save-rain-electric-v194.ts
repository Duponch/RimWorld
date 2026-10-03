import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createWorld } from '../src/sim/engine.ts';
import { newBuildingFuel, WOOD_BURN_TICKS } from '../src/sim/fuel.ts';
import { newHeaterState } from '../src/sim/heater.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { addGroundMaterial, refreshStock } from '../src/sim/materials.ts';
import { BATTERY_ENERGY_SCALE } from '../src/sim/power-battery.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { reconcilePower } from '../src/sim/power.ts';
import { BATTERIES_RESEARCH_COST } from '../src/sim/research.ts';
import { adoptWeather } from '../src/sim/weather.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION, type Pawn, type Structure, type StructureKind, type World } from '../src/sim/types.ts';

export const RAIN_ELECTRIC_DEMO_ID = 'pluie-et-appareils-v194';
export const RAIN_ELECTRIC_DEMO_PATH = 'public/test-saves/v194/pluie-et-appareils.json';
export const RAIN_ELECTRIC_CELLS = {
  battery: { x: 10, z: 10 }, covered: { x: 18, z: 10 }, stopped: { x: 18, z: 16 }, exposed: { x: 10, z: 16 },
} as const;

/** Existing apparatus, charge, fuel and rain are explicit preparation. No tick,
 * contact, fire, damage, startup, roof order, repair or extinction is performed. */
export function prepareRainElectricDemo(): World {
  const w = createWorld(6160, 32, 32);
  w.tiles = w.tiles.map(() => ({ terrain: 'grass' }));
  w.resources = []; w.piles = []; w.structures = []; w.jobs = []; w.packed = [];
  w.stockpiles = []; w.growingZones = []; w.growingCursor = 0;
  w.research = { project: null, points: 0, batteries: { points: BATTERIES_RESEARCH_COST, completedAt: 0 } };
  for (const [i, p] of w.pawns.entries()) {
    p.x = 8; p.z = 13 + i * 2; p.hunger = 100; p.rest = 100; p.recreation.level = 100;
    p.health = createMedicalRecord(w.tick); p.schedule.fill('work'); p.apparelAutomation = false;
    for (const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[]) p.priorities[key] = 0;
    p.skills.construction = { level: 8, xp: 0, dailyXp: 0, passion: 0 };
  }
  function building(kind: StructureKind, x: number, z: number): Structure {
    const s: Structure = { id: w.nextId++, kind, x, z, orientation: 0, footprint: 'standard', material: kind === 'wall' ? 'wood' : 'steel' };
    if (kind !== 'wall') s.power = newPowerState(kind);
    if (kind === 'heater') s.heater = newHeaterState();
    w.structures.push(s); return s;
  }
  // Candidate order is deliberate; covered/stopped apparatus remain in N.
  const battery = building('battery', 10, 10); battery.battery = { stored: 101 * BATTERY_ENERGY_SCALE };
  building('heater', 18, 10);
  building('heater', 18, 16).power!.switchOn = false;
  building('heater', 10, 16);
  const generator = building('wood-generator', 14, 13);
  generator.fuel = newBuildingFuel('wood-generator'); generator.fuel.ticks = 75 * WOOD_BURN_TICKS;
  for (let x = 10; x <= 13; x++) building('power-conduit', x, 13);
  building('power-conduit', 10, 12);
  building('wall', 9, 10); building('wall', 18, 9);
  w.roofing = { constructed: [10 * 32 + 18], build: [], remove: [], cursor: 0 };
  for (let z = 10; z <= 12; z++) for (let x = 10; x <= 11; x++) w.tiles[z * 32 + x]!.floor = 'wood-planks';
  w.home = []; for (let z = 9; z <= 18; z++) for (let x = 7; x <= 20; x++) w.home.push(z * 32 + x);
  addGroundMaterial(w, 'wood', 40, { x: 6, z: 13 });
  addGroundMaterial(w, 'component', 3, { x: 6, z: 15 });
  addGroundMaterial(w, 'food', 6, { x: 6, z: 17 }, 'survival-meal');
  reconcilePower(w); adoptWeather(w);
  Object.assign(w.weather!, { current: 'rain', previous: 'rain', ageCore: 4000, durationCore: 160000 });
  // Leave the new risk stream absent: adoption belongs to the first real tick.
  refreshStock(w); assert.deepEqual(validateWorld(w), []);
  assert.equal(w.rainElectrical, undefined); assert.equal(w.fires, undefined);
  return w;
}

export function rainElectricDemoEntry(w: World, sha256: string) { return {
  id: RAIN_ELECTRIC_DEMO_ID, release: 'v194', label: 'Pluie et appareils · 3 colons',
  description: 'Observer une décharge sous la pluie sur une batterie exposée, protéger réellement son ancrage, éteindre les feux et réparer les dégâts.',
  filename: 'pluie-et-appareils.json', pawns: w.pawns.length, colonists: 3, width: w.width, height: w.height, tick: w.tick,
  focus: ['précipitations', 'exposition électrique', 'toit physique', 'arrêt physique', 'incendie', 'extinction', 'réparation', 'sauvegarde et reprise'],
  steps: [
    'Charger en pause. La batterie en (10,10) est exposée et chargée à 101 W·j ; le radiateur en (18,10) a un toit, celui en (18,16) est arrêté. Le générateur est alimenté en bois ; les radiateurs doivent encore démarrer sur le réseau réel.',
    'Inspecter puis reprendre à 1×. La graine préparée permet une première décharge sur la batterie ; aucun impact ni incendie n’est déjà présent. Sauvegarder avant et après le contact, puis reprendre.',
    'Dans Architecte, désigner un toit sur l’ancrage (10,10), soutenu par le mur adjacent. Dans Travail, donner Construction et Manutention à un colon ; attendre la vraie pose. Pour le radiateur exposé, demander l’arrêt depuis son inspection et attendre le contact d’un colon.',
    'Donner Extinction à un colon, observer son déplacement et ses coups sur le feu. La zone de foyer préparée permet ensuite les réparations avec Construction. La pluie peut aussi éteindre des feux ; cela ne prouve pas à elle seule le travail d’un colon.',
  ], prepared: true,
  provenance: 'Scène préparée 32×32 au schéma 181, createWorld(6160), tick 0. Trois colons adultes libres sains en (8,13/15/17), besoins hauts, Construction 8, travaux désactivés pour laisser la décision au joueur. Terrain grass dégagé, six sols bois autour de la batterie. Recherche Batteries achevée explicitement au tick 0, sans travail de recherche revendiqué. Quatre appareils candidats : batterie 1×2 exposée à 101 W·j, radiateur sous une cellule de toit soutenue par un mur, radiateur arrêté et radiateur exposé. Générateur existant avec 75 bois dans son réservoir, cinq conduits physiques raccordant la batterie ; raccords des consommateurs calculés par reconcilePower, démarrage non accordé. Deux murs de soutien, zone de foyer, 40 bois, trois composants et six repas de survie réellement au sol. Pluie préparée stable, aucun état de risque adopté, tirage, décharge, feu, dommage, route, actionnement, chantier, extinction ou réparation achevé. La graine privée dérivée sera adoptée prospectivement au premier tick ; elle ne démontre pas une fréquence naturelle. Pas de nouveau ticket Zzztt, grande explosion, vidage du réseau, son dédié, campagne ou preuve de charge 250×250.',
  sha256,
}; }

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/create-test-save-rain-electric-v194.ts')) {
  assert.equal(SCHEMA_VERSION, 181, 'Do not rewrite V194 under a later schema.');
  const w = prepareRainElectricDemo(), raw = serializeWorld(w), output = process.argv[2] ?? RAIN_ELECTRIC_DEMO_PATH;
  assert.deepEqual(deserializeWorld(raw), w); mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, raw);
  const entry = rainElectricDemoEntry(w, createHash('sha256').update(raw).digest('hex'));
  // Publication is explicit; default generation never edits the catalogue.
  if (process.argv.includes('--publish')) {
    const { readFileSync } = await import('node:fs');
    const path = 'public/test-saves/manifest.json', manifest = JSON.parse(readFileSync(path, 'utf8'));
    assert.equal(manifest.version, 2);
    assert.equal(manifest.saves.filter((s: { id: string }) => s.id !== entry.id).length, 43);
    manifest.saves = [...manifest.saves.filter((s: { id: string }) => s.id !== entry.id), entry];
    writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  console.log(JSON.stringify({ path: output, entry }));
}
