import { expect,test } from 'vitest';
import { careCamp } from './scenarios/care';
import { rescueCamp } from './scenarios/rescue';
import { controlledInjury } from './scenarios/health';
import { applyCommand,stepWorld } from '../src/sim/engine';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization';
import { medicalBleed } from '../src/sim/injury-state';
import { dryTendQuality,medicalTendQuality,medicalTendSpeed,treatmentTarget } from '../src/sim/care-rules';
import { releaseWork } from '../src/sim/work-release';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import type { World } from '../src/sim/types';

function valid(w:World){expect(validateWorld(w),JSON.stringify({tick:w.tick,p:w.pawns.map(p=>({id:p.id,state:p.state,need:p.need,tend:p.tend})),errors:validateWorld(w)})).toEqual([]);}
function until(w:World,f:()=>boolean,max=1000){for(let i=0;i<max&&!f();i++){stepWorld(w);valid(w);}expect(f()).toBe(true);}
function replay(w:World,n=20){const c=deserializeWorld(serializeWorld(w));stepWorld(w,n);stepWorld(c,n);expect(c).toEqual(w);valid(w);}

test('medical stats separate quality/light, additive variance, caps and real completion XP',()=>{
  const w=careCamp(),d=w.pawns[0]!,p=w.pawns[1]!;
  for(const [level,quality,speed] of [[0,.2,.4],[8,1,.88],[10,1.1,1],[18,1.5,1.48],[20,1.55,1.6]]){
    d.skills.medicine.level=level!;expect(medicalTendQuality(d)).toBeCloseTo(quality!);expect(medicalTendSpeed(d)).toBeCloseTo(speed!);expect(medicalTendSpeed(d,.8)).toBeCloseTo(speed!*.8);
  }
  expect(dryTendQuality(1,0)).toBe(50);expect(dryTendQuality(1,.5)).toBe(300);expect(dryTendQuality(1,1)).toBe(550);expect(dryTendQuality(.2,0)).toBe(0);expect(dryTendQuality(9,1)).toBe(700);
  d.skills.medicine.level=8;until(w,()=>d.tend?.phase==='tend');expect(d.skills.medicine.xp).toBe(0);
  const id=p.health!.injuries.find(i=>i.kind==='cut')!.id;expect(treatmentTarget(p)).toEqual({injuryId:id});
  const rng=w.rng;until(w,()=>p.health!.injuries.some(i=>i.tended!==undefined));expect(d.skills.medicine.xp).toBe(87500);expect(w.rng).not.toBe(rng);
  const cut=p.health!.injuries.find(i=>i.id===id)!;expect(cut.tended).toBeDefined();expect(cut.severity).toBeGreaterThan(4000);expect(medicalBleed(p.health!)).toBe(0);
  expect(p.health!.injuries.find(i=>i.kind==='bruise')!.tended).toBeUndefined();replay(w);
});

test('patient travels, reserves a medical bed, lies awake then sleeps; treatment has no remote gain',()=>{
  const w=careCamp(),d=w.pawns[0]!,p=w.pawns[1]!;p.rest=100;
  stepWorld(w);expect(p.need).toMatchObject({kind:'sleep',phase:'travel',medical:'patient'});expect(p.state).toBe('moving');expect(p.bedId).toBeNull();
  until(w,()=>p.state==='resting');expect(p.rest).toBeLessThan(100);expect(p.medicalSleep).toBeUndefined();expect(p.need).toMatchObject({bedId:w.structures[0]!.id,phase:'sleep'});
  until(w,()=>d.tend?.phase==='tend');expect(Math.abs(d.x-p.x)+Math.abs(d.z-p.z)).toBe(1);replay(w,10);
  until(w,()=>!treatmentTarget(p));expect(d.skills.medicine.xp).toBe(175000);expect(d.tend).toBeUndefined();
  until(w,()=>p.state==='resting'&&p.need?.kind==='sleep'&&p.need.medical==='bedrest');p.rest=50;stepWorld(w,2);expect(p.medicalSleep).toBe(true);expect(p.rest).toBeGreaterThan(50);replay(w);
  const enc=new SnapshotEncoder(),dec=new SnapshotDecoder();const adopted=dec.adopt(structuredClone(enc.encode(w,0,6)));expect(adopted.status).toBe('applied');if(adopted.status==='applied')expect(adopted.world).toEqual(w);
  // Ordinary sleep must not hide the clinic from an injured, tired patient.
  const night=careCamp(),sleeper=night.pawns[1]!;sleeper.rest=40;sleeper.schedule.fill('sleep');
  until(night,()=>sleeper.state==='resting');expect(sleeper.need).toMatchObject({bedId:night.structures[0]!.id,medical:'patient'});replay(night);
});

test('bedside claims, interrupted duration, care policy, death and lost access cannot grant care or XP',()=>{
  for(const cause of ['cancel','policy','bed','doctor-hands','death'] as const){
    const w=careCamp(),d=w.pawns[0]!,p=w.pawns[1]!;until(w,()=>d.tend?.phase==='tend');stepWorld(w,4);replay(w,2);
    const xp=d.skills.medicine.xp;
    if(cause==='cancel'){expect(applyCommand(w,{type:'clear-orders',pawnId:d.id}).ok).toBe(true);d.priorities.doctor=0;}
    if(cause==='policy')expect(applyCommand(w,{type:'medical-policy',pawnId:p.id,enabled:false}).ok).toBe(true);
    if(cause==='bed')expect(applyCommand(w,{type:'medical-bed',bedId:w.structures[0]!.id,enabled:false}).ok).toBe(true);
    if(cause==='doctor-hands'){controlledInjury(w,d,'left-shoulder',30000);controlledInjury(w,d,'right-shoulder',30000);}
    if(cause==='death')controlledInjury(w,p,'heart',15000,'cut');
    stepWorld(w);expect(d.skills.medicine.xp).toBe(xp);expect(d.tend).toBeUndefined();valid(w);
  }
  const blocked=careCamp(),walker=blocked.pawns[0]!;until(blocked,()=>walker.tend?.phase==='approach');
  const spot=walker.tend!.spot;expect(Math.abs(walker.x-spot.x)+Math.abs(walker.z-spot.z)).toBeGreaterThan(1);
  blocked.tiles[spot.z*blocked.width+spot.x]={terrain:'rock',stone:'granite'};
  stepWorld(blocked);expect(walker.tend).toBeUndefined();expect(walker.skills.medicine.xp).toBe(0);valid(blocked);
  const w=careCamp(2),d=w.pawns[0]!,p=w.pawns[1]!,other=w.pawns[2]!;w.pawns[3]!.careDisabled=true;
  until(w,()=>d.tend?.phase==='tend'||other.tend?.phase==='tend');const active=w.pawns.find(p=>p.tend)!,idle=d===active?other:d;
  expect(applyCommand(w,{type:'order-tend',pawnId:idle.id,patientId:p.id,queue:false}).ok).toBe(false);
  const duration=active.tend!.duration;controlledInjury(w,active,'left-arm',5000);expect(active.tend!.duration).toBe(duration);replay(w,5);
});

test('rescue leads to physical treatment of fresh amputations; disabled/forced work and policy stay explicit',()=>{
  const w=rescueCamp(),d=w.pawns[0]!,p=w.pawns[1]!;until(w,()=>p.need?.kind==='sleep');d.priorities.doctor=0;
  expect(applyCommand(w,{type:'order-tend',pawnId:d.id,patientId:p.id,queue:false}).ok).toBe(false);d.priorities.doctor=1;
  expect(applyCommand(w,{type:'order-tend',pawnId:d.id,patientId:p.id,queue:true}).ok).toBe(false);
  expect(applyCommand(w,{type:'order-tend',pawnId:d.id,patientId:p.id,queue:false}).ok).toBe(true);
  expect(applyCommand(w,{type:'priority',pawnId:d.id,work:'doctor',value:0}).ok).toBe(true);expect(d.orders.active).toBe('tend');
  until(w,()=>p.health!.missing.every(m=>m.tended));expect(p.health!.missing).toHaveLength(2);expect(medicalBleed(p.health!)).toBe(0);expect(p.state).toBe('downed');replay(w);
  // Becoming incapacitated in a voluntarily chosen bed must not trigger a
  // second rescue when treatment finishes or Patient is disabled.
  const clinic=careCamp(),patient=clinic.pawns[1]!;until(clinic,()=>patient.state==='resting');
  const bedId=patient.need!.kind==='sleep'?patient.need!.bedId:null;
  controlledInjury(clinic,patient,'left-leg',30000);controlledInjury(clinic,patient,'right-leg',30000);
  expect(patient.state).toBe('downed');expect(applyCommand(clinic,{type:'priority',pawnId:patient.id,work:'patient',value:0}).ok).toBe(true);
  until(clinic,()=>!treatmentTarget(patient));expect(patient.need).toMatchObject({kind:'sleep',bedId,phase:'sleep'});
  expect(patient.need?.kind==='sleep'&&patient.need.medical).toBeUndefined();expect(clinic.pawns[0]!.rescue).toBeUndefined();replay(clinic);
});

test('strict V46 migration and relational rejects preserve continuing treatment by value',()=>{
  const w=careCamp();until(w,()=>w.pawns[0]!.tend?.phase==='tend');replay(w);
  for(const mutate of [(v:World)=>v.pawns[0]!.tend!.patientId=v.pawns[0]!.id,(v:World)=>v.pawns[0]!.tend!.progress=9000,(v:World)=>v.pawns[0]!.tend!.spot.x++,(v:World)=>v.pawns[1]!.careDisabled=true]){const bad=structuredClone(w);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
  const healthy=structuredClone(w);delete healthy.pawns[0]!.tend;healthy.pawns[0]!.state='idle';delete healthy.pawns[1]!.health;
  expect(validateWorld(healthy)).toContain('Medical rest without an eligible condition.');
  const old=careCamp();for(const p of old.pawns){delete (p.skills as Partial<typeof p.skills>).medicine;delete (p.priorities as Partial<typeof p.priorities>).patient;delete (p.priorities as Partial<typeof p.priorities>).bedrest;}old.schemaVersion=46 as World['schemaVersion'];
  const upgraded=deserializeWorld(JSON.stringify(old));expect(upgraded.schemaVersion).toBe(52);expect(upgraded.pawns[0]!.skills.medicine).toEqual({level:8,xp:0,dailyXp:0,passion:0});expect(upgraded.pawns[0]!.priorities.patient).toBe(1);expect(upgraded.pawns[0]!.priorities.bedrest).toBe(3);
  const bad=structuredClone(old);bad.pawns[0]!.careDisabled=true;expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();releaseWork(w,w.pawns[0]!);valid(w);
});
