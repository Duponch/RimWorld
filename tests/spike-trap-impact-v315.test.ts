import { expect,test } from 'vitest';
import { seriesApparelProtection } from '../src/sim/apparel-protection.ts';
import type { ConstructionMaterial } from '../src/sim/building-materials.ts';
import { combatTargetKey } from '../src/sim/combat-target.ts';
import { healthRandom,updatePawnHealth } from '../src/sim/health.ts';
import { addResolvedInjury,createMedicalRecord,medicalStatus } from '../src/sim/injury-state.ts';
import { BLOOD_UNIT } from '../src/sim/injury-rules.ts';
import { resolveUnarmoredMelee } from '../src/sim/melee-impact.ts';
import { createMechaMedicalRecord } from '../src/sim/mechanoid-health.ts';
import { mechanoidProtection } from '../src/sim/mechanoid-impact.ts';
import { addMaterial,refreshStock } from '../src/sim/materials.ts';
import { commitSpikeTrapImpact,planSpikeTrapImpact } from '../src/sim/spike-trap-impact.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { enableWildlife } from '../src/sim/wildlife.ts';
import { controlledInjury,medicalCamp } from './scenarios/health.ts';
import { exhaustedCarrier } from './scenarios/interrupted-cargo.ts';
import { fixtureMechanoid } from './scenarios/mechanoid-combat-v213.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { reconcilePawnHealth } from '../src/sim/health.ts';
import { validateMedicalRecord } from '../src/sim/injury-validation.ts';

test.each<[ConstructionMaterial,number]>([
  ['wood',8],['steel',20],['sandstone-blocks',10],['granite-blocks',13],
  ['limestone-blocks',12],['slate-blocks',12],['marble-blocks',12],
])('Core stuff %s scales each impact, not a fivefold total', (material,nominal)=>{
  const w=medicalCamp(),p=w.pawns[0]!,before=serializeWorld(w),random={rng:w.rng};
  const factor=.8+.4*healthRandom(random),plan=planSpikeTrapImpact(w,combatTargetKey(p),material,w.tick*10)!;
  expect(plan).toBeDefined();expect(plan.factor).toBe(factor);
  expect(plan.damage).toBeCloseTo(nominal*factor,12);expect(plan.penetration).toBe(plan.damage*.015);
  expect(plan.impacts.length).toBeGreaterThan(0);expect(plan.impacts.length).toBeLessThanOrEqual(5);
  expect(serializeWorld(w)).toBe(before);
});

test('five Stabs reuse one uniform and the real anatomical random stream',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;w.rng=42;
  const random={rng:w.rng},damage=8*(.8+.4*healthRandom(random));let record=createMedicalRecord(w.tick),count=0;
  while(count<5&&!record.death){record=resolveUnarmoredMelee(record,{kind:'stab',damage},()=>healthRandom(random)).record;count++;}
  const oldId=w.nextId,plan=planSpikeTrapImpact(w,combatTargetKey(p),'wood',w.tick*10)!;
  expect(plan.impacts).toHaveLength(count);expect(plan.record).toEqual(record);expect(plan.rngAfter).toBe(random.rng);
  expect(commitSpikeTrapImpact(w,plan)).toBe(true);expect(w.pawns[0]).toBe(p);expect(p.health).toEqual(record);
  expect(w.rng).toBe(random.rng);expect(w.nextId).toBe(oldId);expect(w.piles).toEqual([]);
  expect(p.skills.melee).toEqual(medicalCamp().pawns[0]!.skills.melee);
  expect(validateWorld(w)).toEqual([]);
  expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(serializeWorld(w));
});

test('real steel Stabs retain pending infection through V226 reload and refuse historical exposure',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;w.rng=1;
  expect(p.health).toBeUndefined();const before=serializeWorld(w);
  const plan=planSpikeTrapImpact(w,combatTargetKey(p),'steel',w.tick*10)!;
  expect(plan).toBeDefined();expect(plan.record.injuries.some(i=>i.kind==='stab'&&i.infection!==undefined)).toBe(true);
  expect(serializeWorld(w)).toBe(before);expect(commitSpikeTrapImpact(w,plan)).toBe(true);
  expect(p.health).toEqual(plan.record);expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const valid=(version:number,allowStab=true)=>validateMedicalRecord(p.health,true,true,true,true,false,true,true,true,true,allowStab,true,version,true);
  expect(valid(226)).toBeNull();expect(valid(225)).not.toBeNull();expect(valid(226,false)).not.toBeNull();
  const old=structuredClone(w);old.schemaVersion=225 as typeof old.schemaVersion;expect(()=>deserializeWorld(JSON.stringify(old))).toThrow();
});

test('the lethal Stab finishes its layers but no later impact consumes randomness',()=>{
  const w=medicalCamp(2),p=w.pawns[0]!;controlledInjury(w,p,'torso',34000);w.rng=1;
  const random={rng:w.rng},damage=20*(.8+.4*healthRandom(random));
  const first=resolveUnarmoredMelee(p.health!,{kind:'stab',damage},()=>healthRandom(random));
  expect(first.record.death).toBeDefined();
  const plan=planSpikeTrapImpact(w,combatTargetKey(p),'steel',w.tick*10)!;
  expect(plan.impacts).toHaveLength(1);expect(plan.record).toEqual(first.record);expect(plan.rngAfter).toBe(random.rng);
  expect(commitSpikeTrapImpact(w,plan)).toBe(true);expect(p.state).toBe('dead');
  expect(w.pawns.filter(o=>o.id===p.id)).toEqual([p]);expect(w.piles).toEqual([]);
  expect(w.events.filter(e=>e.message===`${p.name} est décédé.`)).toHaveLength(1);
  expect(commitSpikeTrapImpact(w,plan)).toBe(false);
  expect(planSpikeTrapImpact(w,combatTargetKey(p),'steel',w.tick*10)).toBeUndefined();
  expect(validateWorld(w)).toEqual([]);
});

test('post-chance RNG is private until the complete impact commit',()=>{
  const w=medicalCamp(),p=w.pawns[0]!,before=w.rng,random={rng:before};healthRandom(random);
  const plan=planSpikeTrapImpact(w,combatTargetKey(p),'wood',w.tick*10,random.rng)!;
  expect(plan.rngBefore).toBe(before);expect(w.rng).toBe(before);
  expect(plan.factor).toBe(.8+.4*healthRandom(random));
  expect(commitSpikeTrapImpact(w,plan)).toBe(true);expect(w.rng).toBe(plan.rngAfter);
});

test('capacity exhaustion refuses all five impacts and their uniform atomically',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;p.health=createMedicalRecord(w.tick);p.health.nextInjuryId=Number.MAX_SAFE_INTEGER;
  expect(validateWorld(w)).toEqual([]);
  const before=serializeWorld(w);
  expect(planSpikeTrapImpact(w,combatTargetKey(p),'steel',w.tick*10)).toBeUndefined();
  expect(serializeWorld(w)).toBe(before);
});

test('stale RNG, changed claims and consumed plans cannot adopt a prepared impact',()=>{
  const w=medicalCamp(),p=w.pawns[0]!,plan=planSpikeTrapImpact(w,combatTargetKey(p),'wood',w.tick*10)!;
  const rng=w.rng;w.rng=rng^1;expect(commitSpikeTrapImpact(w,plan)).toBe(false);w.rng=rng;
  p.orders.queue.push(999999);expect(commitSpikeTrapImpact(w,plan)).toBe(false);p.orders.queue.pop();
  expect(commitSpikeTrapImpact(w,plan)).toBe(true);expect(commitSpikeTrapImpact(w,plan)).toBe(false);
});

test('temporal health preparation happens only in the draft and matches the ordinary producer',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;controlledInjury(w,p,'left-arm',3000);w.tick++;
  // This is the producer's pre-physiology phase, not a publishable checkpoint.
  const before=structuredClone(w),reference=structuredClone(w),r=reference.pawns[0]!,damage=8*(.8+.4*healthRandom(reference));
  updatePawnHealth(reference,r);
  let record=r.health!;for(let n=0;n<5&&!record.death;n++)record=resolveUnarmoredMelee(record,{damage,kind:'stab'},()=>healthRandom(reference)).record;
  const plan=planSpikeTrapImpact(w,combatTargetKey(p),'wood',w.tick*10)!;
  expect(w).toEqual(before);expect(plan.record).toEqual(record);expect(plan.rngAfter).toBe(reference.rng);
  expect(commitSpikeTrapImpact(w,plan)).toBe(true);expect(p.health!.tick).toBe(w.tick);expect(validateWorld(w)).toEqual([]);
});

test('real garment wear retires once, stops later protection and uses the neutral ledger',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;addMaterial(w,'apparel',1,{type:'apparel',pawnId:p.id},'flak-vest');
  const vest=w.piles[0]!;vest.apparel!.hitPoints=5;
  const first=seriesApparelProtection(w,p,0,()=>.999999);expect(first.protect!('torso',12)).toEqual({amount:6,converted:true});first.commit();
  expect(vest.apparel!.hitPoints).toBe(2);
  const second=seriesApparelProtection(w,p,0,()=>.999999);second.protect!('torso',12);second.commit();
  expect(w.piles).toEqual([]);expect(w.destroyed?.items?.['flak-vest']).toBe(1);
  expect(seriesApparelProtection(w,p,0,()=>{throw Error('Unarmored garment draw');}).protect).toBeUndefined();
});

test('garment-ledger overflow rejects anatomical damage, wear and random consumption',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;w.rng=1;
  addMaterial(w,'apparel',1,{type:'apparel',pawnId:p.id},'flak-vest');w.piles[0]!.apparel!.hitPoints=1;
  w.destroyed={count:1,lost:{wood:1},items:{'flak-vest':Number.MAX_SAFE_INTEGER}};refreshStock(w);
  expect(validateWorld(w)).toEqual([]);const before=serializeWorld(w);
  expect(planSpikeTrapImpact(w,combatTargetKey(p),'steel',w.tick*10)).toBeUndefined();expect(serializeWorld(w)).toBe(before);
});

test('a saturated floor retains the original cargo and disabled weapon after real death',()=>{
  const w=exhaustedCarrier(),p=w.pawns[0]!;p.rest=80;p.restZeroTicks=0;p.collapsePending=false;
  addMaterial(w,'weapon',1,{type:'equipment',pawnId:p.id},'revolver');
  const held=w.piles.find(i=>i.owner.type==='pawn')!,weapon=w.piles.find(i=>i.owner.type==='equipment')!;
  controlledInjury(w,p,'torso',34000);w.rng=1;refreshStock(w);expect(validateWorld(w)).toEqual([]);
  const nextId=w.nextId,plan=planSpikeTrapImpact(w,combatTargetKey(p),'steel',w.tick*10)!;
  expect(plan.record.death).toBeDefined();expect(commitSpikeTrapImpact(w,plan)).toBe(true);
  expect(p.state).toBe('dead');expect(p.interruptedCargo).toBe(true);expect(p.equipmentDropPending).toBe(true);
  expect(w.piles.find(i=>i.id===held.id)).toBe(held);expect(held.owner).toEqual({type:'pawn',pawnId:p.id});
  expect(w.piles.find(i=>i.id===weapon.id)).toBe(weapon);expect(weapon.owner).toEqual({type:'equipment',pawnId:p.id});
  expect(p.haul).toBeNull();expect(p.orders.queue).toEqual([]);expect(w.jobs[0]!.reservedBy).toBeNull();
  expect(w.nextId).toBe(nextId);expect(validateWorld(w)).toEqual([]);
});

test('a later exhausted lesion ID rolls back an earlier fall and prospective cargo drop',()=>{
  const w=exhaustedCarrier(),p=w.pawns[0]!;p.rest=80;p.restZeroTicks=0;p.collapsePending=false;
  // Leave a real drop cell and keep a compatible partially filled destination.
  // The first wood Stab crosses pain shock; the second cannot allocate its ID.
  w.piles=w.piles.filter(i=>!(i.owner.type==='ground'&&i.owner.x===2&&i.owner.z===3));
  for(const part of ['left-arm','right-arm','left-leg','right-leg'] as const)controlledInjury(w,p,part,10000);
  expect(medicalStatus(p.health!)).toBe('mobile');p.health!.nextInjuryId=Number.MAX_SAFE_INTEGER-1;
  w.rng=1;refreshStock(w);expect(validateWorld(w)).toEqual([]);const before=serializeWorld(w);
  expect(planSpikeTrapImpact(w,combatTargetKey(p),'wood',w.tick*10)).toBeUndefined();
  expect(serializeWorld(w)).toBe(before);
  expect(w.piles.some(i=>i.owner.type==='ground'&&i.owner.x===2&&i.owner.z===3)).toBe(false);
  expect(p.haul?.phase).toBe('deliver');expect(p.orders.queue).toHaveLength(1);
});

test('namespace, material, clock and independently carried patient refusals are neutral',()=>{
  const w=medicalCamp(2),carrier=w.pawns[0]!,patient=w.pawns[1]!;
  const bed=fixtureBuilding(w,'bed',20,16);Object.assign(bed,{medical:true});
  patient.health={...createMedicalRecord(w.tick),bloodLoss:Math.round(BLOOD_UNIT*.7)};reconcilePawnHealth(w,patient);
  Object.assign(patient,{x:carrier.x,z:carrier.z});carrier.priorities.doctor=1;carrier.state='moving';
  carrier.rescue={patientId:patient.id,bedId:bed.id,phase:'carry'};
  expect(validateWorld(w)).toEqual([]);
  const before=serializeWorld(w);
  expect(planSpikeTrapImpact(w,`animal:${carrier.id}`,'steel',w.tick*10)).toBeUndefined();
  expect(planSpikeTrapImpact(w,combatTargetKey(carrier),'cloth',w.tick*10)).toBeUndefined();
  expect(planSpikeTrapImpact(w,combatTargetKey(carrier),'wood',w.tick*10+1)).toBeUndefined();
  expect(planSpikeTrapImpact(w,combatTargetKey(patient),'steel',w.tick*10)).toBeUndefined();
  expect(serializeWorld(w)).toBe(before);
});

test('carrier fall releases the same living animal and retains its captured edge',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;
  w.resources.push({id:w.nextId++,kind:'berries',x:10,z:10,amount:10,growth:1,growthTick:w.tick});enableWildlife(w,1);const a=w.wildlife!.animals[0]!;
  a.domestic={since:w.tick,care:'best',tameness:1,nextDecay:w.tick+600};
  a.health={...createMedicalRecord(w.tick),body:a.species,bloodLoss:Math.round(BLOOD_UNIT*.7)};a.state='downed';
  const spotId=w.nextId++;w.structures.push({id:spotId,kind:'animal-sleeping-spot',x:16,z:16,orientation:0,footprint:'standard',medical:true});
  p.priorities.doctor=1;p.state='moving';
  p.animalRescue={animalId:a.id,spotId,phase:'carry',forced:true};
  p.motion={from:{x:p.x-1,z:p.z},to:{x:p.x,z:p.z},start:w.tick-1,end:w.tick+2};p.moveCooldown=2;
  Object.assign(a,{x:p.x,z:p.z,motion:structuredClone(p.motion)});controlledInjury(w,p,'torso',34000);w.rng=1;
  expect(validateWorld(w)).toEqual([]);
  const before=serializeWorld(w);expect(planSpikeTrapImpact(w,combatTargetKey(a),'steel',w.tick*10)).toBeUndefined();
  expect(serializeWorld(w)).toBe(before);
  const plan=planSpikeTrapImpact(w,combatTargetKey(p),'steel',w.tick*10)!;expect(commitSpikeTrapImpact(w,plan)).toBe(true);
  expect(p.animalRescue).toBeUndefined();expect(w.wildlife!.animals[0]).toBe(a);expect(a.state).toBe('downed');
  expect(a.motion).toEqual(p.motion);expect(a.path).toEqual([]);expect(w.piles).toEqual([]);
  expect(validateWorld(w)).toEqual([]);
});

test('a mech uses its real body and natural armor without biological roll or fresh ID',()=>{
  const w=medicalCamp(),m=fixtureMechanoid(w,14,16);w.rng=1;
  const before=serializeWorld(w),nextId=w.nextId,plan=planSpikeTrapImpact(w,combatTargetKey(m),'steel',w.tick*10)!;
  expect(plan.record.body).toBe('scyther');expect(plan.record.bloodLoss).toBe(0);expect(serializeWorld(w)).toBe(before);
  expect(plan.impacts.flatMap(i=>i.layers).every(i=>i.part.startsWith('scyther-'))).toBe(true);
  expect(commitSpikeTrapImpact(w,plan)).toBe(true);expect(w.mechanoids![0]).toBe(m);expect(w.nextId).toBe(nextId);
  expect(m.health).toEqual(plan.record);expect(m.stagger).toBeUndefined();expect(m.stun).toBeUndefined();
  expect(validateWorld(w)).toEqual([]);
});

test('a genuine mechanical fall is terminal without an animal death-on-downed draw',()=>{
  const w=medicalCamp(),m=fixtureMechanoid(w,14,16);m.health=createMechaMedicalRecord(w.tick);
  addResolvedInjury(m.health,'scyther-brain','crack',7000,()=>.999999);
  expect(medicalStatus(m.health)).toBe('mobile');expect(validateWorld(w)).toEqual([]);
  let plan:ReturnType<typeof planSpikeTrapImpact>;
  for(let seed=1;seed<=64&&!plan;seed++){w.rng=seed;const candidate=planSpikeTrapImpact(w,combatTargetKey(m),'steel',w.tick*10);if(candidate?.record.death?.cause==='downed')plan=candidate;}
  expect(plan).toBeDefined();
  const random={rng:w.rng},damage=20*(.8+.4*healthRandom(random)),draw=()=>healthRandom(random);
  let record=structuredClone(m.health),count=0;
  while(count<5&&!record.death){
    record=resolveUnarmoredMelee(record,{damage,kind:'stab'},draw,mechanoidProtection('sharp',damage*.015,draw,m.mechKind)).record;count++;
    if(!record.death&&medicalStatus(record)==='downed')record.death={tick:w.tick,cause:'downed'};
  }
  expect(plan!.record).toEqual(record);expect(plan!.rngAfter).toBe(random.rng);expect(plan!.impacts).toHaveLength(count);
  expect(commitSpikeTrapImpact(w,plan!)).toBe(true);expect(m.state).toBe('dead');expect(w.piles).toEqual([]);
  expect(validateWorld(w)).toEqual([]);
});

test('domestic and wild animals share the historical violent downed policy',()=>{
  const w=medicalCamp();
  w.resources.push({id:w.nextId++,kind:'berries',x:10,z:10,amount:10,growth:1,growthTick:w.tick});enableWildlife(w,1);const a=w.wildlife!.animals[0]!;a.food=.2;a.rest=1;
  // Identical genuine body and stream; possession alone does not invent the
  // Core faction exemption which the historical local projectile lacks.
  const wild=planSpikeTrapImpact(w,combatTargetKey(a),'steel',w.tick*10)!;
  a.domestic={since:w.tick,care:'best',tameness:1,nextDecay:w.tick+600};
  const domestic=planSpikeTrapImpact(w,combatTargetKey(a),'steel',w.tick*10)!;
  expect(domestic.record).toEqual(wild.record);expect(domestic.rngAfter).toBe(wild.rngAfter);
  expect(domestic.impacts.length).toBe(wild.impacts.length);
  expect(commitSpikeTrapImpact(w,domestic)).toBe(true);expect(w.wildlife!.animals[0]).toBe(a);
  expect(a.state).toBe(medicalStatus(domestic.record)==='mobile'?a.state:medicalStatus(domestic.record));
  expect(a.stagger).toBeUndefined();expect(a.flee).toBeUndefined();expect(w.piles).toEqual([]);
});
