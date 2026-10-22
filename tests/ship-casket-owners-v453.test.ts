import {expect,test} from 'vitest';
import {shipCasketServiceCamp277,shipCasketAnimal277} from './scenarios/ship-casket-service-v453.ts';
import {prepareShipCasketResume277} from '../src/sim/ship-casket-clock-277.ts';
import {validShipCasketHistoricalTransport277} from '../src/sim/ship-casket-save-277.ts';
import {validateShipCasketOwners277,registerShipCasketThingIds277} from '../src/sim/ship-casket-owner-save-277.ts';
import {validatePawnRecordShape} from '../src/sim/pawn-record-save.ts';
import {validMechanoidShape} from '../src/sim/mechanoid-save.ts';
import {validMechanoidRangedShape} from '../src/sim/mechanoid-ranged-save.ts';
import {validMechanoidEmpState} from '../src/sim/emp-save.ts';
import {empAdaptedUntilCore277} from '../src/sim/emp-state.ts';
import {mechanoidDefinition} from '../src/sim/mechanoid-definition.ts';
import {createMechaMedicalRecord} from '../src/sim/mechanoid-health.ts';
import {actualMechanicalBirthFaction259} from '../src/sim/mechanoid-world-faction-259.ts';
import {startTravel} from '../src/sim/movement.ts';
import {syncShipCasketPassenger277,shipCasketCarrierOf277} from '../src/sim/ship-casket-carry-277.ts';
import {controlledInjury} from './scenarios/health.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {validShootingShape} from '../src/sim/shooting-save.ts';
import {validAnimalClinicalOwner256} from '../src/sim/animal-clinical-age-v256.ts';
import {medicalCivilTick271,medicalElapsedTicks271} from '../src/sim/suspended-human-clock-271.ts';
import {advanceMedical} from '../src/sim/injury-evolution.ts';
import {validateMedicalRecord} from '../src/sim/injury-validation.ts';
import {addResolvedInjury} from '../src/sim/injury-state.ts';
import {validAnesthetic} from '../src/sim/anesthetic.ts';
import {validAlcoholHeader265} from '../src/sim/alcohol-state-265.ts';
import {validToxicBuildupHeader256} from '../src/sim/toxic-buildup-256.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import type {Mechanoid} from '../src/sim/mechanoid-state.ts';

test('flesh-animal suspension keeps actual dose/injury dates and active age, then advances only the next real clinical tick',()=>{
 const {w}=shipCasketServiceCamp277(1),a=shipCasketAnimal277(w),h=a.health!;
 addResolvedInjury(h,'left-rear-leg','bruise',100,()=>.999999);a.shipCryptosleepHeldAt277=w.tick;
 const before=structuredClone(h),age=a.ageTicks,plan=prepareShipCasketResume277({kind:'animal',animal:a},w.tick,w.tick+1000);
 expect(h).toEqual(before);expect(plan.current()).toBe(true);expect(plan.commit()).toBe(true);expect(plan.commit()).toBe(false);
 expect(h.tick).toBe(before.tick);expect(h.injuries).toEqual(before.injuries);expect(h.anesthetic?.bornAt).toBe(before.anesthetic?.bornAt);expect(h.anesthetic?.severity).toBe(before.anesthetic?.severity);expect(a.ageTicks).toBe(age);
 expect(medicalCivilTick271(h)).toBe(1000);expect(medicalElapsedTicks271(h,1001)).toBe(1);expect(validAnesthetic(h.anesthetic,h.tick,true,a.id%20,1000,277)).toBe(true);
 expect(validAlcoholHeader265(h,277,false)).toBe(true);expect(validToxicBuildupHeader256(h,277)).toBe(true);
 expect(validAlcoholHeader265(h,276,false)).toBe(false);expect(validToxicBuildupHeader256(h,276)).toBe(false);
 expect(validAlcoholHeader265({...h,alcohol:{bornAt:0,high:0,tolerance:0,hangover:0,lastDoseTick:0,dosesToday:1}},277,false)).toBe(false);
 expect(validateMedicalRecord(h,true,true,true,true,true,true,true,true,true,true,true,277)).toBeNull();expect(validateMedicalRecord(h,true,true,true,true,true,true,true,true,true,true,true,276)).not.toBeNull();
 expect(validAnimalClinicalOwner256(h,a.species,age,1000)).toBe(true);
 advanceMedical(h,1,{phase:a.id%60,posture:'ground',starving:false},()=>.999999);
 expect(h.tick).toBe(before.tick+1);expect(medicalCivilTick271(h)).toBe(1001);expect(h.injuries.map(i=>i.bornAt)).toEqual(before.injuries.map(i=>i.bornAt));
});

test('human post-shot recovery pauses with its actual existing Core clock and factual start',()=>{
 const {actor:p}=shipCasketServiceCamp277(1);p.shipCryptosleepHeldAt277=0;p.shooting={order:null,stance:{phase:'cooldown',startedAtCore:0,endsAtCore:96,clock:{lastAdvancedAtCore:0,pausedCore:0}}};
 expect(validShootingShape(p.shooting,277,0)).toBe(true);const plan=prepareShipCasketResume277({kind:'human',pawn:p},0,1000);expect(plan.commit()).toBe(true);
 expect(p.shooting.stance).toEqual({phase:'cooldown',startedAtCore:0,endsAtCore:10096,clock:{lastAdvancedAtCore:10000,pausedCore:10000}});expect(validShootingShape(p.shooting,277,1000)).toBe(true);
});

test('mechanical EMP adaptation and ranged recovery resume without clinical aging or sickness',()=>{
 const m:Mechanoid={id:5,mechKind:'lancer',x:1,z:1,state:'idle',path:[],heading:0,moveCooldown:0,planCooldown:0,shipCryptosleepHeldAt277:0,
  emp:{lastAtCore:0,adaptedUntilCore:2200,stunUntilCore:1350},ranged:{order:null,stance:{phase:'cooldown',targetKey:'pawn:4',startedAtCore:0,lastAdvancedAtCore:0,remainingCore:162}}};
 const plan=prepareShipCasketResume277({kind:'mechanical',mech:m},0,1000);expect(plan.current()).toBe(true);expect(plan.commit()).toBe(true);
 expect(m.emp).toEqual({lastAtCore:0,adaptedUntilCore:2200,stunUntilCore:1350,suspendedCore277:10000});expect(empAdaptedUntilCore277(m.emp!)-10000).toBe(2200);expect(validMechanoidEmpState(m.emp,277,1000)).toBe(true);expect(validMechanoidEmpState(m.emp,276,1000)).toBe(false);
 expect(m.ranged!.stance).toMatchObject({startedAtCore:0,lastAdvancedAtCore:10000,remainingCore:162});expect(validMechanoidRangedShape(m.ranged,'lancer',277,1000)).toBe(true);expect(m.health?.cryptosleepSickness).toBeUndefined();expect(validMechanoidShape(m,277,1000)).toBe(false);
});

test('one original holder rejects duplicate actors/local markers and old/future transport without a resource rescan',()=>{
 const {w,actor:p,casket:c}=shipCasketServiceCamp277(1);p.shipCryptosleepHeldAt277=w.tick;w.pawns=[];c.shipCryptosleep277.occupant={kind:'human',pawn:p};
 expect(validateWorld(w)).toEqual([]);expect(validatePawnRecordShape(p as unknown as Record<string,unknown>,w,277).some(e=>e.includes('suspension authority'))).toBe(true);
 const ids=new Set([c.id]),resources=w.resources;let reads=0;Object.defineProperty(w,'resources',{configurable:true,enumerable:true,get(){reads++;return resources;}});
 expect(registerShipCasketThingIds277(w,ids)).toEqual([]);expect(reads).toBe(0);Object.defineProperty(w,'resources',{configurable:true,enumerable:true,writable:true,value:resources});
 expect(ids.has(p.id)).toBe(true);w.pawns.push(p);expect(validateShipCasketOwners277(w).length).toBeGreaterThan(0);w.pawns=[];
 const text=serializeWorld(w);expect(serializeWorld(deserializeWorld(text))).toBe(text);const packet=new SnapshotEncoder().encode(w,0,0,true),decoder=new SnapshotDecoder();expect(decoder.adopt(structuredClone(packet)).status).toBe('applied');
 for(const version of [276,278])expect(validShipCasketHistoricalTransport277(w,version)).toBe(false);
 const bad=structuredClone(packet);if(bad.kind!=='checkpoint')throw Error('Checkpoint required');bad.world.pawns.push(structuredClone(p));expect(new SnapshotDecoder().adopt(bad).status).toBe('resync');
});

test.each(['lancer','pikeman']as const)('%s keeps a real human carrier edge through RAW/public and release, without changing autonomous or historical speed',kind=>{
 const {w,actor,casket}=shipCasketServiceCamp277(1),health=createMechaMedicalRecord(w.tick,kind);
 // Declared nonviolent clinical original: remove only non-vital legs. The
 // checkpoint below exercises edge ownership, not a played capture/pickup.
 const legs=kind==='lancer'?['lancer-left-leg','lancer-right-leg']as const:['pikeman-left-front-leg','pikeman-right-front-leg','pikeman-left-rear-leg','pikeman-right-rear-leg']as const;
 for(const part of legs)addResolvedInjury(health,part,'crack',100000,()=>.999999);
 const faction=actualMechanicalBirthFaction259(w.worldFactions),mech:Mechanoid={id:w.nextId++,mechKind:kind,x:actor.x,z:actor.z,state:'downed',path:[],heading:0,moveCooldown:0,planCooldown:0,health,...faction?{worldFaction259:faction}:{}};
 w.mechanoids=[mech];expect(validateWorld(w)).toEqual([]);
 // A minor actual human injury makes the real captured factor explicit, so
 // the slow Pikeman's old ceiling is exercised rather than an absent default.
 controlledInjury(w,actor,'left-leg',1000);expect(startTravel(w,actor,{x:actor.x+1,z:actor.z})).toBe(true);
 actor.path=Array.from({length:15-actor.x},(_,i)=>({x:actor.x+i+1,z:actor.z}));actor.state='moving';actor.shipCasketTask277={casketId:casket.id,action:'carry',phase:'carry',patient:{kind:'mechanical',id:mech.id},progressCore:0,lastWorkedAt:w.tick};
 syncShipCasketPassenger277(w,actor);expect(shipCasketCarrierOf277(w,{kind:'mechanical',id:mech.id})).toBe(actor);const expected=structuredClone(actor.motion!);delete expected.snowEntryPending;expect(mech.motion).toEqual(expected);expect(mech.motion).not.toBe(actor.motion);
 const speed=mech.motion!.speedFactor!;expect(speed).toBeGreaterThan(2.5/4.6);expect(speed).toBeLessThan(1);expect(validMechanoidShape(mech,277,w.tick)).toBe(true);
 expect(validMechanoidShape(mech,276,w.tick)).toBe(kind==='lancer');
 if(kind==='pikeman'){
  expect(speed).toBeGreaterThan(mechanoidDefinition(kind).moveSpeed/4.6);expect(validMechanoidShape(mech,278,w.tick)).toBe(false);
  expect(validMechanoidShape({...mech,state:'moving',path:[{x:mech.x+1,z:mech.z}]},277,w.tick)).toBe(false);
 }
 expect(validateWorld(w)).toEqual([]);const text=serializeWorld(w);expect(serializeWorld(deserializeWorld(text))).toBe(text);
 for(const schemaVersion of [276,278])expect(()=>deserializeWorld(JSON.stringify({...w,schemaVersion}))).toThrow();
 const packet=new SnapshotEncoder().encode(w,0,0,true);expect(new SnapshotDecoder().adopt(structuredClone(packet)).status).toBe('applied');
 const edge=structuredClone(mech.motion);expect(applyCommand(w,{type:'clear-orders',pawnId:actor.id}).ok).toBe(true);expect(actor.shipCasketTask277).toBeUndefined();expect(shipCasketCarrierOf277(w,{kind:'mechanical',id:mech.id})).toBeUndefined();expect(mech.motion).toEqual(edge);
 expect(validateWorld(w)).toEqual([]);const released=serializeWorld(w);expect(serializeWorld(deserializeWorld(released))).toBe(released);
 expect(new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,0,true))).status).toBe('applied');
 stepWorld(w,Math.ceil(edge!.end-w.tick)+1);expect(validateWorld(w)).toEqual([]);expect(mech.motion?.end??0).toBeLessThanOrEqual(w.tick);
});
