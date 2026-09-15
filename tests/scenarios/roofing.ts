import { applyCommand } from '../../src/sim/engine.ts';
import { deconstructionCamp, fixtureBuilding } from './deconstruction.ts';

export function roofTraffic(count:number) {
  const w=deconstructionCamp(count,250);w.tick=2000;
  for(let n=0;n<count;n++) {
    const x=95+n%10*6,z=95+Math.floor(n/10)*6,p=w.pawns[n]!;
    p.x=x-1;p.z=z+1;
    fixtureBuilding(w,'wall',x,z);
    w.resources.push({id:w.nextId++,kind:'tree',x:x+2,z:z+2,amount:12});
    applyCommand(w,{type:'area',action:'build-roof',from:{x:x-2,z:z-2},to:{x:x+2,z:z+2}});
  }
  return w;
}
