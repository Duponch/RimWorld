import { deconstructionReserved } from './deconstruction-rules.ts';
import { isCookingOrder } from './order-types.ts';
import { reservedDestination } from './materials.ts';
import type { Structure, World } from './types.ts';

/** 600 integer reserve units per wood. Burn rates depend on the appliance. */
export const WOOD_BURN_TICKS = 600;
export const CAMPFIRE_CAPACITY = 20 * WOOD_BURN_TICKS;
export const PASSIVE_COOLER_CAPACITY = 50 * WOOD_BURN_TICKS;
export const isFueledBuilding = (kind:unknown):boolean => kind==='campfire'||kind==='passive-cooler'||kind==='wood-generator'||kind==='fueled-stove';
export const fuelLimit = (kind:unknown):number => kind==='wood-generator'?75*WOOD_BURN_TICKS:kind==='fueled-stove'||kind==='passive-cooler'?PASSIVE_COOLER_CAPACITY:kind==='campfire'?CAMPFIRE_CAPACITY:0;
export const newBuildingFuel = (kind:Structure['kind']):FuelState => ({ticks:kind==='wood-generator'||kind==='fueled-stove'?0:fuelLimit(kind),burned:0,autoRefuel:true,...kind==='wood-generator'?{burnRemainder:0}:{}});
export function refuelable(world:World,id:number):Structure|undefined {return world.structures.find(s=>s.id===id&&isFueledBuilding(s.kind));}
export const AUTO_REFUEL_THRESHOLD = .3;
export const REFUEL_WORK_TICKS = 24;
export interface FuelState { burnRemainder?:number; ticks: number; burned: number; autoRefuel: boolean }
export function newCampfireFuel(): FuelState { return {ticks:CAMPFIRE_CAPACITY,burned:0,autoRefuel:true}; }
export function campfire(world: World, id: number): Structure | undefined {
  return world.structures.find(s => s.id === id && s.kind === 'campfire');
}
/** Waiting refuels reserve the workstation as well as their wood. */
export function fuelStationReserved(world: World, id: number, exceptPawn?: number): boolean {
  if(deconstructionReserved(world,id,exceptPawn))return true;
  for(const p of world.pawns) {
    if(p.id!==exceptPawn&&(p.cooking?.stationId===id||p.haul?.destination.type==='fuel'&&p.haul.destination.structureId===id))return true;
    for(const task of p.orders?.queue??[])if(typeof task!=='number'&&(isCookingOrder(task)?task.cooking.stationId===id:task.destination.type==='fuel'&&task.destination.structureId===id))return true;
  }
  return false;
}
export function fuelCapacity(world: World, id: number, exceptPawn?: number, forced=false): number {
  const fire=refuelable(world,id);
  if (!fire?.fuel || !forced&&!fire.fuel.autoRefuel || fuelStationReserved(world,id,exceptPawn)) return 0;
  // Whole wood units only: never silently discard a fractional refill overflow.
  return Math.max(0,Math.floor((fuelLimit(fire.kind)-fire.fuel.ticks)/WOOD_BURN_TICKS)-reservedDestination(world,{type:'fuel',structureId:id},exceptPawn));
}
export function wantsFuel(world: World, fire: Structure): boolean {
  return isFueledBuilding(fire.kind) && !!fire.fuel?.autoRefuel && fire.fuel.ticks <= fuelLimit(fire.kind)*AUTO_REFUEL_THRESHOLD && fuelCapacity(world,fire.id)>0;
}
export function burnFuel(world: World): void {
  for (const fire of world.structures) if (isFueledBuilding(fire.kind) && fire.kind!=='fueled-stove' && fire.fuel && fire.fuel.ticks>0) {
    const f=fire.fuel;let amount=1;
    if(fire.kind==='wood-generator'){const total=(f.burnRemainder??0)+11;amount=Math.floor(total/5);f.burnRemainder=total%5;}
    amount=Math.min(amount,f.ticks);f.ticks-=amount;f.burned+=amount;
    if(fire.kind==='wood-generator'&&!f.ticks){f.burnRemainder=0;if(fire.power)fire.power.on=false;}
  }
}
/** 160 wood per 6000 local work ticks =16 reserve units per work tick.
 * The final partial reserve grants only its corresponding fraction of work. */
export function consumeCookingFuel(station:Structure):number {
  if(station.kind!=='fueled-stove')return 1;
  const fuel=station.fuel;if(!fuel)return 0;
  const amount=Math.min(16,fuel.ticks);fuel.ticks-=amount;fuel.burned+=amount;
  return amount/16;
}
