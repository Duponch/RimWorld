import {expect,test} from 'vitest';
import {initialNativeWorldPawns256,initialWorldPawns256,type WorldPawnOwner256} from '../src/sim/world-pawn-state-256';
import {validWorldPawnsEnvelope256} from '../src/sim/world-pawn-save-256';
import {orderedWorldPawnRows256,validPhysicalWorldPawnOrder256,freezeAdmittedNativeWorldPawnOrder256,captureNativeWorldPawnBirth256,sameNativeWorldPawnBirth256} from '../src/sim/world-pawn-native-order-256';
import {preparePassedToWorld256} from '../src/sim/world-pawn-transition-256';
import {prepareWorldAnimalRedress256} from '../src/sim/world-pawn-redress-256';
import {prepareWorldAnimalGeneration256} from '../src/sim/world-pawn-generation-256';
import {prepareWorldPawnLife256} from '../src/sim/world-pawn-life-256';
import {attachGeneratedAnimalGrowth256} from '../src/sim/animal-growth-runtime-256';
import {INITIAL_ANIMAL_FACTS_256} from '../src/sim/initial-animal-data-256';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256';
import {BLOOD_UNIT} from '../src/sim/injury-rules';
import type {WorldFactionRegistry256} from '../src/sim/world-faction-state';
import type {WildAnimal} from '../src/sim/wildlife-state';
import {startingPawn} from '../src/sim/starting-pawns';
import {originalAncientHumanWord256,ancientHumanNameLabel256} from '../src/sim/ancient-human-name-256';
import {createMedicalRecord} from '../src/sim/injury-state';
import {nativeHumanBiologicalCore256,validHumanAgeForPawn256} from '../src/sim/native-human-identity-256';
import {nativeHumanHealthScaleForCore256} from '../src/sim/native-human-clinical-scale-256';
/** Prepared scalar owners only; no native birth/history, whole World, camp
 * or faction-generation qualification is asserted by this fixture. */
const registry:WorldFactionRegistry256={revision:1,contentModel:'original-faction-content-v1',generatedAt:0,playerFactionId:1,nextFactionId:2,nextSettlementId:1,factions:[{id:1,def:'PlayerColony',hidden:false,name:'Préparé',randomKey:1,colorFromSpectrum:0,leaderOwnerId:null}],relations:[],settlements:[],leaders:[]};
function row(id:number,atCore=0):Extract<WorldPawnOwner256,{kind:'animal'}>{const actor:WildAnimal={id,species:'hare',sex:'female',ageTicks:1000000,x:1,z:1,food:.1,rest:.8,state:'idle',path:[],nextDecision:Math.floor(atCore/10)+1};attachGeneratedAnimalGrowth256(actor,atCore,256);return {kind:'animal',actor,factionId:null,originMapId:0,context:{seed:7,width:32,height:32},clockCore:atCore,enteredAtAbsCore:7200000+atCore,mode:'active',items:[],packed:[]};}
const random=()=>({value:()=>0,float:(a:number,_b:number)=>Math.fround(a),integer:(a:number,_b:number)=>a});
function born(){return initialNativeWorldPawns256({atCore:0,atAbsCore:7200000,firstThingId:1});}
function passed(state:ReturnType<typeof born>,r:Extract<WorldPawnOwner256,{kind:'animal'}>):Extract<WorldPawnOwner256,{kind:'animal'}>{const p=preparePassedToWorld256(state,r,registry,random(),{situation:'Free'});if(!p.ok)throw Error(p.reason);p.commit();if(p.row.kind!=='animal')throw Error('Prepared animal changed kind');return p.row;}
test('only the explicit native constructor opens slot history; old absence stays absent',()=>{
 expect(Object.hasOwn(initialWorldPawns256(),'nativeOrder')).toBe(false);const s=born();expect(s.nativeOrder!.alive.slots).toEqual([]);expect(validWorldPawnsEnvelope256({worldPawns:s},256,0,200)).toBe(true);expect(validWorldPawnsEnvelope256({worldPawns:s},255,0,200)).toBe(false);
 expect(validWorldPawnsEnvelope256({worldPawns:{...initialWorldPawns256(),nativeOrder:undefined}},256,0,200)).toBe(false);expect(()=>initialNativeWorldPawns256({atCore:1,atAbsCore:7200000,firstThingId:1})).toThrow();
});
test('real Pass/removal/repass retains same originals, physical ownership and native hole order',()=>{
 const s=born(),a=passed(s,row(101)),b=passed(s,row(102)),c=passed(s,row(103)),order=s.nativeOrder;
 const removal=prepareWorldAnimalRedress256(s,b,INITIAL_ANIMAL_FACTS_256.Hare,{tick:0,cell:{x:5,z:6},random:random(),situation:()=> 'Free'});if(!removal.ok)throw Error(removal.reason);const returned=removal.commit();expect(returned).toBe(b.actor);expect(s.nativeOrder).not.toBe(order);expect(s.nativeOrder!.alive.slots).toEqual([101,null,103]);
 const d=passed(s,row(104));expect(s.owners.map(r=>r.actor.id)).toEqual([101,103,104]);expect(orderedWorldPawnRows256(s)).toEqual([a,d,c]);expect(s.owners[0]!.actor).toBe(a.actor);expect(validPhysicalWorldPawnOrder256(s,200)).toBe(true);
});
test('a private two-reuse1200 phase changes no owner until commit and carries both actual holes',()=>{
 const s=born(),a=passed(s,row(101)),b=passed(s,row(102)),before=JSON.stringify(s),phase=prepareWorldAnimalGeneration256(s,{tick:0,nextId:200,situation:()=> 'Free',weight:()=>1,random:random()});
 expect(phase.generate(INITIAL_ANIMAL_FACTS_256.Hare,{x:5,z:6}).status).toBe('ready');expect(phase.generate(INITIAL_ANIMAL_FACTS_256.Hare,{x:6,z:6}).status).toBe('ready');expect(JSON.stringify(s)).toBe(before);expect(phase.candidateState.nativeOrder!.alive.slots).toEqual([]);const originals=phase.commit();expect(originals).toEqual([a.actor,b.actor]);expect(originals[0]).toBe(a.actor);expect(originals[1]).toBe(b.actor);expect(s.owners).toEqual([]);expect(s.nativeOrder!.alive).toEqual({slots:[],free:[]});
});
test('cold restore retains supplied slots, rejects membership/mode forgery and freezes before runtime',()=>{
 const s=born();passed(s,row(101));const owner={nextId:200,worldPawns:JSON.parse(JSON.stringify(s)) as typeof s};expect(validWorldPawnsEnvelope256(owner,256,0,200)).toBe(true);freezeAdmittedNativeWorldPawnOrder256(owner);expect(owner.worldPawns.nativeOrder).toEqual(s.nativeOrder);expect(Object.isFrozen(owner.worldPawns.nativeOrder!.alive.slots)).toBe(true);
 const wrong=JSON.parse(JSON.stringify(s)) as typeof s;wrong.owners[0]!.mode='mothballed';expect(validWorldPawnsEnvelope256({worldPawns:wrong},256,0,200)).toBe(false);const missing=JSON.parse(JSON.stringify(s)) as typeof s;missing.owners=[];expect(validPhysicalWorldPawnOrder256(missing,200)).toBe(false);
 const historical={nextId:200,worldPawns:initialWorldPawns256()};freezeAdmittedNativeWorldPawnOrder256(historical);expect(Object.hasOwn(historical.worldPawns,'nativeOrder')).toBe(false);
});
test('a stale slot successor refuses before original transfer or RNG changes',()=>{
 const s=born(),a=row(101),plan=preparePassedToWorld256(s,a,registry,random(),{situation:'Free'});if(!plan.ok)throw Error(plan.reason);passed(s,row(102));const before=JSON.stringify(s),actor=JSON.stringify(a.actor);expect(()=>plan.commit()).toThrow('Stale');expect(JSON.stringify(s)).toBe(before);expect(JSON.stringify(a.actor)).toBe(actor);
});
test('actual human Pass keeps the SAME original, NameTriple, biological sex/remainder and held items',()=>{
 const s=born(),actor=startingPawn(101,'Préparation de transport, pas naissance native',1,1,0,55,123,0),name={first:originalAncientHumanWord256(1,100),nick:originalAncientHumanWord256(2,100),last:originalAncientHumanWord256(3,100),nickSet:true};
 actor.name=ancientHumanNameLabel256(name);actor.nativeHuman={revision:1,gender:'Female',name,biologicalCoreRemainder:9};actor.health=createMedicalRecord(0);actor.health.humanHealthScale=nativeHumanHealthScaleForCore256(nativeHumanBiologicalCore256(actor));
 const core=nativeHumanBiologicalCore256(actor),header=JSON.stringify(actor.nativeHuman),input:WorldPawnOwner256={kind:'human',actor,factionId:1,originMapId:0,context:{seed:7,width:32,height:32},clockCore:0,enteredAtAbsCore:7200000,mode:'active',items:[],packed:[],keepForever:true,startingPawnLeftBehind:true},before=JSON.stringify(input);
 const plan=preparePassedToWorld256(s,input,registry,random(),{situation:'StartingPawnLeftBehind'});if(!plan.ok)throw Error(plan.reason);expect(JSON.stringify(input)).toBe(before);plan.commit();expect(s.owners[0]!.actor).toBe(actor);expect(s.owners[0]!.items).toBe(input.items);expect(s.owners[0]!.packed).toBe(input.packed);expect(JSON.stringify(actor.nativeHuman)).toBe(header);expect(nativeHumanBiologicalCore256(actor)).toBe(core);expect(validHumanAgeForPawn256(actor,256)).toBe(true);
});
test('confirmed epoch birth continuity never substitutes for RAW/full ownership validation',()=>{
 const s=born(),proof=captureNativeWorldPawnBirth256(s);expect(sameNativeWorldPawnBirth256(proof,JSON.parse(JSON.stringify(s)))).toBe(true);expect(sameNativeWorldPawnBirth256(proof,initialWorldPawns256())).toBe(false);expect(sameNativeWorldPawnBirth256(undefined,s)).toBe(false);expect(sameNativeWorldPawnBirth256(undefined,initialWorldPawns256())).toBe(true);
 const changed=JSON.parse(JSON.stringify(s)) as typeof s;Object.defineProperty(changed.nativeOrder!,'birth',{value:{...changed.nativeOrder!.birth,atAbsCore:7200010},enumerable:true});expect(sameNativeWorldPawnBirth256(proof,changed)).toBe(false);expect(Object.isFrozen(proof)).toBe(true);
});
test('real mothball commit changes the native set with the same clinical original',()=>{
 const s=born();s.atCore=14990;const a=passed(s,row(101,14990));a.actor.nextDecision=1500;if(a.kind!=='animal')throw Error('Prepared animal changed kind');const actor=a.actor,rng={rng:123},before=JSON.stringify(s),plan=prepareWorldPawnLife256(s,15000,rng);if(!plan.ok)throw Error(plan.reason);expect(JSON.stringify(s)).toBe(before);plan.commit();expect(a.actor).toBe(actor);expect(a.mode).toBe('mothballed');expect(s.nativeOrder!.alive.slots).toEqual([]);expect(s.nativeOrder!.mothballed.slots).toEqual([101]);expect(validWorldPawnsEnvelope256({worldPawns:s},256,15000,200)).toBe(true);
});
test('true clinical death moves its actual native slot once, and cold terminal reprise cannot recreate an alive member',()=>{
 const s=born();s.atCore=1000;const input=row(17,1000);input.actor.nextDecision=101;const h=input.actor.health=createAnimalMedicalRecord256({schemaVersion:256,tick:100},input.actor);h.injuries.push({id:1,part:'torso',kind:'cut',severity:1000,bornAt:100});h.nextInjuryId=2;h.bloodLoss=BLOOD_UNIT-1;
 const a=passed(s,input),actor=a.actor,rng={rng:123},plan=prepareWorldPawnLife256(s,1010,rng);if(!plan.ok)throw Error(plan.reason);plan.commit();expect(a.actor).toBe(actor);expect(a.mode).toBe('dead');expect(a.actor.health!.death?.cause).toBe('blood-loss');expect(s.nativeOrder!.alive.slots).toEqual([]);expect(s.nativeOrder!.dead.slots).toEqual([17]);
 const owner={nextId:200,worldPawns:JSON.parse(JSON.stringify(s)) as typeof s};expect(validWorldPawnsEnvelope256(owner,256,1010,200)).toBe(true);freezeAdmittedNativeWorldPawnOrder256(owner);const before=JSON.stringify(owner.worldPawns.owners[0]);const resumed=prepareWorldPawnLife256(owner.worldPawns,1020,{rng:rng.rng});if(!resumed.ok)throw Error(resumed.reason);resumed.commit();expect(JSON.stringify(owner.worldPawns.owners[0])).toBe(before);expect(owner.worldPawns.nativeOrder!.dead.slots).toEqual([17]);expect(owner.worldPawns.nativeOrder!.alive.slots).toEqual([]);
});
