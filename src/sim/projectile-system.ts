import { damageBarrier,isBarrier } from './barriers.ts';
import { disturbanceEvents,isLying } from './disturbance.ts';
import { advanceBulletFlight,type BulletFlight } from './bullet-flight.ts';
import { captureProjectileBatch } from './projectile-batch.ts';
import { validWorldProjectile } from './projectile-save.ts';
import { CORE_TICKS_PER_LOCAL,revolverProfile } from './ranged-statistics.ts';
import { damageUnarmoredPawnWithBullet } from './bullet-damage.ts';
import { healthRandom } from './health.ts';
import type { ProjectileScene } from './projectile-rules.ts';
import type { ProjectileRelations,WorldProjectile } from './projectile-state.ts';
import type { WeaponQuality } from './equipment-rules.ts';
import type { World } from './types.ts';
import { applyBulletStagger } from './stagger.ts';

/** Commit a producer's validated emission and its private PRNG together.
 * Internal boundary, not a player command or a replacement for aiming/cadence. */
export function registerWorldProjectile(world:World,flight:BulletFlight,quality:WeaponQuality,relations:ProjectileRelations,rng=world.rng,at=world.tick*CORE_TICKS_PER_LOCAL):WorldProjectile {
  if(world.schemaVersion<55||!Number.isSafeInteger(world.nextId+1)||!Number.isSafeInteger(rng)||rng<1||rng>0xffffffff||world.projectiles&&world.projectiles.length>=world.width*world.height)throw new RangeError('Cannot register projectile');
  if(!Number.isSafeInteger(at)||at<Math.max(0,(world.tick-1)*CORE_TICKS_PER_LOCAL)||at>world.tick*CORE_TICKS_PER_LOCAL)throw new RangeError('Invalid emission time');
  const projectile:WorldProjectile={id:world.nextId,quality,emittedAtCore:at,advancedAtCore:at,flight:{...flight,origin:{...flight.origin},destination:{...flight.destination}},relations:{friendlyPawnIds:[...new Set(relations.friendlyPawnIds)].sort((a,b)=>a-b),friendlyFireFactor:relations.friendlyFireFactor},arrival:null};
  if(projectile.flight.completed||!validWorldProjectile(projectile,{...world,tick:at/CORE_TICKS_PER_LOCAL}))throw new RangeError('Invalid projectile emission');
  world.nextId++;world.rng=rng;(world.projectiles??=[]).push(projectile);return projectile;
}

/** Run after doors/environment, before civilian actions. Core substep FIRST,
 * then persistent ID: a closer/lower-ID impact may change the next projectile's
 * admissible targets. Never finish each projectile's whole flight in sequence. */
export function advanceWorldProjectiles(world:World,beforeCore?:(core:number)=>boolean|void,afterImpact?:()=>void,disturbance=disturbanceEvents(world)):void {
  if(!world.projectiles&&!beforeCore)return;
  const end=world.tick*CORE_TICKS_PER_LOCAL,start=end-CORE_TICKS_PER_LOCAL;
  if(world.projectiles)world.projectiles=world.projectiles.filter(p=>!p.arrival||p.advancedAtCore>start);
  if(!world.projectiles?.length){delete world.projectiles;if(!beforeCore)return;}
  let batch:ReturnType<typeof captureProjectileBatch>|undefined;
  let targets:ReturnType<ReturnType<typeof captureProjectileBatch>['refresh']>|undefined;
  const scenes=new Map<WorldProjectile,ProjectileScene>();
  const scene=(p:WorldProjectile)=>{
    let s=scenes.get(p);if(!s){batch??=captureProjectileBatch(world);targets??=batch.refresh(world);s=targets(new Set(p.relations.friendlyPawnIds),p.relations.friendlyFireFactor);scenes.set(p,s);}return s;
  };
  for(let core=start+1;core<=end;core++) {const structures=world.structures;if(beforeCore?.(core)){if(structures!==world.structures)batch=undefined;targets=undefined;scenes.clear();}for(const p of world.projectiles??[]) {
    if(p.arrival||p.advancedAtCore>=core)continue;
    if(p.advancedAtCore!==core-1)throw new Error('Stale projectile clock');
    const randomState={rng:world.rng},next=advanceBulletFlight(p.flight,scene(p),()=>healthRandom(randomState),1);
    p.flight=next.flight;p.advancedAtCore=core;world.rng=randomState.rng;
    const a=next.arrival;if(!a)continue;
    const pawn=a.targetKey?.startsWith('pawn:')?world.pawns.find(pawn=>`pawn:${pawn.id}`===a.targetKey):undefined;
    const barrier=a.targetKey?.startsWith('structure:')?world.structures.find(s=>`structure:${s.id}`===a.targetKey&&isBarrier(s)):undefined;
    p.arrival={...a,effect:a.kind==='exit'?'exit':pawn?'pawn':barrier?'barrier':a.targetKey?'unsupported-object':'ground'};
    const wasLying=!!pawn&&isLying(pawn);
    if(a.kind!=='exit'&&disturbance.impact({x:Math.floor(a.point.x),z:Math.floor(a.point.z)},core)){targets=undefined;scenes.clear();afterImpact?.();}
    if(barrier){
      const structures=world.structures;damageBarrier(world,barrier,revolverProfile(p.quality).damage);
      if(world.structures!==structures)batch=undefined;targets=undefined;scenes.clear();afterImpact?.();
    }
    if(pawn) {
      const impact=damageUnarmoredPawnWithBullet(world,pawn,{damage:revolverProfile(p.quality).damage},revolverProfile(p.quality).armorPenetration);
      applyBulletStagger(world,pawn,core,revolverProfile(p.quality).stoppingPower);
      if(impact?.layers.some(l=>l.severity>0))disturbance.damage(pawn,core,wasLying);
      // A fall can change posture, release a carried patient and drop objects.
      // Do not reuse a capture across the medical reconciliation.
      targets=undefined;scenes.clear();afterImpact?.();
    }
  }}
}
