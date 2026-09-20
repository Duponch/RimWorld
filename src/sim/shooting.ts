import { huntingPermission } from './hunting-state.ts';
import { weatherShotFactor } from './weather-exposure.ts';
import { friendlyFireFactor } from './game-profile.ts';
import { combatTarget,combatTargetKey,combatTargetSize,hostileTarget,isAnimalTarget } from './combat-target.ts';
import { automaticPermission,automaticTarget } from './automatic-combat-state.ts';
import { cancelMelee } from './melee-state.ts';
import { isStunned } from './stun.ts';
import { assaultTarget,hostileTo,isColonist,distanceSquared } from './affiliation.ts';
import type { CommandResult,Pawn,World } from './types.ts';
import type { ShootingCommand } from './shooting-state.ts';
import { cancelShooting } from './shooting-state.ts';
import { equippedWeapon,isRangedWeaponItem } from './equipment-rules.ts';
import { pawnBody,medicallyStopped } from './health-rules.ts';
import { captureWorldShotGrid } from './combat-world.ts';
import { captureWorldProjectileTargets } from './projectile-world.ts';
import { findShotLine } from './combat-space.ts';
import { shotAim,shotCover } from './combat-report.ts';
import { emitRevolverBullet } from './bullet-emission.ts';
import { registerWorldProjectile } from './projectile-system.ts';
import { CORE_TICKS_PER_LOCAL,rangedWeaponProfile,shootingAccuracy,rangedTimings } from './ranged-statistics.ts';
import { learnSkill,XP_SCALE } from './skills.ts';
import { healthRandom } from './health.ts';
import { captureStandability } from './furniture-travel.ts';

/** Captures are shared only during this synchronous, unchanged decision. */
export function shootingQueries(world:World,readGrid=()=>captureWorldShotGrid(world)) {
  let grid:ReturnType<typeof captureWorldShotGrid>|undefined,targets:ReturnType<typeof captureWorldProjectileTargets>|undefined;
  let stand:ReturnType<typeof captureStandability>|undefined,carried:Set<number>|undefined;
  const bodies=new Map<Pawn,ReturnType<typeof pawnBody>>();
  const body=(p:Pawn)=>{let b=bodies.get(p);if(!b){b=pawnBody(p);bodies.set(p,b);}return b;};
  return {body,carried:(id:number)=>(carried??=new Set(world.pawns.filter(p=>p.rescue?.phase==='carry').map(p=>p.rescue!.patientId))).has(id),grid:()=>grid??=readGrid(),targets:()=>targets??=captureWorldProjectileTargets(world),stands:()=>stand??=captureStandability(world)};
}
type Queries=ReturnType<typeof shootingQueries>;
export function shotPlan(world:World,pawn:Pawn,targetId:number,queries:Queries,automatic=pawn.shooting?.order?.auto?.kind) {
  if(!pawn.draft&&isColonist(pawn)&&automatic!=='response'&&!huntingPermission(world,pawn,targetId)||automatic&&!automaticPermission(pawn,automatic)||medicallyStopped(pawn)||pawn.state==='sleeping'||pawn.need&&automatic!=='response'||pawn.collapsePending||queries.carried(pawn.id))return {reason:'Le tireur doit être mobilisé, éveillé et capable de tirer.'} as const;
  if(!queries.stands()(pawn))return {reason:'Le colon doit terminer le franchissement avant de viser.'} as const;
  const weapon=equippedWeapon(world,pawn);
  if(!weapon?.weapon||!isRangedWeaponItem(weapon.item)||pawn.equipmentDropPending||queries.body(pawn).capacities.manipulation<=0)return {reason:'Aucune arme à distance utilisable en main.'} as const;
  const target=combatTarget(world,targetId);
  if(!target||target.id===pawn.id||target.state==='dead'||queries.carried(targetId))return {reason:'Cible absente ou invalide.'} as const;
  if(hostileTarget(pawn,target)&&target.state!=='downed'&&distanceSquared(pawn,target)<1.421**2)return {reason:'Un adversaire adjacent empêche le tir : utilisez la mêlée.'} as const;
  const profile=rangedWeaponProfile(weapon.item,weapon.weapon.quality)!,line=findShotLine(queries.grid(),pawn,{cell:target,leans:!isAnimalTarget(target)&&!['downed','resting','sleeping'].includes(target.state)},profile.range);
  if(!line.ok)return {reason:line.reason==='range'?'La cible est hors de portée.':'La ligne de tir est bloquée.'} as const;
  return {weapon,target,profile,line} as const;
}
function startAim(world:World,pawn:Pawn,core:number,queries:Queries):void {
  const order=pawn.shooting?.order;if(!order)return;
  if(isStunned(pawn,core)||pawn.melee?.strike||(pawn.motion?.end??0)*CORE_TICKS_PER_LOCAL>core)return;
  const plan=shotPlan(world,pawn,order.targetId,queries);
  if('reason' in plan||plan.weapon.id!==order.weaponId){cancelShooting(pawn);return;}
  pawn.shooting!.stance={phase:'aim',startedAtCore:core,endsAtCore:core+plan.profile.warmupCoreTicks,targetStartedDowned:plan.target.state==='downed',...plan.weapon.item==='bolt-action-rifle'?{weaponItem:'bolt-action-rifle' as const}:{}};
  pawn.state='idle';
}
export function applyShootingCommand(world:World,command:ShootingCommand):CommandResult {
  const reject=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
  if(!Array.isArray(command.pawnIds)||!command.pawnIds.length||command.pawnIds.some(id=>!Number.isSafeInteger(id))||new Set(command.pawnIds).size!==command.pawnIds.length||!Number.isSafeInteger(command.targetId))return reject('Ordre de tir invalide.');
  const queries=shootingQueries(world),plans=[];
  for(const id of [...command.pawnIds].sort((a,b)=>a-b)) {
    const pawn=world.pawns.find(p=>p.id===id);if(!pawn||!pawn.draft)return reject('Mobilisez le tireur.');
    const plan=shotPlan(world,pawn,command.targetId,queries);if('reason' in plan)return reject(`${pawn.name} : ${plan.reason}`);
    plans.push({pawn,plan});
  }
  // Atomic group acceptance. Preserve the captured edge and every cooldown.
  for(const {pawn,plan} of plans) {
    cancelMelee(pawn);const stance=pawn.shooting?.stance;
    pawn.shooting={order:{targetId:command.targetId,weaponId:plan.weapon.id,startedDowned:plan.target.state==='downed'},stance:stance?.phase==='cooldown'?stance:null};
    pawn.draft!.target=null;pawn.draft!.queue=[];pawn.draft!.lastActiveTick=world.tick;pawn.path=[];
    if(!pawn.shooting.stance)startAim(world,pawn,world.tick*CORE_TICKS_PER_LOCAL,queries);
  }
  return {ok:true};
}

/** Core clock is shared with flight. Caller invalidates queries after an impact. */
export function advanceShooter(world:World,pawn:Pawn,core:number,queries:Queries):void {
  const shot=pawn.shooting;if(!shot)return;
  if(medicallyStopped(pawn)||queries.body(pawn).capacities.manipulation===0){delete pawn.shooting;return;}
  if(shot.order){const a=shot.order.auto;if(shot.order.hunt?!huntingPermission(world,pawn,shot.order.targetId):a?(!automaticPermission(pawn,a.kind)||!automaticTarget(world,pawn,shot.order.targetId)||a.kind==='draft'&&pawn.draft?.holdFire||a.kind==='response'&&world.tick>=a.until):!pawn.draft&&isColonist(pawn))cancelShooting(pawn);}
  if(shot.order) {
    const target=combatTarget(world,shot.order!.targetId);
    if(!target||target.state==='dead'||!shot.order.startedDowned&&target.state==='downed'||!isColonist(pawn)&&(!hostileTarget(pawn,target)||isAnimalTarget(target)||!assaultTarget(pawn,target)))cancelShooting(pawn);
    if(!pawn.shooting)return;
  }
  if(pawn.draft)pawn.draft.lastActiveTick=world.tick;
  if(shot.stance?.phase==='cooldown') {
    if(core<shot.stance.endsAtCore)return;
    shot.stance=null;if(shot.order?.auto?.kind==='response'&&shot.order.auto.remaining===0)shot.order=null;if(!shot.order){delete pawn.shooting;return;}
  }
  if(isStunned(pawn,core)||pawn.melee?.strike)return;
  if(!shot.stance){startAim(world,pawn,core,queries);return;}
  if(shot.stance.phase!=='aim'||!shot.order)return;
  const plan=shotPlan(world,pawn,shot.order.targetId,queries);
  if('reason' in plan||plan.weapon.id!==shot.order.weaponId||!shot.stance.targetStartedDowned&&plan.target.state==='downed'){cancelShooting(pawn);return;}
  if(core<shot.stance.endsAtCore)return;
  const {target,weapon,profile,line}=plan,standing=!['sleeping','resting','downed'].includes(target.state),body=queries.body(pawn).capacities;
  const cover=shotCover(queries.grid(),pawn,target,combatTargetKey(target));
  const aim=shotAim({distance:line.distance,pawnAccuracy:shootingAccuracy(pawn.skills.shooting.level,body.sight,body.manipulation).perCell,weaponAccuracy:profile.accuracy,targetSize:combatTargetSize(target),standing,weather:weatherShotFactor(world,pawn,target),blindSmoke:false},cover.passChance);
  const random={rng:world.rng};
  const emission=emitRevolverBullet({grid:queries.grid(),line,origin:{x:pawn.x+.5,z:pawn.z+.5},launcherKey:`pawn:${pawn.id}`,equipmentKey:`pile:${weapon.id}`,target:{key:combatTargetKey(target),cell:target,full:false,canBenefitFromCover:true},aim,cover,profile,canHitOtherPawns:true,preventFriendlyFire:false,coverAnchor:key=>queries.targets().anchor(key)},()=>healthRandom(random));
  registerWorldProjectile(world,emission.flight,profile.quality,{friendlyPawnIds:world.pawns.filter(p=>!hostileTo(pawn,p)).map(p=>p.id),friendlyFireFactor:friendlyFireFactor(world)},random.rng,core,weapon.item as 'revolver'|'bolt-action-rifle');
  // Same projectile rules; only the documented hostile learning rate differs.
  if(target.state!=='downed')learnSkill(pawn.skills.shooting,(hostileTarget(pawn,target)?170:20)*rangedTimings(profile).learningCycleSeconds*XP_SCALE,pawn);
  pawn.lastAttack={targetId:target.id,atCore:core};
  if(shot.order.auto?.kind==='response')shot.order.auto.remaining--;
  if(shot.order.auto?.kind==='draft')shot.order=null;
  shot.stance={phase:'cooldown',startedAtCore:core,endsAtCore:core+profile.cooldownCoreTicks,...weapon.item==='bolt-action-rifle'?{weaponItem:'bolt-action-rifle' as const}:{}};
}

export function startAutonomousShot(world:World,pawn:Pawn,target:Pawn,queries:Queries):boolean {
  if(isColonist(pawn)||!hostileTarget(pawn,target)||!assaultTarget(pawn,target)||pawn.shooting)return false;
  const plan=shotPlan(world,pawn,target.id,queries);if('reason' in plan)return false;
  pawn.path=[];pawn.shooting={order:{targetId:target.id,weaponId:plan.weapon.id,startedDowned:false},stance:null};
  startAim(world,pawn,world.tick*CORE_TICKS_PER_LOCAL,queries);return !!pawn.shooting;
}
