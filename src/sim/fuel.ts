import { reservedDestination } from './materials.ts';
import type { Structure, World } from './types.ts';

/** One wood burns for 1/10 day. Integer burn ticks preserve exact save/replay. */
export const WOOD_BURN_TICKS = 600;
export const CAMPFIRE_CAPACITY = 20 * WOOD_BURN_TICKS;
export const AUTO_REFUEL_THRESHOLD = .3;
export const REFUEL_WORK_TICKS = 24;
export interface FuelState { ticks: number; burned: number; autoRefuel: boolean }
export function newCampfireFuel(): FuelState { return {ticks:CAMPFIRE_CAPACITY,burned:0,autoRefuel:true}; }
export function campfire(world: World, id: number): Structure | undefined {
  return world.structures.find(s => s.id === id && s.kind === 'campfire');
}
export function fuelCapacity(world: World, id: number, exceptPawn?: number): number {
  const fire=campfire(world,id);
  if (!fire?.fuel?.autoRefuel || world.pawns.some(p=>p.id!==exceptPawn&&(p.cooking?.stationId===id||p.haul?.destination.type==='fuel'&&p.haul.destination.structureId===id))) return 0;
  // Whole wood units only: never silently discard a fractional refill overflow.
  return Math.max(0,Math.floor((CAMPFIRE_CAPACITY-fire.fuel.ticks)/WOOD_BURN_TICKS)-reservedDestination(world,{type:'fuel',structureId:id},exceptPawn));
}
export function wantsFuel(world: World, fire: Structure): boolean {
  return fire.kind === 'campfire' && !!fire.fuel?.autoRefuel && fire.fuel.ticks <= CAMPFIRE_CAPACITY*AUTO_REFUEL_THRESHOLD && fuelCapacity(world,fire.id)>0;
}
export function burnFuel(world: World): void {
  for (const fire of world.structures) if (fire.kind==='campfire' && fire.fuel && fire.fuel.ticks>0) {
    fire.fuel.ticks--; fire.fuel.burned++;
  }
}
