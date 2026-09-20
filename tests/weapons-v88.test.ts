import { expect,test } from 'vitest';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { addMaterial } from '../src/sim/materials';
import { equippedWeapon,newWeaponState,weaponMaxHitPoints } from '../src/sim/equipment-rules';
import { validWeaponShape } from '../src/sim/equipment-save';
import { rangedWeaponProfile,revolverProfile,rangedTimings } from '../src/sim/ranged-statistics';
import { validShootingShape } from '../src/sim/shooting-save';
import { validWorldProjectile } from '../src/sim/projectile-save';
import { validMeleeShape } from '../src/sim/melee-save';
import { meleeTools } from '../src/sim/melee-statistics';
import { strikeLivingTarget } from '../src/sim/living-melee';
import { resolveUnarmoredMelee } from '../src/sim/melee-impact';
import { createMedicalRecord } from '../src/sim/injury-state';
import { validateMedicalRecord } from '../src/sim/injury-validation';
import { huntingWanted } from '../src/sim/hunting';
import { pileMaxHp,pileFlammability } from '../src/sim/thing-damage-rules';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import { firingCamp } from './scenarios/shooting';

test('rifle and plasteel material have distinct physical profiles; a knife cannot shoot or start hunting',()=>{
  const rifle=rangedWeaponProfile('bolt-action-rifle','normal')!;
  expect(rifle).toMatchObject({damage:18,armorPenetration:.27,accuracy:[.65,.8,.9,.8],range:36.9,warmupCoreTicks:102,cooldownCoreTicks:90,projectileTilesPerCoreTick:.7,stoppingPower:1.5});
  expect(rangedTimings(rifle)).toMatchObject({warmup:10.2,cooldown:9,cycle:19.2});
  expect(rangedWeaponProfile('bolt-action-rifle','legendary')?.damage).toBe(27);
  expect(rangedWeaponProfile('revolver','normal')).toEqual(revolverProfile('normal'));
  expect(rangedWeaponProfile('plasteel-knife','normal')).toBeUndefined();
  const w=firingCamp(),p=w.pawns[0],weapon=equippedWeapon(w,p)!;
  weapon.item='plasteel-knife';weapon.weapon=newWeaponState('plasteel-knife');
  expect(weaponMaxHitPoints(weapon.item)).toBe(280);expect(pileMaxHp(weapon)).toBe(280);expect(pileFlammability(weapon)).toBe(0);
  expect(pileMaxHp({kind:'silver',item:'silver'})).toBe(0);expect(pileFlammability({kind:'silver',item:'silver'})).toBe(0);
  expect(validWeaponShape(weapon as unknown as Record<string,unknown>,88)).toBe(true);
  expect(validWeaponShape(weapon as unknown as Record<string,unknown>,87)).toBe(false);
  const tools=meleeTools(w,p),blade=tools.find(t=>t.id==='knife-blade')!,point=tools.find(t=>t.id==='knife-point')!;
  expect(blade.damage).toBeCloseTo(13.2);expect(blade.penetration).toBeCloseTo(.198);expect(blade.cooldownCore).toBe(72);
  expect(point.damage).toBeCloseTo(14.3);expect(point.penetration).toBeCloseTo(.2145);expect(point.cooldownCore).toBe(96);
  const before=serializeWorld(w);expect(applyCommand(w,{type:'shoot',pawnIds:[p.id],targetId:w.pawns[1].id}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:false});p.priorities.hunt=1;w.hunting={targets:[w.pawns[1].id],completed:0};
  expect(huntingWanted(w,p)).toBe(false);
});

test('rifle aims beyond revolver range; its emitted profile survives stop/drop, phase saves and bridge continuation',()=>{
  const w=firingCamp(),p=w.pawns[0],target=w.pawns[1],weapon=equippedWeapon(w,p)!;
  Object.assign(target,{x:30,z:10});w.pawns[2].z=20;
  const command={type:'shoot' as const,pawnIds:[p.id],targetId:target.id};
  expect(applyCommand(w,command).ok).toBe(false);
  weapon.item='bolt-action-rifle';weapon.weapon=newWeaponState('bolt-action-rifle');
  const start=w.tick*10;expect(applyCommand(w,command).ok).toBe(true);
  expect(p.shooting?.stance).toMatchObject({phase:'aim',weaponItem:'bolt-action-rifle',startedAtCore:start,endsAtCore:start+102});
  expect(validShootingShape(p.shooting,87,w.tick)).toBe(false);
  const resumed=deserializeWorld(serializeWorld(w)),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  for(let i=0;i<11;i++){
    stepWorld(w);stepWorld(resumed);expect(resumed).toEqual(w);expect(validateWorld(w)).toEqual([]);
    const message=decoder.adopt(structuredClone(encoder.encode(w,0,6)));expect(message.status).toBe('applied');if(message.status==='applied')expect(message.world).toEqual(w);
    if(i<10)expect(w.projectiles).toBeUndefined();
  }
  const bullet=w.projectiles![0];expect(bullet).toMatchObject({weaponItem:'bolt-action-rifle',emittedAtCore:start+102,flight:{speedPerCoreTick:.7}});
  expect(p.shooting?.stance).toMatchObject({phase:'cooldown',startedAtCore:start+102,endsAtCore:start+192});
  expect(validWorldProjectile(bullet,w,87)).toBe(false);
  const wrong=structuredClone(bullet);delete wrong.weaponItem;expect(validWorldProjectile(wrong,w,88)).toBe(false);
  expect(applyCommand(w,{type:'draft-stop',pawnIds:[p.id]}).ok).toBe(true);
  // Controlled drop boundary: preserve the same physical item/quantity while
  // proving the already emitted projectile never rereads its owner's weapon.
  weapon.owner={type:'ground',x:p.x,z:p.z};
  const copy=deserializeWorld(serializeWorld(w));let arrived=false;
  for(let i=0;i<12;i++){stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);arrived ||=!!w.projectiles?.find(b=>b.id===bullet.id)?.arrival;}
  expect(arrived).toBe(true);expect(p.shooting).toBeUndefined();expect(w.piles.find(i=>i.id===weapon.id)?.quantity).toBe(1);
});

test('plasteel blade recovery retains the 72 Core boundary across a real strike and save/load',()=>{
  const w=firingCamp(),p=w.pawns[0],target=w.pawns[1];w.piles=[];Object.assign(target,{x:p.x+1,z:p.z});
  addMaterial(w,'weapon',1,{type:'equipment',pawnId:p.id},'plasteel-knife');
  const blade=meleeTools(w,p).find(t=>t.id==='knife-blade')!,start=w.tick*10;
  // Select the tool explicitly to isolate fractional recovery from the separate
  // weighted choice; hit/dodge, anatomical injury and XP still run normally.
  p.melee={order:null,strike:null};strikeLivingTarget(w,p,target,blade,start,{rng:w.rng});
  expect(p.melee.strike).toMatchObject({tool:'knife-blade',atCore:start,untilCore:start+72});
  expect(p.skills.melee.dailyXp).toBeGreaterThan(0);expect(validMeleeShape(p.melee,87,w.tick)).toBe(false);expect(validateWorld(w)).toEqual([]);
  const copy=deserializeWorld(serializeWorld(w));
  for(let i=0;i<7;i++){stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(p.melee?.strike?.untilCore).toBe(start+72);expect(validateWorld(w)).toEqual([]);}
  stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(p.melee).toBeUndefined();expect(validateWorld(w)).toEqual([]);
});

test('cut and stab retain distinct anatomical workers and sharp-to-blunt conversion',()=>{
  const record=createMedicalRecord(),before=structuredClone(record);
  let draws=[0,.99];const cut=resolveUnarmoredMelee(record,{part:'torso',kind:'cut',damage:10},()=>draws.shift()??.99);
  expect(cut.layers).toEqual([{part:'torso',kind:'cut',severity:10000}]);
  draws=[.5,0];const stab=resolveUnarmoredMelee(record,{part:'torso',kind:'stab',damage:10},()=>draws.shift()??.99);
  expect(stab.selected).not.toBe('torso');expect(stab.layers).toContainEqual({part:'torso',kind:'stab',severity:7500});
  expect(stab.layers.some(l=>l.severity===4000)).toBe(true);
  const guarded=resolveUnarmoredMelee(record,{part:'torso',kind:'stab',damage:10},()=>.99,()=>({amount:5,converted:true}));
  expect(guarded.layers).toEqual([{part:'torso',kind:'bruise',severity:5000}]);
  draws=[.8,0,0,.99];const spread=resolveUnarmoredMelee(record,{part:'left-hand',kind:'cut',damage:4},()=>draws.shift()??.99);
  expect(spread.layers.length).toBeGreaterThan(1);
  for(const result of [cut,stab,guarded,spread])expect(validateMedicalRecord(result.record)).toBeNull();expect(record).toEqual(before);
});
