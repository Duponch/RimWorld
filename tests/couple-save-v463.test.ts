import {SCHEMA_VERSION} from '../src/sim/types.ts';
import {expect,test} from 'vitest';
import {captureCoupleMapContext285,validCoupleClock285,validCoupleTask285,validCouplePawnShape285,validCouplePawnContext285,type CouplePawnContext285} from '../src/sim/couple-save-285.ts';
import {HUMAN_YEAR_TICKS} from '../src/sim/human-age.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {bedSlotCell} from '../src/sim/bed-slots.ts';
import {medicalCamp} from './scenarios/health.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import type {Pawn} from '../src/sim/types.ts';

function pair(){
 const w=medicalCamp(2),[a,b]=w.pawns as [Pawn,Pawn],bed=fixtureBuilding(w,'double-bed',14,14);
 w.relationships={links:[{kind:'lover',aId:Math.min(a.id,b.id),bId:Math.max(a.id,b.id),recordedAt:w.tick}]};
 for(const [p,other,slot] of [[a,b,0],[b,a,1]] as const){
  delete p.nativeHuman;p.age={biologicalTicks:30*HUMAN_YEAR_TICKS,chronologicalTicks:30*HUMAN_YEAR_TICKS};
  Object.assign(p,bedSlotCell(bed,slot),{bedId:bed.id,bedSlot:slot,state:'idle',need:null,jobId:null,haul:null,cooking:null,path:[],moveCooldown:0,motion:null});
  p.orders.active=null;p.recreation.task=null;
  p.coupleClock285={revision:1,rng:p.id,lastAttemptAtCore:w.tick*10,nextAllowedAtCore:0};
  p.coupleTask285={revision:1,otherId:other.id,initiatorId:a.id,bedId:bed.id,slot,enteredAtCore:w.tick*10,endsAtCore:w.tick*10+1000,roomRest:{nextAt:w.tick+100,applied:false}};
 }
 const context=():CouplePawnContext285=>({version:285,tick:w.tick,nextId:w.nextId,knownHumanIds:new Set([a.id,b.id]),map:captureCoupleMapContext285(w)});
 return {w,a,b,bed,context};
}

test('all historical versions retain literal absence and reject any prospective field presence',()=>{
 for(const version of [2,138,256,271,284]){
  expect(validCouplePawnShape285({},version,100)).toBe(true);
  for(const key of ['coupleClock285','coupleTask285','coupleMemories285']){
   for(const value of [undefined,null,{}])expect(validCouplePawnShape285({[key]:value},version,100)).toBe(false);
   expect(validCouplePawnShape285(Object.create({[key]:undefined}),version,100)).toBe(false);
  }
 }
 for(const version of [285,286,287,288,289,290])expect(validCouplePawnShape285({},version,100)).toBe(true);expect(validCouplePawnShape285({},SCHEMA_VERSION+1,100)).toBe(false);expect(validCouplePawnShape285({},1,100)).toBe(false);
});

test('descriptor-first guards never execute top-level or nested getters',()=>{
 let reads=0;const getter=()=>{reads++;throw Error('Do not read');};
 for(const key of ['coupleClock285','coupleTask285','coupleMemories285']){
  const raw={};Object.defineProperty(raw,key,{get:getter,enumerable:true});expect(validCouplePawnShape285(raw,285,100)).toBe(false);
  const hidden={};Object.defineProperty(hidden,key,{value:undefined});expect(validCouplePawnShape285(hidden,285,100)).toBe(false);
 }
 const clock={revision:1,rng:1};Object.defineProperty(clock,'lastAttemptAtCore',{get:getter,enumerable:true});
 expect(validCoupleClock285(clock,100)).toBe(false);
 const {a,w}=pair();const task={...a.coupleTask285!};Object.defineProperty(task,'roomRest',{get:getter,enumerable:true});
 expect(validCoupleTask285(task,w.tick)).toBe(false);
 const room={applied:false};Object.defineProperty(room,'nextAt',{get:getter,enumerable:true});
 expect(validCoupleTask285({...a.coupleTask285,roomRest:room},w.tick)).toBe(false);expect(reads).toBe(0);
});

test('personal clock accepts expired absolute cooldowns without suspension or future attempt dates',()=>{
 expect(validCoupleClock285({revision:1,rng:0xffffffff,lastAttemptAtCore:1000,nextAllowedAtCore:0},100)).toBe(true);
 expect(validCoupleClock285({revision:1,rng:1,nextAllowedAtCore:Number.MAX_SAFE_INTEGER},100)).toBe(true);
 for(const patch of [{rng:0},{rng:4294967296},{rng:1.5},{lastAttemptAtCore:1001},{nextAllowedAtCore:-1},{nextAllowedAtCore:undefined},{suspendedTicks:1},{revision:2}])
  expect(validCoupleClock285({revision:1,rng:1,...patch},100)).toBe(false);
});

test('entered task retains exact Core duration bounds, tick grid and future ending',()=>{
 const {a,w}=pair(),task=a.coupleTask285!;
 for(const duration of [250,251,2749,2750])expect(validCoupleTask285({...task,endsAtCore:task.enteredAtCore+duration},w.tick)).toBe(true);
 for(const patch of [{enteredAtCore:task.enteredAtCore+1},{enteredAtCore:task.enteredAtCore-1},{endsAtCore:task.enteredAtCore+249},{endsAtCore:task.enteredAtCore+2751},{endsAtCore:task.enteredAtCore},{slot:2},{revision:2},{otherId:0},{bedId:0},{extra:true}])
  expect(validCoupleTask285({...task,...patch},w.tick)).toBe(false);
});

test('RoomRest keeps its exact acquired state and only the existing future deadline range',()=>{
 const {a,w}=pair(),task=a.coupleTask285!;
 for(const [applied,max] of [[false,1000],[true,6000]] as const){
  expect(validCoupleTask285({...task,roomRest:{applied,nextAt:w.tick+1}},w.tick)).toBe(true);
  expect(validCoupleTask285({...task,roomRest:{applied,nextAt:w.tick+max}},w.tick)).toBe(true);
  for(const nextAt of [w.tick,w.tick+max+1])expect(validCoupleTask285({...task,roomRest:{applied,nextAt}},w.tick)).toBe(false);
 }
 expect(validCoupleTask285({...task,roomRest:undefined},w.tick)).toBe(false);
 expect(validCoupleTask285({...task,roomRest:{nextAt:w.tick+1,applied:false,redrawn:true}},w.tick)).toBe(false);
});

test('the previous medical rest mandate remains literal without admitting unknown medical roles',()=>{
 const {a,w,context}=pair();
 for(const medical of ['patient','bedrest'] as const){
  a.coupleTask285!.medical=medical;const before=JSON.stringify(a.coupleTask285);
  expect(validCoupleTask285(a.coupleTask285,w.tick)).toBe(true);expect(validCouplePawnContext285(a,context())).toBe(true);
  expect(JSON.stringify(a.coupleTask285)).toBe(before);
 }
 for(const medical of [undefined,null,'doctor',true])expect(validCoupleTask285({...a.coupleTask285,medical},w.tick)).toBe(false);
});

test('both original adults, reciprocal jobs and physical bed slots pass without any mutation',()=>{
 const {w,a,b,context}=pair(),before=JSON.stringify(w),rng=w.rng;
 expect(validCouplePawnContext285(a,context())).toBe(true);expect(validCouplePawnContext285(b,context())).toBe(true);
 expect(JSON.stringify(w)).toBe(before);expect(w.rng).toBe(rng);
 const clone=structuredClone(a);expect(validCouplePawnContext285(clone,context())).toBe(false);
});

test('reciprocity compares initiator, two times, original bed and distinct durable slots',()=>{
 for(const patch of [{otherId:999},{initiatorId:999},{bedId:999},{slot:0},{enteredAtCore:29990},{endsAtCore:31001}]){
  const {a,b,context}=pair();Object.assign(b.coupleTask285!,patch);expect(validCouplePawnContext285(a,context())).toBe(false);
 }
 const {a,b,context}=pair();delete b.coupleTask285;expect(validCouplePawnContext285(a,context())).toBe(false);
});

test('position, finite movement and real civil shared bed remain required after admission',()=>{
 for(const change of [
  ({a}:ReturnType<typeof pair>)=>{a.x++;},
  ({a}:ReturnType<typeof pair>)=>{a.bedSlot=1;},
  ({a}:ReturnType<typeof pair>)=>{a.path=[{x:a.x+1,z:a.z}];},
  ({a}:ReturnType<typeof pair>)=>{a.moveCooldown=1;},
  ({bed}:ReturnType<typeof pair>)=>{Object.assign(bed,{medical:true});},
  ({bed}:ReturnType<typeof pair>)=>{Object.assign(bed,{prisoner:true});},
  ({a,w}:ReturnType<typeof pair>)=>{a.motion={from:{x:a.x,z:a.z},to:{x:a.x,z:a.z},start:w.tick-1,end:w.tick+1};},
  ({w}:ReturnType<typeof pair>)=>{w.relationships={links:[]};},
  ({w}:ReturnType<typeof pair>)=>{w.structures=[];},
 ]){const s=pair();change(s);expect(validCouplePawnContext285(s.a,s.context())).toBe(false);}
 const s=pair();s.w.relationships!.links[0]!.kind='spouse';expect(validCouplePawnContext285(s.a,s.context())).toBe(true);
});

test('awake idle or downed states are accepted while legacy medical-rest state still requires its separate service',()=>{
 const {a,context}=pair();
 for(const state of ['idle','downed'] as const){a.state=state;expect(validCouplePawnContext285(a,context())).toBe(true);}
 for(const state of ['resting','sleeping','dead','moving','working','hungry','eating','recreating'] as const){a.state=state;expect(validCouplePawnContext285(a,context())).toBe(false);}
 a.state='idle';a.stun={sinceCore:30000,untilCore:30045};expect(validCouplePawnContext285(a,context())).toBe(true);
 a.health=createMedicalRecord(3000);a.health.death={tick:3000,cause:'trauma'};expect(validCouplePawnContext285(a,context())).toBe(false);
});

test('active service and order exclusions preserve pending queue rather than inventing an empty queue rule',()=>{
 for(const key of ['brewing','deepWork','animalHandling','surgery','rescue','research','draft','allowedAreaReturn','medicalSleep','transitExit'] as const){
  const {a,context}=pair();Object.assign(a,{[key]:true});expect(validCouplePawnContext285(a,context())).toBe(false);
 }
 const {a,context}=pair();a.need={kind:'sleep',phase:'sleep',bedId:a.bedId,target:{x:a.x,z:a.z}};expect(validCouplePawnContext285(a,context())).toBe(false);
 // Queue foreign keys belong to the ordinary order guard, not this context.
 a.need=null;a.orders.queue=[123];
 expect(validCouplePawnContext285(a,context())).toBe(true);
});

test('passive fields require real adult age and factual nonself human IDs, including away holders',()=>{
 const {a,b,context}=pair();delete a.coupleTask285;a.coupleMemories285=[{otherId:b.id,at:3000}];
 const away={...context(),map:undefined};expect(validCouplePawnContext285(a,away)).toBe(true);
 a.coupleMemories285[0]!.otherId=a.id;expect(validCouplePawnContext285(a,away)).toBe(false);
 a.coupleMemories285[0]!.otherId=b.id;expect(validCouplePawnContext285(a,{...away,knownHumanIds:new Set([a.id])})).toBe(false);
 a.age!.biologicalTicks=18*HUMAN_YEAR_TICKS-1;expect(validCouplePawnContext285(a,away)).toBe(false);
 a.age!.biologicalTicks=30*HUMAN_YEAR_TICKS;Object.assign(a,{nativeHuman:{revision:1}});expect(validCouplePawnContext285(a,away)).toBe(false);delete a.nativeHuman;
 delete a.age;expect(validCouplePawnContext285(a,away)).toBe(false);
 delete a.coupleClock285;delete a.coupleMemories285;expect(validCouplePawnContext285(a,away)).toBe(true);
});

test('away or suspended holders retain only passive fields and current clocks stay civil',()=>{
 const {a,b,context}=pair();expect(validCouplePawnContext285(a,{...context(),map:undefined})).toBe(false);
 a.cryptosleepHeldAt271=2900;expect(validCouplePawnContext285(a,context())).toBe(false);
 delete a.coupleTask285;a.coupleMemories285=[{otherId:b.id,at:2900}];
 expect(validCouplePawnContext285(a,{...context(),tick:2900,civilTick:3000,map:undefined})).toBe(true);
 a.coupleClock285!.lastAttemptAtCore=30001;expect(validCouplePawnContext285(a,{...context(),tick:2900,civilTick:3000,map:undefined})).toBe(false);
});

test('duplicated local IDs and invalid namespace never gain a second owner by indexing',()=>{
 const {w,a,b,context}=pair();w.pawns.push(structuredClone(b));expect(validCouplePawnContext285(a,context())).toBe(false);
 w.pawns.pop();expect(validCouplePawnContext285(a,{...context(),nextId:a.id})).toBe(false);
 const local=context().map!,before=local.pawns.get(b.id);expect(before).toBe(b);
});
