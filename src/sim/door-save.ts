import { doorOpenness, doorOpenTicks } from './door-rules.ts';
import type { World } from './types.ts';
export function validateDoors(world:World,version:number):string[] {
  const errors:string[]=[];
  for(const s of [...world.structures,...world.jobs]) {
    const d=(s as import('./types.ts').Structure).door;
    if(s.kind==='door'&&s.orientation!==0)errors.push('Door orientation must be automatic.');
    if(s.kind!=='door'||!world.structures.includes(s as import('./types.ts').Structure)||version<34) {
      if(d!==undefined)errors.push('Unexpected door state.');continue;
    }
    if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).length!==7||!['open','holdOpen','forbidden'].every(k=>typeof d[k as keyof typeof d]==='boolean')
      ||!Number.isSafeInteger(d.changedAt)||d.changedAt<0||d.changedAt>world.tick||!Number.isFinite(d.from)||d.from<0||d.from>1
      ||!Number.isSafeInteger(d.lastTouch)||d.lastTouch< -12||d.lastTouch>world.tick
      ||!(d.closeAt===null||Number.isFinite(d.closeAt)&&d.closeAt>=world.tick&&d.closeAt<=world.tick+21)
      ||!d.open&&d.closeAt!==null) {errors.push('Invalid door state.');continue;}
    if(s.orientation!==0||s.material===undefined)errors.push('Door requires an explicit material and automatic orientation.');
    // No new movement enters a closed/incompletely opened door. A later forbid
    // does not invalidate the committed edge; construction protects its corners.
    for(const p of world.pawns)if(p.motion&&p.motion.end>world.tick&&p.x===s.x&&p.z===s.z) {
      if(!d.open||d.changedAt>p.motion.start||d.from+(p.motion.start-d.changedAt)/doorOpenTicks(s)<1-1e-7)errors.push('Travel entered a door before opening.');
    }
    if(!Number.isFinite(doorOpenness(s as import('./types.ts').Structure,world.tick)))errors.push('Invalid door pose.');
  }
  return errors;
}
