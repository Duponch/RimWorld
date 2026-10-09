import { expect,test } from 'vitest';
import { woodenSurgeryCamp } from './helpers/wooden-surgery-v275.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { addGroundMaterial,refreshStock,reservedSource } from '../src/sim/materials.ts';
import { lyingPatient,patientClaimed } from '../src/sim/care-access.ts';
import { implantSurgeryProposal,implantSurgeryReason } from '../src/sim/prosthetic-surgery.ts';
import { blockedCells,reachableCells } from '../src/sim/pathfinding.ts';
import { validImplantTaskRelations } from '../src/sim/surgery-ingredients.ts';
import type { Command,World } from '../src/sim/types.ts';

type Camp=ReturnType<typeof woodenSurgeryCamp>;
const actor=(w:World,id:number)=>w.pawns.find(p=>p.id===id)!;
const units=(w:World,item:string)=>w.piles.reduce((n,p)=>n+(p.item===item?p.quantity:0),0);
function valid(w:World){expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}
function until(w:World,done:()=>boolean,limit=1500){
  valid(w);for(let i=0;i<limit&&!done();i++){stepWorld(w);valid(w);}
  expect(done(),`transition not reached at tick ${w.tick}`).toBe(true);
}
function replay(w:World,ticks=1){
  valid(w);const resumed=deserializeWorld(serializeWorld(w));expect(resumed).toEqual(w);
  for(let i=0;i<ticks;i++){stepWorld(w);stepWorld(resumed);valid(w);valid(resumed);}
  expect(resumed).toEqual(w);
}
function admitted(c:Camp){
  expect(applyCommand(c.world,{type:'surgery-install',pawnId:c.patientId,part:c.part,implant:c.implant})).toEqual({ok:true});
  until(c.world,()=>lyingPatient(actor(c.world,c.patientId)));
  expect(actor(c.world,c.patientId)).toMatchObject({x:10,z:10});
  expect(actor(c.world,c.patientId).health!.anesthetic).toBeUndefined();
}
function enable(c:Camp){expect(applyCommand(c.world,{type:'priority',pawnId:c.doctorId,work:'doctor',value:1})).toEqual({ok:true});}
function collecting(c:Camp){
  admitted(c);enable(c);until(c.world,()=>actor(c.world,c.doctorId).surgery?.phase==='pickup');
  return actor(c.world,c.doctorId).surgery!;
}
function working(c:Camp){
  collecting(c);until(c.world,()=>actor(c.world,c.doctorId).surgery?.phase==='work');
  const doctor=actor(c.world,c.doctorId),patient=actor(c.world,c.patientId);
  expect(doctor.surgery).toMatchObject({implant:c.implant,part:c.part,consumedMedicine:c.item});
  expect(doctor.surgery!.ingredients).toBeUndefined();expect(doctor.surgery!.medicine).toBeUndefined();
  expect(units(c.world,'wood')).toBe(0);expect(units(c.world,c.item)).toBe(1);
  expect(patient.health!.anesthetic).toBeDefined();expect(lyingPatient(patient)).toBe(true);
  expect(Math.abs(doctor.x-patient.x)+Math.abs(doctor.z-patient.z)).toBe(1);
  expect(doctor.moveCooldown).toBe(0);expect(doctor.skills.medicine.xp).toBeLessThanOrEqual(0); // Natural high-skill decay can occur during transport; no surgical XP yet.
}

test('real bed admission, wood and two-dose delivery, atomic administration and completion survive exact checkpoints',()=>{
  const c=woodenSurgeryCamp(),w=c.world,doctor=actor(w,c.doctorId),patient=actor(w,c.patientId);
  doctor.skills.medicine.level=20; // Prepared skill, before every played tick and draw.
  const task=collecting(c);
  expect(task.ingredients).toHaveLength(2);
  expect(task.ingredients!.map(i=>[i.item,i.quantity,i.stage])).toEqual([['wood',1,'source'],['medicine',2,'source']]);
  expect(reservedSource(w,c.woodSourceId)).toBe(1);expect(reservedSource(w,c.sourceId)).toBe(2);
  expect(patientClaimed(w,patient.id,actor(w,c.helperId))).toBe(true);replay(w);
  until(w,()=>doctor.surgery?.ingredients?.some(i=>i.stage==='held')===true);
  const held=doctor.surgery!.ingredients!.find(i=>i.stage==='held')!;
  expect(w.piles.find(p=>p.id===held.pileId)).toMatchObject({item:'wood',quantity:1,owner:{type:'pawn',pawnId:doctor.id}});
  expect(patient.health!.anesthetic).toBeUndefined();expect(units(w,'medicine')).toBe(3);replay(w);
  until(w,()=>doctor.surgery?.ingredients?.every(i=>i.stage==='placed')===true);
  expect(patient.health!.anesthetic).toBeUndefined();
  for(const i of doctor.surgery!.ingredients!)expect(w.piles.find(p=>p.id===i.pileId)).toMatchObject({item:i.item,quantity:i.quantity,owner:{type:'ground',...i.cell}});
  expect(validImplantTaskRelations(w,doctor,patient,doctor.surgery!)).toBe(true);replay(w);
  until(w,()=>doctor.surgery?.phase==='work');expect(units(w,'wood')).toBe(0);expect(units(w,'medicine')).toBe(1);
  expect(doctor.surgery!.ingredients).toBeUndefined();replay(w,3);
  until(w,()=>doctor.surgery===undefined);
  expect(patient.health!.artificialParts).toEqual([{part:c.part,kind:c.implant,installedAt:w.tick}]);
  expect(patient.surgeryRequest).toBeUndefined();expect(patient.health!.anesthetic).toBeDefined();
  expect(doctor.skills.medicine.xp).toBeGreaterThan(0);expect(units(w,'medicine')).toBe(1);replay(w,3);
});

test('two distinct one-dose piles of one medicine are collected and staged physically without a synthetic dose',()=>{
  const c=woodenSurgeryCamp('wooden-hand','left-hand','herbal-medicine'),w=c.world,source=w.piles.find(p=>p.id===c.sourceId)!;
  source.quantity=1;addGroundMaterial(w,'medicine',1,{x:12,z:3},c.item);refreshStock(w);
  const task=collecting(c),doses=task.ingredients!.filter(i=>i.item===c.item);
  expect(doses.map(i=>i.quantity)).toEqual([1,1]);expect(new Set(doses.map(i=>i.pileId)).size).toBe(2);
  until(w,()=>actor(w,c.doctorId).surgery?.ingredients?.every(i=>i.stage==='placed')===true);
  const staged=actor(w,c.doctorId).surgery!.ingredients!,ids=staged.map(i=>i.pileId);
  expect(staged).toHaveLength(3);expect(units(w,c.item)).toBe(2);expect(units(w,'wood')).toBe(1);replay(w,0);
  expect(applyCommand(w,{type:'surgery-cancel',pawnId:c.patientId})).toEqual({ok:true});valid(w);
  expect(actor(w,c.patientId).health!.anesthetic).toBeUndefined();
  expect(units(w,c.item)).toBe(2);expect(units(w,'wood')).toBe(1);
  for(const id of ids)expect(w.piles.find(p=>p.id===id)?.owner.type).toBe('ground');
  replay(w,3);
});

test('cancelling while carrying returns the exact unconsumed wood and doses and releases their reservations',()=>{
  const c=woodenSurgeryCamp(),w=c.world;collecting(c);
  const doctor=actor(w,c.doctorId),patient=actor(w,c.patientId);
  until(w,()=>doctor.surgery?.ingredients?.some(i=>i.stage==='held')===true);
  const heldId=doctor.surgery!.ingredients!.find(i=>i.stage==='held')!.pileId;
  replay(w);const restored=deserializeWorld(serializeWorld(w));
  for(const world of [w,restored]){
    expect(applyCommand(world,{type:'surgery-cancel',pawnId:c.patientId})).toEqual({ok:true});valid(world);
    expect(actor(world,c.doctorId).surgery).toBeUndefined();expect(actor(world,c.patientId).surgeryRequest).toBeUndefined();
    expect(actor(world,c.patientId).health!.anesthetic).toBeUndefined();
    expect(world.piles.find(p=>p.id===heldId)).toMatchObject({item:'wood',quantity:1,owner:{type:'ground'}});
    expect(units(world,'wood')).toBe(1);expect(units(world,c.item)).toBe(3);
    expect(reservedSource(world,c.sourceId)).toBe(0);expect(reservedSource(world,c.woodSourceId)).toBe(0);
  }
  expect(restored).toEqual(w);expect(doctor.skills.medicine.xp).toBe(0);expect(patient.health!.artificialParts).toBeUndefined();replay(w,3);
});

test('cancelling after administration refunds nothing and retains anesthesia without incomplete-operation XP or automatic retry',()=>{
  const c=woodenSurgeryCamp('wooden-foot','right-foot'),w=c.world;working(c);replay(w,2);
  const patient=actor(w,c.patientId),doctor=actor(w,c.doctorId),anesthesia=structuredClone(patient.health!.anesthetic);
  expect(applyCommand(w,{type:'surgery-cancel',pawnId:c.patientId})).toEqual({ok:true});valid(w);
  expect(patient.health!.anesthetic).toEqual(anesthesia);expect(patient.health!.artificialParts).toBeUndefined();
  expect(patient.surgeryRequest).toBeUndefined();expect(doctor.surgery).toBeUndefined();expect(doctor.skills.medicine.xp).toBe(0);
  expect(units(w,'wood')).toBe(0);expect(units(w,c.item)).toBe(1);
  const before=serializeWorld(w);
  expect(applyCommand(w,{type:'surgery-install',pawnId:c.patientId,part:c.part,implant:c.implant}).ok).toBe(false);
  expect(serializeWorld(w)).toBe(before);replay(w,4);
});

test('shortage, mixed single doses, medical policy and insufficient skill cannot start collection or consume supplies',()=>{
  for(const cause of ['wood','dose','mixed','policy','skill'] as const){
    const c=woodenSurgeryCamp(),w=c.world,doctor=actor(w,c.doctorId),patient=actor(w,c.patientId);
    if(cause==='wood')w.piles=w.piles.filter(p=>p.item!=='wood');
    if(cause==='dose'||cause==='mixed')w.piles.find(p=>p.id===c.sourceId)!.quantity=1;
    if(cause==='mixed')addGroundMaterial(w,'medicine',1,{x:12,z:3},'herbal-medicine');
    if(cause==='policy')patient.medicalCare='herbal';
    if(cause==='skill')doctor.skills.medicine.level=2;
    refreshStock(w);admitted(c);enable(c);
    const before=serializeWorld(w),reach=reachableCells(w,doctor,blockedCells(w),new Set());
    expect(implantSurgeryProposal(w,doctor,patient,reach)).toBeUndefined();expect(serializeWorld(w)).toBe(before);
    if(cause==='skill')expect(implantSurgeryReason(w,doctor,patient)).toContain('Médecine 3');
    const wood=units(w,'wood'),doses=units(w,c.item);
    for(let i=0;i<60;i++){stepWorld(w);valid(w);}
    expect(doctor.surgery).toBeUndefined();expect(patient.health!.anesthetic).toBeUndefined();
    expect(units(w,'wood')).toBe(wood);expect(units(w,c.item)).toBe(doses);expect(patient.surgeryRequest).toBeDefined();
  }
});

test('request refusals and corrupted held/staged ledgers are rejected before creating clinical or inventory state',()=>{
  const c=woodenSurgeryCamp(),w=c.world;
  for(const command of [
    {type:'surgery-install',pawnId:-1,part:c.part,implant:c.implant},
    {type:'surgery-install',pawnId:c.patientId,part:'right-leg',implant:'peg-leg'},
    {type:'surgery-install',pawnId:c.patientId,part:'left-leg',implant:'wooden-hand'},
    {type:'surgery-install',pawnId:c.patientId,part:'head',implant:'peg-leg'},
  ] as unknown as Command[]){
    const before=serializeWorld(w);expect(applyCommand(w,command).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  }
  collecting(c);const doctor=actor(w,c.doctorId);
  until(w,()=>doctor.surgery?.ingredients?.some(i=>i.stage==='held')===true);replay(w);
  const checkpoint=serializeWorld(w);
  for(const corrupt of ['phase','quantity','alias','staging','medicine'] as const){
    const bad=deserializeWorld(checkpoint),task=actor(bad,c.doctorId).surgery!,ingredients=task.ingredients!;
    if(corrupt==='phase')task.phase='pickup';
    if(corrupt==='quantity')ingredients[0]!.quantity=2;
    if(corrupt==='alias')ingredients[1]!.pileId=ingredients[0]!.pileId;
    if(corrupt==='staging')ingredients[0]!.cell={...task.spot};
    if(corrupt==='medicine')ingredients.find(i=>i.item===c.item)!.item='herbal-medicine';
    expect(()=>deserializeWorld(serializeWorld(bad))).toThrow();
  }
  expect(serializeWorld(w)).toBe(checkpoint);expect(actor(w,c.patientId).health!.anesthetic).toBeUndefined();
});

test('hand and foot installations share the real provider and their own work amounts rather than an amputation result',()=>{
  for(const [implant,part] of [['wooden-hand','right-hand'],['wooden-foot','left-foot']] as const){
    const c=woodenSurgeryCamp(implant,part),w=c.world,doctor=actor(w,c.doctorId),patient=actor(w,c.patientId);
    doctor.skills.medicine.level=20;working(c);replay(w,2);
    until(w,()=>doctor.surgery===undefined);
    expect(patient.health!.artificialParts).toEqual([{part,kind:implant,installedAt:w.tick}]);
    expect(patient.health!.missing.some(m=>m.part===part)).toBe(false);
    expect(patient.health!.missing.every(m=>m.nonFresh===true)).toBe(true);
    expect(doctor.skills.medicine.xp).toBeGreaterThan(0);expect(units(w,'wood')).toBe(0);expect(units(w,c.item)).toBe(1);
    expect(patient.surgeryRequest).toBeUndefined();replay(w,2);
  }
});

test('a completed failed installation spends the delivered materials, grants work XP and retains physical consequences without retry',()=>{
  const c=woodenSurgeryCamp(),w=c.world;w.rng=1; // Prepared failing stream before clinical draws.
  working(c);const doctor=actor(w,c.doctorId),patient=actor(w,c.patientId),bornAt=patient.health!.anesthetic!.bornAt;
  until(w,()=>doctor.surgery===undefined);
  expect(w.events.some(e=>e.message.includes('prothèse')&&e.message.includes('échoué'))).toBe(true);
  expect(patient.health!.artificialParts).toBeUndefined();expect(patient.health!.injuries.length).toBeGreaterThan(0);
  expect(patient.health!.anesthetic).toMatchObject({bornAt});expect(patient.surgeryRequest).toBeUndefined();
  expect(doctor.skills.medicine.xp).toBeGreaterThan(0);expect(units(w,'wood')).toBe(0);expect(units(w,c.item)).toBe(1);replay(w);
});
