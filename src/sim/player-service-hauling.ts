import { candidateAccess } from './candidate-access.ts';
import { asBuilder, constructionHaulPriority, constructionObstruction, isConstruction } from './construction-rules.ts';
import { growingJobValid } from './farming.ts';
import { CARRY_CAPACITY } from './definitions.ts';
import { campfire, fuelCapacity, fuelStationReserved } from './fuel.ts';
import { findAsideDestination } from './haul-aside.ts';
import { reservedSource } from './materials.ts';
import { blockedCells, routeToJob } from './pathfinding.ts';
import { canReach } from './work-planner.ts';
import type { HaulProposal } from './player-hauling.ts';
import type { Cell, HaulDestination, Pawn, World } from './types.ts';

export type ServiceHaulTarget={type:'fuel';structureId:number}|{type:'clear';jobId:number}|{type:'clear-sow';jobId:number};
/** Contextual sub-jobs reuse the ordinary physical transport executor. */
export function planServiceHaul(world:World,pawn:Pawn,target:ServiceHaulTarget):HaulProposal {
  const label=target.type==='fuel'?'Ravitailler le feu':target.type==='clear-sow'?'Dégager avant de semer':'Dégager le chantier';
  const no=(reason:string):HaulProposal=>({label,reason});
  if(target.type==='fuel'?!pawn.priorities.haul:target.type==='clear-sow'?!pawn.priorities.grow:!Number.isFinite(constructionHaulPriority(pawn)))return no('Ce travail est désactivé dans le tableau Travail.');
  const job=target.type!=='fuel'?world.jobs.find(j=>j.id===target.jobId):undefined;
  const fire=target.type==='fuel'?campfire(world,target.structureId):undefined;
  if(target.type==='clear'&&(!job||!isConstruction(job)))return no('Chantier introuvable.');
  if(target.type==='clear-sow'&&(!job||job.kind!=='sow'||!growingJobValid(world,job)))return no('Le semis n’est plus autorisé sur cette cellule.');
  if(job?.reservedBy!==undefined&&job.reservedBy!==null)return no('Chantier déjà réservé.');
  const obstacle=job?constructionObstruction(world,job):undefined;
  if(obstacle?.plant)return no('La plante doit être coupée avant le transport.');
  if(job&&!obstacle?.pile)return no('Aucune pile à dégager.');
  if(target.type==='fuel'&&!fire?.fuel)return no('Feu introuvable.');
  if(fire&&fuelStationReserved(world,fire.id))return no('Feu réservé pour la cuisine ou un ravitaillement.');
  const capacity=fire?fuelCapacity(world,fire.id,undefined,true):CARRY_CAPACITY;
  if(!capacity)return no('Le feu ne peut pas encore recevoir une unité entière de bois.');
  const blocked=blockedCells(world),reach=candidateAccess(world,pawn,blocked,new Set());
  if(fire&&!canReach(world,fire,reach,true))return no('Aucun accès praticable au feu.');
  const sources=obstacle?.pile?[obstacle.pile]:world.piles.filter(p=>p.item==='wood'&&p.owner.type==='ground');
  let best:{source:Cell;id:number;quantity:number;distance:number;destination:HaulDestination}|undefined;
  for(const pile of sources) {
    if(pile.owner.type!=='ground')continue;
    const reserved=reservedSource(world,pile.id);
    // Clearing owns the obstructing pile, including trips smaller than a stack.
    if(job&&reserved>0)continue;
    const quantity=Math.min(CARRY_CAPACITY,capacity,pile.quantity-reserved);if(quantity<=0)continue;
    if(!canReach(world,pile.owner,reach,true))continue;
    const aside=job?findAsideDestination(world,pile.owner,pile.item,quantity,blocked,{pairs:32768}):null;
    if(job&&!aside)return no('Aucune cellule proche accessible pour déposer la pile.');
    const destination:HaulDestination=fire?{type:'fuel',structureId:fire.id,forced:true}:target.type==='clear-sow'?{...aside!,growingZoneId:job!.growingZoneId,sowCell:{x:job!.x,z:job!.z}}:{...aside!,constructionId:job!.id,forConstruction:asBuilder(pawn)};
    const distance=Math.abs(pawn.x-pile.owner.x)+Math.abs(pawn.z-pile.owner.z);
    if(!best||distance<best.distance||distance===best.distance&&pile.id<best.id)best={source:pile.owner,id:pile.id,quantity,distance,destination};
  }
  if(!best)return no(job?'La pile est déjà réservée ou inaccessible.':'Aucun bois disponible et accessible.');
  const path=routeToJob(world,best.source,reach,true);if(!path)return no('Aucun accès praticable à la pile.');
  return {label:`${label} (${best.quantity} unités)`,path,task:{sourcePileId:best.id,quantity:best.quantity,phase:'pickup',carryPileId:null,destination:best.destination}};
}
