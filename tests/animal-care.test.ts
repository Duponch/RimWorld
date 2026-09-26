import {expect,test} from 'vitest';
import {animalCombatCamp} from './scenarios/animal-combat.ts';
import {animalCareInProgress,animalCareProposal,animalCareTargets,animalCareWanted,
  applyAnimalCarePolicy,processAnimalCare,startAnimalCare} from '../src/sim/animal-care.ts';
import {createMedicalRecord,addResolvedInjury} from '../src/sim/injury-state.ts';
import {addMaterial,reservedSource} from '../src/sim/materials.ts';
import {blockedCells,reachableCells} from '../src/sim/pathfinding.ts';
import {releaseWork} from '../src/sim/work-release.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {stepWorld} from '../src/sim/engine.ts';
import type {NeedContext} from '../src/sim/needs.ts';
import type {Pawn,World} from '../src/sim/types.ts';

function fixture(){
  const w=animalCombatCamp(),a=w.wildlife!.animals[0]!,doctor=w.pawns[0]!;
  for(const p of w.pawns){delete p.draft;p.priorities.doctor=0;}
  doctor.priorities.doctor=1;doctor.x=7;doctor.z=10;
  a.x=10;a.z=10;a.state='sleeping';
  a.domestic={since:w.tick,care:'industrial',tameness:5,nextDecay:w.tick+45000};
  a.health={...createMedicalRecord(w.tick),body:'hare'};
  addResolvedInjury(a.health,'left-front-paw','cut',1000,()=>.999999);
  addResolvedInjury(a.health,'right-front-paw','cut',1000,()=>.999999);
  return {w,a,doctor};
}
function reach(w:World,p:Pawn){return reachableCells(w,p,blockedCells(w),new Set());}
function context(w:World,p:Pawn):NeedContext&{candidates:()=>ReturnType<typeof reach>;blocked:()=>Uint8Array}{
  return {search:()=>reach(w,p),candidates:()=>reach(w,p),blocked:()=>blockedCells(w),
    move:(cell)=>{p.x=cell.x;p.z=cell.z;},release:()=>releaseWork(w,p),event:()=>{}};
}
function medicineUnits(w:World){return w.piles.reduce((n,p)=>n+(p.kind==='medicine'?p.quantity:0),0);}
function run(w:World,p:Pawn,count=400){const ctx=context(w,p);for(let i=0;i<count&&p.animalCare;i++){w.tick++;processAnimalCare(w,p,ctx,()=>1);}}

test('only an owned, lying hare with veterinary need is eligible; paw anatomy is not human',()=>{
  const {w,a,doctor}=fixture();
  expect(animalCareTargets(a)).toHaveLength(2);
  expect(animalCareWanted(w,doctor)).toBe(true);
  const proposal=animalCareProposal(w,doctor,reach(w,doctor))!;
  expect(proposal.target).toBe(a);
  expect(proposal.task.spot).toSatisfy((spot:{x:number;z:number})=>Math.abs(spot.x-a.x)+Math.abs(spot.z-a.z)===1);
  w.pawns[1]!.animalHandling={animalId:a.id,kind:'maintain',sourcePileId:1,carryPileId:null,quantity:0,phase:'interact',step:4,progress:0};
  expect(animalCareWanted(w,doctor)).toBe(false);
  delete w.pawns[1]!.animalHandling;
  a.state='idle';expect(animalCareWanted(w,doctor)).toBe(false);
  a.state='sleeping';delete a.domestic;expect(animalCareWanted(w,doctor)).toBe(false);
  a.domestic={since:w.tick,care:'none',tameness:5,nextDecay:w.tick+45000};
  expect(animalCareWanted(w,doctor)).toBe(false);
  expect(applyAnimalCarePolicy(w,{animalId:a.id,care:'herbal'}).ok).toBe(true);
  expect(animalCareWanted(w,doctor)).toBe(true);
  expect(applyAnimalCarePolicy(w,{animalId:a.id,care:'bogus' as never}).ok).toBe(false);
});

test('medicine is reserved, physically carried and consumed once; treatment awards Medicine XP and survives replay',()=>{
  const {w,a,doctor}=fixture();
  addMaterial(w,'medicine',3,{type:'ground',x:6,z:10},'medicine');
  const source=w.piles.find(p=>p.kind==='medicine')!;
  const proposal=animalCareProposal(w,doctor,reach(w,doctor))!;
  expect(proposal.task.phase).toBe('pickup');
  expect(proposal.task.medicine).toMatchObject({item:'medicine',sourcePileId:source.id,quantity:1});
  startAnimalCare(doctor,proposal);
  expect(reservedSource(w,source.id)).toBe(1);
  expect(animalCareProposal(w,w.pawns[1]!,reach(w,w.pawns[1]!))).toBeUndefined();
  const ctx=context(w,doctor);
  w.tick++;processAnimalCare(w,doctor,ctx,()=>1);
  expect(doctor.animalCare?.phase).toBe('approach');
  expect(medicineUnits(w)).toBe(3);
  expect(w.piles.some(p=>p.owner.type==='pawn'&&p.owner.pawnId===doctor.id&&p.kind==='medicine')).toBe(true);
  const clone=deserializeWorld(serializeWorld(w));
  expect(validateWorld(w)).toEqual([]);
  run(w,doctor);run(clone,clone.pawns.find(p=>p.id===doctor.id)!);
  expect(clone).toEqual(w);
  expect(animalCareTargets(a)).toHaveLength(0);
  expect(a.health!.injuries.map(i=>i.tended)).toEqual([expect.any(Number),expect.any(Number)]);
  expect(doctor.skills.medicine.xp).toBeGreaterThan(0);
  expect(medicineUnits(w)).toBe(2);
  expect(doctor.animalCare).toBeUndefined();
  expect(validateWorld(w)).toEqual([]);
});

test('policy interruption returns the same carried medicine, then dry care resumes without a free dose',()=>{
  const {w,a,doctor}=fixture();
  addMaterial(w,'medicine',2,{type:'ground',x:6,z:10},'medicine');
  startAnimalCare(doctor,animalCareProposal(w,doctor,reach(w,doctor))!);
  const ctx=context(w,doctor);
  w.tick++;processAnimalCare(w,doctor,ctx,()=>1);
  const rng=w.rng,xp=doctor.skills.medicine.xp;
  expect(medicineUnits(w)).toBe(2);
  expect(applyAnimalCarePolicy(w,{animalId:a.id,care:'dry'}).ok).toBe(true);
  expect(doctor.animalCare).toBeUndefined();
  expect(doctor.skills.medicine.xp).toBe(xp);expect(w.rng).toBe(rng);
  expect(medicineUnits(w)).toBe(2);
  expect(w.piles.filter(p=>p.kind==='medicine').every(p=>p.owner.type==='ground')).toBe(true);
  const proposal=animalCareProposal(w,doctor,reach(w,doctor))!;
  expect(proposal.task.medicine).toBeUndefined();
  startAnimalCare(doctor,proposal);
  run(w,doctor);
  expect(animalCareTargets(a)).toHaveLength(0);
  expect(medicineUnits(w)).toBe(2);
  expect(validateWorld(w)).toEqual([]);
});

test('the animal remains free on a doctor route and still yields to danger during actual treatment',()=>{
  const {w,a,doctor}=fixture();
  startAnimalCare(doctor,animalCareProposal(w,doctor,reach(w,doctor))!);
  expect(animalCareInProgress(w,a)).toBe(false);
  const ctx=context(w,doctor);
  for(let i=0;i<12&&doctor.animalCare?.phase!=='treat';i++){w.tick++;processAnimalCare(w,doctor,ctx,()=>1);}
  expect(doctor.animalCare?.phase).toBe('treat');
  expect(animalCareInProgress(w,a)).toBe(true);
  doctor.moveCooldown=1;expect(animalCareInProgress(w,a)).toBe(false);doctor.moveCooldown=0;
  a.flee={danger:{x:0,z:0},until:w.tick+100};
  expect(animalCareInProgress(w,a)).toBe(false);
});

test('the normal work planner completes a physical veterinary treatment and keeps a saved treatment checkpoint',()=>{
  const {w,a,doctor}=fixture();a.rest=.2;
  for(const key of Object.keys(doctor.priorities) as (keyof typeof doctor.priorities)[])doctor.priorities[key]=0;
  doctor.priorities.doctor=1;
  addMaterial(w,'medicine',2,{type:'ground',x:6,z:10},'medicine');
  for(let i=0;i<300&&doctor.animalCare?.phase!=='treat';i++)stepWorld(w);
  expect(doctor.animalCare?.phase).toBe('treat');
  expect(animalCareInProgress(w,a)).toBe(true);
  expect(validateWorld(w)).toEqual([]);
  const copy=deserializeWorld(serializeWorld(w));
  for(let i=0;i<300&&animalCareTargets(a).length;i++){stepWorld(w);stepWorld(copy);}
  expect(copy).toEqual(w);
  expect(animalCareTargets(a)).toHaveLength(0);
  expect(medicineUnits(w)).toBe(1);
  expect(validateWorld(w)).toEqual([]);
});

test('a policy change on saturated ground keeps carried medicine in emergency cargo',()=>{
  const {w,a,doctor}=fixture();
  addMaterial(w,'medicine',2,{type:'ground',x:6,z:10},'medicine');
  startAnimalCare(doctor,animalCareProposal(w,doctor,reach(w,doctor))!);
  w.tick++;processAnimalCare(w,doctor,context(w,doctor),()=>1);
  const held=w.piles.find(p=>p.kind==='medicine'&&p.owner.type==='pawn')!;
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++){
    if(w.piles.some(p=>p.owner.type==='ground'&&p.owner.x===x&&p.owner.z===z))continue;
    try{addMaterial(w,'wood',75,{type:'ground',x,z},'wood');}catch{}
  }
  const before=medicineUnits(w),rng=w.rng,xp=doctor.skills.medicine.xp;
  expect(applyAnimalCarePolicy(w,{animalId:a.id,care:'dry'}).ok).toBe(true);
  expect(doctor.animalCare).toBeUndefined();
  expect(doctor.interruptedCargo).toBe(true);
  expect(w.piles.find(p=>p.id===held.id)?.owner).toEqual({type:'pawn',pawnId:doctor.id});
  expect(medicineUnits(w)).toBe(before);
  expect(doctor.skills.medicine.xp).toBe(xp);expect(w.rng).toBe(rng);
  expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});
