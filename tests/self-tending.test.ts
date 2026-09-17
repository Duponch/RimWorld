import { expect,test } from 'vitest';
import { selfTendingCamp } from './scenarios/self-tending';
import { careCamp } from './scenarios/care';
import { controlledInjury } from './scenarios/health';
import { fixtureBuilding } from './scenarios/deconstruction';
import { applyCommand,stepWorld } from '../src/sim/engine';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization';
import { dryTendQuality,treatmentTarget } from '../src/sim/care-rules';
import { medicalBleed } from '../src/sim/injury-state';
import { queryOrderOptions } from '../src/sim/player-orders';
import { footprintContains } from '../src/sim/definitions';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import type { World } from '../src/sim/types';

function valid(w:World){expect(validateWorld(w),JSON.stringify({tick:w.tick,p:w.pawns.map(p=>({id:p.id,state:p.state,tend:p.tend,need:p.need})),errors:validateWorld(w)})).toEqual([]);}
function until(w:World,f:()=>boolean,max=1000){for(let i=0;i<max&&!f();i++){stepWorld(w);valid(w);}expect(f()).toBe(true);}
function replay(w:World,n=8){const c=deserializeWorld(serializeWorld(w));stepWorld(w,n);stepWorld(c,n);expect(c).toEqual(w);valid(w);}
function enable(w:World,index=0){expect(applyCommand(w,{type:'self-tend-policy',pawnId:w.pawns[index]!.id,enabled:true}).ok).toBe(true);}

test('self-treatment is opt-in, physical, learns on completion and applies 70% before additive variation',()=>{
  expect(dryTendQuality(1,.5,true)).toBe(210);expect(dryTendQuality(1,0,true)).toBe(0);expect(dryTendQuality(1,1,true)).toBe(460);
  expect(dryTendQuality(3,.5,true)).toBe(630);expect(dryTendQuality(9,1,true)).toBe(700);
  const w=selfTendingCamp(),p=w.pawns[0]!,start={x:p.x,z:p.z};stepWorld(w,10);expect(p.tend).toBeUndefined();expect(p.skills.medicine.xp).toBe(0);
  enable(w);until(w,()=>p.tend?.phase==='tend');expect(p.tend!.patientId).toBe(p.id);expect(p.skills.medicine.xp).toBe(0);expect(w.structures).toHaveLength(0);replay(w);
  until(w,()=>!treatmentTarget(p));expect(p.x).toBe(start.x);expect(p.z).toBe(start.z);expect(p.skills.medicine.xp).toBe(175000);expect(medicalBleed(p.health!)).toBe(0);expect(p.health!.injuries).toHaveLength(2);replay(w);
});

test('self-treatment obeys work/care policies and shared claims; direct orders preserve accepted priority semantics',()=>{
  const w=selfTendingCamp(),p=w.pawns[0]!;
  expect(queryOrderOptions(w,p.id,p).find(o=>o.tendPatientId===p.id)?.enabled).toBe(false);
  enable(w);expect(applyCommand(w,{type:'priority',pawnId:p.id,work:'doctor',value:0}).ok).toBe(true);
  stepWorld(w,5);expect(p.tend).toBeUndefined();expect(p.selfTend).toBe(true);
  expect(applyCommand(w,{type:'order-tend',pawnId:p.id,patientId:p.id,queue:false}).ok).toBe(false);
  applyCommand(w,{type:'priority',pawnId:p.id,work:'doctor',value:1});applyCommand(w,{type:'medical-policy',pawnId:p.id,enabled:false});
  expect(applyCommand(w,{type:'order-tend',pawnId:p.id,patientId:p.id,queue:false}).ok).toBe(false);
  applyCommand(w,{type:'medical-policy',pawnId:p.id,enabled:true});
  expect(applyCommand(w,{type:'order-tend',pawnId:p.id,patientId:p.id,queue:true}).ok).toBe(false);
  expect(applyCommand(w,{type:'order-tend',pawnId:p.id,patientId:p.id,queue:false}).ok).toBe(true);
  applyCommand(w,{type:'priority',pawnId:p.id,work:'doctor',value:0});until(w,()=>!treatmentTarget(p));expect(p.skills.medicine.xp).toBe(175000);
  const clinic=careCamp(),patient=clinic.pawns[1]!;until(clinic,()=>!!clinic.pawns[0]!.tend);enable(clinic,1);patient.priorities.doctor=1;
  expect(applyCommand(clinic,{type:'order-tend',pawnId:patient.id,patientId:patient.id,queue:false}).ok).toBe(false);valid(clinic);
  // With equal work priority, treatment of another lying human precedes self.
  const order=careCamp(),doctor=order.pawns[0]!;doctor.priorities.doctor=0;until(order,()=>order.pawns[1]!.state==='resting');controlledInjury(order,doctor,'left-arm',4000,'cut');enable(order);
  applyCommand(order,{type:'priority',pawnId:doctor.id,work:'doctor',value:1});until(order,()=>!!doctor.tend);expect(doctor.tend!.patientId).toBe(order.pawns[1]!.id);
});

test('changing permission, collapse, manipulation loss and death stop self-treatment without premature XP',()=>{
  for(const cause of ['self-policy','care-policy','work','cancel','hands','downed','death','collapse'] as const){
    const w=selfTendingCamp(),p=w.pawns[0]!;enable(w);applyCommand(w,{type:'order-tend',pawnId:p.id,patientId:p.id,queue:false});until(w,()=>p.tend?.phase==='tend');stepWorld(w,3);
    if(cause==='self-policy')applyCommand(w,{type:'self-tend-policy',pawnId:p.id,enabled:false});
    if(cause==='care-policy')applyCommand(w,{type:'medical-policy',pawnId:p.id,enabled:false});
    if(cause==='work'){p.orders.active=null;applyCommand(w,{type:'priority',pawnId:p.id,work:'doctor',value:0});}
    if(cause==='cancel'){applyCommand(w,{type:'clear-orders',pawnId:p.id});delete p.selfTend;}
    if(cause==='hands'){controlledInjury(w,p,'left-shoulder',30000);controlledInjury(w,p,'right-shoulder',30000);}
    if(cause==='downed'){controlledInjury(w,p,'left-leg',30000);controlledInjury(w,p,'right-leg',30000);}
    if(cause==='death')controlledInjury(w,p,'heart',15000,'cut');
    if(cause==='collapse'){p.rest=0;p.collapsePending=true;}
    stepWorld(w);valid(w);expect(p.tend).toBeUndefined();expect(p.skills.medicine.xp).toBe(0);replay(w,2);
  }
});

test('self-treatment leaves a bed physically, preserves the captured path and refuses an inaccessible work cell',()=>{
  const w=selfTendingCamp(),p=w.pawns[0]!,bed=fixtureBuilding(w,'bed',p.x,p.z);p.bedId=bed.id;p.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:p.x,z:p.z}};p.state='sleeping';enable(w);
  const before={x:p.x,z:p.z};expect(applyCommand(w,{type:'order-tend',pawnId:p.id,patientId:p.id,queue:false}).ok).toBe(true);expect(p.x).toBe(before.x);expect(p.z).toBe(before.z);expect(p.path).toHaveLength(1);expect(p.need).toBeNull();
  stepWorld(w);valid(w);expect(p.moveCooldown).toBeGreaterThan(0);expect(p.skills.medicine.xp).toBe(0);replay(w,1);until(w,()=>p.tend?.phase==='tend');expect(Math.abs(p.x-before.x)+Math.abs(p.z-before.z)).toBe(1);replay(w);
  const blocked=selfTendingCamp(),b=blocked.pawns[0]!,blockedBed=fixtureBuilding(blocked,'bed',b.x,b.z);
  for(const [dx,dz] of [[0,-1],[1,0],[0,1],[-1,0]])if(!footprintContains(blockedBed,{x:b.x+dx!,z:b.z+dz!}))blocked.tiles[(b.z+dz!)*blocked.width+b.x+dx!]={terrain:'rock',stone:'granite'};
  enable(blocked);const saved=serializeWorld(blocked);expect(applyCommand(blocked,{type:'order-tend',pawnId:b.id,patientId:b.id,queue:false}).ok).toBe(false);expect(serializeWorld(blocked)).toBe(saved);
});

test('self-treatment roundtrips snapshots and rejects corrupted or premature V48 data',()=>{
  const old=selfTendingCamp();old.schemaVersion=48 as World['schemaVersion'];expect(deserializeWorld(JSON.stringify(old))).toEqual({...old,schemaVersion:50});
  const badOld=structuredClone(old);badOld.pawns[0]!.selfTend=true;expect(()=>deserializeWorld(JSON.stringify(badOld))).toThrow();
  const w=selfTendingCamp(),p=w.pawns[0]!;enable(w);until(w,()=>p.tend?.phase==='tend');replay(w);
  for(const mutate of [(v:World)=>delete v.pawns[0]!.selfTend,(v:World)=>v.pawns[0]!.tend!.spot.x++,(v:World)=>v.schemaVersion=48 as World['schemaVersion']]){const bad=structuredClone(w);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
  const enc=new SnapshotEncoder(),dec=new SnapshotDecoder();const adopted=dec.adopt(structuredClone(enc.encode(w,0,6)));expect(adopted.status).toBe('applied');if(adopted.status==='applied')expect(adopted.world).toEqual(w);
  // All actors can continue their own treatments without a global patient lock.
  const crowd=selfTendingCamp(100,250);for(let i=0;i<100;i++)enable(crowd,i);stepWorld(crowd,250);valid(crowd);expect(crowd.pawns.every(p=>!treatmentTarget(p)&&p.skills.medicine.xp===175000)).toBe(true);replay(crowd);
});
