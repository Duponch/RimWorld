import { deconstructionCamp } from './deconstruction.ts';
import type { Cell,World } from '../../src/sim/types.ts';
import { newDoorState } from '../../src/sim/door-rules.ts';

/** Controlled physical work fixture, no claim of natural colony chronology. */
export function cleanlinessCamp(count=1):World {
  const w=deconstructionCamp(count);w.stockpiles=[];w.growingZones=[];delete w.home;
  for(const p of w.pawns){p.recreation.level=100;p.priorities.clean=3;p.priorities.build=0;p.priorities.craft=0;p.priorities.mine=0;}
  return w;
}
export function enclosedRoom(w:World,origin:Cell,size=5):{inside:Cell;door:Cell;cells:number[]} {
  const door={x:origin.x+Math.floor(size/2),z:origin.z},cells:number[]=[];
  for(let z=origin.z;z<origin.z+size;z++)for(let x=origin.x;x<origin.x+size;x++){
    if(x!==origin.x&&x!==origin.x+size-1&&z!==origin.z&&z!==origin.z+size-1){cells.push(z*w.width+x);continue;}
    const isDoor=x===door.x&&z===door.z;
    w.structures.push({id:w.nextId++,kind:isDoor?'door':'wall',x,z,orientation:0,footprint:'standard',material:'wood',...(isDoor?{door:newDoorState(w.tick)}:{})});
  }
  return {inside:{x:origin.x+1,z:origin.z+1},door,cells};
}
