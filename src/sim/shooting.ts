import { activeThreat,hostileTo,isColonist,distanceSquared } from './affiliation.ts';
import type { CommandResult,Pawn,World } from './types.ts';
import type { ShootingCommand } from './shooting-state.ts';
import { cancelShooting } from './shooting-state.ts';
import { equippedWeapon } from './equipment-rules.ts';
import { pawnBody,medicallyStopped } from './health-rules.ts';
import { carrierOf } from './rescue-state.ts';
import { captureWorldShotGrid } from './combat-world.ts';
import { captureWorldProjectileTargets } from './projectile-world.ts';
import { findShotLine } from './combat-space.ts';
import { shotAim,shotCover } from './combat-report.ts';
import { emitRevolverBullet } from './bullet-emission.ts';
import { registerWorldProjectile } from './projectile-system.ts';
import { CORE_TICKS_PER_LOCAL,revolverProfile,shootingAccuracy,rangedTimings } from './ranged-statistics.ts';
import { learnSkill,XP_SCALE } from './skills.ts';
import { healthRandom } from './health.ts';
import { captureStandability } from './furniture-travel.ts';

/** Captures are shared only during this synchronous, unchanged decision. */
export function shootingQueries(world:World,readGrid=()=>captureWorldShotGrid(world)) {
  let grid:ReturnType<typeof captureWorldShotGrid>|undefined,targets:ReturnType<typeof captureWorldProjectileTargets>|undefined;
  let stand:ReturnType<typeof captureStandability>|undefined;
  return {grid:()=>grid??=readGrid(),targets:()=>targets??=captureWorldProjectileTargets(world),stands:()=>stand??=captureStandability(world)};
}
type Queries=ReturnType<typeof shootingQueries>;
export function shotPlan(world:World,pawn:Pawn,targetId:number,queries:Queries) {
  if(!pawn.draft&&isColonist(pawn)||medicallyStopped(pawn)||pawn.state==='sleeping'||pawn.need||pawn.collapsePending||carrierOf(world,pawn.id))return {reason:'Le tireur doit être mobilisé, éveillé et capable de tirer.'} as const;
  if(!queries.stands()(pawn))return {reason:'Le colon doit terminer le franchissement avant de viser.'} as const;
  const weapon=equippedWeapon(world,pawn);
  if(!weapon?.weapon||weapon.item!=='revolver'||pawn.equipmentDropPending||pawnBody(pawn).capacities.manipulation<=0)return {reason:'Aucun revolver utilisable en main.'} as const;
  const target=world.pawns.find(p=>p.id===targetId);
  if(!target||target.id===pawn.id||target.state==='dead'||carrierOf(world,targetId))return {reason:'Cible humaine absente ou invalide.'} as const;
  if(hostileTo(pawn,target)&&target.state!=='downed'&&distanceSquared(pawn,target)<1.421**2)return {reason:'Un adversaire adjacent empêche le tir. La mêlée reste à développer.'} as const;
  const profile=revolverProfile(weapon.weapon.quality),line=findShotLine(queries.grid(),pawn,{cell:target,leans:!['downed','resting','sleeping'].includes(target.state)},profile.range);
  if(!line.ok)return {reason:line.reason==='range'?'La cible est hors de portée.':'La ligne de tir est bloquée.'} as const;
  return {weapon,target,profile,line} as const;
}
function startAim(world:World,pawn:Pawn,core:number,queries:Queries):void {
  const order=pawn.shooting?.order;if(!order)return;
  if((pawn.motion?.end??0)*CORE_TICKS_PER_LOCAL>core)return;
  const plan=shotPlan(world,pawn,order.targetId,queries);
  if('reason' in plan||plan.weapon.id!==order.weaponId){cancelShooting(pawn);return;}
  pawn.shooting!.stance={phase:'aim',startedAtCore:core,endsAtCore:core+plan.profile.warmupCoreTicks,targetStartedDowned:plan.target.state==='downed'};
  pawn.state='idle';
}
export function applyShootingCommand(world:World,command:ShootingCommand):CommandResult {
  const reject=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
  if(!Array.isArray(command.pawnIds)||!command.pawnIds.length||command.pawnIds.some(id=>!Number.isSafeInteger(id))||new Set(command.pawnIds).size!==command.pawnIds.length||!Number.isSafeInteger(command.targetId))return reject('Ordre de tir invalide.');
  const queries=shootingQueries(world),plans=[];
  for(const id of [...command.pawnIds].sort((a,b)=>a-b)) {
    const pawn=world.pawns.find(p=>p.id===id);if(!pawn)return reject('Tireur introuvable.');
    const plan=shotPlan(world,pawn,command.targetId,queries);if('reason' in plan)return reject(`${pawn.name} : ${plan.reason}`);
    plans.push({pawn,plan});
  }
  // Atomic group acceptance. Preserve the captured edge and every cooldown.
  for(const {pawn,plan} of plans) {
    const stance=pawn.shooting?.stance;
    pawn.shooting={order:{targetId:command.targetId,weaponId:plan.weapon.id,startedDowned:plan.target.state==='downed'},stance:stance?.phase==='cooldown'?stance:null};
    pawn.draft!.target=null;pawn.draft!.queue=[];pawn.draft!.lastActiveTick=world.tick;pawn.path=[];
    if(!pawn.shooting.stance)startAim(world,pawn,world.tick*CORE_TICKS_PER_LOCAL,queries);
  }
  return {ok:true};
}

/** Core clock is shared with flight. Caller invalidates queries after an impact. */
export function advanceShooter(world:World,pawn:Pawn,core:number,queries:Queries):void {
  const shot=pawn.shooting;if(!shot)return;
  if(medicallyStopped(pawn)||pawnBody(pawn).capacities.manipulation===0){delete pawn.shooting;return;}
  if(shot.order&&!pawn.draft&&isColonist(pawn))cancelShooting(pawn);
  if(shot.order) {
    const target=world.pawns.find(p=>p.id===shot.order!.targetId);
    if(!target||target.state==='dead'||!shot.order.startedDowned&&target.state==='downed'||!isColonist(pawn)&&(!activeThreat(target)||!hostileTo(pawn,target)))cancelShooting(pawn);
    if(!pawn.shooting)return;
  }
  if(pawn.draft)pawn.draft.lastActiveTick=world.tick;
  if(shot.stance?.phase==='cooldown') {
    if(core<shot.stance.endsAtCore)return;
    shot.stance=null;if(!shot.order){delete pawn.shooting;return;}
  }
  if(!shot.stance){startAim(world,pawn,core,queries);return;}
  if(shot.stance.phase!=='aim'||!shot.order)return;
  const plan=shotPlan(world,pawn,shot.order.targetId,queries);
  if('reason' in plan||plan.weapon.id!==shot.order.weaponId||!shot.stance.targetStartedDowned&&plan.target.state==='downed'){cancelShooting(pawn);return;}
  if(core<shot.stance.endsAtCore)return;
  const {target,weapon,profile,line}=plan,standing=!['sleeping','resting','downed'].includes(target.state),body=pawnBody(pawn).capacities;
  const cover=shotCover(queries.grid(),pawn,target,`pawn:${target.id}`);
  const aim=shotAim({distance:line.distance,pawnAccuracy:shootingAccuracy(pawn.skills.shooting.level,body.sight,body.manipulation).perCell,weaponAccuracy:profile.accuracy,targetSize:1,standing,weather:1,blindSmoke:false},cover.passChance);
  const random={rng:world.rng};
  const emission=emitRevolverBullet({grid:queries.grid(),line,origin:{x:pawn.x+.5,z:pawn.z+.5},launcherKey:`pawn:${pawn.id}`,equipmentKey:`pile:${weapon.id}`,target:{key:`pawn:${target.id}`,cell:target,full:false,canBenefitFromCover:true},aim,cover,profile,canHitOtherPawns:true,preventFriendlyFire:false,coverAnchor:key=>queries.targets().anchor(key)},()=>healthRandom(random));
  registerWorldProjectile(world,emission.flight,profile.quality,{friendlyPawnIds:world.pawns.filter(p=>!hostileTo(pawn,p)).map(p=>p.id),friendlyFireFactor:.4},random.rng,core);
  // Same projectile rules; only the documented hostile learning rate differs.
  if(target.state!=='downed')learnSkill(pawn.skills.shooting,(hostileTo(pawn,target)?170:20)*rangedTimings(profile).learningCycleSeconds*XP_SCALE);
  shot.stance={phase:'cooldown',startedAtCore:core,endsAtCore:core+profile.cooldownCoreTicks};
}

export function startAutonomousShot(world:World,pawn:Pawn,target:Pawn,queries:Queries):boolean {
  if(isColonist(pawn)||!hostileTo(pawn,target)||!activeThreat(target)||pawn.shooting)return false;
  const plan=shotPlan(world,pawn,target.id,queries);if('reason' in plan)return false;
  pawn.path=[];pawn.shooting={order:{targetId:target.id,weaponId:plan.weapon.id,startedDowned:false},stance:null};
  startAim(world,pawn,world.tick*CORE_TICKS_PER_LOCAL,queries);return !!pawn.shooting;
}
