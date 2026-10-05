import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { projectileProfile,rangedWeaponProfile } from '../src/sim/ranged-statistics.ts';
import { isWeaponItem } from '../src/sim/equipment-rules.ts';
import { advanceTurretOwner } from '../src/sim/mini-turret.ts';
import { MINI_TURRET_PROFILE } from '../src/sim/mini-turret-profile.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { controlledInjury } from './scenarios/health.ts';
import { campTurret,miniTurretCamp,miniTurretQueries } from './scenarios/mini-turret-v212.ts';
import type { World } from '../src/sim/types.ts';

function until(w:World,done:()=>boolean,limit=20):void {
  for(let i=0;i<limit&&!done();i++)stepWorld(w);
  expect(done(),`Missing turret boundary at tick ${w.tick}`).toBe(true);expect(validateWorld(w)).toEqual([]);
}
function firstBurst(w:World):void {until(w,()=>!!campTurret(w).turret!.burst);}

test('intrinsic normal gun preserves inventory profiles and drives real two-shot emission without a Pawn or XP',()=>{
  expect(isWeaponItem('mini-turret-gun')).toBe(false);expect(rangedWeaponProfile('mini-turret-gun','normal')).toBeUndefined();
  expect(projectileProfile('mini-turret-gun','normal')).toBe(MINI_TURRET_PROFILE);expect(projectileProfile('mini-turret-gun','legendary')).toBeUndefined();
  for(const item of ['revolver','bolt-action-rifle'] as const)expect(projectileProfile(item,'excellent')).toBe(rangedWeaponProfile(item,'excellent'));
  expect(MINI_TURRET_PROFILE).toMatchObject({damage:12,armorPenetration:.18,accuracy:[.77,.70,.45,.24],range:28.9,projectileTilesPerCoreTick:.7,stoppingPower:.5});
  const w=miniTurretCamp(),s=campTurret(w),xp=w.pawns.map(p=>p.skills.shooting.xp),owners=w.pawns.map(p=>p.id);
  until(w,()=>!!s.turret!.warmup);expect(s.turret!.ammoQ).toBe(240);expect(s.turret!.warmup!.totalCore).toBeGreaterThanOrEqual(15);expect(s.turret!.warmup!.totalCore).toBeLessThanOrEqual(45);
  firstBurst(w);const first=w.projectiles!.find(p=>p.weaponItem==='mini-turret-gun')!;
  expect(s.turret!.ammoQ).toBe(236);expect(first.flight).toMatchObject({launcherKey:`structure:${s.id}`,equipmentKey:null});
  expect(first.quality).toBe('normal');expect(first.relations.friendlyPawnIds).toEqual([w.pawns[0]!.id,w.pawns[2]!.id].sort((a,b)=>a-b));
  const saved=serializeWorld(w),copy=deserializeWorld(saved);stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);
  const second=w.projectiles!.find(p=>p.id!==first.id&&p.weaponItem==='mini-turret-gun')!;
  expect(second.emittedAtCore-first.emittedAtCore).toBe(8);expect(second.advancedAtCore).toBe(w.tick*10);
  expect(s.turret!.burst).toBeNull();expect(s.turret!.ammoQ).toBe(232);
  expect(s.turret!.cooldownCore).toBe(287-(w.tick*10-second.emittedAtCore));
  expect(w.pawns.map(p=>p.id)).toEqual(owners);expect(w.pawns.map(p=>p.skills.shooting.xp)).toEqual(xp);expect(w.piles.some(p=>p.owner.type==='equipment')).toBe(false);expect(validateWorld(w)).toEqual([]);
});

test('hold-fire cancels acquired warmup, but engaged burst survives policy and power loss then resumes exactly once',()=>{
  const warm=miniTurretCamp(),warmGun=campTurret(warm);until(warm,()=>!!warmGun.turret!.warmup);
  const ammo=warmGun.turret!.ammoQ,rng=warm.rng;
  expect(applyCommand(warm,{type:'turret-hold-fire',structureId:warmGun.id,enabled:true}).ok).toBe(true);
  expect(warmGun.turret!.warmup).toBeNull();expect(warmGun.turret!.targetKey).toBeNull();stepWorld(warm,3);
  expect(warmGun.turret!.ammoQ).toBe(ammo);expect(warm.projectiles).toBeUndefined();expect(warm.rng).toBe(rng);expect(warmGun.turret!.cooldownCore).toBe(0);
  const w=miniTurretCamp(),s=campTurret(w);firstBurst(w);const burst=structuredClone(s.turret!.burst),firstId=w.projectiles![0]!.id;
  expect(applyCommand(w,{type:'turret-hold-fire',structureId:s.id,enabled:true}).ok).toBe(true);s.power!.switchOn=false;s.power!.on=false;stepWorld(w,2);
  expect(s.turret!.burst).toEqual(burst);expect(s.turret!.targetKey).toBeNull();expect(s.turret!.ammoQ).toBe(236);
  const copy=deserializeWorld(serializeWorld(w));s.power!.switchOn=true;campTurret(copy).power!.switchOn=true;
  const replayUntil=(done:()=>boolean)=>{
    for(let i=0;i<25&&!done();i++){stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);}
    expect(done()).toBe(true);expect(validateWorld(w)).toEqual([]);
  };
  // Requested switch state does not instantly restart a stopped consumer. The
  // ordinary network startup cadence must actually resume the private owner.
  replayUntil(()=>s.turret!.burst===null);expect(s.turret!.ammoQ).toBe(232);
  expect(w.projectiles?.filter(p=>p.id!==firstId&&p.weaponItem==='mini-turret-gun')).toHaveLength(1);
  const cooldown=s.turret!.cooldownCore;
  for(const gun of [s,campTurret(copy)]){gun.power!.switchOn=false;gun.power!.on=false;}
  stepWorld(w,2);stepWorld(copy,2);expect(copy).toEqual(w);expect(s.turret!.cooldownCore).toBe(cooldown);
  s.power!.switchOn=true;campTurret(copy).power!.switchOn=true;replayUntil(()=>s.power!.on);
  expect(s.turret!.cooldownCore).toBe(cooldown-10);expect(validateWorld(w)).toEqual([]);
});

test('private second shot does not reacquire a fallen victim; a lost line fails with cooldown while preentry failure has none',()=>{
  const w=miniTurretCamp(),s=campTurret(w),victim=w.pawns[1]!;firstBurst(w);
  controlledInjury(w,victim,'left-leg',30000,'cut');controlledInjury(w,victim,'right-leg',30000,'cut');expect(victim.state).toBe('downed');
  const intended=`pawn:${victim.id}`;stepWorld(w);expect(s.turret!.ammoQ).toBe(232);
  expect(w.projectiles?.filter(p=>p.weaponItem==='mini-turret-gun'&&p.flight.intendedKey===intended)).toHaveLength(2);expect(validateWorld(w)).toEqual([]);
  const lost=miniTurretCamp(),gun=campTurret(lost);firstBurst(lost);const failedAt=lost.projectiles![0]!.emittedAtCore+8;fixtureBuilding(lost,'wall',26,32);
  const privateAmmo=gun.turret!.ammoQ;stepWorld(lost);expect(gun.turret!.burst).toBeNull();expect(gun.turret!.ammoQ).toBe(privateAmmo);expect(gun.turret!.cooldownCore).toBe(287-(lost.tick*10-failedAt));
  const before=miniTurretCamp(),preGun=campTurret(before);until(before,()=>!!preGun.turret!.warmup);fixtureBuilding(before,'wall',26,32);
  until(before,()=>preGun.turret!.warmup===null);expect(preGun.turret!.cooldownCore).toBe(0);expect(preGun.turret!.ammoQ).toBe(240);expect(before.projectiles).toBeUndefined();
});

test('a single available round never becomes two; empty hold-fire cooldown continues and an emitted flight outlives its source',()=>{
  const w=miniTurretCamp(),s=campTurret(w);s.turret!.ammoQ=4;firstBurst(w);expect(s.turret!.ammoQ).toBe(0);
  const bullet=w.projectiles![0]!,firstId=bullet.id;stepWorld(w);expect(s.turret!.burst).toBeNull();expect(s.turret!.cooldownCore).toBeGreaterThan(0);expect(w.projectiles).toHaveLength(1);
  expect(applyCommand(w,{type:'turret-hold-fire',structureId:s.id,enabled:true}).ok).toBe(true);const cooldown=s.turret!.cooldownCore;stepWorld(w);expect(s.turret!.cooldownCore).toBe(cooldown-10);
  // Source removal is prepared here; physical destruction/Bomb belongs to sim.
  w.structures=w.structures.filter(v=>v!==s);const copy=deserializeWorld(serializeWorld(w));
  let arrived=false;for(let i=0;i<8;i++){stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);if(w.projectiles?.find(p=>p.id===firstId)?.arrival)arrived=true;}
  expect(arrived).toBe(true);expect(validateWorld(w)).toEqual([]);
});

test('registration saturation refuses before committing canon, phase, ID or emission RNG',()=>{
  const w=miniTurretCamp(),s=campTurret(w);until(w,()=>!!s.turret!.warmup);
  // A positive last-Core warmup is a legitimate state. Testing the internal
  // emission boundary does not advance environment or forge a burst2/0 phase.
  s.turret!.warmup!.remainingCore=1;w.nextId=Number.MAX_SAFE_INTEGER;
  const before=JSON.stringify(w);expect(()=>advanceTurretOwner(w,s,w.tick*10,miniTurretQueries(w))).toThrow();expect(JSON.stringify(w)).toBe(before);
});
