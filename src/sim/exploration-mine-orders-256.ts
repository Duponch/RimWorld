/** Discovery removes now-known empty Mine designations through the existing
 * cancellation transaction: queued work, reservations and cargo stay real. */
import {cancelIntentJobs} from './designation-cancel.ts';
import {explorationEnabled256,foggedCell256,validExplorationCell256} from './exploration-state-256.ts';
import type {World,CommandResult} from './types.ts';
export function retireEmptyMinesAfterReveal256(world:World,changedCells:readonly number[],completedMineId?:number):CommandResult {
 if(!explorationEnabled256(world)||!changedCells.length)return {ok:true};
 const cells=new Set(changedCells.filter(c=>validExplorationCell256(world,c)&&!foggedCell256(world,c)&&world.tiles[c]!.terrain!=='rock'&&!world.tiles[c]!.collapsedRock));
 const ids=new Set(world.jobs.filter(j=>j.id!==completedMineId&&j.kind==='mine'&&cells.has(j.z*world.width+j.x)).map(j=>j.id));
 return ids.size?cancelIntentJobs(world,ids):{ok:true};
}
