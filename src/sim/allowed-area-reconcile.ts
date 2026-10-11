import { allowedAreaAllows,allowedAreaWorkAllowed, captureAllowedArea, releaseAllowedAreaReturn } from './allowed-area-state.ts';
import { allowedAreaServicesAllowed } from './allowed-area-services.ts';
import { reconcileAllowedAreaReturn } from './allowed-area-navigation.ts';
import { clearQueuedOrders, reconcileOrders } from './player-orders.ts';
import { interruptWork } from './interrupted-cargo.ts';
import { planPawnDrops, releaseWork, type DropPlan } from './work-release.ts';
import type { Pawn, World } from './types.ts';

interface AreaInterruptionPlan { ids:ReadonlySet<number>; drops:DropPlan }
const admissible=(world:World,pawn:Pawn)=>{
  const rescue=pawn.rescue;
  if(rescue?.phase==='approach'&&(rescue.capture||rescue.arrest)){
    const patient=world.pawns.find(p=>p.id===rescue.patientId);if(patient&&!allowedAreaAllows(world,pawn,patient))return false;
  }
  if(rescue?.release){
    const patient=world.pawns.find(p=>p.id===rescue.patientId);
    if(!allowedAreaAllows(world,pawn,rescue.release.drop)||rescue.phase==='approach'&&patient&&!allowedAreaAllows(world,pawn,patient))return false;
  }
  return allowedAreaWorkAllowed(world,pawn)&&allowedAreaServicesAllowed(world,pawn);
};

/** Inspect the unpublished future policy, but plan physical drops against the
 * current owners together so two interrupted carriers cannot choose one cell. */
export function preflightAllowedAreaChange(current:World,next:World,affected:readonly Pawn[]):false|AreaInterruptionPlan {
  const ids=new Set<number>();
  for(const pawn of affected){const future=next.pawns.find(p=>p.id===pawn.id);if(future&&!admissible(next,future))ids.add(pawn.id);}
  const drops=planPawnDrops(current,ids);return drops?{ids,drops}:false;
}
export function commitAllowedAreaChange(world:World,affected:readonly Pawn[],plan:unknown):void {
  const prepared=plan as AreaInterruptionPlan|undefined;
  for(const pawn of affected){
    if(!world.pawns.includes(pawn))continue;
    releaseAllowedAreaReturn(pawn);
    if(prepared?.ids.has(pawn.id)){
      clearQueuedOrders(world,pawn);delete pawn.priorityWork;
      // Every temporary owner was admitted by the combined preflight.
      if(!releaseWork(world,pawn,prepared.drops))interruptWork(world,pawn);
    }else pawn.path=[];
    pawn.planCooldown=0;pawn.needCooldown=0;
  }
  reconcileOrders(world);
}
/** Recheck before the next real act, without treating a corridor outside the
 * area as an invalid target. Emergency drops retain their existing owners. */
export function reconcileAllowedAreaPawn(world:World,pawn:Pawn):void {
  if(!pawn.allowedAreaId&&!pawn.allowedAreaReturn)return;
  reconcileAllowedAreaReturn(world,pawn);
  if(captureAllowedArea(world,pawn)&&!admissible(world,pawn))interruptWork(world,pawn);
}
export function reconcileAllowedAreas(world:World):void {
  if(!world.allowedAreas?.length&&!world.pawns.some(p=>p.allowedAreaReturn))return;
  for(const pawn of world.pawns)reconcileAllowedAreaPawn(world,pawn);
}
