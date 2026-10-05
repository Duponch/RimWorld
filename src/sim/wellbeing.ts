import { isBedKind } from './bed-kinds.ts';
import { updateMood,expireMealMemories } from './mood.ts';
import { rememberRoomUse } from './room-experience.ts';
export { comfortMood } from './mood.ts';
import type { BodyAssessment } from './body-capacities.ts';
import { TICKS_PER_DAY } from './types.ts';
import type { Pawn,Structure, World } from './types.ts';
import { comfortForStructure,type FurnitureWorldLike } from './furniture-stats.ts';
import { isDiningSeat } from './dining.ts';
import { footprintCells,footprintContains } from './definitions.ts';
import { STRUCTURE_SHOT_FILL } from './combat-content.ts';
import { clearShotSegment,type ShotGrid } from './combat-space.ts';
import { isRoomDoor } from './door-rules.ts';
import type { ItemId } from './items.ts';
import type { RoomTopology } from './room-topology.ts';

export type FurnitureSight=()=>ShotGrid;

/** Comfort is a level approaching the furniture's ceiling, not an instant bonus. */
export function updateWellbeing(world: World, pawn: Pawn,body?:BodyAssessment,readSight?:FurnitureSight,topology?:RoomTopology|(()=>RoomTopology)): void {
  const need = pawn.need;
  let ceiling = 0;
  let fallback:ShotGrid|undefined;
  const sight=()=>readSight?.()??(fallback??={width:world.width,height:world.height,coverAt:()=>undefined,blocksSight:(x,z)=>world.tiles[z*world.width+x]?.terrain==='rock'||world.structures.some(s=>STRUCTURE_SHOT_FILL[s.kind]>.99&&!(isRoomDoor(s.kind)&&s.door?.open)&&footprintContains(s,{x,z}))});
  const furnitureWorld:FurnitureWorldLike={structures:world.structures,cellsOf:structure=>footprintCells(structure as unknown as Structure),lineOfSight:(from,to)=>clearShotSegment(sight(),from,to)};
  if (need?.kind === 'sleep' && need.bedId !== null && (pawn.state === 'sleeping'||need.phase==='sleep'&&pawn.moveCooldown===0&&(pawn.state==='resting'||pawn.state==='downed'))) {
    const bed=world.structures.find(item=>item.id===need.bedId&&isBedKind(item.kind)&&item.x===pawn.x&&item.z===pawn.z&&(item.kind!=='hospital-bed'||need.phase==='sleep'&&pawn.moveCooldown===0&&need.target.x===item.x&&need.target.z===item.z));
    if(bed&&(pawn.state==='sleeping'||bed.kind==='hospital-bed')) {
      const comfort=comfortForStructure(furnitureWorld,bed)*100;
      ceiling=bed.kind==='hospital-bed'?Math.min(100,comfort):comfort;
    }
  }
  if (pawn.state === 'eating' && need?.kind === 'eat' && need.dining?.seatId !== null && need.dining) {const seat=world.structures.find(item => item.id === need.dining!.seatId && isDiningSeat(item.kind) && item.x === pawn.x && item.z === pawn.z);if(seat)ceiling=comfortForStructure(furnitureWorld,seat)*100;}
  if(pawn.research && pawn.state==='working' && pawn.x===pawn.research.spot.x && pawn.z===pawn.research.spot.z){const seat=world.structures.find(s=>isDiningSeat(s.kind)&&s.x===pawn.x&&s.z===pawn.z);if(seat)ceiling=comfortForStructure(furnitureWorld,seat)*100;}
  if(pawn.state==='recreating'&&(pawn.recreation.task?.activity==='chess'||pawn.recreation.task?.activity==='watch-television'&&pawn.x===pawn.recreation.task.target.x&&pawn.z===pawn.recreation.task.target.z&&pawn.moveCooldown===0)&&pawn.recreation.task.phase==='active'){
    const seat=world.structures.find(s=>s.id===pawn.recreation.task!.seatId&&isDiningSeat(s.kind)&&s.x===pawn.x&&s.z===pawn.z);
    if(seat)ceiling=comfortForStructure(furnitureWorld,seat)*100;
  }
  const perHour = pawn.comfort < ceiling ? 60 : -4;
  pawn.comfort = pawn.comfort < ceiling ? Math.min(ceiling, pawn.comfort + perHour * 24 / TICKS_PER_DAY)
    : Math.max(ceiling, pawn.comfort + perHour * 24 / TICKS_PER_DAY);
  expireMealMemories(world,pawn);
  updateMood(world,pawn,body,topology);
}

export function rememberMeal(world: World, pawn: Pawn, atTable: boolean, raw = false, food?: ItemId): void {
  rememberRoomUse(world,pawn,'dining');rememberIngestionAt(pawn,world.tick,{atTable,raw,food});
}
export function rememberIngestionAt(pawn:Pawn,tick:number,{atTable,raw=false,food}:{atTable?:boolean;raw?:boolean;food?:ItemId}):void {
  // Fine and lavish tastes replace one another; table/raw thoughts remain independent.
  const taste=food==='fine-meal'||food==='vegetarian-fine-meal'||food==='carnivore-fine-meal'?'ate-fine-meal' as const:food==='lavish-meal'||food==='vegetarian-lavish-meal'||food==='carnivore-lavish-meal'?'ate-lavish-meal' as const:undefined;
  const kinds = [...(atTable===false ? ['ate-without-table' as const] : []), ...(raw ? ['ate-raw-food' as const] : []), ...(taste ? [taste] : [])];
  pawn.memories = [...pawn.memories.filter(memory => !kinds.includes(memory.kind)&&!(taste&&(memory.kind==='ate-fine-meal'||memory.kind==='ate-lavish-meal'))), ...kinds.map(kind => ({kind, expiresAt: tick + TICKS_PER_DAY}))];
}
