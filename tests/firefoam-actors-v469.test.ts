import {expect,test} from 'vitest';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {applyFirefoamActor290,canApplyFirefoamActor290,advanceLocalMechFirefoam290,captureFirefoamWorldPawnIds290} from '../src/sim/firefoam-actor-290.ts';
import {advanceCoveredInFirefoam290,firefoamIgnitionFactor290,validCoveredInFirefoamField290,validCoveredInFirefoamState290} from '../src/sim/firefoam-actor-state-290.ts';
import {validFirefoamActorOwners290} from '../src/sim/firefoam-actor-save-290.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {advanceMedical} from '../src/sim/injury-evolution.ts';
import {validateMedicalRecord,validateMechanoidMedicalRecord} from '../src/sim/injury-validation.ts';
import {prepareSuspendedHumanResume271,medicalElapsedTicks271} from '../src/sim/suspended-human-clock-271.ts';
import {prepareWorldPawnLife256,worldPawnMothballReadiness256} from '../src/sim/world-pawn-life-256.ts';
import {prepareShipCasketResume277} from '../src/sim/ship-casket-clock-277.ts';
import {initialWorldPawns256,type WorldPawnOwner256} from '../src/sim/world-pawn-state-256.ts';
import type {Mechanoid} from '../src/sim/mechanoid-state.ts';
import type {MedicalContext,MedicalRecord} from '../src/sim/injury-types.ts';
import type {World} from '../src/sim/types.ts';

const foam=()=>({remainingCore:900});
const noDraw=()=>{throw Error('Firefoam has no random trial');};
const context:MedicalContext={phase:0,posture:'standing',starving:false};
function mech(w:World):Mechanoid {
 const m:Mechanoid={id:w.nextId++,mechKind:'scyther',x:12,z:12,state:'idle',path:[],heading:0,moveCooldown:0,planCooldown:0};
 (w.mechanoids??=[]).push(m);return m;
}

test('prepared physical custody excludes a held animal or mechanical patient from new wave acquisition without altering its dossier',()=>{
 const f=animalHaulingCamp459(),w=f.world,p=w.pawns[0]!,m=mech(w);delete f.animal.health;
 // Predicate control only: these declared carry states are not evidence of a
 // journey earned by a rescue or casket controller.
 p.animalRescue={animalId:f.animal.id,bedId:null,spot:{x:p.x,z:p.z},phase:'carry'} as never;
 const before=JSON.stringify(w);expect(canApplyFirefoamActor290(w,`animal:${f.animal.id}`)).toBe(false);expect(applyFirefoamActor290(w,`animal:${f.animal.id}`)).toBe(false);expect(JSON.stringify(w)).toBe(before);
 delete p.animalRescue;p.shipCasketTask277={action:'carry',patient:{kind:'mechanical',id:m.id},phase:'carry'} as never;
 const other=JSON.stringify(w);expect(canApplyFirefoamActor290(w,`mech:${m.id}`)).toBe(false);expect(JSON.stringify(w)).toBe(other);
});

test('scalar protection is prospective290 only and closes future291 without manufacturing absent state',()=>{
 const r={coveredInFirefoam290:foam()};expect(validCoveredInFirefoamField290(r,290)).toBe(true);
 for(const v of [1,194,256,289,291,290.5,NaN])expect(validCoveredInFirefoamField290(r,v)).toBe(false);
 expect(validCoveredInFirefoamField290({},289)).toBe(true);expect(validCoveredInFirefoamField290({},290)).toBe(true);expect(validCoveredInFirefoamField290({},291)).toBe(false);
 for(const remainingCore of [0,-1,901,.5,NaN,Infinity])expect(validCoveredInFirefoamState290({remainingCore})).toBe(false);
 for(const remainingCore of [1,10,899,900])expect(validCoveredInFirefoamState290({remainingCore})).toBe(true);
});

test('scalar ownundefined, hidden inherited symbol and accessor states fail without getter calls',()=>{
 let reads=0;const getter={};Object.defineProperty(getter,'coveredInFirefoam290',{enumerable:true,get(){reads++;return foam();}});
 const remaining={};Object.defineProperty(remaining,'remainingCore',{enumerable:true,get(){reads++;return 900;}});
 const hidden={};Object.defineProperty(hidden,'coveredInFirefoam290',{value:foam()});
 for(const value of [getter,hidden,Object.create({coveredInFirefoam290:foam()}),{coveredInFirefoam290:undefined},{coveredInFirefoam290:remaining},{coveredInFirefoam290:{...foam(),[Symbol('extra')]:1}},{coveredInFirefoam290:{...foam(),extra:1}}])expect(validCoveredInFirefoamField290(value,290)).toBe(false);
 expect(reads).toBe(0);
});

test('pure preflight and real healthy recipients create only the correct medical body without RNG or other counters',()=>{
 const f=animalHaulingCamp459(),w=f.world,m=mech(w),p=w.pawns[0]!;delete p.health;delete f.animal.health;
 const before=JSON.stringify(w),rng=w.rng,nextId=w.nextId;
 for(const key of [`pawn:${p.id}`,`animal:${f.animal.id}`,`mech:${m.id}`] as const)expect(canApplyFirefoamActor290(w,key)).toBe(true);
 expect(JSON.stringify(w)).toBe(before);
 for(const key of [`pawn:${p.id}`,`animal:${f.animal.id}`,`mech:${m.id}`] as const)expect(applyFirefoamActor290(w,key)).toBe(true);
 expect(p.health!.body).toBeUndefined();expect(f.animal.health!.body).toBe(f.animal.species);expect(m.health!.body).toBe('scyther');
 for(const r of [p.health!,f.animal.health!,m.health!]){expect(r.coveredInFirefoam290).toEqual(foam());expect(r.injuries).toEqual([]);expect(r.tick).toBe(w.tick);expect(firefoamIgnitionFactor290(r)).toBe(0);}
 expect([w.rng,w.nextId]).toEqual([rng,nextId]);expect(validateMechanoidMedicalRecord(m.health,290,'scyther')).toBeNull();
});

test('reapplication keeps the original acquired dossier and never stacks or changes injury IDs',()=>{
 const w=deconstructionCamp(1),p=w.pawns[0]!;delete p.health;expect(applyFirefoamActor290(w,`pawn:${p.id}`)).toBe(true);
 const record=p.health!;advanceCoveredInFirefoam290(record,150);const id=record.nextInjuryId,rng=w.rng;
 expect(record.coveredInFirefoam290!.remainingCore).toBe(750);expect(applyFirefoamActor290(w,`pawn:${p.id}`)).toBe(true);
 expect(p.health).toBe(record);expect(record.coveredInFirefoam290).toEqual(foam());expect([record.nextInjuryId,w.rng]).toEqual([id,rng]);
});

test('healthy medical fast path expires after exactly900 activeCore and never mutates from a pure stat read',()=>{
 const r=createMedicalRecord(10);r.coveredInFirefoam290=foam();const before=JSON.stringify(r);
 expect(firefoamIgnitionFactor290(r)).toBe(0);expect(JSON.stringify(r)).toBe(before);
 advanceMedical(r,89,context,noDraw);expect(r.coveredInFirefoam290!.remainingCore).toBe(10);
 advanceMedical(r,1,context,noDraw);expect(r.coveredInFirefoam290).toBeUndefined();expect(firefoamIgnitionFactor290(r)).toBe(1);
 expect(r.tick).toBe(100);
});

test('clinical slow path consumes only performed ticks and freezes at the actual terminal frontier',()=>{
 const r=createMedicalRecord(10);r.coveredInFirefoam290=foam();
 advanceMedical(r,90,context,noDraw,{step(current){current.death={tick:current.tick,cause:'trauma'};},commit(){}});
 expect(r.tick).toBe(11);expect(r.coveredInFirefoam290!.remainingCore).toBe(890);
 const terminal=JSON.stringify(r);advanceMedical(r,10,context,noDraw);expect(JSON.stringify(r)).toBe(terminal);
});

test('human suspension moves only civil time and resumed clinical time consumes no held gap',()=>{
 const w=deconstructionCamp(1),p=w.pawns[0]!;p.health=createMedicalRecord(w.tick);p.health.coveredInFirefoam290=foam();p.cryptosleepHeldAt271=w.tick;
 const plan=prepareSuspendedHumanResume271(p,w.tick,w.tick+1000);expect(plan.commit()).toBe(true);
 expect(p.health.coveredInFirefoam290).toEqual(foam());expect(medicalElapsedTicks271(p.health,w.tick+1000)).toBe(0);
 advanceMedical(p.health,1,{...context,civilTick:w.tick+1001},noDraw);expect(p.health.coveredInFirefoam290!.remainingCore).toBe(890);
});

test('namespace, absent, terminal, historical and frozen recipients refuse without changing originals',()=>{
 const w=deconstructionCamp(1),p=w.pawns[0]!;p.health=createMedicalRecord(w.tick);p.health.coveredInFirefoam290=foam();
 for(const key of [`animal:${p.id}`,'pawn:999999'] as const){const before=JSON.stringify(w);expect(applyFirefoamActor290(w,key)).toBe(false);expect(JSON.stringify(w)).toBe(before);}
 Object.freeze(p.health);const frozen=JSON.stringify(w);expect(canApplyFirefoamActor290(w,`pawn:${p.id}`)).toBe(false);expect(applyFirefoamActor290(w,`pawn:${p.id}`)).toBe(false);expect(JSON.stringify(w)).toBe(frozen);
 const old=deconstructionCamp(1);Object.assign(old,{schemaVersion:289});const before=JSON.stringify(old);expect(applyFirefoamActor290(old,`pawn:${old.pawns[0]!.id}`)).toBe(false);expect(JSON.stringify(old)).toBe(before);
});

test('mechanical passive countdown preserves sparse health.tick, skips absent-frontier arrivals and does not consume creation step',()=>{
 const w=deconstructionCamp(1),m=mech(w);expect(applyFirefoamActor290(w,`mech:${m.id}`)).toBe(true);const tick=m.health!.tick;
 advanceLocalMechFirefoam290(w,new Set());expect(m.health!.coveredInFirefoam290).toEqual(foam());
 advanceLocalMechFirefoam290(w,new Set([m.id]));expect(m.health!.coveredInFirefoam290!.remainingCore).toBe(890);expect(m.health!.tick).toBe(tick);
 m.shipCryptosleepHeldAt277=w.tick;advanceLocalMechFirefoam290(w,new Set([m.id]));expect(m.health!.coveredInFirefoam290!.remainingCore).toBe(890);
 delete m.shipCryptosleepHeldAt277;m.state='dead';advanceLocalMechFirefoam290(w,new Set([m.id]));expect(m.health!.coveredInFirefoam290!.remainingCore).toBe(890);
});

test('mechanical WorldPawn new-entry snapshot skips only the effect while the real row frontier still advances',()=>{
 const w=deconstructionCamp(1),m=mech(w);expect(applyFirefoamActor290(w,`mech:${m.id}`)).toBe(true);
 const state=initialWorldPawns256();w.worldPawns=state;const ids=captureFirefoamWorldPawnIds290(w);
 const row:WorldPawnOwner256={kind:'mechanical',actor:m,mode:'active',clockCore:0,mechanicalTimersAtCore259:0,enteredAtAbsCore:0,factionId:null,originMapId:null,context:{seed:w.seed,width:w.width,height:w.height},items:[],packed:[]};
 state.owners.push(row);const random={rng:123};const first=prepareWorldPawnLife256(state,10,random,290,ids);expect(first.ok).toBe(true);if(!first.ok)throw Error(first.reason);first.commit();
 expect(row.clockCore).toBe(10);expect(m.health!.coveredInFirefoam290).toEqual(foam());expect(m.health!.tick).toBe(w.tick);
 const next=prepareWorldPawnLife256(state,20,random,290,captureFirefoamWorldPawnIds290(w));expect(next.ok).toBe(true);if(!next.ok)throw Error(next.reason);next.commit();
 expect(row.clockCore).toBe(20);expect(m.health!.coveredInFirefoam290!.remainingCore).toBe(890);expect(m.health!.tick).toBe(w.tick);expect(random.rng).toBe(123);
});

test('the medical validator accepts only the new component on all body families and leaves mechanical diseases forbidden',()=>{
 const human=createMedicalRecord(0);human.coveredInFirefoam290=foam();
 expect(validateMedicalRecord(human,true,true,true,true,false,false,true,true,true,true,true,290)).toBeNull();
 expect(validateMedicalRecord(human,true,true,true,true,false,false,true,true,true,true,true,289)).not.toBeNull();
 const f=animalHaulingCamp459();expect(applyFirefoamActor290(f.world,`animal:${f.animal.id}`)).toBe(true);
 expect(validateMedicalRecord(f.animal.health,true,true,true,true,true,false,true,true,true,true,true,290)).toBeNull();
 const w=deconstructionCamp(1),m=mech(w);expect(applyFirefoamActor290(w,`mech:${m.id}`)).toBe(true);
 expect(validateMechanoidMedicalRecord(m.health,290,'scyther')).toBeNull();m.health!.heatstroke=1;expect(validateMechanoidMedicalRecord(m.health,290,'scyther')).not.toBeNull();
});

test('frozen custody and corpse dossiers conserve the same relative state while initial-held and mothballed acquisitions are refused',()=>{
 const record:MedicalRecord={...createMedicalRecord(0),coveredInFirefoam290:foam()};
 const envelopes=[{pawns:[{health:record}]},{structures:[{cryptosleep:{human:{health:record}}}]},{packed:[{building:{shipCryptosleep277:{occupant:{kind:'mechanical',mech:{health:record}}}}}]},
  {worldGroups:{losses:[{pawn:{health:record}}],animalLosses:[{animal:{health:record}}],abandonedContents:[{humans:[{pawn:{health:record}}],animals:[{animal:{health:record}}]}]}},
  {worldPawns:{owners:[{mode:'active',actor:{health:record}}],heldShipCaskets277:[{casket:{shipCryptosleep277:{occupant:{kind:'animal',animal:{health:record}}}}}]}},
  {piles:[{corpse:{health:record}},{mechCorpse:{health:record}}]}, {dynamic:{pawns:{removed:[],upserted:[{health:record}]}}}];
 for(const raw of envelopes){const before=JSON.stringify(raw);expect(validFirefoamActorOwners290(raw,290)).toBe(true);expect(validFirefoamActorOwners290(raw,289)).toBe(false);expect(JSON.stringify(raw)).toBe(before);}
 expect(validFirefoamActorOwners290({worldPawns:{owners:[{mode:'mothballed',actor:{health:record}}]}},290)).toBe(false);
 expect(validFirefoamActorOwners290({startingArrival:{phase:'pending',pods:[{pawn:{health:record}}]}},290)).toBe(false);
 expect(worldPawnMothballReadiness256({kind:'animal',actor:{health:record}} as WorldPawnOwner256)).toBe('blocked');
});

test('custody validation never reads grid physiology or a hidden medical getter',()=>{
 let reads=0;const raw={pawns:[{health:{...createMedicalRecord(0),coveredInFirefoam290:foam()}}]};
 for(const key of ['tiles','resources','planet'])Object.defineProperty(raw,key,{enumerable:true,get(){reads++;throw Error('No grid');}});
 expect(validFirefoamActorOwners290(raw,290)).toBe(true);
 const actor={};Object.defineProperty(actor,'health',{enumerable:true,get(){reads++;throw Error('No health getter');}});
 expect(validFirefoamActorOwners290({pawns:[actor]},290)).toBe(false);expect(reads).toBe(0);
});

test('spatial mechanical suspension keeps the same component despite later sparse clock rebasing',()=>{
 const w=deconstructionCamp(1),m=mech(w);expect(applyFirefoamActor290(w,`mech:${m.id}`)).toBe(true);m.shipCryptosleepHeldAt277=w.tick;
 const plan=prepareShipCasketResume277({kind:'mechanical',mech:m},w.tick,w.tick+1000);expect(plan.commit()).toBe(true);
 expect(m.health!.coveredInFirefoam290).toEqual(foam());expect(m.health!.tick).toBe(w.tick);
});
