import {describe,it,expect} from 'vitest';
import {advanceWorldPawnRow256,prepareWorldPawnLife256,prepareWorldPawnRemoval256} from '../src/sim/world-pawn-life-256';
import {prepareWorldAnimalGeneration256} from '../src/sim/world-pawn-generation-256';
import {prepareWorldAnimalRedress256} from '../src/sim/world-pawn-redress-256';
import {INITIAL_ANIMAL_FACTS_256} from '../src/sim/initial-animal-data-256';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256';
import {constructNativeWorldPawnOrder256,passNativeWorldPawnOrder256,mothballNativeWorldPawnOrder256} from '../src/sim/native-world-pawn-order-256';
import type {WorldPawnOwner256,WorldPawnsState256} from '../src/sim/world-pawn-state-256';
import type {WildAnimal} from '../src/sim/wildlife-state';
// Prepared scalar animal owner only, not a World, birthday/medical native
// capture or replacement cohort. Matches the refused interval's age arithmetic.
function fixture(){
 const actor:WildAnimal={id:17,species:'squirrel',sex:'female',ageTicks:1439004,ageCoreRemainder:3,x:1,z:1,food:.1,rest:.8,state:'idle',path:[],nextDecision:9001,wander:{revision:1,nextMoveOrderIsWait:true},growthTracker:{revision:1,value:1,nextCheckCore:null}};
 const row:Extract<WorldPawnOwner256,{kind:'animal'}>={kind:'animal',actor,factionId:null,originMapId:1,context:{seed:7,width:32,height:32},clockCore:90000,enteredAtAbsCore:2850750,mode:'mothballed',free:true,items:[],packed:[]};
 const state:WorldPawnsState256={revision:1,atCore:104990,lastSuccessfulCore:90210,currentRate:1,owners:[row]},rng={rng:123};return {actor,row,state,rng};
}
const blocked=(f:ReturnType<typeof fixture>,version:number)=>{const before=JSON.stringify(f),plan=prepareWorldPawnLife256(f.state,105000,f.rng,version);expect(plan).toMatchObject({ok:false,reason:expect.stringContaining('birthday')});expect(JSON.stringify(f)).toBe(before);};
describe('declared provisional263 mothballed animal continuation',()=>{
 it('stages and commits only existing age/growth, keeping identity, owner and no clinical/mind creation or RNG',()=>{
  const f=fixture(),before=JSON.stringify(f),mind=JSON.stringify(f.actor.wander),plan=prepareWorldPawnLife256(f.state,105000,f.rng,263);expect(plan.ok).toBe(true);if(!plan.ok)throw Error(plan.reason);
  expect(JSON.stringify(f)).toBe(before);expect(plan.notices).toEqual([]);plan.commit();expect(f.state.owners[0]).toBe(f.row);expect(f.row.actor).toBe(f.actor);expect(f.actor.ageTicks).toBe(1440504);expect(f.actor.ageCoreRemainder).toBe(3);expect(f.actor.growthTracker).toEqual({revision:1,value:1,nextCheckCore:null});expect(JSON.stringify(f.actor.wander)).toBe(mind);expect(f.actor.health).toBeUndefined();expect(f.row.mode).toBe('mothballed');expect(f.row.free).toBe(true);expect(f.row.originMapId).toBe(1);expect(f.row.clockCore).toBe(105000);expect(f.state.atCore).toBe(105000);expect(f.rng.rng).toBe(123);expect(()=>plan.commit()).toThrow('Stale');
 });
 it('preserves real permanent injury severity/tend/scar and the entire frozen clinical dossier',()=>{
  const f=fixture(),h=f.actor.health=createAnimalMedicalRecord256({schemaVersion:263,tick:9000},f.actor);h.injuries.push({id:1,part:'torso',kind:'cut',severity:1000,bornAt:8000,tended:500,scar:{threshold:1000,pain:0}});h.nextInjuryId=2;const clinical=JSON.stringify(h),plan=prepareWorldPawnLife256(f.state,105000,f.rng,263);if(!plan.ok)throw Error(plan.reason);plan.commit();expect(JSON.stringify(f.actor.health)).toBe(clinical);expect(f.rng.rng).toBe(123);
 });
 it('keeps every historical256..262 version and the direct public row/removal boundary strict',()=>{
  for(const version of [256,257,258,259,260,261,262])blocked(fixture(),version);
  const f=fixture(),before=JSON.stringify(f);let draws=0;expect(advanceWorldPawnRow256(f.row,105000,()=>{draws++;return 0;},[],263)).toMatchObject({ok:false,reason:expect.stringContaining('birthday')});expect(draws).toBe(0);expect(prepareWorldPawnRemoval256(f.row,105000)).toMatchObject({ok:false,reason:expect.stringContaining('birthday')});expect(JSON.stringify(f)).toBe(before);
 });
 it('keeps an explicit native order strict, and does not fabricate an absent historical mind/tracker',()=>{
  const f=fixture();let order=constructNativeWorldPawnOrder256({atCore:0,atAbsCore:2775000,firstThingId:1});order=passNativeWorldPawnOrder256(order,f.actor.id,false);f.state.nativeOrder=mothballNativeWorldPawnOrder256(order,f.actor.id);blocked(f,263);
  const absentMind=fixture();delete absentMind.actor.wander;blocked(absentMind,263);const absentGrowth=fixture();delete absentGrowth.actor.growthTracker;blocked(absentGrowth,263);
 });
 it('does not convert an unresolved real clinical owner into healthy, or commit stale prepared owners',()=>{
  const f=fixture(),h=f.actor.health=createAnimalMedicalRecord256({schemaVersion:263,tick:9000},f.actor);h.bloodLoss=1;blocked(f,263);
  const stale=fixture(),plan=prepareWorldPawnLife256(stale.state,105000,stale.rng,263);if(!plan.ok)throw Error(plan.reason);stale.actor.food=.09;const before=JSON.stringify(stale);expect(()=>plan.commit()).toThrow('Stale');expect(JSON.stringify(stale)).toBe(before);
 });
});

// Same declared mode and scalar fixture as life; no map, native cohort,
// clinical redress curve, route or new animal is constructed by these cases.
function redressRandom263(){const calls:string[]=[];return {calls,value(){calls.push('value');return 0;},float(a:number,b:number){calls.push(`float:${a}:${b}`);return Math.fround(a);},integer(a:number,b:number){calls.push(`integer:${a}:${b}`);return a;}};}
const free263=()=> 'Free' as const;
const fact263=INITIAL_ANIMAL_FACTS_256.Squirrel;
describe('same provisional263 age remainder through retained-animal generation/redress',()=>{
 it('transmits the actual version, stages the same original once, and adds no birthday/clinical/mind draws',()=>{
  const f=fixture(),random=redressRandom263(),before=JSON.stringify(f),mind=JSON.stringify(f.actor.wander),phase=prepareWorldAnimalGeneration256(f.state,{version:263,tick:10499,nextId:100,situation:free263,weight:()=>1,random});
  const made=phase.generate(fact263,{x:5,z:6});expect(made.status).toBe('ready');if(made.status!=='ready')throw Error(made.reason);expect(made.source).toBe('world');expect(phase.nextId).toBe(100);expect(phase.selectedOriginals).toEqual([f.actor]);expect(JSON.stringify(f)).toBe(before);expect(random.calls).toEqual(['value','float:0.5:0.9','float:0.9:1']);
  const animals=phase.commit();expect(animals).toEqual([f.actor]);expect(animals[0]).toBe(f.actor);expect(f.state.owners).toEqual([]);expect(f.actor.ageTicks).toBe(1440503);expect(f.actor.ageCoreRemainder).toBe(3);expect(f.actor.growthTracker).toEqual({revision:1,value:1,nextCheckCore:null});expect(JSON.stringify(f.actor.wander)).toBe(mind);expect(f.actor.health).toBeUndefined();expect(f.actor).toMatchObject({id:17,x:5,z:6,nextDecision:10500});expect(f.rng.rng).toBe(123);expect(()=>phase.commit()).toThrow('Stale/blocked');
 });
 it('keeps omitted/old generation versions, direct old redress and explicit native order strict',()=>{
  for(const version of [undefined,256,257,258,259,260,261,262]){
   const f=fixture(),before=JSON.stringify(f),random=redressRandom263(),phase=prepareWorldAnimalGeneration256(f.state,{...version===undefined?{}:{version},tick:10499,nextId:100,situation:free263,weight:()=>1,random});expect(phase.generate(fact263,{x:5,z:6})).toMatchObject({status:'blocked',reason:expect.stringContaining('birthday')});expect(JSON.stringify(f)).toBe(before);expect(()=>phase.commit()).toThrow('Stale/blocked');
  }
  const direct=fixture();expect(prepareWorldAnimalRedress256(direct.state,direct.row,fact263,{tick:10499,cell:{x:5,z:6},random:redressRandom263(),situation:free263})).toMatchObject({ok:false,reason:expect.stringContaining('birthday')});
  const native=fixture();let order=constructNativeWorldPawnOrder256({atCore:0,atAbsCore:2775000,firstThingId:1});order=passNativeWorldPawnOrder256(order,native.actor.id,false);native.state.nativeOrder=mothballNativeWorldPawnOrder256(order,native.actor.id);const before=JSON.stringify(native);expect(prepareWorldAnimalRedress256(native.state,native.row,fact263,{version:263,tick:10499,cell:{x:5,z:6},random:redressRandom263(),situation:free263})).toMatchObject({ok:false,reason:expect.stringContaining('birthday')});expect(JSON.stringify(native)).toBe(before);
 });
 it('requires the actual owned original and permits only the existing Food/Rest clone changes',()=>{
  const good=fixture(),clone=structuredClone(good.row);clone.actor.food=.12;clone.actor.rest=.9;const ready=prepareWorldPawnRemoval256(clone,104990,{version:263,state:good.state,original:good.row});expect(ready.ok).toBe(true);expect(good.row.actor.ageTicks).toBe(1439004);
  const mutations:((r:typeof clone)=>void)[]=[r=>{r.actor.ageTicks++;},r=>{r.actor.ageCoreRemainder=4;},r=>{r.actor.id++;},r=>{r.clockCore+=10;},r=>{r.mode='active';},r=>{r.context.seed++;},r=>{r.actor.wander!.nextMoveOrderIsWait=false;},r=>{r.actor.health=createAnimalMedicalRecord256({schemaVersion:263,tick:9000},r.actor);}];
  for(const mutate of mutations){const f=fixture(),draft=structuredClone(f.row),before=JSON.stringify(f);mutate(draft);expect(prepareWorldPawnRemoval256(draft,104990,{version:263,state:f.state,original:f.row})).toMatchObject({ok:false,reason:expect.stringContaining('actual unchanged original')});expect(JSON.stringify(f)).toBe(before);}
  const f=fixture(),copy=structuredClone(f.row);expect(prepareWorldPawnRemoval256(copy,104990,{version:263,state:f.state,original:structuredClone(f.row)})).toMatchObject({ok:false});expect(prepareWorldPawnRemoval256(copy,105000,{version:263,state:f.state,original:f.row})).toMatchObject({ok:false});
  for(const missing of ['wander','growthTracker'] as const){const absent=fixture();delete absent.actor[missing];expect(prepareWorldAnimalRedress256(absent.state,absent.row,fact263,{version:263,tick:10499,cell:{x:5,z:6},random:redressRandom263(),situation:free263})).toMatchObject({ok:false,reason:expect.stringContaining('birthday')});}
 });
 it('refuses a JSON-equal replacement actor instead of adopting a different original',()=>{
  const f=fixture(),original=f.actor,plan=prepareWorldAnimalRedress256(f.state,f.row,fact263,{version:263,tick:10499,cell:{x:5,z:6},random:redressRandom263(),situation:free263});if(!plan.ok)throw Error(plan.reason);const before=JSON.stringify(f.state),actorBefore=JSON.stringify(original);expect(plan.original).toBe(original);f.row.actor=structuredClone(original);expect(JSON.stringify(f.state)).toBe(before);expect(f.row.actor).not.toBe(original);expect(plan.current()).toBe(false);expect(()=>plan.adoptOriginal()).toThrow('Stale');expect(()=>plan.commit()).toThrow('Stale');expect(JSON.stringify(original)).toBe(actorBefore);expect(JSON.stringify(f.state)).toBe(before);
 });
 it('does not heal retained injuries or admit unresolved clinical redress, and stale adoption remains atomic',()=>{
  const f=fixture(),h=f.actor.health=createAnimalMedicalRecord256({schemaVersion:263,tick:9000},f.actor);h.injuries.push({id:1,part:'torso',kind:'cut',severity:1000,bornAt:8000,tended:500,scar:{threshold:1000,pain:0}});h.nextInjuryId=2;const before=JSON.stringify(f),random=redressRandom263();expect(prepareWorldAnimalRedress256(f.state,f.row,fact263,{version:263,tick:10499,cell:{x:5,z:6},random,situation:free263})).toMatchObject({ok:false,reason:expect.stringContaining('clinical redress curves')});expect(JSON.stringify(f)).toBe(before);expect(random.calls).toEqual([]);
  const stale=fixture(),plan=prepareWorldAnimalRedress256(stale.state,stale.row,fact263,{version:263,tick:10499,cell:{x:5,z:6},random:redressRandom263(),situation:free263});if(!plan.ok)throw Error(plan.reason);stale.actor.food=.09;const at=JSON.stringify(stale);expect(()=>plan.commit()).toThrow('Stale');expect(JSON.stringify(stale)).toBe(at);
 });
});
