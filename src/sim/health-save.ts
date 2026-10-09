import { medicalStatus } from './injury-state.ts';
import { pawnBody } from './health-rules.ts';
import { validAnesthetic } from './anesthetic.ts';
import { hasArtificialPartData } from './artificial-parts-save.ts';
import { validateMedicalRecord } from './injury-validation.ts';
import { captureHumanOwners } from './human-owners.ts';
import type { Pawn,World } from './types.ts';

/** New artificial anatomy uses the shared medical validator at its real owner
 * clock. Historical records keep the existing sparse transport path. */
export function validArtificialPartTransport(pawn:Pawn,version:number,clock:number):boolean {
  const record=pawn.health;if(!hasArtificialPartData(record))return true;
  if(!record||record.body!==undefined||validateMedicalRecord(record,true,true,true,true,false,false,true,true,true,true,true,version,version>=127)!==null
    ||record.tick>clock||record.death?.tick!==undefined&&record.death.tick>clock)return false;
  const status=medicalStatus(record);
  return status==='mobile'?pawn.state!=='dead'&&pawn.state!=='downed':pawn.state===status;
}

export function validArtificialPartsWorldTransport(world:World,version:number=world.schemaVersion):boolean {
  try {
    const candidates:Pawn[]=[...world.pawns];
    for(const owner of [world.scout,world.commercialTrip])if(owner&&'pawn' in owner)candidates.push(owner.pawn);
    if(world.group&&'members' in world.group)candidates.push(...world.group.members);
    candidates.push(...(world.groupLosses??[]).map(loss=>loss.pawn));
    for(const records of [world.visitors?.departed??[],world.podRescues?.departed??[]])candidates.push(...records.map(d=>d.pawn));
    if(!candidates.some(p=>hasArtificialPartData(p.health)))return true;
    const capture=captureHumanOwners(world);
    return capture.pawnOwners.every(slot=>validArtificialPartTransport(slot.pawn!,version,slot.validationTick));
  }catch{return false;}
}

/** Called after the isolated records and ordinary pawn shapes are validated. */
export function validatePawnHealth(world:World):string[] {
  const errors:string[]=[];
  for(const p of world.pawns) {
    if(p.medicalSleep&&((p.state!=='downed'&&p.state!=='resting')||p.moveCooldown>0))errors.push('Invalid medical sleep posture.');
    const h=p.health;
    if(!h){if(p.state==='downed'||p.state==='dead')errors.push('Medical state without a medical record.');continue;}
    if(!validArtificialPartTransport(p,world.schemaVersion,world.tick))errors.push('Invalid or future artificial part anatomy.');
    if(!validAnesthetic(h.anesthetic,h.tick,world.schemaVersion>=179,p.id%20))errors.push('Anesthetic cadence does not match its owner.');
    if(h.death?h.tick>world.tick:h.tick!==world.tick)errors.push('Medical clock does not match the world.');
    const vomit=h.foodPoisoning?.vomit;
    if(vomit&&(vomit.cell.x>=world.width||vomit.cell.z>=world.height))errors.push('Vomiting target is outside the map.');
    const fluVomit=h.flu?.vomit;
    if(fluVomit&&(fluVomit.cell.x>=world.width||fluVomit.cell.z>=world.height))errors.push('Flu vomiting target is outside the map.');
    const malariaVomit=h.immuneDiseases?.malaria?.vomit;
    if(malariaVomit&&(malariaVomit.cell.x>=world.width||malariaVomit.cell.z>=world.height))errors.push('Malaria vomiting target is outside the map.');
    if(malariaVomit&&(vomit||fluVomit))errors.push('Malaria vomiting conflicts with another episode owner.');
    const status=medicalStatus(h),stopped=status!=='mobile';
    if(stopped?p.state!==status:p.state==='downed'||p.state==='dead')errors.push('Inconsistent medical state.');
    if((stopped||pawnBody(p).capacities.manipulation===0)&&(p.firefighting||p.hunting||p.research||p.equipmentTask||p.jobId!==null||p.ward||p.feed||p.tend||p.surgery||p.rescue||p.haul||p.cooking||p.orders.active!==null||p.orders.queue.length||p.priorityWork))errors.push('Incapacitated pawn still owns work.');
    if(stopped&&(p.heatRefuge||p.path.length||p.recreation.task||p.transitExit||p.collapsePending||p.restZeroTicks||p.need&&(status==='dead'||p.need.kind!=='sleep'||p.need.phase!=='sleep'||p.need.bedId===null)))errors.push('Invalid incapacitated activity.');
  }
  return errors;
}
