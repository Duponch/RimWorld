import { expect,test } from 'vitest';
import { urgentSelfCamp,urgentBedCamp } from './scenarios/urgent-care';
import { careCamp } from './scenarios/care';
import { controlledInjury } from './scenarios/health';
import { applyCommand,stepWorld } from '../src/sim/engine';
import { addMaterial,refreshStock } from '../src/sim/materials';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization';
import { urgentTreatment,treatmentTarget } from '../src/sim/care-rules';
import { urgentWorkEnabled,medicalBedReview,planUrgentCare } from '../src/sim/urgent-care';
import { BLOOD_UNIT } from '../src/sim/injury-rules';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import type { World } from '../src/sim/types';

function valid(w:World){expect(validateWorld(w),JSON.stringify({tick:w.tick,p:w.pawns.map(p=>({id:p.id,state:p.state,tend:p.tend,need:p.need})),errors:validateWorld(w)})).toEqual([]);}
function until(w:World,f:()=>boolean,max=1000){for(let i=0;i<max&&!f();i++){stepWorld(w);valid(w);}expect(f()).toBe(true);}
function replay(w:World,n=8){const c=deserializeWorld(serializeWorld(w));stepWorld(w,n);stepWorld(c,n);expect(c).toEqual(w);valid(w);}
function food(w:World){const p=w.pawns[0]!;addMaterial(w,'food',10,{type:'ground',x:p.x+2,z:p.z},'survival-meal');refreshStock(w);}

test('urgent providers obey the best enabled work category and the strict blood-loss threshold',()=>{
  const w=urgentSelfCamp(),p=w.pawns[0]!;expect(urgentTreatment(p)).toBe(true);
  // 5 HP at neck = 1.2/day: 10% loss gives exactly 0.75 day, not urgent.
  p.health!.injuries[0]!.severity=5000;p.health!.bloodLoss=BLOOD_UNIT/10;
  expect(urgentTreatment(p)).toBe(false);p.health!.bloodLoss++;expect(urgentTreatment(p)).toBe(true);
  p.careDisabled=true;expect(urgentTreatment(p)).toBe(false);delete p.careDisabled;
  p.priorities.doctor=2;p.priorities.haul=1;expect(urgentWorkEnabled(p,'doctor')).toBe(false);
  p.priorities.haul=0;expect(urgentWorkEnabled(p,'doctor')).toBe(true);
  // An enabled high-ranked category gates emergency work even without a job.
  for(const lowered of [false,true]){
    const a=urgentSelfCamp(),d=a.pawns[0]!;food(a);d.hunger=25;d.priorities.haul=lowered?1:0;d.priorities.doctor=2;
    stepWorld(a);valid(a);expect(!!d.tend?.urgent).toBe(!lowered);expect(d.need?.kind==='eat').toBe(lowered);
  }
});

test('urgent self-treatment precedes food/schedules, then releases after one wound to reconsider real needs',()=>{
  for(const schedule of ['anything','sleep','recreation'] as const){
    const w=urgentSelfCamp(),p=w.pawns[0]!;food(w);p.hunger=25;p.rest=50;p.recreation.level=5;p.schedule.fill(schedule);
    until(w,()=>p.tend?.phase==='tend');expect(p.tend?.urgent).toBe(true);expect(p.need).toBeNull();replay(w);
    until(w,()=>p.skills.medicine.xp>0);expect(p.skills.medicine.xp).toBe(87500);expect(p.tend).toBeUndefined();expect(urgentTreatment(p)).toBe(false);expect(treatmentTarget(p)).toBeDefined();
    until(w,()=>p.need?.kind==='eat');expect(p.health!.injuries.filter(i=>i.tended!==undefined)).toHaveLength(1);replay(w);
  }
});

test('bed review keeps patient priority on ties and can leave the bed for urgent self-treatment with exact continuation',()=>{
  const w=urgentBedCamp(),p=w.pawns[0]!;p.priorities.patient=1;
  until(w,()=>p.need?.kind==='sleep'&&p.need.medical==='patient');expect(p.tend).toBeUndefined();replay(w,30);expect(p.tend).toBeUndefined();
  applyCommand(w,{type:'priority',pawnId:p.id,work:'patient',value:2});
  until(w,()=>!!p.tend);expect(p.tend?.urgent).toBe(true);expect(p.moveCooldown).toBeGreaterThan(0);expect(p.motion!.from).toMatchObject({x:w.structures[0]!.x,z:w.structures[0]!.z});expect(p.need).toBeNull();expect(p.skills.medicine.xp).toBe(0);replay(w,1);
  until(w,()=>p.tend?.phase==='tend');expect(p.motion).toBeDefined();replay(w);
  const idle=urgentBedCamp(),q=idle.pawns[0]!;while(!medicalBedReview(idle,q))idle.tick++;
  const before=structuredClone(q);expect(planUrgentCare(idle,q,()=>null)).toBe(true);expect(q).toEqual(before);
  // 211 Core ticks are preserved as 21/22 local ticks, not rounded every cycle.
  const hits:number[]=[];for(let tick=0;tick<211;tick++)if(medicalBedReview({...idle,tick},q))hits.push(tick);
  expect(hits).toHaveLength(10);expect(hits.slice(1).every((x,i)=>[21,22].includes(x-hits[i]!))).toBe(true);
});

test('urgent other-patient care respects claims/access while current work and direct orders are not globally preempted',()=>{
  const w=careCamp(),d=w.pawns[0]!,p=w.pawns[1]!;d.priorities.doctor=0;until(w,()=>p.state==='resting');
  controlledInjury(w,p,'neck',6000,'cut');controlledInjury(w,d,'neck',6000,'cut');d.selfTend=true;d.hunger=25;food(w);
  applyCommand(w,{type:'priority',pawnId:d.id,work:'doctor',value:1});until(w,()=>!!d.tend);expect(d.tend).toMatchObject({patientId:p.id,urgent:true});expect(d.need).toBeNull();replay(w);
  const active=urgentSelfCamp(),a=active.pawns[0]!;delete a.selfTend;a.priorities.gather=1;
  active.resources.push({id:active.nextId++,x:a.x+1,z:a.z,kind:'tree',amount:12});applyCommand(active,{type:'designate',kind:'chop',x:a.x+1,z:a.z});
  until(active,()=>a.jobId!==null);const job=a.jobId!;a.selfTend=true;stepWorld(active,3);expect(a.jobId).toBe(job);expect(a.tend).toBeUndefined();valid(active);
  // Direct self-tending retains its full accepted action, not the one-wound giver.
  const forced=urgentSelfCamp(),f=forced.pawns[0]!;expect(applyCommand(forced,{type:'order-tend',pawnId:f.id,patientId:f.id,queue:false}).ok).toBe(true);
  expect(f.tend?.urgent).toBeUndefined();until(forced,()=>!treatmentTarget(f));expect(f.skills.medicine.xp).toBe(175000);
});

test('urgent state migrates strictly, survives snapshots, and stops on policy/incapacity without premature results',()=>{
  const old=urgentSelfCamp();old.schemaVersion=49 as World['schemaVersion'];const copy=deserializeWorld(JSON.stringify(old));expect(copy).toEqual({...old,schemaVersion:52});
  const w=urgentSelfCamp(),p=w.pawns[0]!;until(w,()=>p.tend?.phase==='tend');replay(w);
  for(const mutate of [(v:World)=>v.schemaVersion=49 as World['schemaVersion'],(v:World)=>(v.pawns[0]!.tend as any).urgent=false]){const bad=structuredClone(w);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
  const enc=new SnapshotEncoder(),dec=new SnapshotDecoder();const adopted=dec.adopt(structuredClone(enc.encode(w,0,6)));expect(adopted.status).toBe('applied');if(adopted.status==='applied')expect(adopted.world).toEqual(w);
  for(const cause of ['policy','hands','collapse'] as const){const a=deserializeWorld(serializeWorld(w)),q=a.pawns[0]!;
    if(cause==='policy')applyCommand(a,{type:'self-tend-policy',pawnId:q.id,enabled:false});
    if(cause==='hands'){controlledInjury(a,q,'left-shoulder',30000);controlledInjury(a,q,'right-shoulder',30000);}
    if(cause==='collapse'){q.rest=0;q.collapsePending=true;}
    stepWorld(a);valid(a);expect(q.tend).toBeUndefined();expect(q.skills.medicine.xp).toBe(0);replay(a,2);
  }
  const crowd=urgentSelfCamp(100,250);stepWorld(crowd,300);valid(crowd);expect(crowd.pawns.every(p=>!treatmentTarget(p)&&p.skills.medicine.xp===175000)).toBe(true);replay(crowd);
});
