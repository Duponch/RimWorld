import { medicalCamp } from './health.ts';
import { fixtureBuilding } from './deconstruction.ts';
import { startSadWander } from '../../src/sim/mental-break.ts';
import { mentalState } from '../../src/sim/mental-state.ts';
import { applyCommand } from '../../src/sim/engine.ts';
import { isColonist } from '../../src/sim/affiliation.ts';
import type { World } from '../../src/sim/types.ts';

/** Explicit pre-existing low mood exposure, not a claim about a natural camp.
 * Entry/recovery and every subsequent action are performed by the real worker. */
export function mentalCamp():World {
  const w=medicalCamp(),p=w.pawns[0]!;w.rng=1;
  w.tick+=(14-(w.tick+p.id)%15+15)%15; // Eligible check on the first worker tick, before ordinary sleep.
  Object.assign(p,{mood:0,hunger:95,rest:16.5,comfort:50});p.recreation.level=50;p.schedule.fill('anything');p.priorities.gather=1;
  mentalState(p).below=[2100,2100,2100];
  const bed=fixtureBuilding(w,'bed',p.x,p.z+1);p.bedId=bed.id;
  const tree={id:w.nextId++,kind:'tree' as const,x:p.x+5,z:p.z,amount:10};w.resources.push(tree);
  applyCommand(w,{type:'area',action:'chop',from:tree,to:tree});return w;
}

/** Alternate civilian workers enter a crisis; combat and the other workers
 * continue. This stress fixture intentionally starts states, not a frequency audit. */
export function addMentalLoad(w:World):number {
  let count=0;
  w.pawns.filter(p=>isColonist(p)&&!p.draft).forEach((p,i)=>{if(i%2===0&&startSadWander(w,p))count++;});
  return count;
}
