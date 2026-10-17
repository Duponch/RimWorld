import { captureAllowedArea,releaseAllowedAreaReturn,allowedAreaOtherActivity } from './allowed-area-state.ts';
import { pawnBody } from './health-rules.ts';
import type { AllowedAreaPolicy } from './allowed-area-state.ts';
import type { NeedContext } from './needs.ts';
import type { Cell,Pawn,World } from './types.ts';
export type AllowedAreaRouteResult={kind:'found';target:Cell;path:Cell[]}|{kind:'deferred'}|{kind:'unreachable'};
export interface AllowedAreaContext extends NeedContext { searchAllowed(policy:AllowedAreaPolicy):AllowedAreaRouteResult }
function available(world:World,pawn:Pawn):boolean {
  return !allowedAreaOtherActivity(pawn)&&(pawn.state==='idle'||pawn.state==='moving'||pawn.state==='hungry')&&!pawn.health?.death&&!pawn.medicalSleep&&!pawn.collapsePending&&!(world.restRules==='legacy'&&pawn.rest===0)&&!(pawn.stun&&(pawn.stun.untilCore>world.tick*10))&&!(pawn.health?.foodPoisoning?.vomit||pawn.health?.cryptosleepSickness?.vomit||pawn.health?.toxicBuildup?.vomit||pawn.health?.toxicBuildup?.vomitRequestedAt!==undefined)&&!pawn.health?.flu?.vomit&&!pawn.health?.immuneDiseases?.malaria?.vomit&&pawnBody(pawn).capacities.moving>0
    &&!world.pawns.some(p=>p.rescue?.phase==='carry'&&p.rescue.patientId===pawn.id)
    &&!world.piles.some(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id)&&!world.packed.some(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id);
}
export function reconcileAllowedAreaReturn(world:World,pawn:Pawn):void {
  const intent=pawn.allowedAreaReturn;if(!intent)return;
  const policy=captureAllowedArea(world,pawn);
  if(!policy||!available(world,pawn)||!policy.has(intent.target.z*world.width+intent.target.x))releaseAllowedAreaReturn(pawn);
}
/** The engine decides whether needs, safety, cargo or service owners take priority. */
export function processReturnToAllowedArea(world:World,pawn:Pawn,context:AllowedAreaContext):boolean {
  const policy=captureAllowedArea(world,pawn);
  if(!policy||!available(world,pawn)){releaseAllowedAreaReturn(pawn);return false;}
  if(pawn.allowedAreaReturn){const target=pawn.allowedAreaReturn.target;
    if(!policy.has(target.z*world.width+target.x)){releaseAllowedAreaReturn(pawn);}
    else if(pawn.x===target.x&&pawn.z===target.z&&(pawn.motion?.end??0)<=world.tick){releaseAllowedAreaReturn(pawn);pawn.state='idle';return false;}
    else {context.move(target,true);return true;}
  }
  if(policy.has(pawn.z*world.width+pawn.x))return false;
  if(pawn.planCooldown>0)return true;
  const route=context.searchAllowed(policy);
  if(route.kind==='deferred')return true;
  if(route.kind==='unreachable'){pawn.planCooldown=20;return true;}
  pawn.allowedAreaReturn={target:route.target};pawn.path=route.path;pawn.state='moving';context.move(route.target,true);return true;
}
