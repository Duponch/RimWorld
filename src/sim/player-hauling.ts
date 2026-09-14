import { validSowingClearance } from './sowing-clearance.ts';
import { planServiceHaul, type ServiceHaulTarget } from './player-service-hauling.ts';
import { candidateAccess } from './candidate-access.ts';
import { asBuilder, constructionHaulPriority, constructionSiteFree, isConstruction } from './construction-rules.ts';
import { CARRY_CAPACITY, JOB_WOOD_COST } from './definitions.ts';
import { storageCapacity } from './ground-placement.ts';
import { withoutQueuedOrder } from './haul-reservations.ts';
import { ITEM_DEFINITIONS } from './items.ts';
import { deliveredStock, reservedDestination, reservedSource } from './materials.ts';
import { blockedCells, routeToJob } from './pathfinding.ts';
import { canReach, destinationCapacity, destinationCell } from './work-planner.ts';
import type { Cell, HaulTask, Pawn, World } from './types.ts';

export type HaulOrderTarget={type:'pile';pileId:number}|{type:'job';jobId:number}|ServiceHaulTarget;
export interface HaulProposal { task?:HaulTask; path?:Cell[]; label:string; reason?:string }
const distance=(a:Cell,b:Cell)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
const same=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;

/** One read-only decision with one shared, resumable access search. No global
 * logistics cursor or per-frame query. A delivery is one trip, not a build chain. */
export function planHaulOrder(world:World,pawn:Pawn,target:HaulOrderTarget):HaulProposal {
  if(target.type==='fuel'||target.type==='clear'||target.type==='clear-sow')return planServiceHaul(world,pawn,target);
  const label=target.type==='pile'?'Transporter vers le stockage':'Livrer les matériaux';
  const no=(reason:string):HaulProposal=>({label,reason});
  if(target.type!=='pile'&&target.type!=='job')return no('Cible de transport invalide.');
  if(target.type==='pile'?!pawn.priorities.haul:!Number.isFinite(constructionHaulPriority(pawn)))return no('Ce travail est désactivé dans le tableau Travail.');
  const source=target.type==='pile'?world.piles.find(p=>p.id===target.pileId):undefined;
  const job=target.type==='job'?world.jobs.find(j=>j.id===target.jobId):undefined;
  if(target.type==='pile'&&source?.owner.type!=='ground')return no('La pile n’est plus au sol.');
  if(target.type==='job'&&(!job||!isConstruction(job)))return no('Chantier introuvable.');
  if(job&&!constructionSiteFree(world,job,pawn.id))return no('Le chantier doit être dégagé avant la livraison.');
  if(job&&JOB_WOOD_COST[job.kind]-deliveredStock(world,job.id).wood-reservedDestination(world,{type:'job',jobId:job.id})<=0)return no('Les matériaux sont déjà livrés ou réservés.');
  const reach=candidateAccess(world,pawn,blockedCells(world),new Set());
  if(job&&!canReach(world,job,reach,false))return no('Aucun accès praticable au chantier.');
  const sources=source?[source]:world.piles.filter(p=>p.owner.type==='ground'&&p.item==='wood');
  let best:{task:HaulTask;source:Cell;rank:number;distance:number;id:number}|undefined;
  for(const pile of sources) {
    if(pile.owner.type!=='ground')continue;
    let available=pile.quantity-reservedSource(world,pile.id);if(available<=0)continue;
    if(!canReach(world,pile.owner,reach,true))continue;
    const sourceZone=world.stockpiles.find(z=>same(z,pile.owner as Cell));
    const excess=sourceZone?Math.max(0,pile.quantity-sourceZone.capacity):0;
    const currentPriority=sourceZone?.filters[pile.kind]&&!excess?sourceZone.priority:0;
    if(!job&&sourceZone?.filters[pile.kind]&&excess)available=Math.min(available,Math.max(0,excess-reservedSource(world,pile.id)));
    const destinations=job?[{destination:{type:'job' as const,jobId:job.id,forConstruction:asBuilder(pawn)},cell:job,rank:0,
      capacity:JOB_WOOD_COST[job.kind]-deliveredStock(world,job.id).wood-reservedDestination(world,{type:'job',jobId:job.id})}]
      :world.stockpiles.filter(z=>z.priority>currentPriority&&!same(z,pile.owner as Cell))
        .map(z=>({destination:{type:'stockpile' as const,stockpileId:z.id},cell:z,rank:-z.priority,capacity:storageCapacity(world,z,pile.item)}));
    for(const dest of destinations) {
      const quantity=Math.min(CARRY_CAPACITY,available,dest.capacity);if(quantity<=0||!canReach(world,dest.cell,reach,!job))continue;
      const cost=distance(pawn,pile.owner)+distance(pile.owner,dest.cell),id=job?pile.id:dest.cell.id;
      if(!best||dest.rank<best.rank||dest.rank===best.rank&&(cost<best.distance||cost===best.distance&&id<best.id))
        best={task:{sourcePileId:pile.id,quantity,phase:'pickup',destination:dest.destination,carryPileId:null},source:pile.owner,rank:dest.rank,distance:cost,id};
    }
  }
  if(!best)return no(job?'Aucun bois disponible et accessible.':'Aucune réserve accessible de meilleure priorité avec une place compatible, ou pile déjà réservée.');
  const path=routeToJob(world,best.source,reach,true);if(!path)return no('Aucun accès praticable à la pile.');
  const item=world.piles.find(p=>p.id===best.task.sourcePileId)!;
  return {task:best.task,path,label:`${label} (${best.task.quantity} ${ITEM_DEFINITIONS[item.item].label})`};
}

/** Own waiting reservation is excluded exactly once, never the rest of its queue. */
export function queuedHaulReason(world:World,task:HaulTask):string|undefined {
  const view=withoutQueuedOrder(world,task),pile=world.piles.find(p=>p.id===task.sourcePileId);
  if(pile?.owner.type!=='ground'||pile.quantity-reservedSource(view,pile.id)<task.quantity)return 'La pile ou sa quantité réservée n’est plus disponible.';
  if(destinationCapacity(view,task.destination,pile.kind,undefined,pile.item)<task.quantity)return 'La destination n’accepte plus la quantité réservée.';
  const destination=task.destination;
  if(!validSowingClearance(world,destination))return 'Culture supprimée ou semis désactivés.';
  if(destination.type==='aside'&&destination.constructionId!==undefined&&!world.jobs.some(j=>j.id===destination.constructionId&&isConstruction(j)))return 'Chantier annulé.';
  const target=destinationCell(world,task.destination);
  if(!target||destination.type!=='fuel'&&same(target,pile.owner))return 'La destination a disparu ou coïncide avec la source.';
}

export function haulOrderCell(world:World,task:HaulTask):Cell|undefined {
  const pile=world.piles.find(p=>p.id===task.sourcePileId);
  return pile?.owner.type==='ground'?pile.owner:undefined;
}
export function startHaulOrder(pawn:Pawn,task:HaulTask,path:Cell[]):void {
  pawn.haul=task;pawn.orders.active='haul';pawn.path=path;pawn.planCooldown=0;
  pawn.state=path.length||pawn.moveCooldown>0?'moving':'working';
}
