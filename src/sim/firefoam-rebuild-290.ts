import {canPlaceFirefoamPopper290} from './firefoam-placement-290.ts';
import type {Job,Structure,World} from './types.ts';

/** Call only after destructive retirement of the installed original. Nothing
 * is refunded or delivered: the replacement waits for all physical inputs. */
export function rebuildFirefoamPopper290(world:World,source:Structure):Job|undefined {
 if((Number(world.schemaVersion)!==290&&(Number(world.schemaVersion)!==291&&(Number(world.schemaVersion)!==292&&Number(world.schemaVersion)!==293)))||source.kind!=='firefoam-popper'||!source.firefoam290?.autoRebuild||source.factionId!==undefined
  ||world.structures.includes(source)
  ||world.jobs.length>=world.width*world.height*3||!Number.isSafeInteger(world.nextId+1))return;
 const command={type:'designate' as const,kind:'firefoam-popper' as const,x:source.x,z:source.z,orientation:0 as const,material:'steel' as const};
 if(!canPlaceFirefoamPopper290(world,command).ok)return;
 const job:Job={id:world.nextId++,kind:'firefoam-popper',x:source.x,z:source.z,orientation:0,footprint:'standard',material:'steel',
  construction:'blueprint',progress:0,status:'pending',reservedBy:null,escrow:{wood:0,food:0}};
 world.jobs.push(job);for(const pawn of world.pawns)pawn.planCooldown=0;
 return job;
}
