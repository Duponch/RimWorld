import { stonecuttingCamp } from './stonecutting.ts';
import { newDoorState } from '../../src/sim/door-rules.ts';
import { newCampfireFuel } from '../../src/sim/fuel.ts';
import type { World } from '../../src/sim/types.ts';

/** One small workshop; environment fixture, not an organically built colony. */
export function workplaceCamp():World {
  const w=stonecuttingCamp(1,32);w.tick=3000;
  for(let x=1;x<=7;x++)for(const z of [1,7])w.structures.push({id:w.nextId++,kind:'wall',x,z,orientation:0,footprint:'standard'});
  for(let z=2;z<7;z++)for(const x of [1,7])w.structures.push({id:w.nextId++,kind:'wall',x,z,orientation:0,footprint:'standard'});
  const door=w.structures.find(s=>s.x===4&&s.z===1)!;door.kind='door';door.material='wood';door.door=newDoorState(w.tick);
  const constructed:number[]=[];for(let z=2;z<7;z++)for(let x=2;x<7;x++)constructed.push(z*w.width+x);
  w.roofing={constructed,build:[],remove:[],cursor:0};return w;
}
export function fixtureFire(w:World,x=6,z=4) {
  const fire={id:w.nextId++,kind:'campfire' as const,x,z,orientation:0 as const,footprint:'standard' as const,fuel:newCampfireFuel(),bills:[]};
  w.structures.push(fire);return fire;
}
