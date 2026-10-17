/** Original prospective natural owner; never a constructible Structure or pile. */
import type {World,Cell} from './types.ts';
export interface NaturalGeyser256 extends Cell {id:number;ticksUntilSpray:number;sprayTicksLeft:number}
export interface LocalGeysers256 {revision:1;atTick:number;items:NaturalGeyser256[]}
export type GeyserWorld256=World&{geysers?:LocalGeysers256};
export const GEYSER_FACTS_256=Object.freeze({coreDef:'SteamGeyser',width:2,height:2,passability:'Standable',edifice:false,fill:0,holdsRoof:false,destroyable:false,useHitPoints:false,claimable:false,deconstructible:false,blockPlants:true,coexistsWithFloors:false,seedPart:1158116095,order:950});
export function geyserCells256(width:number,g:Cell):number[] {return [g.z*width+g.x,g.z*width+g.x+1,(g.z+1)*width+g.x,(g.z+1)*width+g.x+1];}
export function geyserAt256(world:Pick<GeyserWorld256,'geysers'>,cell:Cell):NaturalGeyser256|undefined {return world.geysers?.items.find(g=>cell.x>=g.x&&cell.x<=g.x+1&&cell.z>=g.z&&cell.z<=g.z+1);}
export function geyserOwnedId256(world:Pick<GeyserWorld256,'geysers'>,id:number):NaturalGeyser256|undefined {return world.geysers?.items.find(g=>g.id===id);}
/** Only floor/plant conflict. This is NOT a universal building/movement ban:
 * Core allows many edifices over a non-edifice (default canBuildNonEdificesUnder). */
export const geyserBlocksPlantOrFloor256=(world:Pick<GeyserWorld256,'geysers'>,cell:Cell):boolean=>geyserAt256(world,cell)!==undefined;
