import { isBedKind } from './bed-kinds.ts';
import { deconstructionReserved } from './deconstruction-rules.ts';
import { interruptWork } from './interrupted-cargo.ts';
import { releaseRescue } from './rescue-state.ts';
import { prisonBedValid } from './prison-space.ts';
import type { CommandResult,Pawn,Structure,World } from './types.ts';

/** Keep role priority separate from bed type: a hospital bed switched to an
 * ordinary role remains an ordinary destination. */
export const medicalBedPreference=(bed:Structure):number=>bed.medical?(bed.kind==='hospital-bed'?0:1):2;

export type MedicalBedCommand={type:'medical-bed';bedId:number;enabled:boolean};
export function rescueBedAvailable(world:World,bed:Structure,patient:Pawn,carrierId:number,capture=false):boolean {
  return isBedKind(bed.kind)&&!deconstructionReserved(world,bed.id,carrierId)
    &&!!bed.prisoner===(!!patient.prisoner||capture)&&(!bed.prisoner||prisonBedValid(world,bed))
    &&!world.pawns.some(p=>p.id!==patient.id&&(p.need?.kind==='sleep'&&p.need.bedId===bed.id||!bed.medical&&p.bedId===bed.id))
    &&!world.pawns.some(p=>p.id!==carrierId&&p.rescue?.bedId===bed.id);
}
export function applyMedicalBed(world:World,command:MedicalBedCommand):CommandResult {
  const bed=world.structures.find(s=>s.id===command.bedId&&isBedKind(s.kind));
  if(!bed||typeof command.enabled!=='boolean')return {ok:false,code:'invalid-command',reason:'Lit ou usage médical invalide.'};
  if(!!bed.medical===command.enabled)return {ok:true};
  if(command.enabled)bed.medical=true;else delete bed.medical;
  // Core changing the role removes durable owners. A patient already lying in
  // the bed keeps its actual use; returning to normal claims it for that patient.
  for(const p of world.pawns){
    if(p.bedId===bed.id)p.bedId=null;
    if(p.need?.kind==='sleep'&&p.need.bedId===bed.id){
      if(p.state==='downed'&&p.need.phase==='sleep'){if(!bed.medical)p.bedId=bed.id;}
      else interruptWork(world,p);
    }
  }
  for(const p of world.pawns)if(p.rescue?.bedId===bed.id){releaseRescue(world,p);p.path=[];p.orders.active=null;p.state='idle';p.planCooldown=0;}
  for(const p of world.pawns)p.planCooldown=0;
  return {ok:true};
}
