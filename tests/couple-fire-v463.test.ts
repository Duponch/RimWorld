import {expect,test} from 'vitest';
import {medicalCamp} from './scenarios/health.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import {claimLocalActorBed256} from '../src/sim/actor-bed-local-256.ts';
import {bedSlotCell} from '../src/sim/bed-slots.ts';
import {coupleBed285,coupleBedBurning285} from '../src/sim/couple-bed-285.ts';
import {coupleClockDraft285,coupleOpportunityRoll285} from '../src/sim/couple-random-285.ts';
import {coupleBiologicalYears285,coupleHourlyChance285,coupleMtbHours285} from '../src/sim/couple-rules-285.ts';
import {tryCoupleOpportunity285,reconcileCouple285,processCouple285} from '../src/sim/couple-runtime-285.ts';
import {prepareCoupleRelease285} from '../src/sim/couple-release-285.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {startFire} from '../src/sim/fire.ts';
import {pawnBody} from '../src/sim/health-rules.ts';
import {HUMAN_YEAR_TICKS} from '../src/sim/human-age.ts';
import {relationshipIndex} from '../src/sim/relationship-runtime.ts';
import {knownRomanceChanceFactor,romanceAgeFactor} from '../src/sim/relationship-state.ts';
import {opinionOf} from '../src/sim/social-state.ts';
import type {Pawn} from '../src/sim/types.ts';

/** Declared real map/bed/adult preparation, with an existing deterministic
 * positive check date. No seed replacement, played construction or fire spread
 * is claimed: startFire alone produces each actual flame used below. */
function prepared(){
 const w=medicalCamp(2),a=w.pawns[0]!,b=w.pawns[1]!,bed=fixtureBuilding(w,'double-bed',14,14);
 Object.assign(bed,{material:'wood'});
 w.relationships={links:[{kind:'lover',aId:Math.min(a.id,b.id),bId:Math.max(a.id,b.id),recordedAt:w.tick-1}]};
 for(const [p,slot]of [[a,0],[b,1]]as const){
  delete p.nativeHuman;delete p.health;delete p.social;delete p.mental;delete p.medicalSleep;delete p.traits;
  p.age={biologicalTicks:30*HUMAN_YEAR_TICKS,chronologicalTicks:30*HUMAN_YEAR_TICKS};
  claimLocalActorBed256(w,p,bed,slot);
  Object.assign(p,bedSlotCell(bed,slot),{state:'sleeping',need:null,jobId:null,haul:null,cooking:null,path:[],moveCooldown:0,motion:null,hunger:100,rest:50});
  p.orders.active=null;p.orders.queue=[];p.recreation.task=null;
 }
 const index=relationshipIndex(w),person=(p:Pawn,q:Pawn)=>{
  const age=coupleBiologicalYears285(p)!,otherAge=coupleBiologicalYears285(q)!;
  return {ageYears:age,pain:0,consciousness:pawnBody(p).capacities.consciousness,opinion:opinionOf(p,q.id,w.tick,w),
   attraction:romanceAgeFactor(age,otherAge)*knownRomanceChanceFactor(index,p.id,q.id)};
 };
 const mtb=coupleMtbHours285(person(a,b),person(b,a));
 if(mtb===undefined||!Number.isFinite(mtb))throw Error('Prepared real pair has no finite opportunity');
 const chance=coupleHourlyChance285(mtb),initial=w.tick;let found=false;
 for(let n=0;n<2000;n++){
  const tick=initial+n*250;
  if(coupleOpportunityRoll285(w.seed,a.id,tick*10)<chance){w.tick=tick;found=true;break;}
 }
 if(!found)throw Error('No positive check date within the declared bound');
 for(const p of [a,b])p.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:p.x,z:p.z},roomRest:{nextAt:w.tick+750,applied:false}};
 const heads=[bedSlotCell(bed,0)!,bedSlotCell(bed,1)!];
 const foot=footprintCells(bed).find(c=>!heads.some(h=>h.x===c.x&&h.z===c.z));
 if(!foot)throw Error('Real double-bed foot cell missing');
 return {w,a,b,bed,foot};
}

test('a real flame at the bed foot refuses a positive opportunity without entering or awarding either participant',()=>{
 const s=prepared(),needA=s.a.need,needB=s.b.need,initial=coupleClockDraft285(s.w.seed,s.a.id);
 expect(startFire(s.w,s.foot)).toBe(true);expect(coupleBedBurning285(s.w,s.bed)).toBe(true);
 const rng=s.w.rng,fire=JSON.stringify(s.w.fires),nextId=s.w.nextId;
 expect(tryCoupleOpportunity285(s.w,s.a)).toBe(false);
 expect(s.a.coupleClock285).toEqual({...initial,lastAttemptAtCore:s.w.tick*10});
 expect(s.b.coupleClock285).toBeUndefined();expect(s.a.need).toBe(needA);expect(s.b.need).toBe(needB);
 for(const p of [s.a,s.b]){expect(p.coupleTask285).toBeUndefined();expect(p.coupleMemories285).toBeUndefined();}
 expect(s.w.rng).toBe(rng);expect(s.w.nextId).toBe(nextId);expect(JSON.stringify(s.w.fires)).toBe(fire);
});

test('a bed-foot fire closes both entered stages exactly once and never resumes sleep in that burning bed',()=>{
 const s=prepared();expect(tryCoupleOpportunity285(s.w,s.a)).toBe(true);s.w.tick++;
 expect(startFire(s.w,s.foot)).toBe(true);
 // Being physically in bed remains true until the simulation releases it;
 // a posture reader alone does not claim that the activity is still usable.
 expect(coupleBed285(s.w,s.a)).toBe(s.bed);expect(coupleBed285(s.w,s.b)).toBe(s.bed);
 const rng=s.w.rng,fire=JSON.stringify(s.w.fires),nextId=s.w.nextId;
 reconcileCouple285(s.w,s.a);
 for(const [p,other]of [[s.a,s.b],[s.b,s.a]]as const){
  expect(p.coupleTask285).toBeUndefined();expect(p.need).toBeNull();expect(p.state).not.toBe('sleeping');
  expect(p.coupleMemories285).toEqual([{otherId:other.id,at:s.w.tick}]);
  expect(p.coupleClock285!.nextAllowedAtCore).toBeGreaterThan(s.w.tick*10);
 }
 const closed=JSON.stringify(s.w);
 reconcileCouple285(s.w,s.b);reconcileCouple285(s.w,s.a);
 expect(processCouple285(s.w,s.a)).toBe(false);expect(processCouple285(s.w,s.b)).toBe(false);
 expect(JSON.stringify(s.w)).toBe(closed);expect(s.w.rng).toBe(rng);expect(s.w.nextId).toBe(nextId);expect(JSON.stringify(s.w.fires)).toBe(fire);
});

test('an adjacent real flame outside the bed footprint neither refuses the start nor interrupts the same pair',()=>{
 const s=prepared(),adjacent={x:s.bed.x-1,z:s.bed.z};
 expect(footprintCells(s.bed).some(c=>c.x===adjacent.x&&c.z===adjacent.z)).toBe(false);
 const fuel=fixtureBuilding(s.w,'wall',adjacent.x,adjacent.z);Object.assign(fuel,{material:'wood'});
 expect(startFire(s.w,adjacent)).toBe(true);expect(coupleBedBurning285(s.w,s.bed)).toBe(false);
 const rng=s.w.rng;expect(tryCoupleOpportunity285(s.w,s.a)).toBe(true);
 const tasks=[s.a.coupleTask285,s.b.coupleTask285];s.w.tick++;
 reconcileCouple285(s.w,s.a);reconcileCouple285(s.w,s.b);
 expect(s.a.coupleTask285).toBe(tasks[0]);expect(s.b.coupleTask285).toBe(tasks[1]);
 expect(processCouple285(s.w,s.a)).toBe(true);expect(processCouple285(s.w,s.b)).toBe(true);
 expect(s.a.need).toBeNull();expect(s.b.need).toBeNull();expect(s.a.coupleMemories285).toBeUndefined();expect(s.b.coupleMemories285).toBeUndefined();expect(s.w.rng).toBe(rng);
});

test('a true bed-foot ignition after preparation makes the whole resume plan stale without a partial finish',()=>{
 const s=prepared();expect(tryCoupleOpportunity285(s.w,s.a)).toBe(true);
 const before=JSON.stringify(s.w),plan=prepareCoupleRelease285(s.w,new Set([s.a.id]),{resumeAll:true});
 expect(plan.current()).toBe(true);expect(JSON.stringify(s.w)).toBe(before);
 expect(startFire(s.w,s.foot)).toBe(true);expect(coupleBedBurning285(s.w,s.bed)).toBe(true);
 const ignited=JSON.stringify(s.w),clocks=[s.a.coupleClock285,s.b.coupleClock285],tasks=[s.a.coupleTask285,s.b.coupleTask285];
 expect(plan.current()).toBe(false);expect(()=>plan.commit()).toThrow('Stale couple release');
 expect(JSON.stringify(s.w)).toBe(ignited);
 for(const [index,p]of [s.a,s.b].entries()){
  expect(p.coupleClock285).toBe(clocks[index]);expect(p.coupleTask285).toBe(tasks[index]);expect(p.coupleMemories285).toBeUndefined();expect(p.need).toBeNull();
 }
});

test('a true adjacent ignition after preparation keeps an otherwise unchanged physical resume plan usable',()=>{
 const s=prepared(),adjacent={x:s.bed.x-1,z:s.bed.z};
 expect(footprintCells(s.bed).some(c=>c.x===adjacent.x&&c.z===adjacent.z)).toBe(false);
 const fuel=fixtureBuilding(s.w,'wall',adjacent.x,adjacent.z);Object.assign(fuel,{material:'wood'});
 expect(tryCoupleOpportunity285(s.w,s.a)).toBe(true);
 const before=JSON.stringify(s.w),plan=prepareCoupleRelease285(s.w,new Set([s.a.id]),{resumeAll:true});
 expect(plan.current()).toBe(true);expect(JSON.stringify(s.w)).toBe(before);
 expect(startFire(s.w,adjacent)).toBe(true);expect(coupleBedBurning285(s.w,s.bed)).toBe(false);
 const fire=JSON.stringify(s.w.fires),rng=s.w.rng,nextId=s.w.nextId;
 expect(plan.current()).toBe(true);plan.commit();
 for(const [p,other]of [[s.a,s.b],[s.b,s.a]]as const){
  expect(p.coupleTask285).toBeUndefined();expect(p.need).toMatchObject({kind:'sleep',phase:'sleep',bedId:s.bed.id});
  expect(p.state).toBe('sleeping');expect(p.coupleMemories285).toEqual([{otherId:other.id,at:s.w.tick}]);
 }
 expect(JSON.stringify(s.w.fires)).toBe(fire);expect(s.w.rng).toBe(rng);expect(s.w.nextId).toBe(nextId);
 const done=JSON.stringify(s.w);expect(()=>plan.commit()).toThrow('Stale couple release');expect(JSON.stringify(s.w)).toBe(done);
});
