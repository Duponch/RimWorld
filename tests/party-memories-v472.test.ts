import {expect,test} from 'vitest';
import {addPartyMemory292,expirePartyMemories292,partyMoodThoughts292,validPartyMemoryField292,type PartyMemoryHolder292} from '../src/sim/party-memories-292.ts';
import {preparePartyRelease292} from '../src/sim/party-release-292.ts';
import {releaseWork} from '../src/sim/work-release.ts';
import {medicalCamp} from './scenarios/health.ts';
const f=Math.fround;

test('Party partial memories are intrinsic, float32 and combine by average times geometric weights without fade',()=>{
 const h:PartyMemoryHolder292={};addPartyMemory292(h,.25,100);addPartyMemory292(h,1,200);
 expect(h.partyMemories292).toEqual([{at:100,power:f(.25)},{at:200,power:1}]);
 expect(partyMoodThoughts292(h,200)[0]!.offset).toBe(f(f(f(f(8*.25)+f(8))/f(2))*f(1.75)));
 expect(partyMoodThoughts292(h,50000)[0]!.offset).toBe(partyMoodThoughts292(h,200)[0]!.offset);
});
test('Party cap refreshes the oldest active age and retains its old power instead of replacing it',()=>{
 const h:PartyMemoryHolder292={partyMemories292:Array.from({length:10},(_,i)=>({at:100+i,power:i===0?.25:1}))};
 addPartyMemory292(h,1,200);expect(h.partyMemories292).toHaveLength(10);expect(h.partyMemories292![0]).toEqual({at:200,power:.25});
});
test('Party cap chooses first equal oldest age and removes its suspension correction on renewal',()=>{
 const h:PartyMemoryHolder292={partyMemories292:[{at:0,power:.5,suspendedTicks:100},...Array.from({length:9},()=>({at:100,power:1}))]};
 addPartyMemory292(h,.25,200);expect(h.partyMemories292![0]).toEqual({at:200,power:.5});expect(h.partyMemories292![1]!.at).toBe(100);
});
test('Party memory retains the exact ten-day boundary and expires only after it',()=>{
 const h:PartyMemoryHolder292={};addPartyMemory292(h,1,100);expirePartyMemories292(h,60100);expect(h.partyMemories292).toHaveLength(1);
 expirePartyMemories292(h,60101);expect(h.partyMemories292).toBeUndefined();
});
test('Party suspension freezes active age without changing factual date or acquired power',()=>{
 const h:PartyMemoryHolder292={partyMemories292:[{at:100,power:.5}],cryptosleepHeldAt271:200};
 expirePartyMemories292(h,100000);expect(partyMoodThoughts292(h,100000)[0]!.offset).toBe(4);
 expect(()=>addPartyMemory292(h,1,100000)).toThrow();expect(h.partyMemories292).toEqual([{at:100,power:.5}]);
 delete h.cryptosleepHeldAt271;h.partyMemories292![0]!.suspendedTicks=99800;
 expect(partyMoodThoughts292(h,159900)).toHaveLength(1);expect(partyMoodThoughts292(h,159901)).toHaveLength(0);
});
test('Party memory historical, future, undefined and accessor fields fail without executing getters',()=>{
 const value={partyMemories292:[{at:100,power:.5}]};expect(validPartyMemoryField292(value,292,200)).toBe(true);
 for(const version of [1,271,285,290,291,293])expect(validPartyMemoryField292(value,version,200)).toBe(false);
 let reads=0;const getter={};Object.defineProperty(getter,'partyMemories292',{enumerable:true,get(){reads++;throw Error('getter');}});
 expect(validPartyMemoryField292(getter,292,200)).toBe(false);expect(reads).toBe(0);
 expect(validPartyMemoryField292({partyMemories292:undefined},292,200)).toBe(false);
 expect(validPartyMemoryField292(Object.create({partyMemories292:undefined}),292,200)).toBe(false);
});
test('Party release excludes all departing IDs before a proportional issue, then cannot award twice',()=>{
 const w=medicalCamp(3),now=w.tick*10,[a,b,c]=w.pawns;
 w.party292={adoptedAtCore:0,nextCheckCore:now+5000,rng:1,pending:false,lastStartedAtCore:now-1000,active:{startedAtCore:now-1000,durationCore:5000,advancedAtCore:now,organizerId:a!.id,organizerJoined:true,site:{x:a!.x,z:a!.z},members:w.pawns.map(p=>({pawnId:p.id,joinedAtCore:now-1000,presentCore:500}))}};
 for(const p of w.pawns){p.state='recreating';p.recreation.task={activity:'party',partyStartedAtCore:now-1000,buildingId:null,target:{x:p.x,z:p.z},phase:'active',elapsed:50};}
 const before=JSON.stringify(w),plan=preparePartyRelease292(w,new Set([a!.id,b!.id]));expect(JSON.stringify(w)).toBe(before);plan.commit();
 expect(a!.partyMemories292).toBeUndefined();expect(b!.partyMemories292).toBeUndefined();expect(c!.partyMemories292).toHaveLength(1);expect(w.party292.active).toBeUndefined();
 const after=JSON.stringify(w);expect(()=>plan.commit()).toThrow();preparePartyRelease292(w,new Set(),{finish:true}).commit();expect(JSON.stringify(w)).toBe(after);
});
test('Party finish excludes zero presence, dead and held humans and preserves a captured travel segment',()=>{
 const w=medicalCamp(3),now=w.tick*10,[a,b,c]=w.pawns;
 w.party292={adoptedAtCore:0,nextCheckCore:now+5000,rng:1,pending:false,lastStartedAtCore:now-1000,active:{startedAtCore:now-1000,durationCore:5000,advancedAtCore:now,organizerId:a!.id,site:{x:a!.x,z:a!.z},members:w.pawns.map((p,i)=>({pawnId:p.id,joinedAtCore:now-1000,presentCore:i===0?0:500}))}};
 a!.state='moving';a!.motion={from:{x:a!.x,z:a!.z},to:{x:a!.x+1,z:a!.z},start:w.tick,end:w.tick+5};a!.moveCooldown=5;
 a!.recreation.task={activity:'party',partyStartedAtCore:now-1000,buildingId:null,target:{x:a!.x+1,z:a!.z},phase:'travel',elapsed:0};b!.state='dead';c!.cryptosleepHeldAt271=w.tick;
 const segment=structuredClone(a!.motion);preparePartyRelease292(w,new Set(),{finish:true}).commit();
 expect(w.pawns.every(p=>p.partyMemories292===undefined)).toBe(true);expect(a!.motion).toEqual(segment);expect(a!.moveCooldown).toBe(5);
});
test('an immutable remaining recipient refuses the collective release before the first real assignment write',()=>{
 const w=medicalCamp(2),[a,b]=w.pawns,now=w.tick*10;
 w.party292={adoptedAtCore:0,nextCheckCore:now+5000,rng:1,pending:false,lastStartedAtCore:now-1000,active:{startedAtCore:now-1000,durationCore:5000,advancedAtCore:now,organizerId:a!.id,organizerJoined:true,site:{x:a!.x,z:a!.z},members:w.pawns.map(p=>({pawnId:p.id,joinedAtCore:now-1000,presentCore:500}))}};
 for(const p of w.pawns){p.state='recreating';p.recreation.task={activity:'party',partyStartedAtCore:now-1000,buildingId:null,target:{x:p.x,z:p.z},phase:'active',elapsed:50};}
 Object.preventExtensions(b!);const before=JSON.stringify(w);expect(()=>preparePartyRelease292(w,new Set([a!.id]))).toThrow();expect(JSON.stringify(w)).toBe(before);
 expect(releaseWork(w,a!)).toBe(false);expect(JSON.stringify(w)).toBe(before);
});
