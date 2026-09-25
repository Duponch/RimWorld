import { FURNITURE_MATERIALS,isSculptureKind,isSculptureMaterial,sculptureWorkToMakeCore } from './furniture-stats.ts';
import { structureMaxHp } from './thing-damage-rules.ts';
import { roundTradeSilver, tradeHealthFactor } from './trade-prices.ts';
import type { ConstructionMaterial } from './building-materials.ts';
import type { FloorKind } from './flooring.ts';
import type { Resource, ResourceKind, Structure, StructureKind, Tile } from './types.ts';

/** Core 1.6.4871, StatWorker_MarketValue. These are market values, never
 * negotiated prices or the resale multiplier of a building. */
const VALUE_PER_WORK = .0036;
const UNKNOWN_STUFF_VALUE = 2;
const MATERIAL_VALUE: Readonly<Record<ConstructionMaterial, number>> = Object.freeze({
  wood: 1.2, steel: 1.9,
  'granite-blocks': .9, 'limestone-blocks': .9, 'marble-blocks': .9,
  'sandstone-blocks': .9, 'slate-blocks': .9,
  cloth: 1.5, 'light-leather': 1.9,
});

type Passability = 'standable' | 'pass-through' | 'impassable';
interface BuildingValueDef {
  /** Core costStuffCount, separate from fixed costList. */
  readonly stuff: number;
  readonly wood: number;
  readonly steel: number;
  readonly component: number;
  /** Neutral Core WorkToBuild, or WorkToMake for a sculpture, before stuff. */
  readonly work: number;
  readonly quality: boolean;
  readonly passability: Passability;
}
const def = (stuff: number, work: number, passability: Passability,
  fixed: Readonly<{wood?: number; steel?: number; component?: number}> = {},
  quality = false): BuildingValueDef => Object.freeze({
    stuff, work, passability, quality,
    wood: fixed.wood ?? 0, steel: fixed.steel ?? 0, component: fixed.component ?? 0,
  });

/** Resolved Core building Defs. An explicit zero prevents a new kind from
 * inheriting a fictitious value. Historical untyped furniture keeps Core's
 * abstract-stuff estimate rather than receiving a fabricated material. */
const BUILDINGS: Readonly<Record<StructureKind, BuildingValueDef>> = Object.freeze({
  'art-bench': def(75, 2500, 'pass-through', {steel:50}),
  'small-sculpture': def(50, 18000, 'pass-through', {}, true),
  'large-sculpture': def(100, 30000, 'pass-through', {}, true),
  'machining-table': def(0, 3000, 'pass-through', {steel:150,component:5}),
  grave: def(0, 800, 'standable'),
  heater: def(0, 1000, 'pass-through', {steel:50,component:1}),
  'wind-turbine': def(0, 3300, 'pass-through', {steel:100,component:2}),
  'power-conduit': def(0, 35, 'standable', {steel:1}),
  'power-switch': def(0, 200, 'standable', {steel:15,component:1}),
  battery: def(0, 800, 'pass-through', {steel:70,component:2}),
  'solar-generator': def(0, 2500, 'pass-through', {steel:100,component:3}),
  'fueled-stove': def(0, 2000, 'pass-through', {steel:80}),
  'electric-stove': def(0, 2000, 'pass-through', {steel:80,component:2}),
  'butcher-table': def(75, 2000, 'pass-through', {wood:20}),
  'butcher-spot': def(0, 0, 'standable'),
  cooler: def(0, 1600, 'impassable', {steel:90,component:3}),
  'research-bench': def(75, 2800, 'pass-through', {steel:25}),
  'tailor-bench': def(75, 2000, 'pass-through'),
  'electric-tailor-bench': def(75, 2500, 'pass-through', {steel:50,component:2}),
  'crafting-spot': def(0, 0, 'standable'),
  'wood-generator': def(0, 2500, 'pass-through', {steel:100,component:2}),
  'standing-lamp': def(0, 300, 'pass-through', {steel:20}),
  'passive-cooler': def(0, 200, 'pass-through', {wood:50}),
  door: def(25, 850, 'standable'),
  wall: def(5, 135, 'impassable'),
  bed: def(45, 800, 'pass-through', {}, true),
  table: def(28, 750, 'pass-through', {}, true),
  'table-square': def(50, 1500, 'pass-through', {}, true),
  'table-long': def(95, 3000, 'pass-through', {}, true),
  stool: def(25, 450, 'standable', {}, true),
  'dining-chair': def(45, 8000, 'standable', {}, true),
  armchair: def(110, 14000, 'standable', {}, true),
  'end-table': def(30, 1000, 'pass-through', {}, true),
  dresser: def(50, 2000, 'pass-through', {}, true),
  'flower-pot': def(20, 250, 'pass-through', {}, true),
  campfire: def(0, 200, 'pass-through', {wood:20}),
  horseshoes: def(10, 100, 'standable'),
  stonecutter: def(75, 2000, 'pass-through', {steel:30}),
});

const QUALITY_FACTOR = Object.freeze({
  awful: .5, poor: .75, normal: 1, good: 1.25,
  excellent: 1.5, masterwork: 2.5, legendary: 5,
} as const);
const QUALITY_MAX_GAIN = Object.freeze({
  awful: Infinity, poor: Infinity, normal: Infinity, good: 500,
  excellent: 1000, masterwork: 2000, legendary: 3000,
} as const);

function coreDef(kind: StructureKind): BuildingValueDef {
  const result = BUILDINGS[kind];
  if (!result) throw new RangeError(`Unmapped room building value: ${kind}`);
  return result;
}

export function structureRoomStandable(kind: StructureKind): boolean {
  return coreDef(kind).passability === 'standable';
}

export function structureRoomMarketValue(structure: Structure): number {
  const d = coreDef(structure.kind);
  const material = d.stuff && structure.material ? structure.material : undefined;
  const factors = material ? FURNITURE_MATERIALS[material] : undefined;
  if (material && !factors) throw new RangeError(`Unmapped building material: ${material}`);
  const stuffValue = d.stuff * (material ? MATERIAL_VALUE[material] : UNKNOWN_STUFF_VALUE);
  const fixedValue = d.wood * MATERIAL_VALUE.wood + d.steel * MATERIAL_VALUE.steel + d.component * 32;
  const work = isSculptureKind(structure.kind)&&isSculptureMaterial(material)
    ? sculptureWorkToMakeCore(structure.kind,material)
    : d.work * (factors?.workFactor ?? 1) + (factors?.workOffset ?? 0);
  let value = stuffValue + fixedValue + (work > 2 ? work * VALUE_PER_WORK : 0);

  if (d.quality) {
    const quality = structure.quality ?? 'normal';
    if (!(quality in QUALITY_FACTOR)) throw new RangeError(`Unmapped building quality: ${quality}`);
    const q = quality as keyof typeof QUALITY_FACTOR;
    value += Math.min(value * (QUALITY_FACTOR[q] - 1), QUALITY_MAX_GAIN[q]);
  }

  const maxHp = structureMaxHp(structure);
  if (maxHp > 0) value *= tradeHealthFactor((maxHp - (structure.damage ?? 0)) / maxHp);
  // Core StatWorker.FinalizeValue rounds each object's MarketValue above 200.
  return value > 200 ? roundTradeSilver(value / 5) * 5 : value;
}

/** Terrain values are per cell, including the work of laying a floor. Natural
 * terrain and fire-burned planks have no Core construction cost or market value. */
const FLOOR_VALUE: Readonly<Record<FloorKind, number>> = Object.freeze({
  'wood-planks': 3 * MATERIAL_VALUE.wood + 85 * VALUE_PER_WORK,
  'granite-tile': 4 * MATERIAL_VALUE['granite-blocks'] + 1100 * VALUE_PER_WORK,
  'limestone-tile': 4 * MATERIAL_VALUE['limestone-blocks'] + 1100 * VALUE_PER_WORK,
  'marble-tile': 4 * MATERIAL_VALUE['marble-blocks'] + 1100 * VALUE_PER_WORK,
  'sandstone-tile': 4 * MATERIAL_VALUE['sandstone-blocks'] + 1100 * VALUE_PER_WORK,
  'slate-tile': 4 * MATERIAL_VALUE['slate-blocks'] + 1100 * VALUE_PER_WORK,
  'steel-tile': 7 * MATERIAL_VALUE.steel + 800 * VALUE_PER_WORK,
  'burned-wood': 0,
});
export function floorRoomMarketValue(tile: Tile): number {
  if (tile.floor === undefined) return 0;
  const value = FLOOR_VALUE[tile.floor];
  if (value === undefined) throw new RangeError(`Unmapped room floor value: ${tile.floor}`);
  return value;
}

/** All currently shipped plants lack a Core market value; rock is not in the
 * Building/Plant categories counted by RoomStatWorker_Wealth. Daylily in a
 * flower pot likewise adds beauty but zero value beyond the pot. */
const RESOURCE_VALUE: Readonly<Record<ResourceKind, 0>> = Object.freeze({
  'wild-plant': 0, potato: 0, corn: 0, tree: 0, berries: 0,
  rock: 0, rice: 0, cotton: 0,
});
export function resourceRoomMarketValue(resource: Resource): number {
  const value = RESOURCE_VALUE[resource.kind];
  if (value === undefined) throw new RangeError(`Unmapped room resource value: ${resource.kind}`);
  return value;
}
