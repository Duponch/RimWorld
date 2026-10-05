import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { projectileProfile,rangedWeaponProfile } from '../src/sim/ranged-statistics.ts';
import { captureWorldProjectileTargets } from '../src/sim/projectile-world.ts';
import { captureProjectileBatch } from '../src/sim/projectile-batch.ts';
import { flybyChance } from '../src/sim/projectile-rules.ts';
import { createBulletFlight } from '../src/sim/bullet-flight.ts';
import { registerWorldProjectile } from '../src/sim/projectile-system.ts';
import { damageMechanoidWithBullet } from '../src/sim/mechanoid-impact.ts';
import { advanceMechanoidCorpses,mechCorpseMass } from '../src/sim/mechanoid-corpse.ts';
import { medicalCamp } from './scenarios/health.ts';
import { fixtureMechanoid } from './scenarios/mechanoid-combat-v213.ts';
import { rangedMechanoidCamp,prepareRangedDecision } from './scenarios/ranged-mechanoid-v219.ts';
import type { LivingTargetKey } from '../src/sim/combat-target.ts';

test('intrinsic profiles require their actual mechanical source and normal quality, without becoming inventory guns',()=>{
  const {w,m,victim}=rangedMechanoidCamp();
  expect(projectileProfile('lancer-gun','normal')).toMatchObject({range:32.9,damage:30,armorPenetration:.45,projectileTilesPerCoreTick:1.2});
  expect(projectileProfile('pikeman-gun','normal')).toMatchObject({range:44.9,damage:15,armorPenetration:.35,projectileTilesPerCoreTick:.9});
  for(const gun of ['lancer-gun','pikeman-gun']){expect(rangedWeaponProfile(gun,'normal')).toBeUndefined();expect(projectileProfile(gun,'excellent')).toBeUndefined();}
  const flight=createBulletFlight({launcherKey:`mech:${m.id}`,equipmentKey:null,intendedKey:`pawn:${victim.id}`,usedKey:`pawn:${victim.id}`,
    flags:1,preventFriendlyFire:false,origin:{x:m.x+.5,z:m.z+.5},destination:{x:victim.x+.5,z:victim.z+.5},speedPerCoreTick:1.2});
  const before=structuredClone(w),relations={friendlyPawnIds:[],friendlyFireFactor:1};
  expect(()=>registerWorldProjectile(w,flight,'normal',relations,w.rng,w.tick*10,'pikeman-gun')).toThrow(/mechanical emission owner/);
  expect(()=>registerWorldProjectile(w,flight,'excellent',relations,w.rng,w.tick*10,'lancer-gun')).toThrow(/mechanical emission owner/);
  expect(w).toEqual(before);
  const shot=registerWorldProjectile(w,flight,'normal',relations,w.rng,w.tick*10,'lancer-gun');
  expect(shot.flight.launcherKey).toBe(`mech:${m.id}`);expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('typed mechanical friends agree in full and batched captures and change real interception policy without aliasing human IDs',()=>{
  const {w,m,victim}=rangedMechanoidCamp(),friend=fixtureMechanoid(w,54,48);friend.mechKind='pikeman';
  const key=`mech:${friend.id}` as const,keys=new Set<LivingTargetKey>([key]);
  const capture=captureWorldProjectileTargets(w),scene=capture.scene(new Set(),0,keys),batched=captureProjectileBatch(w).refresh(w)(new Set(),0,keys);
  keys.clear();expect(scene.target(key)).toMatchObject({kind:'pawn',friendly:true});expect(scene.at(friend)).toEqual(batched.at(friend));
  const historicalNumeric=capture.scene(new Set([friend.id]),0);expect(historicalNumeric.target(key)).toMatchObject({friendly:false});
  const policy={launcherKey:`mech:${m.id}`,intendedKey:`pawn:${victim.id}`,usedKey:`pawn:${victim.id}`,flags:7,preventFriendlyFire:false},
    origin={x:m.x+.5,z:m.z+.5};
  expect(flybyChance(policy,scene.target(key)!,origin,victim,friend,0)).toBe(0);
  expect(flybyChance(policy,historicalNumeric.target(key)!,origin,victim,friend,0)).toBeGreaterThan(0);
  prepareRangedDecision(w,m);
  for(let i=0;i<30&&!w.projectiles?.length;i++)stepWorld(w);
  expect(w.projectiles![0]!.relations.friendlyTargetKeys).toEqual([`mech:${m.id}`,key].sort());
  expect(w.projectiles![0]!.relations.friendlyPawnIds).toEqual([]);expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test.each(['lancer','pikeman'] as const)('%s carcass traverses source, carried inventory, placement and actual work before steel output',kind=>{
  // Same real crafting producer as V213, with a different original mechanical
  // body. A guaranteed authored Bullet contact creates the corpse; no corpse,
  // recipe job or consequence is present before that clinical transaction.
  const w=medicalCamp(),worker=w.pawns[0]!;delete worker.background;
  worker.priorities.craft=1;worker.skills.crafting={level:10,xp:0,dailyXp:0,passion:1};worker.x=12;worker.z=15;
  const m=fixtureMechanoid(w,15,16);m.mechKind=kind;
  damageMechanoidWithBullet(w,m,{damage:100,part:`${kind}-brain`},w.tick*10,3);
  expect(m.state).toBe('dead');advanceMechanoidCorpses(w);
  const corpse=w.piles.find(p=>p.id===m.id)!;
  expect(corpse).toMatchObject({item:`${kind}-corpse`,quantity:1,mechCorpse:{mechKind:kind,health:{body:kind}}});expect(mechCorpseMass(corpse)).toBeGreaterThan(0);
  expect(applyCommand(w,{type:'designate',kind:'crafting-spot',x:16,z:16}).ok).toBe(true);
  const station=w.structures.find(s=>s.kind==='crafting-spot')!;
  expect(applyCommand(w,{type:'bill-add',structureId:station.id,recipe:'smash-mechanoid'}).ok).toBe(true);
  const bill=station.bills![0]!;bill.destination='drop';expect(validateWorld(w)).toEqual([]);
  let source=false,held=false,placed=false,work=0,replayed=false;
  for(let i=0;i<600&&!w.mechSalvage;i++){
    stepWorld(w);expect(validateWorld(w),String(w.tick)).toEqual([]);
    const task=worker.cooking;source||=!!task?.ingredients.some(entry=>entry.pileId===m.id&&entry.stage==='source');
    held||=!!task?.ingredients.some(entry=>entry.pileId===m.id&&entry.stage==='held');
    placed||=!!task?.ingredients.some(entry=>entry.pileId===m.id&&entry.stage==='placed');
    if(task?.phase==='work')work++;
    if(!replayed&&held){const copy=deserializeWorld(serializeWorld(w));stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);replayed=true;}
  }
  expect({source,held,placed,replayed}).toEqual({source:true,held:true,placed:true,replayed:true});expect(work).toBeGreaterThanOrEqual(89);
  expect(w.mechSalvage).toEqual({completed:1,steel:15});expect(bill.target).toBe(0);
  expect(w.piles.some(p=>p.id===m.id)).toBe(false);expect(w.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0)).toBe(15);
  expect(w.piles.some(p=>p.kind==='weapon'&&p.item.includes(kind))).toBe(false);expect(validateWorld(w)).toEqual([]);
});
