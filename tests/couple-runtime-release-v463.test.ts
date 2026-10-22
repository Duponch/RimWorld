import {expect,test} from 'vitest';
import {medicalCamp,controlledInjury} from './scenarios/health.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import {bedSlotCell} from '../src/sim/bed-slots.ts';
import {claimLocalActorBed256} from '../src/sim/actor-bed-local-256.ts';
import {HUMAN_YEAR_TICKS} from '../src/sim/human-age.ts';
import {COMPLEX_FURNITURE_RESEARCH_COST} from '../src/sim/research.ts';
import {createDeteriorationState} from '../src/sim/deterioration-content.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {pawnBody} from '../src/sim/health-rules.ts';
import {medicalPain} from '../src/sim/injury-state.ts';
import {relationshipIndex} from '../src/sim/relationship-runtime.ts';
import {knownRomanceChanceFactor,romanceAgeFactor} from '../src/sim/relationship-state.ts';
import {opinionOf} from '../src/sim/social-state.ts';
import {coupleBiologicalYears285,coupleCooldownCore285,coupleDurationCore285,coupleHourlyChance285,coupleMtbHours285} from '../src/sim/couple-rules-285.ts';
import {coupleClockDraft285,coupleNormal285,coupleOpportunityRoll285,coupleRandom285} from '../src/sim/couple-random-285.ts';
import {tryCoupleOpportunity285,processCouple285,reconcileCouple285} from '../src/sim/couple-runtime-285.ts';
import {prepareCoupleRelease285} from '../src/sim/couple-release-285.ts';
import {deserializeWorld,serializeWorld} from '../src/sim/serialization.ts';
import type {Pawn} from '../src/sim/types.ts';

/** Explicit ordinary clinical/building preparation, no played construction or
 * natural opportunity claimed. The seed and world RNG are never replaced.
 * Find the initial check date with the same deterministic opportunity math;
 * only try/process/reconcile perform the actual entry and finish below. */
function prepared(positive=true){
 const w=medicalCamp(2),[a,b]=w.pawns as [Pawn,Pawn],bed=fixtureBuilding(w,'double-bed',14,14);
 Object.assign(bed,{material:'wood'});
 w.research={project:null,points:0,complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:w.tick}};
 w.relationships={links:[{kind:'lover',aId:Math.min(a.id,b.id),bId:Math.max(a.id,b.id),recordedAt:w.tick-1}]};
 for(const [p,slot]of [[a,0],[b,1]]as const){
  delete p.nativeHuman;delete p.health;delete p.social;delete p.mental;delete p.medicalSleep;delete p.traits;
  p.age={biologicalTicks:30*HUMAN_YEAR_TICKS,chronologicalTicks:30*HUMAN_YEAR_TICKS};
  claimLocalActorBed256(w,p,bed,slot);
  Object.assign(p,bedSlotCell(bed,slot),{state:'sleeping',need:null,jobId:null,haul:null,cooking:null,path:[],moveCooldown:0,motion:null,hunger:100,rest:50});
  p.orders.active=null;p.orders.queue=[];p.recreation.task=null;
 }
 const index=relationshipIndex(w),aAge=coupleBiologicalYears285(a)!,bAge=coupleBiologicalYears285(b)!;
 const person=(p:Pawn,q:Pawn,age:number,qAge:number)=>({ageYears:age,pain:p.health?medicalPain(p.health):0,
  consciousness:pawnBody(p).capacities.consciousness,opinion:opinionOf(p,q.id,w.tick,w),
  attraction:romanceAgeFactor(age,qAge)*knownRomanceChanceFactor(index,p.id,q.id)});
 const mtb=coupleMtbHours285(person(a,b,aAge,bAge),person(b,a,bAge,aAge));if(mtb===undefined||!Number.isFinite(mtb))throw Error('Prepared real pair has no finite MTB');
 const chance=coupleHourlyChance285(mtb),initial=w.tick;let found=false;
 for(let n=0;n<2000;n++){
  const tick=initial+n*250,roll=coupleOpportunityRoll285(w.seed,a.id,tick*10);
  if((roll<chance)===positive){w.tick=tick;found=true;break;}
 }
 if(!found)throw Error('No deterministic check date found in the declared bound');
 // This is the explicitly prepared initial date, not played elapsed time.
 w.deterioration=createDeteriorationState(w.seed,w.tick);
 for(const p of [a,b])p.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:p.x,z:p.z},roomRest:{nextAt:w.tick+750,applied:false}};
 return {w,a,b,bed,chance};
}
function entered(){const s=prepared();expect(tryCoupleOpportunity285(s.w,s.a)).toBe(true);return s;}
function finishAt(s:ReturnType<typeof entered>){
 const end=s.a.coupleTask285!.endsAtCore;
 while(s.w.tick*10<end){s.w.tick++;processCouple285(s.w,s.a);processCouple285(s.w,s.b);}
 return s.w.tick;
}

test('a failed real opportunity records cadence without entering either task or consuming duration RNG',()=>{
 const {w,a,b,chance}=prepared(false),rng=w.rng,personal=coupleClockDraft285(w.seed,a.id),need=a.need;
 expect(coupleOpportunityRoll285(w.seed,a.id,w.tick*10)).toBeGreaterThanOrEqual(chance);
 expect(tryCoupleOpportunity285(w,a)).toBe(false);expect(a.coupleClock285).toEqual({...personal,lastAttemptAtCore:w.tick*10});
 expect(a.need).toBe(need);expect(a.coupleTask285).toBeUndefined();expect(b.coupleTask285).toBeUndefined();expect(b.coupleClock285).toBeUndefined();expect(w.rng).toBe(rng);
});

test('a missing partner still owns the actual check cadence, including the exact2500-Core boundary',()=>{
 const {w,a,b}=prepared();b.need=null;const rng=w.rng,at=w.tick;
 expect(tryCoupleOpportunity285(w,a)).toBe(false);const clock=a.coupleClock285!;
 expect(clock.lastAttemptAtCore).toBe(at*10);expect(tryCoupleOpportunity285(w,a)).toBe(false);expect(a.coupleClock285).toBe(clock);
 w.tick+=249;expect(tryCoupleOpportunity285(w,a)).toBe(false);expect(a.coupleClock285).toBe(clock);
 w.tick++;expect(tryCoupleOpportunity285(w,a)).toBe(false);expect(a.coupleClock285!.lastAttemptAtCore).toBe(w.tick*10);expect(w.rng).toBe(rng);
});

test('either literal personal cooldown refuses the giver after its factual positive check',()=>{
 for(const owner of ['a','b']as const){
  const s=prepared(),p=s[owner],rng=s.w.rng;p.coupleClock285={...coupleClockDraft285(s.w.seed,p.id),nextAllowedAtCore:s.w.tick*10+1};
  const oldRng=p.coupleClock285.rng,needs=[s.a.need,s.b.need];
  expect(tryCoupleOpportunity285(s.w,s.a)).toBe(false);expect(s.a.coupleClock285!.lastAttemptAtCore).toBe(s.w.tick*10);
  expect(p.coupleClock285!.nextAllowedAtCore).toBe(s.w.tick*10+1);expect(p.coupleClock285!.rng).toBe(oldRng);
  expect(s.a.need).toBe(needs[0]);expect(s.b.need).toBe(needs[1]);expect(s.a.coupleTask285).toBeUndefined();expect(s.b.coupleTask285).toBeUndefined();expect(s.w.rng).toBe(rng);
 }
});

test('famine zero of either participant refuses while positive hunger keeps the same ordinary opportunity',()=>{
 for(const owner of ['a','b']as const){const s=prepared();s[owner].hunger=0;
  expect(tryCoupleOpportunity285(s.w,s.a)).toBe(false);expect(s.a.coupleClock285!.lastAttemptAtCore).toBe(s.w.tick*10);expect(s.a.coupleTask285).toBeUndefined();}
 const s=prepared();s.a.hunger=.01;s.b.hunger=.01;expect(tryCoupleOpportunity285(s.w,s.a)).toBe(true);
});

test('real loss of awake capacity refuses entry without erasing the recorded check',()=>{
 const s=prepared();controlledInjury(s.w,s.b,'brain',8000);expect(pawnBody(s.b).canBeAwake).toBe(false);
 const rng=s.w.rng;expect(tryCoupleOpportunity285(s.w,s.a)).toBe(false);expect(s.a.coupleClock285!.lastAttemptAtCore).toBe(s.w.tick*10);
 expect(s.a.coupleTask285).toBeUndefined();expect(s.b.coupleTask285).toBeUndefined();expect(s.w.rng).toBe(rng);
});

test('a refused mutable start never installs a half-pair or consumes its proposed duration',()=>{
 const s=prepared(),needA=s.a.need,needB=s.b.need,rng=s.w.rng,initial=coupleClockDraft285(s.w.seed,s.a.id);
 Object.preventExtensions(s.b);expect(tryCoupleOpportunity285(s.w,s.a)).toBe(false);
 expect(s.a.coupleClock285).toEqual({...initial,lastAttemptAtCore:s.w.tick*10});expect(s.b.coupleClock285).toBeUndefined();
 expect(s.a.coupleTask285).toBeUndefined();expect(s.b.coupleTask285).toBeUndefined();expect(s.a.need).toBe(needA);expect(s.b.need).toBe(needB);expect(s.w.rng).toBe(rng);
 const locked=prepared();locked.a.coupleClock285=coupleClockDraft285(locked.w.seed,locked.a.id);Object.defineProperty(locked.a,'coupleClock285',{writable:false});
 const before=JSON.stringify(locked.w);expect(tryCoupleOpportunity285(locked.w,locked.a)).toBe(false);expect(JSON.stringify(locked.w)).toBe(before);
});

test('a true positive entry coordinates the two originals, one duration and the same acquired RoomRest objects',()=>{
 const s=prepared(),rng=s.w.rng,roomA=s.a.need?.kind==='sleep'?s.a.need.roomRest:undefined,roomB=s.b.need?.kind==='sleep'?s.b.need.roomRest:undefined;
 if(s.a.need?.kind!=='sleep')throw Error('Physical sleep missing');s.a.need.medical='bedrest';
 const initialA=coupleClockDraft285(s.w.seed,s.a.id),initialB=coupleClockDraft285(s.w.seed,s.b.id),expectedDuration=coupleDurationCore285(coupleRandom285(initialA));
 expect(tryCoupleOpportunity285(s.w,s.a)).toBe(true);
 expect(s.a.coupleTask285).toMatchObject({otherId:s.b.id,initiatorId:s.a.id,slot:0,enteredAtCore:s.w.tick*10,endsAtCore:s.w.tick*10+expectedDuration!,medical:'bedrest'});
 expect(s.b.coupleTask285).toMatchObject({otherId:s.a.id,initiatorId:s.a.id,slot:1,endsAtCore:s.a.coupleTask285!.endsAtCore});
 expect(s.a.coupleTask285!.roomRest).toBe(roomA);expect(s.b.coupleTask285!.roomRest).toBe(roomB);expect(s.a.need).toBeNull();expect(s.b.need).toBeNull();
 expect(s.a.coupleClock285!.rng).toBe(initialA.rng);expect(s.b.coupleClock285!.rng).toBe(initialB.rng);expect(s.w.pawns).toContain(s.a);expect(s.w.pawns).toContain(s.b);expect(s.w.rng).toBe(rng);
});

test('process waits for the actual end without rest gain, premature memory or world RNG consumption',()=>{
 const s=entered(),rng=s.w.rng,rest=[s.a.rest,s.b.rest],rooms=[s.a.coupleTask285!.roomRest,s.b.coupleTask285!.roomRest],end=s.a.coupleTask285!.endsAtCore;
 s.w.tick++;expect(s.w.tick*10).toBeLessThan(end);expect(processCouple285(s.w,s.a)).toBe(true);expect(processCouple285(s.w,s.b)).toBe(true);
 expect([s.a.rest,s.b.rest]).toEqual(rest);expect(s.a.coupleMemories285).toBeUndefined();expect(s.b.coupleMemories285).toBeUndefined();expect(s.w.rng).toBe(rng);
 const at=finishAt(s);for(const [p,other,room]of [[s.a,s.b,rooms[0]],[s.b,s.a,rooms[1]]]as const){
  expect(p.coupleMemories285).toEqual([{otherId:other.id,at}]);expect(p.coupleTask285).toBeUndefined();
  expect(p.need?.kind==='sleep'?p.need.roomRest:undefined).toBe(room);expect(p.state).toBe('sleeping');
 }
 const done=JSON.stringify(s.w);expect(processCouple285(s.w,s.a)).toBe(false);reconcileCouple285(s.w,s.b);expect(JSON.stringify(s.w)).toBe(done);expect(s.w.rng).toBe(rng);
});

test('natural completion draws each exact cooldown from its own clock and does not grant a second activity on recheck',()=>{
 const s=entered(),aClock=coupleClockDraft285(s.w.seed,s.a.id,s.a.coupleClock285),bClock=coupleClockDraft285(s.w.seed,s.b.id,s.b.coupleClock285);
 const aSpan=coupleCooldownCore285(30,coupleNormal285(aClock))!,bSpan=coupleCooldownCore285(30,coupleNormal285(bClock))!,rng=s.w.rng,at=finishAt(s);
 expect(s.a.coupleClock285).toMatchObject({rng:aClock.rng,nextAllowedAtCore:at*10+aSpan});expect(s.b.coupleClock285).toMatchObject({rng:bClock.rng,nextAllowedAtCore:at*10+bSpan});
 const memories=[s.a.coupleMemories285,s.b.coupleMemories285];expect(tryCoupleOpportunity285(s.w,s.a)).toBe(false);expect(s.a.coupleMemories285).toBe(memories[0]);expect(s.b.coupleMemories285).toBe(memories[1]);expect(s.w.rng).toBe(rng);
});

test('an entered interruption is a pure two-person plan, then finalizes both once and resumes only the remaining partner',()=>{
 const s=entered();s.w.tick++;const before=JSON.stringify(s.w),rng=s.w.rng,room=s.b.coupleTask285!.roomRest;
 const plan=prepareCoupleRelease285(s.w,new Set([s.a.id]));expect(plan.people).toEqual([s.a,s.b]);expect(plan.current()).toBe(true);expect(JSON.stringify(s.w)).toBe(before);
 plan.commit();expect(s.a.coupleMemories285).toEqual([{otherId:s.b.id,at:s.w.tick}]);expect(s.b.coupleMemories285).toEqual([{otherId:s.a.id,at:s.w.tick}]);
 expect(s.a.need).toBeNull();expect(s.b.need?.kind==='sleep'?s.b.need.roomRest:undefined).toBe(room);expect(s.a.coupleTask285).toBeUndefined();expect(s.b.coupleTask285).toBeUndefined();
 const done=JSON.stringify(s.w);expect(()=>plan.commit()).toThrow('Stale couple release');expect(JSON.stringify(s.w)).toBe(done);expect(s.w.rng).toBe(rng);
});

test('reconciliation keeps start-only famine separate, then a real lost relationship interrupts both entered stages',()=>{
 const s=entered(),rng=s.w.rng;s.w.tick++;s.a.hunger=0;const task=s.a.coupleTask285;
 reconcileCouple285(s.w,s.a);expect(s.a.coupleTask285).toBe(task);expect(s.a.coupleMemories285).toBeUndefined();
 s.w.relationships!.links=[];reconcileCouple285(s.w,s.a);
 expect(s.a.coupleTask285).toBeUndefined();expect(s.b.coupleTask285).toBeUndefined();
 expect(s.a.coupleMemories285).toEqual([{otherId:s.b.id,at:s.w.tick}]);expect(s.b.coupleMemories285).toEqual([{otherId:s.a.id,at:s.w.tick}]);expect(s.w.rng).toBe(rng);
});

test('array visitation order never changes the initiator-first finish or either personal outcome',()=>{
 const one=entered(),two=structuredClone(one);two.w.pawns.reverse();
 const left=prepareCoupleRelease285(one.w,new Set([one.b.id])),right=prepareCoupleRelease285(two.w,new Set([two.b.id]));
 expect(left.people.map(p=>p.id)).toEqual([one.a.id,one.b.id]);expect(right.people.map(p=>p.id)).toEqual([two.a.id,two.b.id]);left.commit();right.commit();
 for(const p of [one.a,one.b]){const other=two.w.pawns.find(q=>q.id===p.id)!;expect(other.coupleClock285).toEqual(p.coupleClock285);expect(other.coupleMemories285).toEqual(p.coupleMemories285);}
});

test('an immutable partner refuses the whole finish preflight without mutating either participant',()=>{
 const s=entered();Object.preventExtensions(s.b);const before=JSON.stringify(s.w);
 expect(()=>prepareCoupleRelease285(s.w,new Set([s.a.id]))).toThrow('Couple release recipients are not mutable');expect(JSON.stringify(s.w)).toBe(before);
});

test('same-value clock, task, bed or actor replacement makes the original sealed plan stale',()=>{
 for(const replace of [
  (s:ReturnType<typeof entered>)=>{s.a.coupleClock285={...s.a.coupleClock285!};},
  (s:ReturnType<typeof entered>)=>{s.b.coupleTask285={...s.b.coupleTask285!};},
  (s:ReturnType<typeof entered>)=>{s.w.structures[s.w.structures.indexOf(s.bed)]={...s.bed};},
  (s:ReturnType<typeof entered>)=>{s.w.pawns[s.w.pawns.indexOf(s.b)]=structuredClone(s.b);},
 ]){
  const s=entered(),plan=prepareCoupleRelease285(s.w,new Set([s.a.id]));replace(s);const before=JSON.stringify(s.w);
  expect(plan.current()).toBe(false);expect(()=>plan.commit()).toThrow('Stale couple release');expect(JSON.stringify(s.w)).toBe(before);
 }
});

test('a task-free interruption gives no new memory, clock or random advance',()=>{
 const s=prepared(),before=JSON.stringify(s.w),plan=prepareCoupleRelease285(s.w,new Set([s.a.id]));
 expect(plan.people).toEqual([]);expect(plan.writes).toEqual([]);plan.commit();expect(JSON.stringify(s.w)).toBe(before);
});

test('private prior writes project both finishes but cannot be committed outside their enclosing transaction',()=>{
 const s=entered(),before=JSON.stringify(s.w),plan=prepareCoupleRelease285(s.w,new Set([s.a.id]),{priorWrites:[{object:s.a,key:'bedId',present:true,value:null}]});
 const projected=plan.project(s.a);expect(projected).not.toBe(s.a);expect(projected.bedId).toBeNull();expect(projected.coupleTask285).toBeUndefined();expect(projected.coupleMemories285).toEqual([{otherId:s.b.id,at:s.w.tick}]);
 expect(JSON.stringify(s.w)).toBe(before);expect(()=>plan.commit()).toThrow('Prospective couple writes require their enclosing transaction');expect(JSON.stringify(s.w)).toBe(before);
});

test('an actual saved entered pair resumes its same deadline and personal streams without replaying entry or awarding a reload memory',()=>{
 const s=entered(),original=serializeWorld(s.w),loaded=deserializeWorld(original),a=loaded.pawns.find(p=>p.id===s.a.id)!,b=loaded.pawns.find(p=>p.id===s.b.id)!;
 expect(a.coupleTask285).toEqual(s.a.coupleTask285);expect(a.coupleClock285).toEqual(s.a.coupleClock285);expect(a.coupleMemories285).toBeUndefined();
 expect(tryCoupleOpportunity285(loaded,a)).toBe(false);expect(serializeWorld(loaded)).toBe(original);
 const end=s.a.coupleTask285!.endsAtCore;
 while(s.w.tick*10<end){stepWorld(s.w);stepWorld(loaded);}
 expect(serializeWorld(loaded)).toBe(serializeWorld(s.w));expect(loaded.pawns.find(p=>p.id===a.id)).toBe(a);expect(a.coupleMemories285).toHaveLength(1);expect(b.coupleMemories285).toHaveLength(1);
});
