import { apparelProtection } from './apparel-protection.ts';
import { disturbanceEvents,isLying } from './disturbance.ts';
import { automaticPermission,automaticTarget } from './automatic-combat-state.ts';
import type { shootingQueries } from './shooting.ts';
import { activeThreat,hostileTo,isColonist } from './affiliation.ts';
import { cancelShooting } from './shooting-state.ts';
import { cancelMelee,type MeleeCommand } from './melee-state.ts';
import { interruptDraftWork } from './drafting.ts';
import { carrierOf } from './rescue-state.ts';
import { medicallyStopped } from './health-rules.ts';
import { healthRandom,reconcilePawnHealth,updatePawnHealth } from './health.ts';
import { createMedicalRecord } from './injury-state.ts';
import { chooseMeleeTool,meleeTools,meleeHitChance,meleeDodgeChance } from './melee-statistics.ts';
import { resolveUnarmoredMelee } from './melee-impact.ts';
import { meleeContact,meleePlaces,meleeRoute } from './melee-space.ts';
import { applyBulletStagger } from './stagger.ts';
import { applyMeleeStun,isStunned } from './stun.ts';
import { blockedCells,canStep } from './pathfinding.ts';
import { startTravel } from './movement.ts';
import { learnSkill,XP_SCALE } from './skills.ts';
import type { LightReader } from './light-environment.ts';
import type { NavigationGrid,SearchBudget } from './work-planner.ts';
import type { CommandResult,Pawn,World } from './types.ts';

function targetFor(world:World,pawn:Pawn,carried=(id:number)=>!!carrierOf(world,id)):Pawn|undefined {
  const order=pawn.melee?.order;
  return order?world.pawns.find(p=>p.id===order.targetId&&p.state!=='dead'&&(order.startedDowned||p.state!=='downed')&&!carried(p.id)):undefined;
}
function canFight(world:World,pawn:Pawn,carried=(id:number)=>!!carrierOf(world,id)):boolean {
  return !medicallyStopped(pawn)&&pawn.state!=='sleeping'&&!pawn.need&&!pawn.collapsePending&&!carried(pawn.id);
}
export function applyMeleeCommand(world:World,command:MeleeCommand):CommandResult {
  const refuse=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
  if(!Array.isArray(command.pawnIds)||!command.pawnIds.length||command.pawnIds.some(id=>!Number.isSafeInteger(id))||new Set(command.pawnIds).size!==command.pawnIds.length||!Number.isSafeInteger(command.targetId))return refuse('Ordre de mêlée invalide.');
  const target=world.pawns.find(p=>p.id===command.targetId);
  if(!target||target.state==='dead'||carrierOf(world,target.id))return refuse('Cible humaine indisponible.');
  const plans:{pawn:Pawn;path:Pawn['path']}[]=[],claimed=new Set<number>(),blocked=blockedCells(world);
  for(const id of [...command.pawnIds].sort((a,b)=>a-b)) {
    const pawn=world.pawns.find(p=>p.id===id);
    if(!pawn||!pawn.draft||!isColonist(pawn)||pawn===target||!canFight(world,pawn)||!meleeTools(world,pawn).length)return refuse('Mobilisez un colon éveillé et capable de combattre.');
    const path=meleeRoute(world,pawn,meleePlaces(world,pawn,target,claimed),blocked);
    if(!path)return refuse('Aucune place de mêlée accessible et libre.');
    const end=path.at(-1)??pawn;claimed.add(end.z*world.width+end.x);plans.push({pawn,path});
  }
  for(const {pawn,path} of plans) {
    const strike=pawn.melee?.strike??null;cancelShooting(pawn);interruptDraftWork(world,pawn);
    pawn.melee={order:{targetId:target.id,startedDowned:target.state==='downed'},strike};
    pawn.draft!.target=null;pawn.draft!.queue=[];pawn.draft!.lastActiveTick=world.tick;
    pawn.path=strike||pawn.shooting?.stance?.phase==='cooldown'?[]:path;pawn.state=pawn.path.length||pawn.moveCooldown?'moving':'idle';pawn.planCooldown=0;
  }
  return {ok:true};
}
/** Fixed sentry only: counter an adjacent enemy, no implicit raid pursuit. */
export function startSentryMelee(world:World,pawn:Pawn):boolean {
  if(isColonist(pawn)||!canFight(world,pawn))return false;
  const nearby=world.pawns.filter(p=>hostileTo(pawn,p)&&activeThreat(p)&&Math.abs(p.x-pawn.x)<=1&&Math.abs(p.z-pawn.z)<=1);
  if(!nearby.length)return false;
  const blocked=blockedCells(world,true);
  const target=nearby.filter(p=>hostileTo(pawn,p)&&activeThreat(p)&&meleeContact(world,pawn,p,blocked)).sort((a,b)=>a.id-b.id)[0];
  if(!target)return false;
  cancelShooting(pawn);pawn.path=[];
  pawn.melee={order:{targetId:target.id,startedDowned:false},strike:pawn.melee?.strike??null};return true;
}
/** One Core substep. Return true when medical/ground captures have expired. */
export function advanceMelee(world:World,pawn:Pawn,core:number,contactGrid:()=>Uint8Array,queries:ReturnType<typeof shootingQueries>,disturbance=disturbanceEvents(world)):boolean {
  const m=pawn.melee;if(!m)return false;
  if(medicallyStopped(pawn)){delete pawn.melee;return false;}
  if(m.strike&&core>=m.strike.untilCore)m.strike=null;
  if(!canFight(world,pawn,queries.carried)||(m.order?.auto?(!automaticPermission(pawn,m.order.auto)||!automaticTarget(world,pawn,m.order.targetId)):isColonist(pawn)&&!pawn.draft))cancelMelee(pawn);
  const target=targetFor(world,pawn,queries.carried);
  if(m.order&&!target){cancelMelee(pawn);pawn.path=[];}
  if(!pawn.melee)return false;
  if(!m.order&&!m.strike){delete pawn.melee;return false;}
  if(m.strike||!target||isStunned(pawn,core)||pawn.shooting?.stance?.phase==='cooldown'||(pawn.motion?.end??0)>core/10)return false;
  if(!meleeContact(world,pawn,target,contactGrid()))return false;
  // Contact is logical, as in the reference; captured travel cannot permit the
  // attacker to swing before reaching its own interaction cell.
  const randomState={rng:world.rng},random=()=>healthRandom(randomState);
  const tool=chooseMeleeTool(meleeTools(world,pawn,()=>queries.body(pawn)),random);if(!tool){cancelMelee(pawn);return false;}
  const immobile=isLying(target);
  if(!immobile)learnSkill(pawn.skills.melee,200*(tool.cooldownCore/60)*XP_SCALE);
  const attacker=queries.body(pawn).capacities,defender=queries.body(target).capacities;
  const hit=immobile||random()<meleeHitChance(pawn.skills.melee.level,attacker.sight,attacker.manipulation);
  const dodge=hit&&!immobile&&!target.shooting?.stance&&random()<meleeDodgeChance(target.skills.melee.level,defender.moving,defender.sight);
  const outcome=!hit?'miss':dodge?'dodge':'hit';
  // The recovery exists before reconciliation, so a reaction cannot skip it.
  m.strike={targetId:target.id,atCore:core,untilCore:core+tool.cooldownCore,tool:tool.id,outcome};pawn.path=[];pawn.state='idle';
  let stun=false,injured=false;
  if(outcome==='hit') {
    const damage=Math.max(1,tool.damage*(.8+random()*.4));
    // Advance health first using the same stream before the anatomical transaction.
    world.rng=randomState.rng;if(target.health&&target.health.tick<world.tick)updatePawnHealth(world,target);randomState.rng=world.rng;
    const protection=apparelProtection(world,target,tool.kind==='bite'?'sharp':'blunt',tool.penetration,random);
    const impact=resolveUnarmoredMelee(target.health??createMedicalRecord(world.tick),{damage,kind:tool.kind},random,protection.protect);
    protection.commit();injured=impact.layers.length>0;
    target.health=impact.record;stun=impact.stun;
  }
  world.rng=randomState.rng;
  if(outcome==='hit'){reconcilePawnHealth(world,target);if(injured)disturbance.damage(target,core,immobile);}
  applyBulletStagger(world,target,core,1);if(stun)applyMeleeStun(world,target,core);
  // Being attacked in melee interrupts ranged aiming, including a miss/dodge.
  if(target.shooting?.stance?.phase==='aim')cancelShooting(target);
  pawn.lastAttack={targetId:target.id,atCore:core};
  if(m.order?.auto==='draft'||!targetFor(world,pawn))cancelMelee(pawn);
  return true;
}
export function processMelee(world:World,pawn:Pawn,getBlocked:NavigationGrid,budget:SearchBudget,getLight:LightReader):void {
  const m=pawn.melee!,target=targetFor(world,pawn);if(pawn.draft)pawn.draft.lastActiveTick=world.tick;
  if(!target||!canFight(world,pawn)){cancelMelee(pawn);pawn.path=[];return;}
  if(m.strike||pawn.shooting?.stance?.phase==='cooldown'||isStunned(pawn,world.tick*10)){pawn.path=[];pawn.state='idle';return;}
  if(meleeContact(world,pawn,target,getBlocked())){pawn.path=[];pawn.state='idle';return;}
  if(!isColonist(pawn)&&!pawn.tactics||m.order?.auto==='draft'){cancelMelee(pawn);return;}
  const blocked=getBlocked(),end=pawn.path.at(-1),next=pawn.path[0];
  if(!next||!end||!meleeContact(world,end,target,blocked)||!canStep(world,pawn,next,blocked,new Set())) {
    if(!budget.remaining||pawn.planCooldown)return;
    budget.remaining--;pawn.planCooldown=20;
    const path=meleeRoute(world,pawn,meleePlaces(world,pawn,target),blocked);
    if(!path){cancelMelee(pawn);pawn.path=[];pawn.state='idle';return;}pawn.path=path;
  }
  const step=pawn.path[0];if(step){pawn.state='moving';if(startTravel(world,pawn,step,getLight))pawn.path.shift();}
}
