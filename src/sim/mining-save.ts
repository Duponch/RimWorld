import { validOre } from './ore.ts';
import { PICK_TICKS, validMiningDamage } from './mining-rules.ts';
import type { World } from './types.ts';

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
  for(const j of world.jobs)if(j.kind==='mine'&&(version<28||world.tiles[j.z*world.width+j.x]?.terrain!=='rock'||j.footprint!=='standard'||j.escrow.wood||j.escrow.food||j.progress>=PICK_TICKS))errors.push('Invalid mining target or pick preparation.');
  return errors;
}
