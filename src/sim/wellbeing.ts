import { updateMood,expireMealMemories } from './mood.ts';
export { comfortMood } from './mood.ts';
import type { BodyAssessment } from './body-capacities.ts';
import { TICKS_PER_DAY } from './types.ts';
import type { Pawn,Structure, World } from './types.ts';
import { comfortForStructure,type FurnitureWorldLike } from './furniture-stats.ts';
import { isDiningSeat } from './dining.ts';
import { footprintCells,footprintContains } from './definitions.ts';
import { STRUCTURE_SHOT_FILL } from './combat-content.ts';
import { clearShotSegment,type ShotGrid } from './combat-space.ts';

export type FurnitureSight=()=>ShotGrid;

/** Comfort is a level approaching the furniture's ceiling, not an instant bonus. */
export function updateWellbeing(world: World, pawn: Pawn,body?:BodyAssessment,readSight?:FurnitureSight): void {
  const need = pawn.need;
  let ceiling = 0;
  let fallback:ShotGrid|undefined;
  const sight=()=>readSight?.()??(fallback??={width:world.width,height:world.height,coverAt:()=>undefined,blocksSight:(x,z)=>world.tiles[z*world.width+x]?.terrain==='rock'||world.structures.some(s=>STRUCTURE_SHOT_FILL[s.kind]>.99&&!(s.kind==='door'&&s.door?.open)&&footprintContains(s,{x,z}))});
  const furnitureWorld:FurnitureWorldLike={structures:world.structures,cellsOf:structure=>footprintCells(structure as unknown as Structure),lineOfSight:(from,to)=>clearShotSegment(sight(),from,to)};
  if (pawn.state === 'sleeping' && need?.kind === 'sleep' && need.bedId !== null) {const bed=world.structures.find(item => item.id === need.bedId && item.kind === 'bed' && item.x === pawn.x && item.z === pawn.z);if(bed)ceiling=comfortForStructure(furnitureWorld,bed)*100;}
  if (pawn.state === 'eating' && need?.kind === 'eat' && need.dining?.seatId !== null && need.dining) {const seat=world.structures.find(item => item.id === need.dining!.seatId && isDiningSeat(item.kind) && item.x === pawn.x && item.z === pawn.z);if(seat)ceiling=comfortForStructure(furnitureWorld,seat)*100;}
  if(pawn.research && pawn.state==='working' && pawn.x===pawn.research.spot.x && pawn.z===pawn.research.spot.z){const seat=world.structures.find(s=>isDiningSeat(s.kind)&&s.x===pawn.x&&s.z===pawn.z);if(seat)ceiling=comfortForStructure(furnitureWorld,seat)*100;}
  const perHour = pawn.comfort < ceiling ? 60 : -4;
  pawn.comfort = pawn.comfort < ceiling ? Math.min(ceiling, pawn.comfort + perHour * 24 / TICKS_PER_DAY)
    : Math.max(ceiling, pawn.comfort + perHour * 24 / TICKS_PER_DAY);
  expireMealMemories(world,pawn);
  updateMood(world,pawn,body);
}

export function rememberMeal(world: World, pawn: Pawn, atTable: boolean, raw = false): void {
  // A good meal does not erase earlier memories; repeated meals refresh one entry.
  const kinds = [...(!atTable ? ['ate-without-table' as const] : []), ...(raw ? ['ate-raw-food' as const] : [])];
  pawn.memories = [...pawn.memories.filter(memory => !kinds.includes(memory.kind)), ...kinds.map(kind => ({kind, expiresAt: world.tick + TICKS_PER_DAY}))];
}
