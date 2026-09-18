import { withoutShootingSkills,withMigratedShootingSkills } from './scenarios/legacy-skills';
import { SCHEMA_VERSION } from '../src/sim/types';
import { expect,test } from 'vitest';
import { medicineCamp } from './scenarios/medicine';
import { selfTendingCamp } from './scenarios/self-tending';
import { urgentSelfCamp } from './scenarios/urgent-care';
import { controlledInjury } from './scenarios/health';
import { applyCommand,stepWorld } from '../src/sim/engine';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization';
import { addMaterial,reservedSource } from '../src/sim/materials';
import { tendingProposal } from '../src/sim/tending';
import { blockedCells,reachableCells } from '../src/sim/pathfinding';
import { tendQuality,tendXp,medicineAllowed,type MedicineItem } from '../src/sim/medicine-rules';
import { treatmentTargets,treatmentBatch,medicineCount,treatmentTarget } from '../src/sim/care-rules';
import { ticksUntilRot } from '../src/sim/food-preservation';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import type { World } from '../src/sim/types';

function valid(w:World){expect(validateWorld(w),JSON.stringify({tick:w.tick,p:w.pawns.map(p=>({id:p.id,state:p.state,tend:p.tend})),errors:validateWorld(w)})).toEqual([]);}
function until(w:World,f:()=>boolean,n=1300){for(let i=0;i<n&&!f();i++){stepWorld(w);valid(w);}expect(f()).toBe(true);}
function replay(w:World,n=5){const c=deserializeWorld(serializeWorld(w));stepWorld(w,n);stepWorld(c,n);expect(c).toEqual(w);valid(w);}
const units=(w:World,item?:MedicineItem)=>w.piles.reduce((n,p)=>n+(p.kind==='medicine'&&(!item||p.item===item)?p.quantity:0),0);

test('medicine groups injuries by severity, caps each quality and awards XP once per physical treatment',()=>{
  const base=selfTendingCamp(),p=base.pawns[0]!;p.health!.injuries=[];
  controlledInjury(base,p,'torso',15000,'cut');controlledInjury(base,p,'left-arm',9000,'cut');controlledInjury(base,p,'right-arm',5000,'bruise');
  const targets=treatmentTargets(p);expect(treatmentBatch(targets,true).map(t=>t.severity)).toEqual([15000,5000]);expect(medicineCount(targets)).toBe(2);expect(treatmentBatch(targets,false)).toHaveLength(1);
  for(const [item,potency,cap,xp] of [['herbal-medicine',.6,700,250000],['medicine',1,1000,350000],['glitterworld-medicine',1.6,1300,500000]] as const){
    expect(tendQuality(1,.5,false,item)).toBe(Math.min(cap,potency*1000));expect(tendQuality(10,1,false,item)).toBe(cap);expect(tendXp(item)).toBe(xp);
    const w=medicineCamp(1,32,item),d=w.pawns[0]!,patient=w.pawns[1]!;
    until(w,()=>d.tend?.phase==='pickup');expect(d.skills.medicine.xp).toBe(0);expect(units(w)).toBe(4);replay(w);
    until(w,()=>d.tend?.phase==='approach'&&!!d.tend.medicine?.carryPileId);expect(units(w)).toBe(4);expect(patient.health!.injuries.every(i=>i.tended===undefined)).toBe(true);replay(w);
    until(w,()=>d.tend?.phase==='tend');expect(d.skills.medicine.xp).toBe(0);replay(w);
    // A player can queue ordinary work behind the active medical task.
    // Completing a treatment must not act like an involuntary collapse.
    w.resources.push({id:w.nextId++,kind:'tree',x:24,z:24,amount:12});d.priorities.gather=1;
    expect(applyCommand(w,{type:'designate',kind:'chop',x:24,z:24}).ok).toBe(true);const queued=w.jobs.at(-1)!.id;
    expect(applyCommand(w,{type:'order-job',pawnId:d.id,jobId:queued,queue:true}).ok).toBe(true);replay(w,1);
    until(w,()=>!treatmentTarget(patient));expect(units(w)).toBe(3);expect(d.skills.medicine.xp).toBe(xp*35/100);expect(patient.health!.injuries.every(i=>i.tended!==undefined&&i.tended<=cap)).toBe(true);replay(w);
    expect(d.orders.queue.includes(queued)||d.jobId===queued).toBe(true);
  }
});

test('patient ceilings precede potency and patient distance, with reachable fallback and shared source claims',()=>{
  const w=medicineCamp(),d=w.pawns[0]!,p=w.pawns[1]!;d.priorities.doctor=0;until(w,()=>p.state==='resting');d.priorities.doctor=1;
  addMaterial(w,'medicine',2,{type:'ground',x:20,z:20},'glitterworld-medicine');addMaterial(w,'medicine',3,{type:'ground',x:6,z:4},'herbal-medicine');
  const proposal=()=>tendingProposal(w,d,p,reachableCells(w,d,blockedCells(w),new Set()));
  for(const [care,item] of [['dry',undefined],['herbal','herbal-medicine'],['industrial','medicine'],['best','glitterworld-medicine']] as const){p.medicalCare=care;expect(proposal()?.task.medicine?.item).toBe(item);}
  p.medicalCare='none';expect(proposal()).toBeUndefined();p.medicalCare='best';d.medicalCare='none';expect(proposal()?.task.medicine?.item).toBe('glitterworld-medicine');
  for(const [x,z] of [[19,20],[21,20],[20,19],[20,21],[19,19],[19,21],[21,19],[21,21]])w.tiles[z!*w.width+x!]={terrain:'rock'};
  expect(proposal()?.task.medicine?.item).toBe('medicine');expect(medicineAllowed(p,'medicine')).toBe(true);
  d.planCooldown=0;stepWorld(w);expect(d.tend?.medicine?.item).toBe('medicine');const source=d.tend!.medicine!.sourcePileId;expect(reservedSource(w,source)).toBe(1);
  // The common hauling reservation sees the medical quantity, not a free stack.
  const other=w.pawns[1]!;const oldNeed=other.need;other.need=null;other.haul={sourcePileId:source,quantity:4,phase:'pickup',carryPileId:null,destination:{type:'aside',x:20,z:4}};
  expect(reservedSource(w,source)).toBe(5);other.haul=null;other.need=oldNeed;valid(w);
});

test('self-treatment collects medicine, consumes one operation and safely releases unused doses on interruption',()=>{
  const w=selfTendingCamp(),p=w.pawns[0]!;p.selfTend=true;p.medicalCare='industrial';
  addMaterial(w,'medicine',3,{type:'ground',x:12,z:3},'medicine');
  expect(applyCommand(w,{type:'order-tend',pawnId:p.id,patientId:p.id,queue:false}).ok).toBe(true);
  until(w,()=>p.tend?.phase==='tend');expect(p.x).toBeGreaterThan(8);expect(p.tend!.spot).toEqual({x:p.x,z:p.z});replay(w);
  const snapshot=serializeWorld(w),xp=p.skills.medicine.xp;
  for(const cause of ['policy','hands','target','cancel'] as const){const a=deserializeWorld(snapshot),q=a.pawns[0]!;
    if(cause==='policy')applyCommand(a,{type:'medical-care',pawnId:q.id,care:'dry'});
    if(cause==='hands'){controlledInjury(a,q,'left-shoulder',30000);controlledInjury(a,q,'right-shoulder',30000);}
    if(cause==='target')for(const i of q.health!.injuries)i.tended=300;
    if(cause==='cancel')expect(applyCommand(a,{type:'clear-orders',pawnId:q.id}).ok).toBe(true);
    stepWorld(a);valid(a);expect(q.tend).toBeUndefined();expect(q.skills.medicine.xp).toBe(xp);expect(units(a)).toBe(3);replay(a);
  }
  until(w,()=>!treatmentTarget(p));expect(units(w)).toBe(2);expect(p.skills.medicine.xp).toBe(122500);valid(w);
  const urgent=urgentSelfCamp(),self=urgent.pawns[0]!;self.medicalCare='industrial';self.health!.injuries=[];
  controlledInjury(urgent,self,'neck',6000,'cut');controlledInjury(urgent,self,'torso',16000,'bruise');
  addMaterial(urgent,'medicine',3,{type:'ground',x:self.x+1,z:self.z},'medicine');
  until(urgent,()=>self.tend?.phase==='tend');expect(self.tend?.urgent).toBe(true);expect(self.tend?.medicine?.quantity).toBe(2);
  until(urgent,()=>self.skills.medicine.xp>0);expect(self.tend).toBeUndefined();expect(units(urgent)).toBe(2);expect(urgent.piles.every(s=>s.owner.type==='ground')).toBe(true);expect(treatmentTarget(self)).toBeDefined();replay(urgent);
});

test('depleted doses trigger a physical refill; at most ten doctors claim one stack without overbooking',()=>{
  const w=medicineCamp(),d=w.pawns[0]!,p=w.pawns[1]!;w.piles[0]!.quantity=1;p.health!.injuries=[];
  for(const part of ['left-arm','right-arm','left-leg'] as const)controlledInjury(w,p,part,9000,'bruise');
  addMaterial(w,'medicine',1,{type:'ground',x:18,z:4},'herbal-medicine');
  until(w,()=>d.tend?.phase==='find-medicine');expect(d.skills.medicine.xp).toBe(122500);expect(p.health!.injuries.filter(i=>i.tended!==undefined)).toHaveLength(2);expect(units(w)).toBe(1);replay(w,1);
  until(w,()=>d.tend?.phase==='pickup');expect(d.tend!.medicine?.item).toBe('herbal-medicine');replay(w,1);
  until(w,()=>!treatmentTarget(p));expect(d.skills.medicine.xp).toBe(210000);expect(units(w)).toBe(0);valid(w);
  const crowd=medicineCamp(11,64);crowd.piles=[];for(let i=0;i<11;i++)crowd.pawns[i*2]!.priorities.doctor=0;
  until(crowd,()=>crowd.pawns.filter((_,i)=>i%2).every(p=>p.state==='resting'));
  addMaterial(crowd,'medicine',25,{type:'ground',x:32,z:2},'medicine');
  for(let i=0;i<11;i++){const doctor=crowd.pawns[i*2]!,patient=crowd.pawns[i*2+1]!;doctor.priorities.doctor=1;expect(applyCommand(crowd,{type:'order-tend',pawnId:doctor.id,patientId:patient.id,queue:false}).ok).toBe(true);}
  expect(crowd.pawns.filter(p=>p.tend?.medicine)).toHaveLength(10);expect(reservedSource(crowd,crowd.piles[0]!.id)).toBe(10);expect(crowd.pawns[20]!.tend?.phase).toBe('approach');valid(crowd);replay(crowd,1);
  expect(applyCommand(crowd,{type:'medical-care',pawnId:crowd.pawns[1]!.id,care:['industrial'] as any}).ok).toBe(false);
});

test('herbal age survives pickup and expires before treatment; policy cancellation retains cargo on saturated ground',()=>{
  const w=medicineCamp(1,32,'herbal-medicine'),d=w.pawns[0]!,p=w.pawns[1]!;
  until(w,()=>d.tend?.phase==='tend');const pile=w.piles.find(s=>s.owner.type==='pawn')!;
  expect(pile.rot).toBeDefined();expect(ticksUntilRot(pile,w.tick)).toBeLessThan(150*6000);pile.rot={progress:150*6000-1,atTick:w.tick};
  const held=pile.quantity;stepWorld(w);valid(w);expect(units(w)).toBe(4-held);expect(w.spoiled['herbal-medicine']).toBe(held);expect(d.skills.medicine.xp).toBe(0);expect(d.tend).toBeUndefined();replay(w);
  const a=medicineCamp(),doctor=a.pawns[0]!,patient=a.pawns[1]!;until(a,()=>doctor.tend?.phase==='tend');
  for(let z=0;z<a.height;z++)for(let x=0;x<a.width;x++)if(!a.piles.some(p=>p.owner.type==='ground'&&p.owner.x===x&&p.owner.z===z)&&!a.structures.some(s=>s.x===x&&s.z===z))try{addMaterial(a,'wood',75,{type:'ground',x,z},'wood');}catch{}
  // Solid furniture footprint may leave an unfillable cell, while all legal drop cells are full.
  applyCommand(a,{type:'medical-care',pawnId:patient.id,care:'none'});stepWorld(a);expect(doctor.tend).toBeUndefined();expect(doctor.interruptedCargo).toBe(true);expect(units(a)).toBe(4);valid(a);replay(a,2);
});

test('V50 migration rejects future medicine state, carries exact snapshots, and a hundred adults retain the material balance',()=>{
  const old=selfTendingCamp();for(const p of old.pawns)delete p.medicalCare;old.schemaVersion=50 as World['schemaVersion'];withoutShootingSkills(old);expect(deserializeWorld(JSON.stringify(old))).toEqual(withMigratedShootingSkills({...old,schemaVersion:SCHEMA_VERSION}));
  const w=medicineCamp();until(w,()=>w.pawns[0]!.tend?.phase==='tend');
  for(const mutate of [(a:World)=>a.schemaVersion=50 as World['schemaVersion'],(a:World)=>a.pawns[0]!.tend!.medicine!.quantity++, (a:World)=>(a.pawns[0]!.tend!.medicine as any).item=['medicine'],(a:World)=>a.pawns[0]!.tend!.medicine!.carryPileId=null]){const bad=structuredClone(w);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
  const e=new SnapshotEncoder(),d=new SnapshotDecoder(),r=d.adopt(structuredClone(e.encode(w,0,6)));expect(r.status).toBe('applied');if(r.status==='applied')expect(r.world).toEqual(w);
  const crowd=medicineCamp(50,250);until(crowd,()=>crowd.pawns.filter((_,i)=>i%2).every(p=>!treatmentTarget(p)),1800);expect(units(crowd)).toBe(150);expect(crowd.pawns.filter((_,i)=>i%2===0).reduce((n,p)=>n+p.skills.medicine.xp,0)).toBe(50*122500);replay(crowd);
});
