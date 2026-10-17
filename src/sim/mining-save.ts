import {pendingBlindMine256} from './exploration-visibility-256.ts';
import { validOre } from './ore.ts';
import { PICK_TICKS, validMiningDamage } from './mining-rules.ts';
import type { Job, World } from './types.ts';
import { workProgress } from './work-progress.ts';

/** Only an idle intent may name unrevealed empty ground. No escrow, worker,
 * carried delivery or work is admitted by this narrow exception. */
export function pendingUnownedBlindMine256(world:World,j:Job):boolean {
 return pendingBlindMine256(world,j)&&j.footprint==='standard'
  &&!world.piles.some(p=>p.owner.type==='job'&&p.owner.jobId===j.id)
  &&!world.pawns.some(p=>p.jobId===j.id||p.haul?.destination.type==='job'&&p.haul.destination.jobId===j.id);
}
/** Candidate jobs only: does not rescan the map's terrain on ordinary deltas. */
export function validBlindMineTransport256(world:World):boolean {
 return world.jobs.every(j=>j.kind!=='mine'||world.tiles[j.z*world.width+j.x]?.terrain==='rock'||pendingUnownedBlindMine256(world,j));
}

export function validateMining(world:World,version:number):string[] {
  const errors:string[]=[];
  for(const t of world.tiles)if(!validOre(t,version)||!validMiningDamage(t,version))errors.push('Invalid persistent rock damage.');
  for(const p of world.pawns) {
    const value=p.priorities.mine;
    if(version<28?value!==undefined:!Number.isInteger(value)||value<0||value>4)errors.push('Invalid mining priority.');
  }
  for(const p of world.piles) {
    if(p.kind==='steel'&&(version<29||version<30&&p.owner.type==='job'))errors.push('Invalid steel owner or version.');
    if(p.kind==='chunk'&&(version<28||p.quantity!==1||p.owner.type==='job'))errors.push('Invalid chunk owner or quantity.');
    if(p.haulRequested!==undefined&&(version<28||p.kind!=='chunk'||p.haulRequested!==true))errors.push('Invalid chunk haul designation.');
  }
  for(const j of world.jobs){
    if(j.kind!=='mine')continue;
    if(pendingUnownedBlindMine256(world,j))continue;
    if(version<28||world.tiles[j.z*world.width+j.x]?.terrain!=='rock'||j.footprint!=='standard'||j.escrow.wood||j.escrow.food||workProgress(j)>=(version>=37&&j.pickTicks!==undefined?j.pickTicks/10:PICK_TICKS))errors.push('Invalid mining target or pick preparation.');
  }
  return errors;
}
