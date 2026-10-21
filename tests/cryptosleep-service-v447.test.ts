import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {controlledInjury} from './scenarios/health.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {newCryptosleepHolder271,cryptosleepInteraction271,type PlayerCasket271,type CryptosleepTask271} from '../src/sim/cryptosleep-state-271.ts';
import {cryptosleepIntent271,cryptosleepLastColonist271,validCryptosleepCommand271} from '../src/sim/cryptosleep-intent-271.ts';
import {advanceCryptosleepContact271} from '../src/sim/cryptosleep-task-271.ts';
import {validCryptosleepTaskField271,validateCryptosleepTasks271} from '../src/sim/cryptosleep-task-save-271.ts';
import {carrierOf} from '../src/sim/rescue-state.ts';
import {sameRescueEdge} from '../src/sim/rescue-save.ts';
import {patientClaimed} from '../src/sim/care-access.ts';
import {reservedServiceCells} from '../src/sim/service-reservations.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {advanceMedical} from '../src/sim/injury-evolution.ts';
import {administerAnesthetic,anestheticStage} from '../src/sim/anesthetic.ts';
import {reconcilePawnHealth} from '../src/sim/health.ts';
import {medicalCivilTick271} from '../src/sim/suspended-human-clock-271.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {SCHEMA_VERSION,type World,type Command} from '../src/sim/types.ts';
import {colonyWealth} from '../src/sim/colony-wealth.ts';
import {refreshStock} from '../src/sim/materials.ts';
import {structureRoomMarketValue} from '../src/sim/room-market-value.ts';

const command=(w:World,c:Command)=>{const result=applyCommand(w,c);expect(result.ok,result.reason??JSON.stringify(c)).toBe(true);};
const exact=(w:World)=>{const text=serializeWorld(w),copy=deserializeWorld(text);expect(serializeWorld(copy)).toBe(text);return copy;};
function until(w:World,done:()=>boolean,limit=500){for(let i=0;i<limit&&!done();i++)stepWorld(w);expect(done(),JSON.stringify({tick:w.tick,actors:w.pawns.map(p=>({id:p.id,state:p.state,x:p.x,z:p.z,moveCooldown:p.moveCooldown,task:p.cryptosleepTask}))})).toBe(true);expect(validateWorld(w)).toEqual([]);}
/** Declared adults, full needs, zero work priorities, empty installed casket
 * and clear32² ground. No research/construction or clinical acquisition is
 * claimed. Entry, carry, closing, opening and cancellation are real services. */
function camp(){
 const w=deconstructionCamp(3),[actor,patient,helper]=w.pawns;w.jobs=[];w.piles=[];w.structures=[];w.packed=[];w.stockpiles=[];delete w.wildlife;delete w.arrivals;delete w.raids;
 for(const p of w.pawns){delete p.background;delete p.traits;delete p.health;p.hunger=100;p.rest=100;p.recreation.level=100;p.schedule.fill('work');p.bedId=null;for(const key of Object.keys(p.priorities) as (keyof typeof p.priorities)[])p.priorities[key]=0;}
 Object.assign(actor!,{x:4,z:10});Object.assign(patient!,{x:8,z:12});Object.assign(helper!,{x:20,z:10});
 const casket:PlayerCasket271={id:w.nextId++,kind:'cryptosleep-casket',x:14,z:10,orientation:0,footprint:'standard',material:'steel',cryptosleep:newCryptosleepHolder271(w.tick)};
 w.structures.push(casket);expect(w.schemaVersion).toBe(SCHEMA_VERSION);expect(validateWorld(w)).toEqual([]);return {w,actor:actor!,patient:patient!,helper:helper!,casket};
}

test('voluntary entry requires actual travel,500Core contact and exact continuation; opening requires300Core and returns the same person',()=>{
 const {w,actor,helper,casket}=camp(),id=actor.id,cell=cryptosleepInteraction271(casket);
 command(w,{type:'order-enter-cryptosleep',pawnId:id,casketId:casket.id});
 expect(w.pawns.includes(actor)).toBe(true);expect(casket.cryptosleep.human).toBeNull();expect(actor.cryptosleepTask).toMatchObject({action:'enter',phase:'approach',progressCore:0});
 until(w,()=>actor.cryptosleepTask?.phase==='closing');const started=w.tick;
 expect(actor).toMatchObject(cell);expect(actor.moveCooldown).toBe(0);expect(actor.motion?.end??0).toBeLessThanOrEqual(w.tick);expect(actor.cryptosleepTask!.progressCore).toBe(0);
 stepWorld(w,19);expect(actor.cryptosleepTask!.progressCore).toBe(190);expect(w.pawns.includes(actor)).toBe(true);const resume=exact(w),checkpoint=w.tick;
 stepWorld(w,30);stepWorld(resume,30);expect(serializeWorld(resume)).toBe(serializeWorld(w));expect(w.tick-started).toBe(49);expect(actor.cryptosleepTask!.progressCore).toBe(490);expect(casket.cryptosleep.human).toBeNull();
 stepWorld(w);stepWorld(resume);expect(serializeWorld(resume)).toBe(serializeWorld(w));expect(w.tick).toBe(started+50);
 expect(w.pawns.some(p=>p.id===id)).toBe(false);expect(casket.cryptosleep.human).toBe(actor);expect(actor.cryptosleepTask).toBeUndefined();expect(casket.cryptosleep.heldAt).toBe(w.tick);expect(validateWorld(w)).toEqual([]);
 expect(checkpoint).toBe(started+19);stepWorld(w,25);expect(casket.cryptosleep.human).toBe(actor);
 command(w,{type:'order-open-cryptosleep',pawnId:helper.id,casketId:casket.id});until(w,()=>helper.cryptosleepTask?.phase==='opening');const openedAt=w.tick,opening=exact(w);
 stepWorld(w,29);stepWorld(opening,29);expect(serializeWorld(opening)).toBe(serializeWorld(w));expect(helper.cryptosleepTask!.progressCore).toBe(290);expect(w.pawns.some(p=>p.id===id)).toBe(false);
 stepWorld(w);stepWorld(opening);expect(serializeWorld(opening)).toBe(serializeWorld(w));expect(w.tick).toBe(openedAt+30);
 expect(casket.cryptosleep.human).toBeNull();expect(w.pawns.find(p=>p.id===id)).toBe(actor);expect(actor.health?.cryptosleepSickness).toBeDefined();expect(helper.cryptosleepTask).toBeUndefined();exact(w);
});

test.each(['carry','closing'] as const)('stopping during%s keeps the original patient on the physical carrier edge and never inserts them remotely',phase=>{
 const {w,actor,patient,casket}=camp();controlledInjury(w,patient,'left-leg',30000);controlledInjury(w,patient,'right-leg',30000);expect(patient.state).toBe('downed');
 command(w,{type:'order-carry-cryptosleep',pawnId:actor.id,patientId:patient.id,casketId:casket.id});
 until(w,()=>actor.cryptosleepTask?.phase===phase&&(phase==='closing'||(actor.motion?.end??0)>w.tick));
 expect(carrierOf(w,patient.id)).toBe(actor);expect(w.pawns.find(p=>p.id===patient.id)).toBe(patient);expect(patient.x).toBe(actor.x);expect(patient.z).toBe(actor.z);expect(sameRescueEdge(patient.motion,actor.motion)).toBe(true);
 const edge=structuredClone(patient.motion),position={x:patient.x,z:patient.z},copy=exact(w);
 for(const state of [w,copy])command(state,{type:'clear-orders',pawnId:actor.id});
 expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(actor.cryptosleepTask).toBeUndefined();expect(carrierOf(w,patient.id)).toBeUndefined();expect(patient).toMatchObject(position);expect(patient.motion).toEqual(edge);expect(casket.cryptosleep.human).toBeNull();
 stepWorld(w,8);stepWorld(copy,8);expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(w.pawns.find(p=>p.id===patient.id)).toBe(patient);expect(validateWorld(w)).toEqual([]);
});

test('a carried patient naturally recovering during500Core closing remains the same claimed local original until admission',()=>{
 const {w,actor,patient,casket}=camp();Object.assign(casket,{x:3,z:10});Object.assign(patient,{x:4,z:10});
 // Declared valid near-threshold clinical fixture, not a played operation or
 // consumed dose. Exactly75real kernel pulses leave severity800000000; the
 // next pulse during closing restores consciousness without a forced edit.
 const phase=patient.id%20,start=(phase===0?1500:1480+phase)+1,record=createMedicalRecord(0);
 expect(administerAnesthetic(record,()=>.999999)).toBe(true);advanceMedical(record,start,{phase:patient.id%60,posture:'ground',starving:false,hunger:100,rest:100},()=>{throw Error('Prepared anesthetic cadence must not draw');});
 w.tick=start;w.deterioration!.lastTick=start;if(w.fires)w.fires.clockCore=start*10;patient.health=record;reconcilePawnHealth(w,patient);
 expect(anestheticStage(record.anesthetic!.severity)).toBe('sedated');expect(record.anesthetic!.severity).toBe(800_000_000);expect(patient.state).toBe('downed');expect(validateWorld(w)).toEqual([]);
 command(w,{type:'order-carry-cryptosleep',pawnId:actor.id,patientId:patient.id,casketId:casket.id});until(w,()=>actor.cryptosleepTask?.phase==='closing');const began=w.tick,resume=exact(w);
 let recovered=false;
 for(let i=0;i<49;i++){
  stepWorld(w);stepWorld(resume);expect(serializeWorld(resume)).toBe(serializeWorld(w));expect(w.pawns.find(p=>p.id===patient.id)).toBe(patient);expect(casket.cryptosleep.human).toBeNull();
  expect(carrierOf(w,patient.id)).toBe(actor);expect(medicalCivilTick271(patient.health!)).toBe(w.tick);if(patient.state!=='downed')recovered=true;
 }
 expect(recovered).toBe(true);expect(actor.cryptosleepTask?.progressCore).toBe(490);
 stepWorld(w);stepWorld(resume);expect(w.tick).toBe(began+50);expect(serializeWorld(resume)).toBe(serializeWorld(w));expect(casket.cryptosleep.human).toBe(patient);expect(w.pawns.some(p=>p.id===patient.id)).toBe(false);expect(actor.cryptosleepTask).toBeUndefined();expect(validateWorld(w)).toEqual([]);
});

test('casket, interaction and patient claims reject competing orders atomically',()=>{
 const {w,actor,patient,helper,casket}=camp();controlledInjury(w,patient,'left-leg',30000);controlledInjury(w,patient,'right-leg',30000);
 const other:PlayerCasket271={id:w.nextId++,kind:'cryptosleep-casket',x:16,z:10,orientation:2,footprint:'standard',material:'steel',cryptosleep:newCryptosleepHolder271(w.tick)};w.structures.push(other);
 command(w,{type:'order-carry-cryptosleep',pawnId:actor.id,patientId:patient.id,casketId:casket.id});const before=serializeWorld(w),cell=cryptosleepInteraction271(casket);
 expect(patientClaimed(w,patient.id,helper)).toBe(true);expect(reservedServiceCells(w,helper.id).has(cell.z*w.width+cell.x)).toBe(true);
 for(const order of [
  {type:'order-enter-cryptosleep',pawnId:helper.id,casketId:casket.id},
  {type:'order-enter-cryptosleep',pawnId:helper.id,casketId:other.id},
  {type:'order-carry-cryptosleep',pawnId:helper.id,patientId:patient.id,casketId:other.id},
  {type:'order-rescue',pawnId:helper.id,patientId:patient.id,queue:false},
 ] as const){expect(applyCommand(w,order).ok).toBe(false);expect(serializeWorld(w)).toBe(before);}
 expect(validateCryptosleepTasks271(w)).toEqual([]);
});

test('last-colonist acknowledgement is explicit; living downed free colonists count in the native warning',()=>{
 const {w,actor,patient,casket}=camp();w.pawns=[actor,patient];patient.state='downed';expect(cryptosleepLastColonist271(w,actor.id)).toBe(false);
 w.pawns=[actor];expect(cryptosleepLastColonist271(w,actor.id)).toBe(true);expect(validateWorld(w)).toEqual([]);
 const c={type:'order-enter-cryptosleep' as const,pawnId:actor.id,casketId:casket.id},before=serializeWorld(w);
 expect(cryptosleepIntent271(w,c)).toMatchObject({ok:false,reason:expect.stringContaining('dernier colon')});expect(applyCommand(w,c).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
 expect(validCryptosleepCommand271({...c,confirmLastColonist:false},SCHEMA_VERSION,w.nextId)).toBe(false);expect(validCryptosleepCommand271({...c,queue:false},SCHEMA_VERSION,w.nextId)).toBe(false);
 command(w,{...c,confirmLastColonist:true});expect(w.pawns.includes(actor)).toBe(true);expect(casket.cryptosleep.human).toBeNull();expect(actor.cryptosleepTask?.progressCore).toBe(0);
});

test('contact helpers and task envelopes reject paused credit, skipped intervals, future schema and unsupported mixed phases',()=>{
 const t:CryptosleepTask271={casketId:2,action:'enter',phase:'approach',progressCore:0,lastWorkedAt:10};
 expect(advanceCryptosleepContact271(t,10,true)).toBe('wait');expect(t).toMatchObject({phase:'closing',progressCore:0,lastWorkedAt:10});
 expect(advanceCryptosleepContact271(t,10,true)).toBe('wait');expect(t.progressCore).toBe(0);expect(advanceCryptosleepContact271(t,11,true)).toBe('wait');expect(t.progressCore).toBe(10);
 const before=structuredClone(t);expect(advanceCryptosleepContact271(t,13,true)).toBe('cancel');expect(t).toEqual(before);expect(advanceCryptosleepContact271(t,11,false)).toBe('cancel');expect(t).toEqual(before);
 expect(validCryptosleepTaskField271({cryptosleepTask:t},SCHEMA_VERSION,11,4)).toBe(true);expect(validCryptosleepTaskField271({cryptosleepTask:t},270,11,4)).toBe(false);expect(validCryptosleepTaskField271({cryptosleepTask:t},271,11,4)).toBe(true);expect(validCryptosleepTaskField271({cryptosleepTask:t},273,11,4)).toBe(false);
 for(const change of [{progressCore:500},{progressCore:1},{lastWorkedAt:10},{action:'open'},{patientId:3},{phase:'pickup'}])expect(validCryptosleepTaskField271({cryptosleepTask:{...t,...change}},SCHEMA_VERSION,11,4)).toBe(false);
 expect(validCryptosleepTaskField271({cryptosleepTask:undefined},270,11,4)).toBe(false);
 const accessor=Object.defineProperty({...t},'action',{enumerable:true,get(){throw Error('Task accessor must not execute');}});
 expect(validCryptosleepTaskField271({cryptosleepTask:accessor},SCHEMA_VERSION,11,4)).toBe(false);
 const commandAccessor=Object.defineProperty({pawnId:1,casketId:2},'type',{enumerable:true,get(){throw Error('Command accessor must not execute');}});
 expect(validCryptosleepCommand271(commandAccessor,SCHEMA_VERSION,4)).toBe(false);
});

test('same-tick public task admission and cancellation preserve the previously adopted world',()=>{
 const {w,actor,casket}=camp(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 const first=decoder.adopt(structuredClone(encoder.encode(w,0,0)));expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Valid casket checkpoint refused');const retained=structuredClone(first.world);
 command(w,{type:'order-enter-cryptosleep',pawnId:actor.id,casketId:casket.id});const second=decoder.adopt(structuredClone(encoder.encode(w,0,0)));expect(second.status).toBe('applied');if(second.status!=='applied')throw Error('Valid same-tick casket task refused');
 expect(second.world.tick).toBe(first.world.tick);expect(second.world.pawns.find(p=>p.id===actor.id)?.cryptosleepTask).toEqual(actor.cryptosleepTask);expect(first.world).toEqual(retained);
 const admitted=structuredClone(second.world);command(w,{type:'clear-orders',pawnId:actor.id});const third=decoder.adopt(structuredClone(encoder.encode(w,0,0)));expect(third.status).toBe('applied');if(third.status!=='applied')throw Error('Valid cancellation refused');
 expect(third.world.pawns.find(p=>p.id===actor.id)?.cryptosleepTask).toBeUndefined();expect(second.world).toEqual(admitted);expect(first.world).toEqual(retained);
});

test('installed cryptosleep never hides the original colonist or finite personal goods from map wealth',()=>{
 const wealth=(world:World)=>{const value=colonyWealth(world);return {...value,unpricedPawnIds:[...value.unpricedPawnIds].sort((a,b)=>a-b)};};
 const {w,actor,helper,casket}=camp(),empty=wealth(w);
 const wood={id:w.nextId++,kind:'wood' as const,item:'wood' as const,quantity:7,owner:{type:'inventory' as const,pawnId:actor.id}};
 const bed={id:w.nextId++,kind:'bed' as const,x:actor.x,z:actor.z,orientation:0 as const,footprint:'standard' as const,material:'wood' as const,quality:'normal' as const};
 const packed={building:bed,owner:{type:'inventory' as const,pawnId:actor.id}};
 w.piles.push(wood);w.packed.push(packed);refreshStock(w);expect(validateWorld(w)).toEqual([]);
 const before=wealth(w),value=7*1.2+structureRoomMarketValue(bed);
 expect(before.items-empty.items).toBeCloseTo(value,10);expect(before.unpricedPawnIds).toContain(actor.id);
 command(w,{type:'order-enter-cryptosleep',pawnId:actor.id,casketId:casket.id});until(w,()=>casket.cryptosleep.human===actor);
 expect(casket.cryptosleep.items[0]).toBe(wood);expect(casket.cryptosleep.packed[0]).toBe(packed);
 expect(wealth(w)).toEqual(before);const resumed=exact(w);expect(wealth(resumed)).toEqual(before);
 stepWorld(w,30);expect(wealth(w)).toEqual(before);
 command(w,{type:'order-open-cryptosleep',pawnId:helper.id,casketId:casket.id});until(w,()=>casket.cryptosleep.human===null);
 expect(w.piles.find(p=>p.id===wood.id)).toBe(wood);expect(w.packed.find(p=>p.building.id===bed.id)).toBe(packed);
 expect(wealth(w)).toEqual(before);exact(w);
});
