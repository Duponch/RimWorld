/** Authored additions to the maintained Aulnes checkpoint.
 * This helper changes the declared starting layout only. It does not advance
 * time, write a save, grant research, create people or resolve an incident.
 */
import { footprintCells } from '../src/sim/definitions.ts';
import { builtDoorState } from '../src/sim/door-rules.ts';
import { newBuildingFuel, isFueledBuilding } from '../src/sim/fuel.ts';
import { initializeHydroponicBasin } from '../src/sim/hydroponics.ts';
import { orbitalConsoleSpot } from '../src/sim/orbital-rules.ts';
import { pasteSpot } from '../src/sim/nutrient-paste.ts';
import { deepWorkSpot } from '../src/sim/deep-drilling-rules.ts';
import { newPowerState, isElectrical } from '../src/sim/power-rules.ts';
import { isPowerTransmitter } from '../src/sim/power-grid.ts';
import { conduitKeepsPlant } from '../src/sim/power-construction.ts';
import { newHeaterState } from '../src/sim/heater.ts';
import { isPlant } from '../src/sim/plants.ts';
import { researchUnlocked, type ResearchProject } from '../src/sim/research.ts';
import type { FloorKind } from '../src/sim/flooring.ts';
import type { ItemId } from '../src/sim/items.ts';
import type { Cell, Orientation, StorageFilters, Structure, World } from '../src/sim/types.ts';

export interface AulnesDistrict {
  key: string;
  label: string;
  bounds: [number, number, number, number];
}
export interface AulnesRecommendedSupply {
  item: ItemId;
  quantity: number;
  cells: Cell[];
}
export interface AulnesActivitySites {
  refineryId: number;
  chemfuelGeneratorId: number;
  drugLabId: number;
  scannerId: number;
  drillId: number;
  pasteDispenserId: number;
  hopperIds: number[];
  hydroponicBasinIds: number[];
  beaconIds: number[];
  commsConsoleId: number;
  vitalsMonitorIds: number[];
  stockCells: {
    chemfuel: Cell[];
    neutroamine: Cell[];
    industrial: Cell[];
    hospital: Cell[];
    rawFood: Cell[];
    weaponReserve: Cell[];
  };
  recommendedSupplies: AulnesRecommendedSupply[];
  districts: AulnesDistrict[];
  serviceCells: Cell[];
  addedStructureIds: number[];
  addedStockpileIds: number[];
  changedFloorCells: number[];
  landscapedCells: number[];
  removedPlantIds: number[];
  removedResourceIds: number[];
}
export type AulnesCurrentSites = AulnesActivitySites;

type BuildingPlan = Pick<Structure, 'kind' | 'x' | 'z' | 'orientation' | 'footprint'> & {
  material: Structure['material'];
  off?: boolean;
};
const rectangles = (bounds: readonly [number, number, number, number]): Cell[] => {
  const cells: Cell[] = [];
  for (let z = bounds[1]; z <= bounds[3]; z++)
    for (let x = bounds[0]; x <= bounds[2]; x++) cells.push({ x, z });
  return cells;
};

/** Call after unlockAulnesCurrentResearch(), on a private migrated V224 copy.
 * Preparation is deliberately single-use: no replacement of historical files
 * or duplicate machines is concealed by this layout helper.
 */
export function applyAulnesCurrentLayout(world: World): AulnesActivitySites {
  if (world.width !== 250 || world.height !== 250 || world.schemaVersion !== 218)
    throw Error('The maintained Aulnes layout requires a migrated 250×250 schema218 world.');
  const technologies: ResearchProject[] = ['hydroponics', 'drug-production', 'medicine-production',
    'sterile-materials', 'vitals-monitor', 'deep-drilling', 'ground-scanner', 'nutrient-paste', 'biofuel-refining'];
  for (const technology of technologies) if (!researchUnlocked(world, technology))
    throw Error(`Prepare the declared Aulnes research before its layout: ${technology}.`);
  if (world.structures.some(s => ['drug-lab', 'biofuel-refinery', 'chemfuel-generator', 'ground-scanner',
    'deep-drill', 'nutrient-paste-dispenser', 'comms-console', 'hydroponics-basin', 'vitals-monitor'].includes(s.kind)))
    throw Error('The maintained Aulnes additions have already been prepared.');
  if (!world.roofing || !world.home || !world.research)
    throw Error('Aulnes must retain its original roofing, home and research owners.');
  for (const cell of [{ x: 161, z: 98 }, { x: 161, z: 105 }])
    if (!world.structures.some(s => s.kind === 'hospital-bed' && s.x === cell.x && s.z === cell.z))
      throw Error(`The original Aulnes hospital bed is absent at ${cell.x},${cell.z}.`);

  const index = (cell: Cell) => cell.z * world.width + cell.x;
  const plans: BuildingPlan[] = [];
  const roofs = new Set(world.roofing.constructed), home = new Set(world.home);
  const floors = new Map<number, FloorKind>(), landscaped = new Set<number>();
  const plan = (kind: Structure['kind'], x: number, z: number, orientation: Orientation = 0,
    material: Structure['material'] = 'steel', off = false): BuildingPlan => {
    const result: BuildingPlan = { kind, x, z, orientation, footprint: 'standard', material, ...(off ? { off: true } : {}) };
    plans.push(result); return result;
  };
  const landscape = (bounds: readonly [number, number, number, number]) => {
    for (const cell of rectangles(bounds)) { landscaped.add(index(cell)); home.add(index(cell)); }
  };
  const room = (bounds: readonly [number, number, number, number], door: Cell, floor: FloorKind) => {
    landscape(bounds);
    for (const cell of rectangles(bounds)) {
      const boundary = cell.x === bounds[0] || cell.x === bounds[2] || cell.z === bounds[1] || cell.z === bounds[3];
      if (boundary) plan(cell.x === door.x && cell.z === door.z ? 'door' : 'wall', cell.x, cell.z, 0,
        cell.x === door.x && cell.z === door.z ? 'wood' : 'granite-blocks');
      else { roofs.add(index(cell)); floors.set(index(cell), floor); }
    }
  };

  // Two modest workshops extend the existing southern production street.
  room([108, 169, 120, 179], { x: 116, z: 169 }, 'sterile-tile');
  room([122, 169, 134, 179], { x: 128, z: 169 }, 'granite-tile');
  landscape([108, 166, 134, 168]);
  const drugLab = plan('drug-lab', 113, 173);
  const refinery = plan('biofuel-refinery', 128, 173);
  plan('standing-lamp', 109, 170); plan('standing-lamp', 123, 170);
  plan('heater', 119, 177); plan('heater', 133, 177);

  // The new generator begins empty. Its actual fuel and 1000 W are earned by
  // physical refinement/refuelling during the ordinary continuation.
  landscape([165, 155, 169, 158]);
  const generator = plan('chemfuel-generator', 166, 156);
  const scanner = plan('ground-scanner', 112, 166);
  const drill = plan('deep-drill', 110, 165, 0, 'steel', true);
  for (const cell of footprintCells(scanner)) roofs.delete(index(cell));

  // This annex supplies a secondary meal choice rather than replacing cooks.
  room([174, 96, 185, 109], { x: 180, z: 109 }, 'granite-tile');
  landscape([170, 108, 180, 111]);
  const dispenser = plan('nutrient-paste-dispenser', 180, 101);
  const hoppers = [plan('hopper', 178, 101), plan('hopper', 182, 101)];
  plan('standing-lamp', 175, 97); plan('heater', 184, 107);
  const console = plan('comms-console', 114, 127, 2);
  const beacons = [plan('orbital-beacon', 140, 146), plan('orbital-beacon', 150, 146)];
  const monitors = [plan('vitals-monitor', 162, 98), plan('vitals-monitor', 162, 105)];
  for (const cell of rectangles([160, 97, 168, 110])) floors.set(index(cell), 'sterile-tile');

  // Retain the existing sun lamp, soil strip, heater and independent western
  // circuit. Each empty basin receives its real four-cell sowing policy.
  const basins = [148, 153].flatMap(z => [93, 95, 99, 101].map(x => plan('hydroponics-basin', x, z)));
  const basinCells = new Set(basins.flatMap(b => footprintCells(b).map(index)));
  const serviceCells: Cell[] = [
    { x: drugLab.x, z: drugLab.z - 1 }, { x: refinery.x, z: refinery.z - 1 },
    pasteSpot({ ...dispenser, id: 0 }), orbitalConsoleSpot({ ...console, id: 0 }),
    deepWorkSpot({ ...scanner, id: 0 }), deepWorkSpot({ ...drill, id: 0 }),
  ];

  // Wires join existing networks; they neither create supply nor bridge the
  // deliberately separate greenhouse circuit into the main colony network.
  const wireCells = new Set(world.structures.filter(s => isPowerTransmitter(s.kind)).flatMap(s => footprintCells(s).map(index)));
  const wire = (bounds: readonly [number, number, number, number]) => {
    for (const cell of rectangles(bounds)) if (!wireCells.has(index(cell))) {
      wireCells.add(index(cell)); plan('power-conduit', cell.x, cell.z);
    }
  };
  wire([110, 162, 110, 177]); wire([110, 172, 132, 172]);
  wire([157, 108, 180, 108]); wire([180, 100, 180, 108]);
  wire([169, 150, 169, 157]);

  // All ownership-sensitive checks precede the first mutation. A caller may
  // resolve a conflicting ordinary job, but this helper never drops a claim.
  const occupied = new Set(world.structures.filter(s => s.kind !== 'power-conduit').flatMap(s => footprintCells(s).map(index)));
  const addedOccupied = new Set<number>();
  const obstructedByJob = (cell: Cell) => world.jobs.some(job => footprintCells(job).some(part => index(part) === index(cell)));
  for (const building of plans) for (const cell of footprintCells(building)) {
    const key = index(cell);
    if (cell.x < 0 || cell.z < 0 || cell.x >= world.width || cell.z >= world.height)
      throw Error(`Aulnes addition outside its map at ${cell.x},${cell.z}.`);
    if (building.kind !== 'power-conduit') {
      if (occupied.has(key) || addedOccupied.has(key)) throw Error(`Aulnes building overlap at ${cell.x},${cell.z}.`);
      if (obstructedByJob(cell)) throw Error(`Resolve the original Aulnes job at ${cell.x},${cell.z} before adding ${building.kind}.`);
      if (['water', 'rock'].includes(world.tiles[key]!.terrain) && !landscaped.has(key))
        throw Error(`Aulnes addition needs passable terrain at ${cell.x},${cell.z}.`);
      if (['wall', 'nutrient-paste-dispenser'].includes(building.kind)
        && (world.pawns.some(p => p.state !== 'dead' && index(p) === key)
          || world.wildlife?.animals.some(a => a.state !== 'dead' && index(a) === key)))
        throw Error(`An original Aulnes person or animal occupies ${cell.x},${cell.z}.`);
      if (['wall', 'chemfuel-generator', 'nutrient-paste-dispenser', 'hydroponics-basin', 'heater'].includes(building.kind)
        && world.piles.some(p => p.owner.type === 'ground' && index(p.owner) === key))
        throw Error(`Preserve the original Aulnes ground pile at ${cell.x},${cell.z} before its retrofit.`);
      addedOccupied.add(key);
    }
  }
  for (const cell of serviceCells) {
    const key = index(cell);
    if (plans.some(s => ['wall', 'nutrient-paste-dispenser'].includes(s.kind) && footprintCells(s).some(c => index(c) === key))
      || world.structures.some(s => ['wall', 'cooler'].includes(s.kind) && footprintCells(s).some(c => index(c) === key)))
      throw Error(`An Aulnes service cell is blocked at ${cell.x},${cell.z}.`);
  }
  // Every new solid footprint must be cleared, including the drill outside
  // the landscaped street. Conduits preserve only the four permitted crops;
  // trees, bushes and healroot follow the existing construction rule.
  const removedCells = new Set([...landscaped, ...basinCells, ...addedOccupied]);
  const newWires = new Set(plans.filter(s => s.kind === 'power-conduit').flatMap(s => footprintCells(s).map(index)));
  for (const resource of world.resources)
    if (newWires.has(index(resource)) && !conduitKeepsPlant('power-conduit', resource.kind)) removedCells.add(index(resource));
  for (const job of world.jobs) if (removedCells.has(index(job)))
    throw Error(`Resolve the original Aulnes ${job.kind} intent at ${job.x},${job.z} before landscaping.`);

  const stockCells: AulnesActivitySites['stockCells'] = {
    chemfuel: [{ x: 130, z: 175 }, { x: 131, z: 175 }, { x: 132, z: 175 }],
    neutroamine: [{ x: 117, z: 175 }, { x: 118, z: 175 }],
    industrial: [{ x: 109, z: 175 }, { x: 110, z: 175 }, { x: 111, z: 175 }],
    hospital: [{ x: 167, z: 108 }, { x: 168, z: 108 }, { x: 167, z: 109 }],
    rawFood: [{ x: 180, z: 107 }], weaponReserve: [{ x: 132, z: 176 }],
  };
  for (const cell of Object.values(stockCells).flat()) if (plans.some(s => s.kind !== 'power-conduit' && footprintCells(s).some(c => index(c) === index(cell))))
    throw Error(`An Aulnes ingredient shelf overlaps an addition at ${cell.x},${cell.z}.`);

  const removedResources = world.resources.filter(r => removedCells.has(index(r)));
  const removedResourceIds = removedResources.map(r => r.id);
  const removedPlantIds = removedResources.filter(isPlant).map(r => r.id);
  world.resources = world.resources.filter(r => !removedCells.has(index(r)));
  for (const key of landscaped) {
    const original = world.tiles[key]!;
    world.tiles[key] = { terrain: original.terrain === 'rich-soil' ? 'rich-soil' : 'grass', ...(original.floor ? { floor: original.floor } : {}) };
  }
  for (const [key, floor] of floors) world.tiles[key]!.floor = floor;
  world.growingZones = world.growingZones.map(zone => ({ ...zone, cells: zone.cells.filter(key => !basinCells.has(key)) })).filter(zone => zone.cells.length);
  world.growingCursor = 0;
  const buildings = new Map<BuildingPlan, Structure>();
  for (const building of plans) {
    const { off, ...shape } = building;
    const structure: Structure = { ...shape, id: world.nextId++ };
    if (isElectrical(structure.kind)) structure.power = { ...newPowerState(structure.kind), ...(off ? { switchOn: false } : {}) };
    if (isFueledBuilding(structure.kind)) structure.fuel = newBuildingFuel(structure.kind);
    if (structure.kind === 'door') structure.door = builtDoorState(world, structure);
    if (structure.kind === 'heater') structure.heater = newHeaterState();
    if (structure.kind === 'drug-lab' || structure.kind === 'biofuel-refinery') structure.bills = [];
    world.structures.push(structure); buildings.set(building, structure);
    for (const cell of footprintCells(structure)) home.add(index(cell));
  }
  for (const basin of basins) initializeHydroponicBasin(world, buildings.get(basin)!);
  world.roofing.constructed = [...roofs].sort((a, b) => a - b);
  world.home = [...home].sort((a, b) => a - b);

  const addedStockpileIds: number[] = [];
  const stock = (where: Cell[], filters: StorageFilters, priority: number, capacity = 75) => {
    for (const cell of where) if (!world.stockpiles.some(s => s.x === cell.x && s.z === cell.z)) {
      const id = world.nextId++;
      world.stockpiles.push({ id, ...cell, filters: { ...filters }, priority, capacity }); addedStockpileIds.push(id);
    }
  };
  stock(stockCells.chemfuel, { wood: false, food: false, chemfuel: true }, 3, 150);
  stock(stockCells.neutroamine, { wood: false, food: false, neutroamine: true }, 3, 150);
  stock(stockCells.industrial, { wood: true, food: false, textile: true, medicine: true }, 3);
  stock(stockCells.hospital, { wood: false, food: false, medicine: true }, 3);
  stock(stockCells.rawFood, { wood: false, food: true }, 2);
  stock(stockCells.weaponReserve, { wood: false, food: false, weapon: true }, 3);
  const idOf = (building: BuildingPlan) => buildings.get(building)!.id;
  return {
    drugLabId: idOf(drugLab), refineryId: idOf(refinery), chemfuelGeneratorId: idOf(generator),
    scannerId: idOf(scanner), drillId: idOf(drill), pasteDispenserId: idOf(dispenser),
    hopperIds: hoppers.map(idOf), hydroponicBasinIds: basins.map(idOf), beaconIds: beacons.map(idOf),
    commsConsoleId: idOf(console), vitalsMonitorIds: monitors.map(idOf), stockCells,
    recommendedSupplies: [
      { item: 'neutroamine', quantity: 20, cells: [stockCells.neutroamine[0]!] },
      { item: 'wood', quantity: 70, cells: [stockCells.industrial[0]!] },
      { item: 'cloth', quantity: 60, cells: [stockCells.industrial[1]!] },
      { item: 'herbal-medicine', quantity: 10, cells: [stockCells.industrial[2]!] },
      { item: 'rice', quantity: 150, cells: hoppers.map(h => ({ x: h.x, z: h.z })) },
      { item: 'emp-launcher', quantity: 1, cells: [stockCells.weaponReserve[0]!] },
    ],
    districts: [
      { key: 'hospital', label: 'Hôpital et soutien clinique', bounds: [159, 96, 169, 111] },
      { key: 'hydroponics', label: 'Serre mixte et cultures hors sol', bounds: [91, 146, 103, 158] },
      { key: 'pharmacy', label: 'Pharmacie et fournitures médicales', bounds: [108, 169, 120, 179] },
      { key: 'biofuel', label: 'Raffinage et réserve de combustible', bounds: [122, 169, 134, 179] },
      { key: 'paste', label: 'Annexe alimentaire', bounds: [174, 96, 185, 109] },
      { key: 'deep-resources', label: 'Prospection et foreuse mobile en attente', bounds: [108, 164, 114, 168] },
      { key: 'orbital', label: 'Communication et magasins commerciaux', bounds: [107, 111, 154, 157] },
    ],
    serviceCells, addedStructureIds: [...buildings.values()].map(s => s.id), addedStockpileIds,
    changedFloorCells: [...floors.keys()].sort((a, b) => a - b),
    landscapedCells: [...landscaped].sort((a, b) => a - b), removedPlantIds, removedResourceIds,
  };
}
