import { workProgress, WORK_FRACTIONS } from './work-progress.ts';
import type { World } from './types.ts';

/** Called after basic entity shapes, before domain validators read new fields. */
export function validateWorkProgress(world:World,version:number):string[] {
  const errors:string[]=[];
  const validRemainder=(r:unknown)=>r===undefined||version>=37&&typeof r==='number'&&Number.isSafeInteger(r)&&r>0&&r<WORK_FRACTIONS;
  for(const p of world.pawns)if(p.need?.kind==='eat'&&p.need.workRemainder!==undefined&&(version<45||!validRemainder(p.need.workRemainder)||p.need.phase!=='ingest'))errors.push('Invalid fractional ingestion.');
  for(const j of world.jobs) {
    if(!validRemainder(j.workRemainder)||!validRemainder(j.clearance?.workRemainder))errors.push('Invalid fractional work.');
    if(j.pickTicks!==undefined&&(version<37||j.kind!=='mine'||!Number.isSafeInteger(j.pickTicks)||j.pickTicks<100||j.pickTicks>(version>=45?25000:125)))errors.push('Invalid captured mining pick duration.');
    if(version<37)continue;
    if(j.kind==='mine'&&workProgress(j)>0&&j.pickTicks===undefined)errors.push('Missing captured pick duration.');
    if(j.workRemainder&&j.construction==='blueprint'&&j.kind!=='install')errors.push('Blueprint already contains fractional work.');
    // V36 admitted pending progress for some families. Preserve valid historical
    // saves; releaseWork resets new interrupted work, independently of validation.
  }
  return errors;
}

/** V36 must have been fully validated. Keep its current stroke at neutral speed. */
export function initializeLightWork(world:World):void {
  for(const j of world.jobs)if(j.kind==='mine'&&j.progress>0)j.pickTicks=100;
  Object.assign(world,{schemaVersion:37});
}
