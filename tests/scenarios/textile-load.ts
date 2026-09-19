import { miningLoad } from './mining.ts';
import { applyCommand } from '../../src/sim/engine.ts';
import type { Command,World } from '../../src/sim/types.ts';

/** Controlled maturity, not accelerated agricultural gameplay. Half the people
 * grow/haul in the same natural-map patch as miners and tree cutters. */
export function textileLoad(count:number):World {
  const w=miningLoad(count);
  const command=(c:Command)=>{const r=applyCommand(w,c);if(!r.ok)throw Error(r.reason);};
  w.pawns.forEach((p,i)=>{
    if(i%2)return;p.priorities.grow=1;p.priorities.haul=1;p.priorities.mine=2;
    const cell={x:p.x+1,z:p.z};w.jobs=w.jobs.filter(j=>j.x!==cell.x||j.z!==cell.z);w.tiles[cell.z*w.width+cell.x]={terrain:'grass'};
    command({type:'area',action:'growing',from:cell,to:cell});command({type:'growing-policy',zoneId:w.growingZones.at(-1)!.id,plant:'cotton',allowSow:true,allowCut:true});
    w.resources.push({id:w.nextId++,kind:'cotton',...cell,amount:10,growth:1,growthTick:w.tick});
    command({type:'stockpile',enabled:true,x:p.x+1,z:p.z+2,filters:{wood:false,food:false,textile:true}});
  });return w;
}
