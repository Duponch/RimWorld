import {expect,test} from 'vitest';
import {medicalCamp,controlledInjury} from './scenarios/health.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import {claimLocalActorBed256,actualBedOwners256,captureActorBeds256} from '../src/sim/actor-bed-local-256.ts';
import {bedSlotCell} from '../src/sim/bed-slots.ts';
import {coupleBed285} from '../src/sim/couple-bed-285.ts';
import {coupleClockDraft285} from '../src/sim/couple-random-285.ts';
import {reconcileCouple285,processCouple285} from '../src/sim/couple-runtime-285.ts';
import {pawnBody} from '../src/sim/health-rules.ts';
import {reconcilePawnHealth} from '../src/sim/health.ts';
import {medicalStatus} from '../src/sim/injury-state.ts';
import {HUMAN_YEAR_TICKS} from '../src/sim/human-age.ts';

/** Real map, original adults and claimed physical bed. The reciprocal common
 * stage is explicitly prepared, as in the clinical adapter tests; these cases
 * exercise real localized injury and its actual health/release hooks, not the
 * opportunity draw or played bed construction. */
function entered(){
 const w=medicalCamp(2),a=w.pawns[0]!,b=w.pawns[1]!,bed=fixtureBuilding(w,'double-bed',14,14);
 w.relationships={links:[{kind:'lover',aId:Math.min(a.id,b.id),bId:Math.max(a.id,b.id),recordedAt:w.tick-1}]};
 for(const [p,other,slot]of [[a,b,0],[b,a,1]]as const){
  delete p.nativeHuman;delete p.health;delete p.social;delete p.mental;delete p.medicalSleep;delete p.traits;
  p.age={biologicalTicks:30*HUMAN_YEAR_TICKS,chronologicalTicks:30*HUMAN_YEAR_TICKS};
  claimLocalActorBed256(w,p,bed,slot);
  Object.assign(p,bedSlotCell(bed,slot),{state:'idle',need:null,jobId:null,haul:null,cooking:null,path:[],moveCooldown:0,motion:null,hunger:100,rest:50});
  p.orders.active=null;p.orders.queue=[];p.recreation.task=null;
  p.coupleClock285=coupleClockDraft285(w.seed,p.id);
  p.coupleTask285={revision:1,otherId:other.id,initiatorId:a.id,bedId:bed.id,slot,enteredAtCore:(w.tick-1)*10,endsAtCore:w.tick*10+1000,
   medical:'bedrest',roomRest:{nextAt:w.tick+750,applied:false}};
 }
 return {w,a,b,bed};
}

test('a newly downed but conscious participant closes both stages once and retains the same physical bed use and room clock',()=>{
 const s=entered(),position={x:s.a.x,z:s.a.z},room=s.a.coupleTask285!.roomRest,partnerRoom=s.b.coupleTask285!.roomRest;
 const rest=s.a.rest,rng=s.w.rng;expect(coupleBed285(s.w,s.a)).toBe(s.bed);expect(s.a.state).toBe('idle');
 // Destroying the actual internal spine removes locomotion while preserving
 // awake capacity; no fabricated BodyAssessment or forced downed state.
 controlledInjury(s.w,s.a,'spine',25000);
 const record=s.a.health!;expect(record.missing.some(m=>m.part==='spine')).toBe(true);
 expect(record.death).toBeUndefined();expect(pawnBody(s.a).canBeAwake).toBe(true);expect(pawnBody(s.a).movingCapable).toBe(false);
 expect(medicalStatus(record)).toBe('downed');expect(s.a.state).toBe('downed');
 expect({x:s.a.x,z:s.a.z}).toEqual(position);expect(s.a.bedId).toBe(s.bed.id);expect(s.a.bedSlot).toBe(0);
 expect(s.a.need).toMatchObject({kind:'sleep',phase:'sleep',bedId:s.bed.id,target:position,medical:'bedrest'});
 expect(s.a.need?.kind==='sleep'?s.a.need.roomRest:undefined).toBe(room);
 expect(room).toEqual({nextAt:s.w.tick+750,applied:false});expect(s.a.medicalSleep).toBeUndefined();expect(s.a.rest).toBe(rest);
 expect(s.b.need?.kind==='sleep'?s.b.need.roomRest:undefined).toBe(partnerRoom);
 expect(actualBedOwners256(captureActorBeds256(s.w),s.bed.id).map(p=>p.id).sort((a,b)=>a-b)).toEqual([s.a.id,s.b.id].sort((a,b)=>a-b));
 for(const [p,other]of [[s.a,s.b],[s.b,s.a]]as const){
  expect(p.coupleTask285).toBeUndefined();expect(p.coupleMemories285).toEqual([{otherId:other.id,at:s.w.tick}]);
  expect(p.coupleClock285!.nextAllowedAtCore).toBeGreaterThan(s.w.tick*10);
 }
 const closed=JSON.stringify(s.w);reconcilePawnHealth(s.w,s.a);reconcileCouple285(s.w,s.a);reconcileCouple285(s.w,s.b);
 expect(processCouple285(s.w,s.a)).toBe(false);expect(JSON.stringify(s.w)).toBe(closed);expect(s.a.health).toBe(record);expect(s.w.rng).toBe(rng);
});

test('a real fatal injury closes both stages once while releasing the deceased original bed ownership and never restoring its sleep use',()=>{
 const s=entered(),position={x:s.a.x,z:s.a.z},partnerRoom=s.b.coupleTask285!.roomRest;
 // The actual heart is a15-HP vital part in this real adult body.
 controlledInjury(s.w,s.a,'heart',15000);
 const record=s.a.health!;expect(record.death?.cause).toBe('vital-failure');expect(s.a.state).toBe('dead');
 expect({x:s.a.x,z:s.a.z}).toEqual(position);expect(s.a.need).toBeNull();expect(s.a.bedId).toBeNull();expect(s.a.bedSlot).toBeUndefined();expect(s.a.mapBed).toBeUndefined();
 expect(coupleBed285(s.w,s.a)).toBeUndefined();expect(s.a.medicalSleep).toBeUndefined();
 expect(actualBedOwners256(captureActorBeds256(s.w),s.bed.id).map(p=>p.id)).toEqual([s.b.id]);
 expect(s.b.bedId).toBe(s.bed.id);expect(s.b.bedSlot).toBe(1);expect(s.b.need?.kind==='sleep'?s.b.need.roomRest:undefined).toBe(partnerRoom);
 for(const [p,other]of [[s.a,s.b],[s.b,s.a]]as const){
  expect(p.coupleTask285).toBeUndefined();expect(p.coupleMemories285).toEqual([{otherId:other.id,at:s.w.tick}]);
  expect(p.coupleClock285!.nextAllowedAtCore).toBeGreaterThan(s.w.tick*10);
 }
 const clocks=[s.a.coupleClock285,s.b.coupleClock285],memories=[s.a.coupleMemories285,s.b.coupleMemories285],rng=s.w.rng;
 // The death reconciler may repeat its existing death bookkeeping; only the
 // already-entered activity must never finish or draw its cooldown twice.
 reconcilePawnHealth(s.w,s.a);reconcileCouple285(s.w,s.a);reconcileCouple285(s.w,s.b);
 expect(processCouple285(s.w,s.b)).toBe(false);
 expect(s.a.coupleClock285).toBe(clocks[0]);expect(s.b.coupleClock285).toBe(clocks[1]);
 expect(s.a.coupleMemories285).toBe(memories[0]);expect(s.b.coupleMemories285).toBe(memories[1]);expect(s.a.health).toBe(record);expect(s.a.need).toBeNull();expect(s.w.rng).toBe(rng);
});
