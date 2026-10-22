import {expect,test} from 'vitest';
import {medicalCamp} from './scenarios/health.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import {bedSlotCell} from '../src/sim/bed-slots.ts';
import {coupleBed285} from '../src/sim/couple-bed-285.ts';
import {updatePawnHealth} from '../src/sim/health.ts';
import {addResolvedInjury,assessMedical,createMedicalRecord} from '../src/sim/injury-state.ts';
import {medicalModel} from '../src/sim/body-model.ts';
import {acquireFlu} from '../src/sim/flu-state.ts';
import {HUMAN_YEAR_TICKS} from '../src/sim/human-age.ts';

/** Real clinical map and built double-bed fixture. Existing adults are placed
 * in the already-entered reciprocal posture explicitly; this is an adapter
 * check, not a claim of natural opportunity, played construction or admission. */
function pair(){
 const w=medicalCamp(2),a=w.pawns[0]!,b=w.pawns[1]!,bed=fixtureBuilding(w,'double-bed',14,14);
 // One reached clinical healing frontier, with precisely one tick to advance.
 w.tick+=(a.id%60-w.tick%60+60)%60;
 w.relationships={links:[{kind:'lover',aId:Math.min(a.id,b.id),bId:Math.max(a.id,b.id),recordedAt:w.tick-1}]};
 for(const [p,other,slot]of [[a,b,0],[b,a,1]]as const){
  const cell=bedSlotCell(bed,slot);if(!cell)throw Error('Real bed slot missing');
  delete p.nativeHuman;delete p.health;delete p.medicalSleep;
  p.age={biologicalTicks:30*HUMAN_YEAR_TICKS,chronologicalTicks:30*HUMAN_YEAR_TICKS};
  Object.assign(p,cell,{bedId:bed.id,bedSlot:slot,state:'idle',need:null,jobId:null,haul:null,cooking:null,path:[],moveCooldown:0,motion:null,hunger:100,rest:100});
  p.orders.active=null;p.orders.queue=[];p.recreation.task=null;
  p.coupleClock285={revision:1,rng:p.id,lastAttemptAtCore:(w.tick-1)*10};
  p.coupleTask285={revision:1,otherId:other.id,initiatorId:a.id,bedId:bed.id,slot,enteredAtCore:(w.tick-1)*10,endsAtCore:(w.tick-1)*10+1000};
 }
 a.health=createMedicalRecord(w.tick-1);
 return {w,a,b,bed};
}
function bruise(s:ReturnType<typeof pair>){
 const injury=addResolvedInjury(s.a.health!,'right-hand','bruise',2000,()=>.999999);
 if(!injury)throw Error('Actual injury missing');return injury;
}

test('awake physical couple posture keeps the natural lying and civil-bed healing bonuses without restoring the rest gauge',()=>{
 const s=pair(),injury=bruise(s),before=injury.severity,scale=medicalModel(s.a.health!).healthScale,rest=s.a.rest,task=s.a.coupleTask285;
 expect(coupleBed285(s.w,s.a)).toBe(s.bed);expect(s.a.need).toBeNull();
 updatePawnHealth(s.w,s.a);
 expect(before-injury.severity).toBe(Math.round(160*scale)); // Primary8+4+4 per day, local milli-HP frontier.
 expect(s.a.rest).toBe(rest);expect(s.a.health!.tick).toBe(s.w.tick);expect(s.a.coupleTask285).toBe(task);
});

test('a real minor disease retains both bed1.07 and resting1.1 immunity factors while the participant stays awake',()=>{
 const s=pair();expect(acquireFlu(s.a.health!,1_000_000)).toBe(true);
 const filtration=assessMedical(s.a.health!).capacities.bloodFiltration,rng=s.w.rng,rest=s.a.rest;
 updatePawnHealth(s.w,s.a);
 const expected=Math.round(.2388*(.5+.5*filtration)*1.07*1.1*1_000_000_000/6000);
 expect(s.a.health!.flu!.immunity).toBe(expected);
 expect(s.a.health!.flu!.immunity).toBeGreaterThan(Math.round(.2388*(.5+.5*filtration)*1.07*1_000_000_000/6000));
 expect(s.a.state).not.toBe('sleeping');expect(s.a.rest).toBe(rest);expect(s.w.rng).toBe(rng);
});

test('a stale task grants no clinical bed service after movement, loss of place, bed removal, role change or actual carrying',()=>{
 const changes:[string,(s:ReturnType<typeof pair>)=>void][]=[
  ['position',s=>{s.a.x++;}],['slot',s=>{s.a.bedSlot=1;}],['movement',s=>{s.a.moveCooldown=1;}],
  ['motion',s=>{s.a.motion={from:{x:s.a.x,z:s.a.z},to:{x:s.a.x,z:s.a.z},start:s.w.tick-1,end:s.w.tick+1};}],
  ['removed',s=>{s.w.structures=s.w.structures.filter(bed=>bed!==s.bed);}],
  ['medical role',s=>{Object.assign(s.bed,{medical:true});}],['prison role',s=>{Object.assign(s.bed,{prisoner:true});}],
  // Deliberately observe a physical interruption before its task cleanup.
  ['carrier',s=>{s.b.rescue={patientId:s.a.id,bedId:s.bed.id,phase:'carry'};}],
 ];
 for(const [label,change]of changes){
  const s=pair(),injury=bruise(s),before=injury.severity,scale=medicalModel(s.a.health!).healthScale;
  change(s);updatePawnHealth(s.w,s.a);
  expect(before-injury.severity,label).toBe(Math.round(80*scale));
 }
});

test('literal task absence and an actual historical284 sleeper keep their existing clinical branches',()=>{
 const absent=pair(),standingInjury=bruise(absent),standingBefore=standingInjury.severity,scale=medicalModel(absent.a.health!).healthScale;
 delete absent.a.coupleTask285;delete absent.b.coupleTask285;
 updatePawnHealth(absent.w,absent.a);expect(standingBefore-standingInjury.severity).toBe(Math.round(80*scale));
 const old=pair(),bedInjury=bruise(old),bedBefore=bedInjury.severity;
 for(const p of old.w.pawns){delete p.coupleTask285;delete p.coupleClock285;}
 Object.defineProperty(old.w,'schemaVersion',{value:284,writable:true,enumerable:true,configurable:true});
 old.a.state='sleeping';old.a.need={kind:'sleep',phase:'sleep',bedId:old.bed.id,target:{x:old.a.x,z:old.a.z}};
 expect(coupleBed285(old.w,old.a)).toBeUndefined();updatePawnHealth(old.w,old.a);
 expect(bedBefore-bedInjury.severity).toBe(Math.round(160*medicalModel(old.a.health!).healthScale));
});
