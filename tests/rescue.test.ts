import { withoutCare } from './scenarios/legacy-skills';
import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization';
import { releaseWork } from '../src/sim/work-release';
import { injurePawn,reconcilePawnHealth } from '../src/sim/health';
import { BLOOD_UNIT } from '../src/sim/injury-rules';
import { rescueCamp } from './scenarios/rescue';
import { fixtureBuilding } from './scenarios/deconstruction';
import { controlledInjury,medicalCarrier } from './scenarios/health';
import { refreshStock } from '../src/sim/materials';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import { PresentationChanges } from '../src/bridge/presentation-changes';
import { processRescue } from '../src/sim/rescue';
import { updateRest,LEGACY_REST_PER_TICK } from '../src/sim/rest';
import type { World } from '../src/sim/types';

const valid=(w:World)=>expect(validateWorld(w),JSON.stringify({tick:w.tick,errors:validateWorld(w),p:w.pawns.map(p=>({id:p.id,xy:[p.x,p.z],state:p.state,rescue:p.rescue,need:p.need,edge:p.motion,cd:p.moveCooldown}))})).toEqual([]);
function until(w:World,done:()=>boolean,max=600){for(let i=0;i<max&&!done();i++){stepWorld(w);valid(w);}expect(done()).toBe(true);}
function resume(w:World,ticks=8){valid(w);const copy=deserializeWorld(serializeWorld(w));stepWorld(copy,ticks);stepWorld(w,ticks);expect(copy).toEqual(w);valid(w);}
const order=(w:World)=>applyCommand(w,{type:'order-rescue',pawnId:w.pawns[0]!.id,patientId:w.pawns[1]!.id,queue:false});

test('physical rescue reserves both actors and bed, shares edges, continues physiology and arrives before bed rest',()=>{
  const w=rescueCamp(),[actor,patient]=w.pawns;patient!.rest=50;const blood=patient!.health!.bloodLoss,rest=patient!.rest;
  stepWorld(w);expect(actor!.rescue?.phase).toBe('approach');resume(w,1);
  until(w,()=>actor!.rescue?.phase==='carry');const pickup=w.tick;expect(patient!.need).toBeNull();expect(patient!.medicalSleep).toBeUndefined();
  const atPickup=patient!.rest;resume(w);expect(patient!.rest).toBeLessThan(atPickup);expect(patient!.health!.bloodLoss).toBeGreaterThan(blood);
  w.restRules='legacy';const legacyRest=patient!.rest;updateRest(w,patient!);expect(patient!.rest).toBeCloseTo(legacyRest-LEGACY_REST_PER_TICK,9);w.restRules='adult';
  expect(patient!.x).toBe(actor!.x);expect(patient!.motion).toEqual(actor!.motion);expect(patient!.rest).toBeLessThan(rest+1);
  patient!.motion=Object.fromEntries(Object.entries(patient!.motion!).reverse()) as typeof patient.motion;valid(w);
  until(w,()=>patient!.need?.kind==='sleep');expect(w.tick).toBeGreaterThan(pickup);expect(actor!.rescue).toBeUndefined();
  expect(patient!.need).toMatchObject({kind:'sleep',bedId:w.structures[0]!.id,phase:'sleep'});expect(patient!.bedId).toBeNull();
  const before=patient!.rest;resume(w,20);expect(patient!.rest).toBeGreaterThan(before);expect(actor!.x===patient!.x&&actor!.z===patient!.z).toBe(false);
});

test('competition, accessible bed ranking, role changes and ordinary sleeping have distinct ownership',()=>{
  const w=rescueCamp(2),[a,p,b,q]=w.pawns;w.structures.splice(1);b!.x=a!.x;b!.z=a!.z;
  expect(order(w).ok).toBe(true);const unchanged=serializeWorld(w);
  expect(applyCommand(w,{type:'order-rescue',pawnId:b!.id,patientId:p!.id,queue:false}).ok).toBe(false);
  expect(applyCommand(w,{type:'order-rescue',pawnId:b!.id,patientId:q!.id,queue:false}).ok).toBe(false);expect(serializeWorld(w)).toBe(unchanged);
  const oldBed=w.structures[0]!;expect(applyCommand(w,{type:'assign-bed',bedId:oldBed.id,pawnId:b!.id}).ok).toBe(false);
  expect(applyCommand(w,{type:'medical-bed',bedId:oldBed.id,enabled:false}).ok).toBe(true);expect(a!.rescue).toBeUndefined();valid(w);
  expect(applyCommand(w,{type:'assign-bed',bedId:oldBed.id,pawnId:b!.id}).ok).toBe(true);
  const other=fixtureBuilding(w,'bed',20,15);p!.bedId=other.id;expect(order(w).ok).toBe(true);expect(a!.rescue!.bedId).toBe(other.id);
  expect(applyCommand(w,{type:'medical-bed',bedId:other.id,enabled:true}).ok).toBe(true);expect(p!.bedId).toBeNull();expect(order(w).ok).toBe(true);
  until(w,()=>a!.rescue?.phase==='carry');expect(applyCommand(w,{type:'medical-bed',bedId:other.id,enabled:false}).ok).toBe(true);expect(a!.rescue).toBeUndefined();expect(p!.need).toBeNull();valid(w);
  // A medically designated bed is never selected by an ordinary sleepy colon.
  const sleep=rescueCamp(),s=sleep.pawns[0]!;sleep.pawns.splice(1);s.priorities.doctor=0;s.rest=20;s.schedule.fill('sleep');until(sleep,()=>s.state==='sleeping');expect(s.need).toMatchObject({bedId:null});
  const blocked=rescueCamp(),own=fixtureBuilding(blocked,'bed',20,16);blocked.pawns[1]!.bedId=own.id;
  const med=blocked.structures[0]!;for(const [x,z]of[[med.x-1,med.z],[med.x+1,med.z],[med.x,med.z-1],[med.x-1,med.z+1],[med.x+1,med.z+1],[med.x,med.z+2]])fixtureBuilding(blocked,'wall',x!,z!);
  expect(order(blocked).ok).toBe(true);expect(blocked.pawns[0]!.rescue!.bedId).toBe(own.id);valid(blocked);
  const furniture=rescueCamp();furniture.pawns.splice(1);const worker=furniture.pawns[0]!,medical=furniture.structures[0]!;
  worker.priorities.doctor=0;worker.priorities.build=1;
  expect(applyCommand(furniture,{type:'designate',kind:'uninstall',x:medical.x,z:medical.z}).ok).toBe(true);until(furniture,()=>furniture.packed.length===1);
  expect(furniture.packed[0]!.building.medical).toBe(true);resume(furniture,1);
  expect(applyCommand(furniture,{type:'install',structureId:medical.id,x:20,z:20,orientation:1}).ok).toBe(true);
  until(furniture,()=>furniture.structures.some(s=>s.id===medical.id));expect(furniture.structures[0]!.medical).toBe(true);resume(furniture,1);
});

test('interruption, recovery, death and no-manipulation release the one carried body without erasing its edge',()=>{
  for(const cause of ['cancel','collapse','recovery','death','hands','bed-lost'] as const){
    const w=rescueCamp(),[a,p]=w.pawns;expect(order(w).ok).toBe(true);until(w,()=>a!.rescue?.phase==='carry'&&a!.moveCooldown>0);
    const location={x:p!.x,z:p!.z},edge=structuredClone(p!.motion);
    if(cause==='cancel')expect(applyCommand(w,{type:'clear-orders',pawnId:a!.id}).ok).toBe(true);
    if(cause==='collapse'){controlledInjury(w,a!,'left-leg',30000);controlledInjury(w,a!,'right-leg',30000);}
    if(cause==='recovery'){p!.health!.missing=[];p!.health!.injuries=[];p!.health!.bloodLoss=0;reconcilePawnHealth(w,p!);}
    if(cause==='death')injurePawn(w,p!,'heart','cut',15000);
    if(cause==='hands'){controlledInjury(w,a!,'left-shoulder',30000);controlledInjury(w,a!,'right-shoulder',30000);}
    if(cause==='bed-lost')w.structures=[];
    // End-of-tick reconciliation is also exercised for asynchronous world changes.
    if(a!.rescue)stepWorld(w);
    expect(a!.rescue,cause).toBeUndefined();expect({x:p!.x,z:p!.z}).toEqual(location);expect(p!.motion).toEqual(edge);expect(w.pawns).toHaveLength(2);
    a!.priorities.doctor=0;resume(w,30);if(cause==='death')expect(p!.state).toBe('dead');
  }
  const recovering=rescueCamp();recovering.pawns[1]!.health!.missing=[];recovering.pawns[1]!.health!.bloodLoss=.601*BLOOD_UNIT;
  expect(order(recovering).ok).toBe(true);
  until(recovering,()=>recovering.pawns[1]!.state!=='downed',300);expect(recovering.pawns[0]!.rescue).toBeUndefined();valid(recovering);
});

test('doctor priority, direct-order persistence and malformed rescue/medical saves are explicit',()=>{
  const w=rescueCamp(),[a,p]=w.pawns;a!.priorities.doctor=0;expect(order(w).ok).toBe(false);stepWorld(w,10);expect(a!.rescue).toBeUndefined();
  a!.priorities.doctor=1;expect(applyCommand(w,{type:'order-rescue',pawnId:a!.id,patientId:p!.id,queue:true}).ok).toBe(false);expect(order(w).ok).toBe(true);
  expect(applyCommand(w,{type:'priority',pawnId:a!.id,work:'doctor',value:0}).ok).toBe(true);expect(a!.rescue).toBeDefined();resume(w,1);until(w,()=>a!.rescue?.phase==='carry');
  const corruptions=[(v:World)=>v.pawns[0]!.rescue!.patientId=v.pawns[0]!.id,(v:World)=>v.pawns[1]!.x++,(v:World)=>v.pawns[0]!.rescue!.bedId=99999,(v:World)=>v.structures[0]!.kind='table',(v:World)=>v.pawns[1]!.bedId=v.structures[0]!.id,(v:World)=>v.pawns[0]!.orders.active=null];
  for(const mutate of corruptions){const bad=structuredClone(w);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
  const old=rescueCamp();old.structures=[];old.pawns.splice(1);old.schemaVersion=45 as typeof old.schemaVersion;withoutCare(old);delete (old.pawns[0]!.priorities as Partial<typeof a.priorities>).doctor;
  const migrated=deserializeWorld(JSON.stringify(old));expect(migrated.schemaVersion).toBe(47);expect(migrated.pawns[0]!.priorities.doctor).toBe(1);expect(migrated.pawns[0]!.rescue).toBeUndefined();
  const future=structuredClone(old);future.pawns[0]!.priorities.doctor=1;expect(()=>deserializeWorld(JSON.stringify(future))).toThrow(/priority/);
  releaseWork(w,a!);valid(w);
  const regular=rescueCamp();delete regular.structures[0]!.medical;expect(order(regular).ok).toBe(true);
  expect(regular.pawns[1]!.bedId).toBe(regular.structures[0]!.id);releaseWork(regular,regular.pawns[0]!);expect(regular.pawns[1]!.bedId).toBe(regular.structures[0]!.id);valid(regular);
  const exhausted=rescueCamp();exhausted.pawns[0]!.rest=0;exhausted.pawns[0]!.restZeroTicks=200;exhausted.pawns[0]!.collapsePending=true;const snapshot=serializeWorld(exhausted);expect(order(exhausted).ok).toBe(false);expect(serializeWorld(exhausted)).toBe(snapshot);
});

test('pickup and interruption anchor the old healing posture before the medical clock changes context',()=>{
  const w=rescueCamp(),[a,p]=w.pawns;w.tick+=p!.id%60-1;p!.health!.tick=w.tick;
  controlledInjury(w,p!,'left-arm',1000);a!.x=p!.x;a!.z=p!.z;expect(order(w).ok).toBe(true);
  const bruise=p!.health!.injuries[0]!;w.tick++;
  processRescue(w,a!,{move:()=>{},search:()=>null,release:()=>releaseWork(w,a!),event:()=>{}});
  expect(a!.rescue?.phase).toBe('carry');expect(bruise.severity).toBe(880);expect(p!.health!.tick).toBe(w.tick);valid(w);
  w.tick+=60;p!.health!.tick=w.tick-1;releaseWork(w,a!);
  expect(bruise.severity).toBe(800);expect(p!.health!.tick).toBe(w.tick);valid(w);
});

test('a fallen hauler keeps its stranded cargo through rescue; worker snapshots observe pickup, role and placement',()=>{
  const w=medicalCarrier(),patient=w.pawns[0]!,actor=w.pawns[1]!;
  // Reserve a remote bed area before the incident. Every nearby drop cell at
  // the carrier remains full: its steel cannot disappear into the floor.
  w.piles=w.piles.filter(q=>!(q.owner.type==='ground'&&q.owner.x===14&&(q.owner.z===11||q.owner.z===12)));
  const bed=fixtureBuilding(w,'bed',14,11);Object.assign(bed,{medical:true});refreshStock(w);
  const steel=w.piles.filter(q=>q.item==='steel').reduce((n,q)=>n+q.quantity,0),held=w.piles.find(q=>q.owner.type==='pawn')!;
  controlledInjury(w,patient,'left-leg',30000);controlledInjury(w,patient,'right-leg',30000);expect(patient.interruptedCargo).toBe(true);actor.priorities.doctor=1;
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),phases=new PresentationChanges();let changes=0;
  const observe=()=>{changes+=Number(phases.capture(w));const result=decoder.adopt(structuredClone(encoder.encode(w,0,6)));if(result.status==='applied')expect(result.world).toEqual(w);};
  observe();expect(applyCommand(w,{type:'order-rescue',pawnId:actor.id,patientId:patient.id,queue:false}).ok).toBe(true);observe();
  until(w,()=>actor.rescue?.phase==='carry');expect(held.owner).toEqual({type:'pawn',pawnId:patient.id});observe();resume(w,10);expect(held.owner).toEqual({type:'pawn',pawnId:patient.id});
  until(w,()=>patient.need?.kind==='sleep');observe();expect(changes).toBe(4);resume(w,10);
  expect(w.piles.filter(q=>q.item==='steel').reduce((n,q)=>n+q.quantity,0)).toBe(steel);expect(w.piles.filter(q=>q.id===held.id)).toHaveLength(1);
});
