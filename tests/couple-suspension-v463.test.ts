import {expect,test} from 'vitest';
import {medicalCamp} from './scenarios/health.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {prepareSuspendedHumanResume271} from '../src/sim/suspended-human-clock-271.ts';
import {memoryAge271,memoryExpiry271} from '../src/sim/suspended-memory-271.ts';
import {expireMealMemoriesAt} from '../src/sim/mood.ts';
import {coupleOpinionOffset285,COUPLE_MEMORY_DURATION_285 as D} from '../src/sim/couple-memories-285.ts';

function held(){
 const w=medicalCamp(2),p=w.pawns[0]!,other=w.pawns[1]!;p.health=createMedicalRecord(100);p.memories=[];
 p.coupleMemories285=[{otherId:other.id,at:50},{otherId:other.id,at:90}];
 p.coupleClock285={revision:1,rng:123,lastAttemptAtCore:900,nextAllowedAtCore:1250};p.cryptosleepHeldAt271=100;
 return {w,p,other};
}

test('pure suspension plan corrects acquired memory ages once and leaves factual dates, cooldown and RNG literal',()=>{
 const {w,p}=held(),clock=p.coupleClock285!,clockBefore=JSON.stringify(clock),before=JSON.stringify(p),rng=w.rng;
 const memories=p.coupleMemories285!,first=memories[0]!,plan=prepareSuspendedHumanResume271(p,100,200);
 expect(JSON.stringify(p)).toBe(before);expect(plan.current()).toBe(true);expect(plan.commit()).toBe(true);expect(plan.commit()).toBe(false);
 expect(p.coupleMemories285).toBe(memories);expect(memories[0]).toBe(first);expect(memories.map(m=>[m.at,m.suspendedTicks])).toEqual([[50,100],[90,100]]);
 expect(memoryAge271(first,first.at,200)).toBe(50);expect(p.coupleClock285).toBe(clock);expect(JSON.stringify(clock)).toBe(clockBefore);expect(w.rng).toBe(rng);
});

test('two actual held spans accumulate only memory suspension while expired absolute cooldowns stay expired',()=>{
 const {p}=held(),clockBefore=JSON.stringify(p.coupleClock285);
 expect(prepareSuspendedHumanResume271(p,100,200).commit()).toBe(true);p.cryptosleepHeldAt271=200;
 expect(prepareSuspendedHumanResume271(p,200,400).commit()).toBe(true);delete p.cryptosleepHeldAt271;
 expect(p.coupleMemories285!.map(m=>[m.at,m.suspendedTicks])).toEqual([[50,300],[90,300]]);
 expect(memoryAge271(p.coupleMemories285![0]!,50,400)).toBe(50);expect(JSON.stringify(p.coupleClock285)).toBe(clockBefore);
 expect(p.coupleClock285!.nextAllowedAtCore).toBeLessThan(4000);
});

test('list, entry, factual partner, date or suspension changes invalidate the resume before any partial write',()=>{
 for(const mutate of [
  (p:ReturnType<typeof held>['p'])=>{p.coupleMemories285=[...p.coupleMemories285!];},
  (p:ReturnType<typeof held>['p'])=>{p.coupleMemories285![0]={...p.coupleMemories285![0]!};},
  (p:ReturnType<typeof held>['p'])=>{p.coupleMemories285![0]!.otherId++;},
  (p:ReturnType<typeof held>['p'])=>{p.coupleMemories285![0]!.at++;},
  (p:ReturnType<typeof held>['p'])=>{p.coupleMemories285![0]!.suspendedTicks=1;},
  (p:ReturnType<typeof held>['p'])=>{p.coupleMemories285!.push({...p.coupleMemories285![0]!});},
 ]){
  const {p}=held(),plan=prepareSuspendedHumanResume271(p,100,200);mutate(p);const before=JSON.stringify(p);
  expect(plan.current()).toBe(false);expect(plan.commit()).toBe(false);expect(JSON.stringify(p)).toBe(before);expect(p.health!.civilTick271).toBeUndefined();
 }
});

test('an immutable acquired memory rejects planning without changing any other actual owner record',()=>{
 const {p}=held();Object.freeze(p.coupleMemories285![0]!);const before=JSON.stringify(p);
 expect(()=>prepareSuspendedHumanResume271(p,100,200)).toThrow('Suspension original is not mutable data');expect(JSON.stringify(p)).toBe(before);
});

test('a long suspension preserves active opinion and expires only at the corrected memory deadline',()=>{
 const {p,other}=held();p.coupleMemories285=[{otherId:other.id,at:50}];const at=2*D;
 expireMealMemoriesAt(p,at);expect(p.coupleMemories285).toHaveLength(1);
 expect(prepareSuspendedHumanResume271(p,100,at).commit()).toBe(true);delete p.cryptosleepHeldAt271;
 const memory=p.coupleMemories285![0]!,end=memoryExpiry271(memory,memory.at+D);
 expect(memory.at).toBe(50);expect(end).toBe(at+D-50);expect(coupleOpinionOffset285(p,other.id,at)).toBe(6);
 expireMealMemoriesAt(p,end-1);expect(p.coupleMemories285![0]).toBe(memory);expireMealMemoriesAt(p,end);expect(p.coupleMemories285).toBeUndefined();
});

test('zero elapsed time creates no suspension field and a ship-held resume keeps the same personal clocks',()=>{
 const {p}=held(),before=JSON.stringify(p);expect(prepareSuspendedHumanResume271(p,100,100).commit()).toBe(true);expect(JSON.stringify(p)).toBe(before);
 delete p.cryptosleepHeldAt271;p.shipCryptosleepHeldAt277=100;const clock=JSON.stringify(p.coupleClock285);
 expect(prepareSuspendedHumanResume271(p,100,200).commit()).toBe(true);
 expect(p.coupleMemories285!.map(m=>m.suspendedTicks)).toEqual([100,100]);expect(JSON.stringify(p.coupleClock285)).toBe(clock);
});
