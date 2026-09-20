import { isBuildableFloor,isFloorKind } from './flooring.ts';
import { footprintContains } from './definitions.ts';
import type { World } from './types.ts';
export function validateFlooring(w:World,version:number):string[] {
  const errors:string[]=[],plans=new Set<number>();
  for(let i=0;i<w.tiles.length;i++){
    const tile=w.tiles[i]!;if(tile.floor!==undefined&&(version<89||!isFloorKind(tile.floor)||tile.terrain==='water'||tile.terrain==='rock'))errors.push('Invalid constructed floor.');
  }
  for(const job of w.jobs){
    if(job.kind!=='lay-floor'&&job.kind!=='remove-floor'){if(job.floor!==undefined)errors.push('Unexpected floor target.');continue;}
    const index=job.z*w.width+job.x,tile=w.tiles[index];
    if(version<89||!tile||plans.has(index)||job.orientation!==0||job.footprint!=='standard'||job.material!==undefined||job.kind==='lay-floor'&&(!isBuildableFloor(job.floor)||tile.floor!==undefined)||job.kind==='remove-floor'&&(!isFloorKind(job.floor)||tile.floor!==job.floor))errors.push('Invalid floor work.');
    plans.add(index);
    if(job.kind==='lay-floor'&&[...w.structures,...w.jobs].some(s=>s.kind==='grave'&&footprintContains(s,job)))errors.push('Floor would remove a grave terrain support.');
  }
  for(const s of [...w.structures,...(w.packed??[]).map(p=>p.building)])if('floor' in s)errors.push('Floor belongs to terrain, not a structure.');
  return errors;
}
