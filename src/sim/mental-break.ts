import { BREAK_MTB_DAYS,finishMentalBreak,mentalState } from './mental-state.ts';
import { breakThresholds,minorBreakThreshold } from './traits.ts';
import { moodFrozen,moodThoughts } from './mood.ts';
import { healthRandom } from './health.ts';
import { interruptDraftWork } from './drafting.ts';
import { collapseFromExhaustion,processNeeds,type NeedContext } from './needs.ts';
import { retryInterruptedCargo } from './interrupted-cargo.ts';
import { isColonist } from './affiliation.ts';
import { canStandAt } from './furniture-travel.ts';
import { hasReachableCell,routeToCell,type Reachability } from './pathfinding.ts';
import { reservedServiceCells } from './service-reservations.ts';
import type { Pawn,World } from './types.ts';

/** One physical break is currently available. Stronger exposure falls back to
 * this minor content; it does not pretend to implement major/extreme behaviours. */
export function startSadWander(world:World,pawn:Pawn):boolean {
  if(!isColonist(pawn)||pawn.state==='downed'||moodFrozen(pawn)||pawn.mental?.crisis)return false;
  const thoughts=moodThoughts(world,pawn).filter(t=>t.offset<0);
  const strongest=Math.min(0,...thoughts.map(t=>t.offset));
  const candidates=thoughts.filter(t=>t.offset<=strongest*.5);
  let roll=healthRandom(world)*candidates.reduce((s,t)=>s-t.offset,0);
  const reason=candidates.find(t=>(roll+=t.offset)<0)?.label;
  delete pawn.draft;delete pawn.shooting;delete pawn.melee;delete pawn.flee;
  interruptDraftWork(world,pawn);
  mentalState(pawn).crisis={kind:'sad-wander',age:0,target:null,waitUntil:world.tick};
  pawn.needCooldown=0;pawn.planCooldown=0;
  world.events.push({tick:world.tick,type:'need',message:`${pawn.name} commence une errance triste.${reason?` Dernière cause : ${reason}.`:''}`});
  if(world.events.length>80)world.events.splice(0,world.events.length-80);
  return true;
}

/** Counters/cooldown are saved; the schedule derives only from tick and ID.
 * No random calls on healthy ordinary actors. */
export function updateMentalBreak(world:World,pawn:Pawn):void {
  let m=pawn.mental;
  if(m)m.catharsis=m.catharsis.filter(t=>t>world.tick);
  if(pawn.state==='dead'){if(m?.crisis)finishMentalBreak(world,pawn,false);return;}
  if(!isColonist(pawn))return;
  if(m?.cooldown&&!moodFrozen(pawn))m.cooldown--;
  if(m?.crisis) {
    if(pawn.state==='downed'||moodFrozen(pawn)){finishMentalBreak(world,pawn);return;}
    if((world.tick+pawn.id)%3===0) {
      m.crisis.age+=30;
      if(m.crisis.age>=60000||m.crisis.age>=40000&&healthRandom(world)<30/(.166*60000)) {
        finishMentalBreak(world,pawn);
        // Recovery ends the crisis job as well. A carried meal stays physical;
        // interruption may retain it until the active edge/ground permits drop.
        interruptDraftWork(world,pawn);
      }
    }
    return;
  }
  if((world.tick+pawn.id)%15!==0||!m&&pawn.mood>=minorBreakThreshold(pawn))return;
  m=mentalState(pawn);
  const thresholds=breakThresholds(pawn);
  for(let i=0;i<3;i++)m.below[i]=pawn.mood<thresholds[i]! ? Math.min(2100,m.below[i]!+150):0;
  if(m.cooldown||pawn.state==='downed'||moodFrozen(pawn))return;
  const level=m.below[2]>2000?2:m.below[1]>2000?1:m.below[0]>2000?0:-1;
  if(level>=0&&healthRandom(world)<150/(BREAK_MTB_DAYS[Math.max(0,level)]!*60000))startSadWander(world,pawn);
}

export function processSadWander(world:World,pawn:Pawn,context:NeedContext,candidatesReach:()=>Reachability|null):void {
  const crisis=pawn.mental?.crisis;if(!crisis)return;
  collapseFromExhaustion(world,pawn,context);
  if(moodFrozen(pawn)){finishMentalBreak(world,pawn);return;}
  retryInterruptedCargo(world,pawn);
  // Retained emergency cargo never doubles as an inventory. Walking may free a
  // legal drop; ordinary needs resume after the real deposit.
  if(!pawn.interruptedCargo&&processNeeds(world,pawn,context)) {
    // A depleted search budget can defer a need without starting it. Keep the
    // current wander route/target together until a real need replaces them.
    if(pawn.need)crisis.target=null;
    if(moodFrozen(pawn))finishMentalBreak(world,pawn);
    return;
  }
  if(crisis.target) {
    if(!canStandAt(world,crisis.target)||reservedServiceCells(world,pawn.id).has(crisis.target.z*world.width+crisis.target.x)) {
      crisis.target=null;pawn.path=[];pawn.state='idle';crisis.waitUntil=world.tick+1;return;
    }
    if(pawn.x===crisis.target.x&&pawn.z===crisis.target.z){crisis.target=null;pawn.path=[];pawn.state='idle';crisis.waitUntil=world.tick+(125+Math.floor(healthRandom(world)*76))/10;return;}
    context.move(crisis.target,true);
    if(pawn.state==='idle'&&!pawn.path.length){crisis.target=null;crisis.waitUntil=world.tick+20;}
    return;
  }
  pawn.state='idle';
  if(world.tick<crisis.waitUntil||pawn.planCooldown>0)return;
  // Pick a reachable stop, not an arbitrary point through solid cells. One
  // synchronous search, bounded local candidates, no per-frame navigation.
  const reach=candidatesReach();if(!reach)return;
  const reserved=reservedServiceCells(world,pawn.id),candidates=[];
  for(let z=Math.max(0,pawn.z-7);z<=Math.min(world.height-1,pawn.z+7);z++)for(let x=Math.max(0,pawn.x-7);x<=Math.min(world.width-1,pawn.x+7);x++) {
    if((x-pawn.x)**2+(z-pawn.z)**2>49||x===pawn.x&&z===pawn.z||reserved.has(z*world.width+x)||!canStandAt(world,{x,z}))continue;
    if(hasReachableCell(reach,z*world.width+x))candidates.push({x,z});
  }
  if(!candidates.length){crisis.waitUntil=world.tick+20;return;}
  const dest=candidates[Math.floor(healthRandom(world)*candidates.length)]!;
  crisis.target={x:dest.x,z:dest.z};pawn.path=routeToCell(world,dest,reach)!;pawn.planCooldown=0;
  context.move(crisis.target,true);
}
