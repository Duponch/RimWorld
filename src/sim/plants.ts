import { TICKS_PER_DAY, type Resource, type World } from './types.ts';
import { isRoofed, roofIndex } from './roof-rules.ts';
import { annualGrowingLightIntegral } from './environment.ts';
import { soilFertility } from './soil.ts';
import { isCropKind, type CropKind } from './crops.ts';

export const PLANT_DEFINITIONS = Object.freeze({
  cotton: { label: 'Coton', growDays: 8, minFertility: .7, sensitivity: 1, afterHarvest: 0, yield: 10 },
  berries: { label: 'Buisson de baies', growDays: 6, minFertility: .5, sensitivity: .5, afterHarvest: .3, yield: 10 },
  rice: { label: 'Riz', growDays: 3, minFertility: .7, sensitivity: 1, afterHarvest: 0, yield: 6 },
  potato: { label: 'Pommes de terre', growDays: 5.8, minFertility: .7, sensitivity: .4, afterHarvest: 0, yield: 11 },
  corn: { label: 'Maïs', growDays: 11.3, minFertility: .7, sensitivity: 1, afterHarvest: 0, yield: 22 },
});
export const isPlant = (plant: Resource): plant is Resource & { kind: keyof typeof PLANT_DEFINITIONS } => plant.kind === 'berries' || isCropKind(plant.kind);
export const isCrop = (plant: Pick<Resource,'kind'>): plant is Pick<Resource,'kind'>&{kind:CropKind} => isCropKind(plant.kind);
export const harvestProductLabel = (plant:Resource):string => plant.kind==='cotton'?'tissu':plant.kind==='rice'?'riz':plant.kind==='potato'?'pommes de terre':plant.kind==='corn'?'maïs':'baies';

export const BERRY_GROW_DAYS = 6;
export const HARVEST_MIN_GROWTH = .65;
export const AFTER_HARVEST_GROWTH = .3;
const clamp = (n: number): number => Math.max(0, Math.min(1, n));

export const plantTemperatureFactor = (temperature:number):number => temperature < 6 ? clamp(temperature / 6) : temperature > 42 ? clamp((58 - temperature) / 16) : 1;
export const sowingTemperatureAllowed = (temperature:number):boolean => temperature > 0 && temperature < 58;

/** Historical berry calculation; current species use their own sensitivity below. */
export function plantGrowthRate(light: number, temperature: number, fertility: number, resting = false): number {
  if (resting || fertility < .5) return 0;
  const heat = plantTemperatureFactor(temperature);
  return clamp((light - .51) / .49) * heat * (.5 + fertility * .5);
}
export const plantFertility = (world: World, plant: Resource): number => {
  const terrain = world.tiles[plant.z * world.width + plant.x]!.terrain;
  return soilFertility(terrain);
};
export const plantResting = (tick: number): boolean => {
  const day = tick % TICKS_PER_DAY / TICKS_PER_DAY;
  return day < .25 || day > .8;
};

// Fixed temperate, unroofed preset: full daylight during the growing window,
// 21°C. Exact integral avoids scanning/mutating every plant each tick. Future
// environmental changes must checkpoint growth before changing its rate.
function favorableTicks(tick: number): number {
  const day = Math.floor(tick / TICKS_PER_DAY), remainder = tick % TICKS_PER_DAY;
  const start = TICKS_PER_DAY * .25, end = TICKS_PER_DAY * .8;
  return day * (end - start + 1) + Math.max(0, Math.min(remainder, end) - start + 1);
}
export function legacyPlantGrowth(world: World, plant: Resource): number {
  if (plant.kind !== 'berries') return 1;
  const base = plant.growth ?? 1;
  if (base >= 1) return 1;
  const elapsed = favorableTicks(world.tick) - favorableTicks(plant.growthTick ?? world.tick);
  return clamp(base + elapsed * plantGrowthRate(1, 21, plantFertility(world, plant)) / (BERRY_GROW_DAYS * TICKS_PER_DAY));
}
export function plantGrowth(world: World, plant: Resource): number {
  if (!isPlant(plant)) return 1;
  const base = plant.growth ?? 1;
  if(isRoofed(world,roofIndex(world,plant)))return base;
  if (base >= 1) return 1;
  const def = PLANT_DEFINITIONS[plant.kind], fertility = plantFertility(world, plant);
  if (fertility < def.minFertility) return base;
  const lightTime = annualGrowingLightIntegral(world) - annualGrowingLightIntegral(world, plant.growthTick ?? world.tick);
  const factor = (plant.growthThermalFactor ?? 1) * (1 - def.sensitivity + fertility * def.sensitivity);
  return clamp(base + lightTime * factor / (def.growDays * TICKS_PER_DAY));
}
export const harvestable = (world: World, plant: Resource): boolean => isPlant(plant) && plantGrowth(world, plant) > HARVEST_MIN_GROWTH;
export function berryYield(world: World, plant: Resource): number {
  const growth = plantGrowth(world, plant);
  return growth > HARVEST_MIN_GROWTH ? plant.amount * (.5 + .5 * (growth - HARVEST_MIN_GROWTH) / (1 - HARVEST_MIN_GROWTH)) : 0;
}
/** Preview stochastic rounding without consuming RNG until placement succeeds. */
export function harvestRoll(world: World, plant: Resource): { quantity: number; rng: number } {
  const raw = berryYield(world, plant), whole = Math.floor(raw);
  if (raw === whole) return { quantity: whole, rng: world.rng };
  let rng = world.rng; rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5; rng >>>= 0;
  return { quantity: whole + (rng / 0x100000000 < raw - whole ? 1 : 0), rng };
}
