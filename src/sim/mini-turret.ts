import { distanceSquared,factionOf,factionRelation } from './affiliation.ts';
import { prisonBreakActive } from './prison-break-state.ts';
import { isAnimalTarget,isPawnTarget,isMechanoidTarget,combatTargetKey,type LivingTarget } from './combat-target.ts';
import { animalBodySize } from './animal-life.ts';
import { findShotLine,type ShotGrid,type ShotLine } from './combat-space.ts';
import { shotAim,shotCover } from './combat-report.ts';
import { emitRevolverBullet } from './bullet-emission.ts';
import { registerWorldProjectile } from './projectile-system.ts';
import { friendlyFireFactor } from './game-profile.ts';
import { healthRandom } from './health.ts';
import { isPowerActive } from './power-rules.ts';
import { weatherShotFactor } from './weather-exposure.ts';
import { MINI_TURRET_ACCURACY,MINI_TURRET_BURST_INTERVAL,MINI_TURRET_COOLDOWN,MINI_TURRET_PROFILE } from './mini-turret-profile.ts';
import type { TurretLivingKey } from './mini-turret-state.ts';
import type { Cell,Structure,World } from './types.ts';

/** A distinct combat-acquisition budget: no navigation search or retained cache.
 * remaining counts consultations; pairs counts examined owners/LOS checks. */
export interface TurretAcquisitionBudget { remaining:number;pairs:number }
export interface TurretQueries {
  grid():ShotGrid;
  targets():{anchor(key:string):Cell|undefined};
  carried(id:number):boolean;
  turretTargets():TurretTargetIndex;
}
export interface TurretAdvance { changed:boolean;emittedId?:number;deferred?:true }
export const turretOperational=(world:World,s:Structure):boolean=>s.kind==='mini-turret'&&!!s.turret&&world.structures.includes(s)&&isPowerActive(s);
/** Equivalent to (Core+ID)%15 without overflowing a safe persistent ID. */
export const turretHashDue=(s:Pick<Structure,'id'>,core:number):boolean=>(core%15+s.id%15)%15===0;

const keyOf=(t:LivingTarget):TurretLivingKey=>combatTargetKey(t);
const leans=(t:LivingTarget):boolean=>!isAnimalTarget(t)&&!['downed','resting','sleeping'].includes(t.state);
export interface TurretTargetIndex {
  target(key:TurretLivingKey):LivingTarget|undefined;
  near(center:Cell,range:number):readonly LivingTarget[];
}
/** Sparse, shared by one synchronous unchanged combat batch. All owners remain
 * resolvable privately. Acquisition keeps the smallest ID at each cell/posture:
 * other owners there have identical range/LOS and lose the specified ID tie. */
export function captureTurretTargets(w:World):TurretTargetIndex {
  const owners=new Map<TurretLivingKey,LivingTarget>(),cells=new Map<string,LivingTarget>();
  const carried=new Set(w.pawns.filter(p=>p.rescue?.phase==='carry').map(p=>p.rescue!.patientId));
  for(const list of [w.pawns,w.wildlife?.animals??[],w.mechanoids??[]])for(const t of list) {
    if(t.state==='dead'||t.health?.death||isPawnTarget(t)&&carried.has(t.id))continue;
    owners.set(keyOf(t),t);
    if(!turretTargetAllowed(t))continue;
    const key=`${t.x}:${t.z}:${leans(t)?1:0}`,prior=cells.get(key);
    if(!prior||t.id<prior.id)cells.set(key,t);
  }
  const size=8,columns=Math.ceil(w.width/size),buckets=new Map<number,LivingTarget[]>();
  for(const t of cells.values()) {
    const key=Math.floor(t.z/size)*columns+Math.floor(t.x/size);
    let values=buckets.get(key);if(!values){values=[];buckets.set(key,values);}values.push(t);
  }
  return {target:key=>owners.get(key),near(center,range) {
    const result:LivingTarget[]=[];
    const minX=Math.max(0,Math.floor((center.x-range)/size)),maxX=Math.min(columns-1,Math.floor((center.x+range)/size));
    const minZ=Math.max(0,Math.floor((center.z-range)/size)),maxZ=Math.min(Math.ceil(w.height/size)-1,Math.floor((center.z+range)/size));
    for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++)for(const t of buckets.get(z*columns+x)??[])if(distanceSquared(center,t)<=range*range)result.push(t);
    return result.sort((a,b)=>distanceSquared(center,a)-distanceSquared(center,b)||a.id-b.id);
  }};
}
function presentTarget(key:TurretLivingKey,queries:TurretQueries):LivingTarget|undefined {
  const target=queries.turretTargets().target(key);
  return target&&target.state!=='dead'&&!target.health?.death&&(!isPawnTarget(target)||!queries.carried(target.id))?target:undefined;
}
/** Admission is intentionally narrower than mental hostility. Sleeping human
 * targets are not excluded by the machine/faction rule. */
export function turretTargetAllowed(t:LivingTarget):boolean {
  if(t.state==='dead'||t.state==='downed'||t.health?.death)return false;
  return isAnimalTarget(t)?!t.domestic&&!!t.manhunter:isMechanoidTarget(t)?true:prisonBreakActive(t)||!t.prisoner&&factionRelation('colony',factionOf(t))==='hostile';
}
export interface TurretShotPlan { target:LivingTarget;line:Extract<ShotLine,{ok:true}>;key:TurretLivingKey }
export function turretShotPlan(_w:World,s:Structure,key:TurretLivingKey,queries:TurretQueries):TurretShotPlan|{reason:'target'|'bounds'|'range'|'blocked'} {
  const target=presentTarget(key,queries);if(!target)return {reason:'target'} as const;
  const line=findShotLine(queries.grid(),s,{cell:target,leans:leans(target)},MINI_TURRET_PROFILE.range,0,false);
  return line.ok?{target,line,key}:{reason:line.reason} as const;
}

/** Null is a postponed consultation; undefined is a completed search with no
 * target. No RNG/ID/state mutation, including an incomplete budget scan. */
export function turretCandidate(w:World,s:Structure,queries:TurretQueries,budget?:TurretAcquisitionBudget):TurretShotPlan|null|undefined {
  if(budget&&budget.remaining<=0)return null;
  if(budget)budget.remaining--;
  for(const target of queries.turretTargets().near(s,MINI_TURRET_PROFILE.range)) {
    if(budget&&budget.pairs<2)return null;
    if(budget)budget.pairs-=2; // one indexed owner and its physical line
    const plan=turretShotPlan(w,s,keyOf(target),queries);if(!('reason' in plan))return plan;
  }
}

export function setTurretHoldFire(s:Structure,enabled:boolean):void {
  if(!s.turret)return;
  s.turret.holdFire=enabled;
  if(enabled){s.turret.targetKey=null;s.turret.warmup=null;}
}

function emit(w:World,s:Structure,core:number,plan:TurretShotPlan,queries:TurretQueries):number {
  const {target,line,key}=plan,profile=MINI_TURRET_PROFILE;
  const cover=shotCover(queries.grid(),s,target,key);
  const aim=shotAim({distance:line.distance,pawnAccuracy:MINI_TURRET_ACCURACY,weaponAccuracy:profile.accuracy,
    targetSize:isAnimalTarget(target)?animalBodySize(target):1,standing:!['downed','resting','sleeping'].includes(target.state),
    weather:weatherShotFactor(w,s,target),blindSmoke:false},cover.passChance);
  const draft={rng:w.rng};
  const emission=emitRevolverBullet({grid:queries.grid(),line,origin:{x:s.x+.5,z:s.z+.5},launcherKey:`structure:${s.id}`,equipmentKey:null,
    target:{key,cell:target,full:false,canBenefitFromCover:true},aim,cover,profile,canHitOtherPawns:true,preventFriendlyFire:false,
    coverAnchor:key=>queries.targets().anchor(key)},()=>healthRandom(draft));
  const projectile=registerWorldProjectile(w,emission.flight,'normal',{
    friendlyPawnIds:w.pawns.filter(p=>factionRelation('colony',factionOf(p))!=='hostile').map(p=>p.id),friendlyFireFactor:friendlyFireFactor(w),
  },draft.rng,core,'mini-turret-gun');
  s.turret!.ammoQ-=4;return projectile.id;
}

/** One Core passage, supplied by the shared scheduler. No wick tick, XP or
 * fake actor. Canonical phases are adopted only after a successful emission. */
export function advanceTurretOwner(w:World,s:Structure,core:number,queries:TurretQueries,budget?:TurretAcquisitionBudget):TurretAdvance {
  const t=s.turret;if(s.kind!=='mini-turret'||!t||!w.structures.includes(s))return {changed:false};
  if(!turretOperational(w,s)) {
    const changed=t.targetKey!==null||t.warmup!==null;t.targetKey=null;t.warmup=null;return {changed};
  }
  let emittedId:number|undefined,changed=false;
  if(t.targetKey&&!presentTarget(t.targetKey,queries)){t.targetKey=null;t.warmup=null;changed=true;}
  if(t.burst) {
    if(t.burst.delayCore>1){t.burst.delayCore--;return {changed:true};}
    const plan=turretShotPlan(w,s,t.burst.targetKey,queries);
    if(t.ammoQ>=4&&!('reason' in plan))emittedId=emit(w,s,core,plan,queries);
    t.burst=null;t.cooldownCore=MINI_TURRET_COOLDOWN;
  }
  // The Verb callback precedes the building decrement at this same Core.
  if(t.cooldownCore>0) {
    t.cooldownCore--;changed=true;if(t.cooldownCore>0)return {changed:true,...emittedId!==undefined?{emittedId}:{}};
  }
  if(t.holdFire) {
    changed||=t.targetKey!==null||t.warmup!==null;t.targetKey=null;t.warmup=null;return {changed};
  }
  if(t.warmup) {
    if(t.warmup.remainingCore>1){t.warmup.remainingCore--;return {changed:true};}
    const plan=t.targetKey&&turretShotPlan(w,s,t.targetKey,queries);
    if(t.ammoQ<4||!plan||'reason' in plan){t.targetKey=null;t.warmup=null;return {changed:true};}
    emittedId=emit(w,s,core,plan,queries);t.warmup=null;
    t.burst={targetKey:plan.key,shotsLeft:1,delayCore:MINI_TURRET_BURST_INTERVAL};return {changed:true,emittedId};
  }
  if(t.ammoQ<4||!turretHashDue(s,core))return {changed};
  const plan=turretCandidate(w,s,queries,budget);
  if(plan===null)return {changed,deferred:true};
  if(!plan){changed||=t.targetKey!==null;t.targetKey=null;return {changed};}
  const draft={rng:w.rng},duration=Math.floor(15+healthRandom(draft)*31);
  t.targetKey=plan.key;t.warmup={remainingCore:duration,totalCore:duration};w.rng=draft.rng;return {changed:true};
}
