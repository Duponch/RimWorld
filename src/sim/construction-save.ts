import { containsCell, isConstruction } from './construction-rules.ts';
import { clearingDuration } from './gathering.ts';
import type { World } from './types.ts';

export function initializeConstruction(world:World):void {
  Object.assign(world,{schemaVersion:16});
  for(const job of world.jobs)if(isConstruction(job))job.construction=job.escrow.wood>0||job.progress>0?'frame':'blueprint';
}
/** Called after the JSON structures and coordinates have been checked. */
export function validateConstruction(world:World,version:number):string[] {
  const errors:string[]=[];
  for(const job of world.jobs) {
    if(version<16){if(job.construction!==undefined||job.clearance!==undefined)errors.push('Legacy save contains construction phases.');continue;}
    if(isConstruction(job)?!['blueprint','frame'].includes(job.construction!):job.construction!==undefined||job.clearance!==undefined)errors.push('Invalid construction phase.');
    if(job.construction==='blueprint'&&(job.escrow.wood!==0||job.kind!=='install'&&job.progress!==0))errors.push('Blueprint already contains materials or building work.');
    if(job.clearance!==undefined) {
      const c=job.clearance,resource=world.resources.find(r=>r.id===c?.resourceId);
      if(!c||typeof c!=='object'||!Number.isInteger(c.resourceId)||!Number.isInteger(c.progress)||c.progress<0||!resource||resource.kind==='rock'||c.progress>=clearingDuration(resource)||!containsCell(job,resource)||job.reservedBy===null)errors.push('Invalid construction plant clearing.');
    }
  }
  for(const pawn of world.pawns) {
    const d=pawn.haul?.destination;if(!d)continue;
    if('forConstruction' in d&&(version<16||typeof d.forConstruction!=='boolean'||d.type!=='job'&&d.type!=='aside'))errors.push('Invalid construction hauling work.');
    if('constructionId' in d&&(version<16||d.type!=='aside'||!Number.isInteger(d.constructionId)||!world.jobs.some(j=>j.id===d.constructionId&&isConstruction(j))))errors.push('Invalid construction clearing reference.');
    if(d.type==='aside'&&d.forConstruction&&d.constructionId===undefined)errors.push('Clearing has no construction intent.');
  }
  return errors;
}
