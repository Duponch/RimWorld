import { expect,test } from 'vitest';
import { surgeryCamp } from './helpers/surgery-v192.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { addGroundMaterial,reservedSource } from '../src/sim/materials.ts';
import { lyingPatient,patientClaimed } from '../src/sim/care-access.ts';
import { surgeryProposal } from '../src/sim/surgery.ts';
import { blockedCells,reachableCells } from '../src/sim/pathfinding.ts';
import { injurePawn } from '../src/sim/health.ts';
import { medicalBleed,partMissing,tendInjury } from '../src/sim/injury-state.ts';
import { anestheticStage } from '../src/sim/anesthetic.ts';
import type { Command,World } from '../src/sim/types.ts';

type Camp=ReturnType<typeof surgeryCamp>;
const actor=(world:World,id:number)=>world.pawns.find(pawn=>pawn.id===id)!;
const units=(world:World)=>world.piles.reduce((count,pile)=>count+(pile.kind==='medicine'?pile.quantity:0),0);
function valid(world:World) {
  const errors=validateWorld(world);
  expect(errors,`tick ${world.tick}: ${JSON.stringify(world.pawns.map(p=>({id:p.id,state:p.state,need:p.need,surgery:p.surgery,request:p.surgeryRequest,feed:p.feed,tend:p.tend})))}`).toEqual([]);
}
function until(world:World,done:()=>boolean,limit=900) {
  valid(world);
  for(let i=0;i<limit&&!done();i++){stepWorld(world);valid(world);}
  expect(done(),`transition not reached at tick ${world.tick}`).toBe(true);
}
function replay(world:World,ticks=1) {
  valid(world);const resumed=deserializeWorld(serializeWorld(world));
  for(let i=0;i<ticks;i++){stepWorld(world);stepWorld(resumed);valid(world);valid(resumed);}
  expect(resumed).toEqual(world);
}
function request(c:Camp) {
  expect(applyCommand(c.world,{type:'surgery-request',pawnId:c.patientId,part:'left-arm'})).toEqual({ok:true});valid(c.world);
}
function enable(c:Camp,id=c.doctorId) {
  expect(applyCommand(c.world,{type:'priority',pawnId:id,work:'doctor',value:1})).toEqual({ok:true});valid(c.world);
}
function admitted(c:Camp) {
  request(c);until(c.world,()=>lyingPatient(actor(c.world,c.patientId)));
  expect(actor(c.world,c.patientId).need).toMatchObject({kind:'sleep',phase:'sleep',bedId:c.bedId,target:{x:10,z:10}});
  expect(units(c.world)).toBe(3);expect(actor(c.world,c.patientId).health!.anesthetic).toBeUndefined();
}
function carrying(c:Camp) {
  admitted(c);enable(c);until(c.world,()=>actor(c.world,c.doctorId).surgery?.phase==='approach');
  const doctor=actor(c.world,c.doctorId),task=doctor.surgery!;
  expect(task.medicine).toMatchObject({item:c.item,sourcePileId:c.sourceId,quantity:1});expect(task.medicine!.carryPileId).not.toBeNull();
  const pile=c.world.piles.find(pile=>pile.id===task.medicine!.carryPileId)!;
  expect(pile).toMatchObject({quantity:1,item:c.item,owner:{type:'pawn',pawnId:doctor.id}});
  expect(units(c.world)).toBe(3);expect(actor(c.world,c.patientId).health!.anesthetic).toBeUndefined();
  expect(Math.abs(doctor.x-13)+Math.abs(doctor.z-3)).toBeLessThanOrEqual(1);expect(doctor.moveCooldown).toBe(0);
  return pile.id;
}
function working(c:Camp) {
  carrying(c);until(c.world,()=>actor(c.world,c.doctorId).surgery?.phase==='work');
  const doctor=actor(c.world,c.doctorId),patient=actor(c.world,c.patientId),task=doctor.surgery!;
  expect(task.consumedMedicine).toBe(c.item);expect(task.medicine).toBeUndefined();expect(units(c.world)).toBe(2);
  expect(Math.abs(doctor.x-patient.x)+Math.abs(doctor.z-patient.z)).toBe(1);expect(doctor).toMatchObject({x:task.spot.x,z:task.spot.z,moveCooldown:0,state:'working'});
  expect(patient.state).toBe('downed');expect(lyingPatient(patient)).toBe(true);expect(patient.health!.anesthetic).toBeDefined();
  expect(patient.surgeryRequest).toMatchObject({part:'left-arm'});expect(doctor.skills.medicine.xp).toBe(0);
}

test('the waiting request respects disabled patient and bed-rest work, then uses enabled bed rest for real admission',()=>{
  const c=surgeryCamp(),w=c.world,patient=actor(w,c.patientId);
  for(const work of ['patient','bedrest'] as const)expect(applyCommand(w,{type:'priority',pawnId:patient.id,work,value:0})).toEqual({ok:true});
  request(c);const origin={x:patient.x,z:patient.z};
  for(let i=0;i<24;i++){stepWorld(w);valid(w);}
  expect(patient).toMatchObject(origin);expect(patient.need).toBeNull();expect(patient.surgeryRequest).toBeDefined();
  expect(patient.health!.anesthetic).toBeUndefined();expect(units(w)).toBe(3);replay(w,2);
  expect(applyCommand(w,{type:'priority',pawnId:patient.id,work:'bedrest',value:1})).toEqual({ok:true});
  until(w,()=>lyingPatient(patient));expect(patient.need).toMatchObject({kind:'sleep',phase:'sleep',medical:'bedrest',bedId:c.bedId});
  expect(patient).toMatchObject({x:10,z:10});expect(patient.health!.anesthetic).toBeUndefined();expect(units(w)).toBe(3);
});

test('a request reaches a real bed, collects one dose, anesthetizes at contact, completes and receives separate physical postoperative tending',()=>{
  const c=surgeryCamp(),w=c.world;request(c);
  const patient=actor(w,c.patientId),doctor=actor(w,c.doctorId);
  expect(lyingPatient(patient)).toBe(false);expect(patient.health!.anesthetic).toBeUndefined();replay(w,3);
  until(w,()=>lyingPatient(patient));expect(patient).toMatchObject({x:10,z:10});enable(c);
  until(w,()=>doctor.surgery?.phase==='pickup');
  expect(doctor.surgery!.medicine).toMatchObject({sourcePileId:c.sourceId,quantity:1,carryPileId:null});expect(reservedSource(w,c.sourceId)).toBe(1);
  expect(patientClaimed(w,patient.id,actor(w,c.helperId))).toBe(true);expect(units(w)).toBe(3);replay(w,2);
  until(w,()=>doctor.surgery?.phase==='approach');const carriedId=doctor.surgery!.medicine!.carryPileId!;
  expect(carriedId).not.toBe(c.sourceId);expect(w.piles.find(p=>p.id===c.sourceId)!.quantity).toBe(2);expect(units(w)).toBe(3);replay(w,2);
  until(w,()=>doctor.surgery?.phase==='work');
  const task=doctor.surgery!,expiresAt=patient.health!.anesthetic!.expiresAtCore,bornAt=patient.health!.anesthetic!.bornAt;
  expect(task.consumedMedicine).toBe('medicine');expect(task.medicine).toBeUndefined();expect(w.piles.some(p=>p.id===carriedId)).toBe(false);
  expect(units(w)).toBe(2);expect(doctor.skills.medicine.xp).toBe(0);expect(lyingPatient(patient)).toBe(true);expect(patient.surgeryRequest).toBeDefined();
  expect(Math.abs(doctor.x-patient.x)+Math.abs(doctor.z-patient.z)).toBe(1);expect(doctor.moveCooldown).toBe(0);replay(w,4);
  expect(patient.health!.anesthetic).toMatchObject({bornAt,expiresAtCore:expiresAt});
  until(w,()=>partMissing(patient.health!,'left-arm'));
  expect(patient.health!.missing).toEqual([{part:'left-arm',bornAt:w.tick}]);expect(patient.health!.infections!.cases).toEqual([]);
  expect(patient.health!.infections!.nextId).toBe(2);expect(patient.surgeryRequest).toBeUndefined();expect(doctor.surgery).toBeUndefined();
  expect(units(w)).toBe(2);expect(doctor.skills.medicine.xp).toBeGreaterThan(0);expect(medicalBleed(patient.health!)).toBe(3.6);replay(w);
  until(w,()=>patient.health!.missing[0]!.tended===true);
  expect(units(w)).toBe(1);expect(medicalBleed(patient.health!)).toBe(0);expect(patient.health!.anesthetic).toBeDefined();replay(w,3);
  until(w,()=>patient.state!=='downed'&&anestheticStage(patient.health!.anesthetic?.severity??0)!=='sedated',1700);
  expect(patient.health!.death).toBeUndefined();expect(partMissing(patient.health!,'left-hand')).toBe(true);
  expect(patient.health!.anesthetic).toBeDefined();expect(units(w)).toBe(1);valid(w);
});

test('a completed failure consumes its dose, grants actual-work XP and preserves anesthesia and real injuries without retry',()=>{
  const c=surgeryCamp(),w=c.world;w.rng=1; // Prepared failing stream, before every real transition.
  working(c);const doctor=actor(w,c.doctorId),patient=actor(w,c.patientId),bornAt=patient.health!.anesthetic!.bornAt;
  replay(w,3);until(w,()=>doctor.surgery===undefined);
  expect(w.events.some(e=>e.message.includes('opération')&&e.message.includes('échoué'))).toBe(true);
  expect(patient.health!.injuries.length+patient.health!.missing.length).toBeGreaterThan(0);
  expect(patient.health!.anesthetic).toMatchObject({bornAt});expect(patient.surgeryRequest).toBeUndefined();
  expect(doctor.skills.medicine.xp).toBeGreaterThan(0);expect(units(w)).toBe(2);
  const xp=doctor.skills.medicine.xp;
  // Disable the independent postoperative service after observing the actual
  // failure, so this short continuation isolates the lack of surgical retry.
  expect(applyCommand(w,{type:'priority',pawnId:doctor.id,work:'doctor',value:0})).toEqual({ok:true});
  replay(w,30);expect(doctor.surgery).toBeUndefined();expect(patient.surgeryRequest).toBeUndefined();
  expect(doctor.skills.medicine.xp).toBe(xp);expect(units(w)).toBe(2);expect(patient.health!.anesthetic).toBeDefined();
});

test('urgent tending and urgent assisted food precede surgery at a decision while sharing the patient reservation',()=>{
  const urgent=surgeryCamp();admitted(urgent);
  const p=actor(urgent.world,urgent.patientId);injurePawn(urgent.world,p,'neck','cut',6000);enable(urgent);
  until(urgent.world,()=>!!actor(urgent.world,urgent.doctorId).tend);
  expect(actor(urgent.world,urgent.doctorId).tend!.urgent).toBe(true);expect(actor(urgent.world,urgent.doctorId).surgery).toBeUndefined();
  expect(p.health!.anesthetic).toBeUndefined();expect(p.surgeryRequest).toBeDefined();expect(units(urgent.world)).toBe(3);replay(urgent.world);
  const food=surgeryCamp();admitted(food);const patient=actor(food.world,food.patientId);
  // Prepared previously treated brain contusion: incapacity prevents legitimate
  // self-feeding without inserting anesthesia or an urgent untended target.
  // Nine HP keeps one rounded HP; 9.5 would round to zero and destroy the brain.
  injurePawn(food.world,patient,'brain','bruise',9000);
  const contusion=patient.health!.injuries.find(i=>i.part==='brain')!;expect(tendInjury(patient.health!,contusion.id,1000)).toBe(true);
  expect(patient.state).toBe('downed');expect(lyingPatient(patient)).toBe(true);patient.hunger=5;
  addGroundMaterial(food.world,'food',1,{x:8,z:4},'survival-meal');enable(food);
  until(food.world,()=>!!actor(food.world,food.doctorId).feed);
  const doctor=actor(food.world,food.doctorId),helper=actor(food.world,food.helperId);
  expect(doctor.surgery).toBeUndefined();expect(patient.health!.anesthetic).toBeUndefined();expect(units(food.world)).toBe(3);
  enable(food,helper.id);
  const before=serializeWorld(food.world);
  expect(surgeryProposal(food.world,helper,patient,reachableCells(food.world,helper,blockedCells(food.world),new Set()))).toBeUndefined();
  expect(serializeWorld(food.world)).toBe(before);replay(food.world,2);
  until(food.world,()=>patient.hunger>26);expect(food.world.piles.some(pile=>pile.item==='survival-meal')).toBe(false);
  expect(patient.health!.anesthetic).toBeUndefined();expect(units(food.world)).toBe(3);
});

test('cancellation before administration preserves herbal identity and its thermal age after the real carried split',()=>{
  const c=surgeryCamp('herbal-medicine'),carryId=carrying(c),w=c.world,doctor=actor(w,c.doctorId),patient=actor(w,c.patientId);
  const before=w.piles.find(pile=>pile.id===carryId)!,condition=structuredClone(before.rot);expect(condition).toBeDefined();replay(w);
  const checkpoint=serializeWorld(w),restored=deserializeWorld(checkpoint);
  for(const world of [w,restored]) {
    expect(applyCommand(world,{type:'surgery-cancel',pawnId:c.patientId})).toEqual({ok:true});valid(world);
    expect(actor(world,c.doctorId).surgery).toBeUndefined();expect(actor(world,c.patientId).surgeryRequest).toBeUndefined();
    expect(actor(world,c.patientId).health!.anesthetic).toBeUndefined();expect(units(world)).toBe(3);
    expect(world.piles.find(pile=>pile.id===carryId)).toMatchObject({item:'herbal-medicine',quantity:1,owner:{type:'ground'}});
    expect(world.piles.find(pile=>pile.id===carryId)!.rot).toEqual(w.piles.find(pile=>pile.id===carryId)!.rot);
  }
  expect(restored).toEqual(w);expect(doctor.skills.medicine.xp).toBe(0);expect(partMissing(patient.health!,'left-arm')).toBe(false);replay(w,4);
});

test('cancellation after contact never refunds the administered dose, removes anesthesia or grants incomplete-operation XP',()=>{
  const c=surgeryCamp();working(c);const w=c.world,patient=actor(w,c.patientId),doctor=actor(w,c.doctorId);
  const anesthesia=structuredClone(patient.health!.anesthetic);replay(w,3);const current=structuredClone(patient.health!.anesthetic);
  expect(applyCommand(w,{type:'surgery-cancel',pawnId:c.patientId})).toEqual({ok:true});valid(w);
  expect(doctor.surgery).toBeUndefined();expect(patient.surgeryRequest).toBeUndefined();expect(patient.health!.anesthetic).toEqual(current);
  expect(patient.health!.anesthetic).toMatchObject({bornAt:anesthesia!.bornAt,expiresAtCore:anesthesia!.expiresAtCore});
  expect(units(w)).toBe(2);expect(doctor.skills.medicine.xp).toBe(0);expect(partMissing(patient.health!,'left-arm')).toBe(false);
  const before=serializeWorld(w);expect(applyCommand(w,{type:'surgery-request',pawnId:c.patientId,part:'left-arm'}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  replay(w,5);expect(units(w)).toBe(2);expect(patient.health!.anesthetic).toBeDefined();
});

test('a queued physical construction delivery waits through surgery, survives exact reload and starts after cancellation',()=>{
  const c=surgeryCamp();working(c);const w=c.world,doctor=actor(w,c.doctorId),patient=actor(w,c.patientId);
  expect(applyCommand(w,{type:'priority',pawnId:doctor.id,work:'build',value:1})).toEqual({ok:true});
  expect(applyCommand(w,{type:'designate',kind:'wall',x:4,z:12})).toEqual({ok:true});
  const job=w.jobs.find(j=>j.kind==='wall'&&j.x===4&&j.z===12)!;
  addGroundMaterial(w,'wood',5,{x:3,z:12},'wood');
  const wood=w.piles.find(p=>p.item==='wood')!;
  const unchanged=()=>structuredClone({request:patient.surgeryRequest,task:doctor.surgery,condition:patient.health!.anesthetic,
    doses:units(w),xp:doctor.skills.medicine.xp,jobId:doctor.jobId,haul:doctor.haul,path:doctor.path,motion:doctor.motion,state:doctor.state,moveCooldown:doctor.moveCooldown,rng:w.rng});
  const before=unchanged();
  expect(applyCommand(w,{type:'order-haul',pawnId:doctor.id,target:{type:'job',jobId:job.id},queue:true})).toEqual({ok:true});
  expect(unchanged()).toEqual(before);expect(doctor.orders.active).toBeNull();
  expect(doctor.orders.queue).toEqual([{sourcePileId:wood.id,quantity:5,phase:'pickup',destination:{type:'job',jobId:job.id,forConstruction:true},carryPileId:null}]);
  expect(doctor.priorityWork).toEqual({cell:{x:4,z:12},work:'build',startedAt:w.tick});
  expect(reservedSource(w,wood.id)).toBe(5);expect(wood.owner).toEqual({type:'ground',x:3,z:12});
  valid(w);const queue=structuredClone(doctor.orders.queue),intent=structuredClone(doctor.priorityWork),progress=doctor.surgery!.progress;
  replay(w,4);expect(doctor.surgery!.progress).toBeGreaterThan(progress);
  expect(doctor.haul).toBeNull();expect(doctor.jobId).toBeNull();expect(doctor.orders).toEqual({active:null,queue});
  expect(doctor.priorityWork).toEqual(intent);expect(wood.owner).toEqual({type:'ground',x:3,z:12});
  expect(units(w)).toBe(2);expect(doctor.skills.medicine.xp).toBe(0);
  const condition=structuredClone(patient.health!.anesthetic);
  expect(applyCommand(w,{type:'surgery-cancel',pawnId:patient.id})).toEqual({ok:true});
  expect(patient.surgeryRequest).toBeUndefined();expect(doctor.surgery).toBeUndefined();expect(patient.health!.anesthetic).toEqual(condition);
  expect(doctor.orders).toEqual({active:null,queue});expect(doctor.priorityWork).toEqual(intent);valid(w);
  until(w,()=>doctor.haul?.phase==='deliver');
  expect(doctor.orders.active).toBe('haul');expect(doctor.orders.queue).toEqual([]);
  expect(doctor.haul).toMatchObject({sourcePileId:wood.id,quantity:5,destination:{type:'job',jobId:job.id}});
  const carried=w.piles.find(p=>p.id===doctor.haul!.carryPileId)!;
  expect(carried).toMatchObject({item:'wood',quantity:5,owner:{type:'pawn',pawnId:doctor.id}});
  expect(Math.abs(doctor.x-3)+Math.abs(doctor.z-12)).toBeLessThanOrEqual(1);expect(doctor.moveCooldown).toBe(0);replay(w,2);
  until(w,()=>w.piles.some(p=>p.item==='wood'&&p.owner.type==='job'&&p.owner.jobId===job.id));
  expect(w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0)).toBe(5);
  expect(units(w)).toBe(2);expect(doctor.skills.medicine.xp).toBe(0);expect(patient.health!.anesthetic).toBeDefined();replay(w,2);
});

test('disappearance of the directly infected target or a newly solid bedside interrupts before administration without losing cargo',()=>{
  for(const cause of ['infection','obstacle'] as const) {
    const c=surgeryCamp(),carryId=carrying(c),w=c.world,doctor=actor(w,c.doctorId),patient=actor(w,c.patientId);
    if(cause==='infection')patient.health!.infections!.cases=[]; // Prepared disappearance, not a claimed natural acquisition/recovery.
    else {const spot=doctor.surgery!.spot;w.structures.push({id:w.nextId++,kind:'wall',x:spot.x,z:spot.z,orientation:0,footprint:'standard',material:'wood'});}
    stepWorld(w);valid(w);expect(doctor.surgery).toBeUndefined();expect(patient.health!.anesthetic).toBeUndefined();expect(doctor.skills.medicine.xp).toBe(0);
    expect(units(w)).toBe(3);expect(w.piles.filter(pile=>pile.id===carryId)).toHaveLength(1);replay(w,3);
  }
});

test('an incapable operator releases the patient after administration while its condition and physical bed continue',()=>{
  const c=surgeryCamp();working(c);const w=c.world,doctor=actor(w,c.doctorId),patient=actor(w,c.patientId),anesthesia=structuredClone(patient.health!.anesthetic);
  injurePawn(w,doctor,'left-shoulder','crush',30000);injurePawn(w,doctor,'right-shoulder','crush',30000);
  stepWorld(w);valid(w);expect(doctor.surgery).toBeUndefined();expect(patient.surgeryRequest).toBeUndefined();expect(patient.health!.anesthetic).toMatchObject({bornAt:anesthesia!.bornAt,expiresAtCore:anesthesia!.expiresAtCore});
  expect(units(w)).toBe(2);expect(partMissing(patient.health!,'left-arm')).toBe(false);expect(doctor.skills.medicine.xp).toBe(0);expect(lyingPatient(patient)).toBe(true);
  expect(patientClaimed(w,patient.id,actor(w,c.helperId))).toBe(false);replay(w,2);
});

test('request refusals are atomic; cancellation and involuntary release retain the real dose when every drop cell is full',()=>{
  const c=surgeryCamp(),w=c.world;
  for(const command of [{type:'surgery-request',pawnId:-1,part:'left-arm'},{type:'surgery-request',pawnId:c.patientId,part:'head'},
    {type:'surgery-request',pawnId:c.patientId,part:'right-leg'},{type:'surgery-request',pawnId:c.doctorId,part:'left-arm'}] as unknown as Command[]) {
    const before=serializeWorld(w);expect(applyCommand(w,command).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  }
  request(c);const before=serializeWorld(w);expect(applyCommand(w,{type:'surgery-request',pawnId:c.patientId,part:'left-arm'}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  const full=surgeryCamp(),carryId=carrying(full),a=full.world,doctor=actor(a,full.doctorId),patient=actor(a,full.patientId);
  // Saturate through the common physical placement API, preserving all cells
  // occupied by incompatible stacks and furniture rather than overwriting.
  for(let z=0;z<a.height;z++)for(let x=0;x<a.width;x++)try{addGroundMaterial(a,'wood',75,{x,z},'wood');}catch{}
  valid(a);const involuntary=deserializeWorld(serializeWorld(a));
  expect(applyCommand(a,{type:'surgery-cancel',pawnId:patient.id})).toEqual({ok:true});
  expect(patient.surgeryRequest).toBeUndefined();
  expect(applyCommand(involuntary,{type:'medical-care',pawnId:patient.id,care:'none'})).toEqual({ok:true});stepWorld(involuntary);
  for(const world of [a,involuntary]) {
    const operator=actor(world,doctor.id);valid(world);
    expect(operator.surgery).toBeUndefined();expect(operator.interruptedCargo).toBe(true);expect(actor(world,patient.id).health!.anesthetic).toBeUndefined();
    expect(world.piles.filter(pile=>pile.id===carryId)).toHaveLength(1);expect(world.piles.find(pile=>pile.id===carryId)).toMatchObject({quantity:1,owner:{type:'pawn',pawnId:doctor.id}});
    expect(units(world)).toBe(3);expect(operator.skills.medicine.xp).toBe(0);replay(world,2);
  }
});
