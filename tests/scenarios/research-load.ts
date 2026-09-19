import { tailoringLoad } from './tailoring-load.ts';
import { applyCommand } from '../../src/sim/engine.ts';
import type { World } from '../../src/sim/types.ts';

/** Mixed load fixture, separate from naturally earned technology in the pilot. */
export function researchLoad(count:number):World {
  const w=tailoringLoad(count);
  for(const [i,p] of w.pawns.entries())if(i%3===0){
    const x=p.x+1,z=p.z,cells=new Set<number>();
    for(let dx=-1;dx<=1;dx++)for(let dz=0;dz<=1;dz++){const index=(z+dz)*w.width+x+dx;cells.add(index);w.tiles[index]={terrain:'grass'};}
    w.jobs=w.jobs.filter(j=>!cells.has(j.z*w.width+j.x));w.structures=w.structures.filter(s=>!cells.has(s.z*w.width+s.x));
    w.resources=w.resources.filter(r=>!cells.has(r.z*w.width+r.x));
    w.structures.push({id:w.nextId++,kind:'research-bench',material:'wood',x,z,orientation:0,footprint:'standard'});
    p.x=x;p.z=z-1;p.schedule.fill('work');for(const k of Object.keys(p.priorities) as Array<keyof typeof p.priorities>)p.priorities[k]=0;p.priorities.research=1;
    p.skills.intellectual={level:0,xp:0,dailyXp:0,passion:0};
  }
  const result=applyCommand(w,{type:'research-project',project:'complex-clothing'});if(!result.ok)throw Error(result.reason);return w;
}
