/** Player-information boundary only. Never import into physical navigation,
 * climate, weather, growth, corpse owners, damage or generic AI pathfinding. */
import type {Job} from './types.ts';
import {foggedCell256,validExplorationCell256,type ExplorationMap256} from './exploration-state-256.ts';
export function knownCell256(map:ExplorationMap256,cell:number):boolean {return validExplorationCell256(map,cell)&&!foggedCell256(map,cell);}
/** Current Core selection of a large spawned Thing is ANY occupied cell seen.
 * Call on actual spawned footprint; packed inner buildings are not spawned. */
export function knownSpawnedThing256(map:ExplorationMap256,occupiedCells:readonly number[]):boolean {return occupiedCells.some(c=>knownCell256(map,c));}
export type FogCellAction256='inspect'|'build-center'|'zone-add'|'plant-designation'|'mine-designation';
export function explorationCellAction256(map:ExplorationMap256,cell:number,action:FogCellAction256):boolean {
 if(!validExplorationCell256(map,cell))return false;
 return action==='mine-designation'||knownCell256(map,cell);
}
/** A blind mine designation is accepted without consulting terrain/ore; that
 * designation persists until discovery. Worker assignment still needs a real
 * Mineable and physical access. No ordinary target-ID interaction is admitted. */
export function blindMineDesignation256(map:ExplorationMap256,cell:number):boolean {return foggedCell256(map,cell);}
/** A single-cell reader can return this before light/room/ore/object queries. */
export const UNDISCOVERED_CELL_LABEL_256='Zone non d\u00e9couverte';

/** Same saved Job identity, no new blind-job flag or fabricated work/resource.
 * A worker must not assign a non-Mineable target merely because fog admits
 * the player's designation. Guards may admit only this idle empty intent. */
export function pendingBlindMine256(map:ExplorationMap256,job:Job):boolean {
 const cell=job.z*map.width+job.x;
 return job.kind==='mine'&&Number.isInteger(job.x)&&Number.isInteger(job.z)&&job.x>=0&&job.z>=0&&job.x<map.width&&job.z<map.height&&foggedCell256(map,cell)&&job.status==='pending'&&job.reservedBy===null&&job.progress===0&&(job.workRemainder??0)===0&&job.pickTicks===undefined&&job.escrow.wood===0&&job.escrow.food===0;
}
