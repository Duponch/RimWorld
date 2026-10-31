import {hasTravellingCargo} from './interrupted-cargo.ts';
import {commitDrop,planSelectedDrops,releaseAssignments,releaseWork} from './work-release.ts';
import {releaseStructureMelee} from './melee-state.ts';
import {refreshStock} from './materials.ts';
import type {Structure,World} from './types.ts';

export type ShipWorkDraftRetirement298={ok:true}|{ok:false;reason:string};

/** PRIVATE OWNED DRAFT ONLY. A refusal may follow draft writes: discard the
 * whole projection. This is neither a real transaction nor launch authority.
 * The caller owns part removal, other spatial cleanup and guarded adoption. */
export function retireShipWorkDraft298(view:World,parts:readonly Structure[]):ShipWorkDraftRetirement298 {
 const partIds=new Set(parts.map(s=>s.id)),partRefs=new Set(parts),jobIds=new Set<number>();
 const retiredJobs=new Map<number,World['jobs'][number]>();
 for(const j of view.jobs)if(partIds.has(j.repair?.structureId??-1)||partIds.has(j.fixBreakdown?.structureId??-1)
  ||partIds.has(j.deconstruction?.structureId??-1)||partIds.has(j.furniture?.structureId??-1)||partIds.has(j.flick?.structureId??-1)){
  jobIds.add(j.id);retiredJobs.set(j.id,j);
 }
 const affected=view.pawns.filter(p=>{
  const h=p.haul;
  return p.jobId!==null&&jobIds.has(p.jobId)||partIds.has(p.research?.stationId??-1)||partIds.has(p.cooking?.stationId??-1)
   ||partIds.has(p.brewing?.barrelId??-1)||h&&(h.whole&&partIds.has(h.sourcePileId)
    ||(h.destination.type==='fuel'||h.destination.type==='turret'||h.destination.type==='fermenting-barrel')&&partIds.has(h.destination.structureId)
    ||h.destination.type==='job'&&jobIds.has(h.destination.jobId))
   ||p.need?.kind==='sleep'&&partIds.has(p.need.bedId??-1)||partIds.has(p.coupleTask285?.bedId??-1)
   ||partIds.has(p.recreation.task?.buildingId??-1)||partIds.has(p.recreation.task?.seatId??-1)
   ||partIds.has(p.rescue?.bedId??-1)||partIds.has(p.shipCasketTask277?.casketId??-1);
 });
 const travelling=new Set(affected.filter(p=>hasTravellingCargo(view,p)).map(p=>p.id));
 const immediate=new Set(affected.filter(p=>!travelling.has(p.id)).map(p=>p.id));
 // Placement only: the parts' cells are about to become free. The existing
 // planner shadows all pile/pack owners and preserves their exact identities.
 const placement={...view,structures:view.structures.filter(s=>!partRefs.has(s))};
 const drops=planSelectedDrops(placement,jobIds,immediate);
 if(!drops)return {ok:false,reason:'Released work cargo has no actual ground placement.'};
 for(const pile of view.piles)if(pile.owner.type==='job'&&jobIds.has(pile.owner.jobId)){
  const job=retiredJobs.get(pile.owner.jobId)!;
  if(!commitDrop(view,pile,job,drops))return {ok:false,reason:'Prepared delivered work cargo changed.'};
 }
 for(const p of affected){
  delete p.priorityWork;
  if(travelling.has(p.id)){
   // Existing forced-interruption ownership branch, with unrelated queued
   // orders retained. Neither the captured edge nor its cargo is rewritten.
   releaseAssignments(view,p);p.interruptedCargo=true;p.planCooldown=0;
  }else if(!releaseWork(view,p,drops))return {ok:false,reason:'Prepared remaining worker release changed.'};
 }
 view.jobs=view.jobs.filter(j=>!jobIds.has(j.id));
 for(const p of view.pawns){
  p.orders.queue=p.orders.queue.filter(o=>typeof o!=='number'||!jobIds.has(o));
  if(partIds.has(p.bedId??-1)){p.bedId=null;delete p.bedSlot;}
  if(p.need?.kind==='eat'&&partIds.has(p.need.dining?.tableId??-1))p.need.dining!.tableId=null;
 }
 for(const a of view.wildlife?.animals??[])if(partIds.has(a.manhunter?.door?.targetId??-1)&&a.manhunter)delete a.manhunter.door;
 for(const s of parts)releaseStructureMelee(view,s.id);
 refreshStock(view);
 return {ok:true};
}
