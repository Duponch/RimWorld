import { candidateAccess } from './candidate-access.ts';
import { planFurnitureTransport } from './furniture-haul-planner.ts';
import { blockedCells, routeToJob, type Reachability } from './pathfinding.ts';
import type { HaulProposal } from './player-hauling.ts';
import type { Job, Pawn, World } from './types.ts';

export function planFurnitureHaulOrder(world:World,pawn:Pawn,id:number,access?:Reachability,budget={pairs:32768},parent?:Job):HaulProposal {
  const label=parent?'Dégager le meuble emballé':'Transporter le meuble vers le stockage';
  const pack=world.packed.find(p=>p.building.id===id);if(pack?.owner.type!=='ground')return {label,reason:'Le meuble n’est plus au sol.'};
  const blocked=blockedCells(world),reach=access??candidateAccess(world,pawn,blocked,new Set());
  const c=planFurnitureTransport(world,pawn,pack,blocked,reach,budget,parent);
  if(!c)return {label,reason:'Transport désactivé, meuble réservé ou aucune destination accessible et compatible.'};
  const path=routeToJob(world,c.target,reach,true);if(!path)return {label,reason:'Aucun accès au meuble.'};
  return {label,path,task:{whole:true,sourcePileId:id,quantity:1,phase:'pickup',carryPileId:null,destination:c.destination}};
}
