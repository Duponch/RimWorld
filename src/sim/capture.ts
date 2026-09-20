import { factionOf,isColonist } from './affiliation.ts';
import { medicalWorkRefusal } from './health-rules.ts';
import { rescueBedAvailable } from './medical-beds.ts';
import { carrierOf,rescueClaim } from './rescue-state.ts';
import { startRescue } from './rescue.ts';
import { blockedCells,reachableCells,routeToCell,type Reachability } from './pathfinding.ts';
import { clearQueuedOrders } from './player-orders.ts';
import { planCommandDrops,releaseWork } from './work-release.ts';
import { dropRetainingIdentity } from './ground-placement.ts';
import { createPrisonerState } from './prisoner-state.ts';
import type { Cell,CommandResult,Pawn,World } from './types.ts';

export const canCapturePatient=(p:Pawn):boolean=>factionOf(p)==='outlaws'&&!p.prisoner&&p.state==='downed';
export function captureReason(world:World,actor:Pawn,patient:Pawn|undefined,accepted=false):string|undefined {
  return !isColonist(actor)||actor.prisoner?'Seul un colon libre peut capturer.'
    :actor.draft?'Démobilisez ce colon avant la capture.'
    :medicalWorkRefusal(actor)??(actor.mental?.crisis?'Ce colon est en crise mentale.'
    :carrierOf(world,actor.id)?'Ce colon est transporté.'
    :!accepted&&actor.interruptedCargo?'La cargaison doit être déposée avant la capture.'
    :!patient||patient===actor||!canCapturePatient(patient)&&!(accepted&&actor.rescue?.capture&&actor.rescue.phase==='carry'&&actor.rescue.patientId===patient.id&&factionOf(patient)==='outlaws'&&!patient.prisoner&&patient.state!=='dead')?'Choisissez un assaillant vivant à terre.'
    :rescueClaim(world,patient.id,actor.id)?'Une autre personne a réservé ce transport.':undefined);
}
export function captureProposal(world:World,actor:Pawn,patient:Pawn,reach:Reachability):{patientId:number;bedId:number;path:Cell[]}|undefined {
  if(captureReason(world,actor,patient))return;
  const path=routeToCell(world,patient,reach);if(!path)return;
  const beds=world.structures.filter(b=>rescueBedAvailable(world,b,patient,actor.id,true)).sort((a,b)=>
    Number(!!b.medical)-Number(!!a.medical)||(a.x-patient.x)**2+(a.z-patient.z)**2-(b.x-patient.x)**2-(b.z-patient.z)**2||a.id-b.id);
  for(const bed of beds)if(routeToCell(world,bed,reach))return {patientId:patient.id,bedId:bed.id,path};
}
export function applyCapture(world:World,command:{pawnId:number;patientId:number;queue:boolean}):CommandResult {
  const actor=world.pawns.find(p=>p.id===command.pawnId),patient=world.pawns.find(p=>p.id===command.patientId);
  const fail=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
  if(!actor||!patient||typeof command.queue!=='boolean')return fail('Colon ou cible introuvable.');
  if(command.queue)return fail('La capture directe ne peut pas encore être ajoutée à une file.');
  const reason=captureReason(world,actor,patient);if(reason)return fail(reason);
  const proposal=captureProposal(world,actor,patient,reachableCells(world,actor,blockedCells(world),new Set()));
  if(!proposal)return fail('Il faut un lit de prison libre dans une pièce fermée et un trajet praticable.');
  const drops=planCommandDrops(world,{type:'order-capture',...command});
  if(!drops||!releaseWork(world,actor,drops))return fail('Pas de place pour déposer la cargaison avant la capture.');
  clearQueuedOrders(world,actor);delete actor.priorityWork;
  startRescue(world,actor,proposal,true,true);return {ok:true};
}
/** All possessions are preflighted at the actual destination before the status
 * transition. A full floor postpones capture without changing identity or RNG. */
export function completeCapture(world:World,patient:Pawn):boolean {
  if(patient.prisoner)return true;
  const held=world.piles.filter(p=>(p.owner.type==='pawn'||p.owner.type==='equipment')&&p.owner.pawnId===patient.id);
  const shadow={...world,piles:world.piles.map(p=>({...p,owner:{...p.owner}})),packed:world.packed.map(p=>({...p,owner:{...p.owner}}))};
  const placements=new Map<number,Cell>();
  for(const item of held){const copy=shadow.piles.find(p=>p.id===item.id)!;if(!dropRetainingIdentity(shadow,copy,patient)||copy.owner.type!=='ground')return false;placements.set(item.id,{x:copy.owner.x,z:copy.owner.z});}
  const drops=planCommandDrops(shadow,{type:'clear-orders',pawnId:patient.id});if(!drops)return false;
  // Use the same preflighted cells for every temporary/equipment owner.
  for(const [id,cell] of placements)drops.set(id,cell);
  if(!releaseWork(world,patient,drops))return false;
  for(const item of held)item.owner={type:'ground',...placements.get(item.id)!};
  clearQueuedOrders(world,patient);delete patient.priorityWork;delete patient.draft;delete patient.flee;delete patient.equipmentDropPending;
  patient.prisoner=createPrisonerState(world,patient);patient.bedId=null;
  if(patient.raid){patient.raid.goal=null;patient.raid.exiting=true;}
  return true;
}
