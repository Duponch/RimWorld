import type { BedSlot,Cell,Pawn,Structure,World } from './types.ts';
export type { BedSlot } from './types.ts';

const directions:readonly Cell[]=[{x:0,z:1},{x:1,z:0},{x:0,z:-1},{x:-1,z:0}];
const bedKind=(bed:Structure)=>bed.kind==='bed'||bed.kind==='hospital-bed'||bed.kind==='double-bed';
const civil=(pawn:Pawn)=> (pawn.faction??'colony')==='colony'&&!pawn.prisoner&&!pawn.visitor&&!pawn.raid&&!pawn.podRescue&&pawn.state!=='dead';
const same=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;

/** The anchor is head0. A durable slot never follows the rank of its owner. */
export const bedSlotsCount=(bed:Structure):1|2=>bed.kind==='double-bed'?2:1;
export function bedSlotCell(bed:Structure,slot:BedSlot):Cell|undefined {
  if(!bedKind(bed)||(slot!==0&&slot!==1)||slot>=bedSlotsCount(bed))return;
  const orientation=bed.orientation??0;
  if(!Number.isInteger(orientation)||orientation<0||orientation>3)return;
  const side=directions[(orientation+1)%4]!;
  return {x:bed.x+side.x*slot,z:bed.z+side.z*slot};
}
export function bedSlotBodyCenter(bed:Structure,slot:BedSlot):Cell|undefined {
  const head=bedSlotCell(bed,slot);if(!head)return;
  const direction=directions[bed.orientation??0]!;
  return {x:head.x+direction.x*.5,z:head.z+direction.z*.5};
}
export function pawnBedSlot(pawn:Pawn,bed:Structure):BedSlot|undefined {
  if(pawn.bedId!==bed.id||!bedKind(bed))return;
  if(bed.kind!=='double-bed')return pawn.bedSlot===undefined?0:undefined;
  return pawn.bedSlot===0||pawn.bedSlot===1?pawn.bedSlot:undefined;
}
/** The beneficiary, not the carrier, owns a rescue reservation. A person's
 * durable assignment, sleeping need and rescue are the same logical claim. */
export function bedSlotClaimed(world:World,bed:Structure,slot:BedSlot,exceptPawnId?:number):boolean {
  const head=bedSlotCell(bed,slot);if(!head)return true;
  for(const pawn of world.pawns){
    if(pawn.id!==exceptPawnId&&pawn.state!=='dead'){
      if(!bed.medical&&pawnBedSlot(pawn,bed)===slot)return true;
      if(pawn.need?.kind==='sleep'&&pawn.need.bedId===bed.id&&same(pawn.need.target,head))return true;
    }
    const rescue=pawn.rescue;
    if(rescue&&rescue.patientId!==exceptPawnId&&rescue.bedId===bed.id&&(bed.kind==='double-bed'?rescue.bedSlot===slot:slot===0))return true;
  }
  return false;
}
/** Manual assignments do not require a relationship. This rule is only the
 * admission of a new owner by a sleep/patient provider into a shared bed. */
export function civilBedShareAllowed(world:World,bed:Structure,pawn:Pawn):boolean {
  if(bed.kind!=='double-bed'||bed.medical||bed.prisoner||!civil(pawn)||!world.pawns.some(p=>p.id===pawn.id))return false;
  if(pawnBedSlot(pawn,bed)!==undefined)return true;
  const owners=world.pawns.filter(p=>p.bedId===bed.id&&p.state!=='dead');
  if(!owners.length)return true;
  return owners.every(owner=>civil(owner)&&world.relationships?.links.some(link=>
    (link.kind==='lover'||link.kind==='spouse')&&(link.aId===pawn.id&&link.bId===owner.id||link.bId===pawn.id&&link.aId===owner.id)));
}
/** A place proposal, not a navigation/role verdict. Callers retain their
 * historical simple-bed availability/deconstruction/prison guards. */
export function bedSlotForPatient(world:World,bed:Structure,patient:Pawn,carrierId:number):BedSlot|undefined {
  if(!bedKind(bed))return;
  if(world.jobs.some(job=>(job.deconstruction?.structureId??job.furniture?.structureId)===bed.id&&job.reservedBy!==null&&job.reservedBy!==carrierId))return;
  if(bed.kind==='double-bed'){
    if(!civilBedShareAllowed(world,bed,patient)||patient.surgeryRequest)return;
    const owned=pawnBedSlot(patient,bed);
    if(owned!==undefined)return bedSlotClaimed(world,bed,owned,patient.id)?undefined:owned;
    for(const slot of [0,1] as const)if(!bedSlotClaimed(world,bed,slot,patient.id))return slot;
    return;
  }
  if(!!bed.prisoner!==!!patient.prisoner)return;
  return bedSlotClaimed(world,bed,0,patient.id)?undefined:0;
}
export function bedAssignmentReason(world:World,bed:Structure,pawn:Pawn|null,slot:BedSlot):string|undefined {
  if(!bedKind(bed)||!bedSlotCell(bed,slot))return 'Place de lit invalide.';
  if(bed.medical||bed.prisoner)return 'Ce lit ne permet pas une affectation civile.';
  if(bed.kind==='double-bed'&&pawn&&(!civil(pawn)||!world.pawns.some(p=>p.id===pawn.id)))return 'Cette place nécessite un colon libre présent.';
  if(pawn?.state==='dead')return 'Ce colon est décédé.';
}
