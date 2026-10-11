import { expect,test } from 'vitest';
import { medicalCamp,controlledInjury } from './scenarios/health.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { recruitmentUiFixture } from './scenarios/prison-camp.ts';
import { herdCareCamp } from './helpers/veterinary-v277.ts';
import { allowedAreaServicesAllowed,allowedAreaRecreationAllowed } from '../src/sim/allowed-area-services.ts';
import { foodSearchGoals,selectFood } from '../src/sim/food-selection.ts';
import { assistedFoodAccessible } from '../src/sim/prison-food.ts';
import { processEating } from '../src/sim/eating.ts';
import { processSleeping } from '../src/sim/sleeping.ts';
import { processRecreation } from '../src/sim/recreation.ts';
import { processFeeding } from '../src/sim/feeding.ts';
import { chooseDiningPlace } from '../src/sim/dining.ts';
import { reserveMedicalMedicine,medicineTaskValid,pickupMedicalMedicine } from '../src/sim/medicine-logistics.ts';
import { tendingReason } from '../src/sim/tending.ts';
import { rescueProposal,rescueReason } from '../src/sim/rescue.ts';
import { animalCareProposal,animalCareWanted } from '../src/sim/animal-care.ts';
import { animalRescueWanted,applyAnimalRescue,reconcileAnimalRescues } from '../src/sim/animal-rescue.ts';
import { animalCarrier } from '../src/sim/animal-rest-state.ts';
import { processSlaughter,slaughterWanted } from '../src/sim/animal-slaughter.ts';
import { researchProposal } from '../src/sim/research.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { BLOOD_UNIT } from '../src/sim/injury-rules.ts';
import { reconcileAnimalHealth } from '../src/sim/wildlife-health.ts';
import { blockedCells,reachableCells,interactionGoals } from '../src/sim/pathfinding.ts';
import { addGroundMaterial,refreshStock } from '../src/sim/materials.ts';
import { releaseWork } from '../src/sim/work-release.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { validateWorld } from '../src/sim/serialization.ts';
import type { NeedContext } from '../src/sim/needs.ts';
import type { Cell,Pawn,World } from '../src/sim/types.ts';
import type { TendTask } from '../src/sim/care-rules.ts';

function restrict(w:World,p:Pawn,cells:Cell[]):void {
  const id=p.allowedAreaId??w.nextId++;
  w.allowedAreas=[{id,label:'Maison',color:0,cells:[...new Set(cells.map(c=>c.z*w.width+c.x))].sort((a,b)=>a-b)}];
  p.allowedAreaId=id;
}
const reach=(w:World,p:Pawn)=>reachableCells(w,p,blockedCells(w),new Set());
function context(w:World,p:Pawn):NeedContext {
  return {search:()=>reach(w,p),move:()=>{},release:()=>releaseWork(w,p),event:()=>{}};
}
function until(w:World,done:()=>boolean,max=300):void {
  for(let n=0;n<max&&!done();n++)stepWorld(w,1);
  expect(done(),`Transition at tick ${w.tick}`).toBe(true);
}

test('food goals and final ranking ignore a superior outside meal before choosing an inside source',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;Object.assign(p,{x:4,z:4});
  addGroundMaterial(w,'food',1,{x:5,z:4},'lavish-meal');
  addGroundMaterial(w,'food',1,{x:9,z:4},'simple-meal');
  const outside=w.piles.find(q=>q.item==='lavish-meal')!,inside=w.piles.find(q=>q.item==='simple-meal')!;
  restrict(w,p,[inside.owner as Cell]);
  expect(foodSearchGoals(w,p,w.piles)).toEqual(interactionGoals(w,[inside.owner as Cell]));
  expect(selectFood(w,p,w.piles,reach(w,p))?.id).toBe(inside.id);
  expect(assistedFoodAccessible(w,p,w.pawns[0]!,outside)).toBe(false);
});

test('the prison-room food branch cannot bypass the supplier allowed area',()=>{
  const {world:w,actorId,patientId}=recruitmentUiFixture(),p=w.pawns.find(q=>q.id===actorId)!,patient=w.pawns.find(q=>q.id===patientId)!;
  addGroundMaterial(w,'food',1,{x:11,z:10},'simple-meal');const food=w.piles.find(q=>q.item==='simple-meal')!;
  expect(assistedFoodAccessible(w,p,patient,food)).toBe(true);
  restrict(w,p,[{x:20,z:20}]);expect(assistedFoodAccessible(w,p,patient,food)).toBe(false);
  restrict(w,p,[food.owner as Cell]);expect(assistedFoodAccessible(w,p,patient,food)).toBe(true);
});

test('a forbidden pickup cancels before moving the original meal or drawing randomness',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;Object.assign(p,{x:4,z:4});
  addGroundMaterial(w,'food',1,{x:5,z:4},'simple-meal');const pile=w.piles[0]!,owner=structuredClone(pile.owner),rng=w.rng;
  p.need={kind:'eat',phase:'pickup',sourcePileId:pile.id,carryPileId:null,quantity:1,progress:0,dining:null};
  restrict(w,p,[p]);processEating(w,p,context(w,p));
  expect(p.need).toBeNull();expect(pile.owner).toEqual(owner);expect(w.rng).toBe(rng);
});

test('already engaged ingestion continues after shrink, retaining the same held meal',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;Object.assign(p,{x:4,z:4,hunger:10});
  addGroundMaterial(w,'food',1,p,'simple-meal');const pile=w.piles[0]!;pile.owner={type:'pawn',pawnId:p.id};
  p.need={kind:'eat',phase:'ingest',sourcePileId:pile.id,carryPileId:pile.id,quantity:1,progress:1,dining:{target:{x:p.x,z:p.z},seatId:null,tableId:null}};
  restrict(w,p,[{x:20,z:20}]);expect(allowedAreaServicesAllowed(w,p)).toBe(true);
  processEating(w,p,context(w,p));expect(p.need?.kind==='eat'&&p.need.progress).toBeGreaterThan(1);
  expect(pile.owner).toEqual({type:'pawn',pawnId:p.id});expect(p.hunger).toBe(10);
});

test('dining filters seats before selection and permits an adjacent table outside the area',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;Object.assign(p,{x:4,z:4});
  fixtureBuilding(w,'table',5,4);fixtureBuilding(w,'stool',4,4);
  fixtureBuilding(w,'table',9,4);const inside=fixtureBuilding(w,'stool',8,4);
  restrict(w,p,[inside]);const choice=chooseDiningPlace(w,p,context(w,p));
  expect(choice?.place.seatId).toBe(inside.id);expect(choice?.place.target).toEqual({x:8,z:4});
});

test('outside owned bed cannot truncate the search for an admitted alternative bed',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;Object.assign(p,{x:4,z:4,rest:10});p.schedule.fill('anything');
  const outside=fixtureBuilding(w,'bed',6,4),inside=fixtureBuilding(w,'bed',12,4);p.bedId=outside.id;
  restrict(w,p,[inside]);let goals:ReadonlySet<number>|undefined;
  const ctx=context(w,p);ctx.search=g=>{goals=g;return reach(w,p);};
  expect(processSleeping(w,p,ctx,true)).toBe(true);expect(goals).toBeUndefined();
  expect(p.need?.kind==='sleep'&&p.need.bedId).toBe(inside.id);
});

test('ordinary outside floor sleep is refused while engaged sleep remains after shrink',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;Object.assign(p,{x:4,z:4,rest:10});p.schedule.fill('anything');
  restrict(w,p,[{x:20,z:20}]);expect(processSleeping(w,p,context(w,p),true)).toBe(false);expect(p.need).toBeNull();
  p.need={kind:'sleep',phase:'sleep',bedId:null,target:{x:p.x,z:p.z}};p.state='sleeping';
  const rest=p.rest;expect(processSleeping(w,p,context(w,p),false)).toBe(true);expect(p.rest).toBeGreaterThan(rest);
});

test('human rescue direct exception covers the outside patient, never an outside destination bed',()=>{
  const w=medicalCamp(2),p=w.pawns[0]!,patient=w.pawns[1]!;p.priorities.doctor=1;patient.state='downed';
  Object.assign(p,{x:4,z:4});Object.assign(patient,{x:5,z:4});const bed=fixtureBuilding(w,'bed',10,8);Object.assign(bed,{medical:true});
  restrict(w,p,[bed]);expect(rescueReason(w,p,patient)).toContain('Hors zone');
  expect(rescueReason(w,p,patient,true)).toBeUndefined();expect(rescueProposal(w,p,patient,reach(w,p),true)?.bedId).toBe(bed.id);
  restrict(w,p,[p]);expect(rescueProposal(w,p,patient,reach(w,p),true)).toBeUndefined();
});

test('tend preview refuses an outside patient while physical accepted guards retain their original role',()=>{
  const w=medicalCamp(2),p=w.pawns[0]!,patient=w.pawns[1]!;p.priorities.doctor=1;
  Object.assign(patient,{x:8,z:8,state:'resting'});const bed=fixtureBuilding(w,'bed',8,8);Object.assign(bed,{medical:true});
  patient.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:8,z:8},medical:'patient'};
  controlledInjury(w,patient,'left-arm',1000);restrict(w,p,[p]);
  expect(tendingReason(w,p,patient)).toContain('Hors zone');expect(tendingReason(w,p,patient,true)).toBeUndefined();
});

test('medicine ranks admitted sources, then rechecks the source before an actual pickup',()=>{
  const w=medicalCamp(2),p=w.pawns[0]!,patient=w.pawns[1]!;Object.assign(p,{x:4,z:4});patient.medicalCare='industrial';
  addGroundMaterial(w,'medicine',2,{x:5,z:4},'medicine');addGroundMaterial(w,'medicine',2,{x:9,z:4},'herbal-medicine');
  const outside=w.piles.find(q=>q.item==='medicine')!,inside=w.piles.find(q=>q.item==='herbal-medicine')!;
  const task:TendTask={patientId:patient.id,spot:{x:7,z:8},phase:'approach',progress:0};
  restrict(w,p,[inside.owner as Cell]);reserveMedicalMedicine(w,p,patient,task,reach(w,p),1);
  expect(task.medicine?.sourcePileId).toBe(inside.id);p.tend=task;
  restrict(w,p,[patient]);const rng=w.rng;pickupMedicalMedicine(w,p,task,context(w,p));
  expect(p.tend).toBeUndefined();expect(inside.quantity).toBe(2);expect(outside.quantity).toBe(2);expect(w.rng).toBe(rng);
});

test('held medicine crossing an outside corridor retains ownership; only the actual patient is scoped',()=>{
  const w=medicalCamp(2),p=w.pawns[0]!,patient=w.pawns[1]!;Object.assign(p,{x:4,z:4});patient.medicalCare='industrial';
  addGroundMaterial(w,'medicine',1,p,'medicine');const pile=w.piles[0]!;pile.owner={type:'pawn',pawnId:p.id};
  p.tend={patientId:patient.id,spot:{x:patient.x-1,z:patient.z},phase:'approach',progress:0,medicine:{item:'medicine',sourcePileId:pile.id,carryPileId:pile.id,quantity:1}};
  restrict(w,p,[patient]);expect(allowedAreaServicesAllowed(w,p)).toBe(true);
  expect(medicineTaskValid(w,p,patient,p.tend)).toBe(true);
  restrict(w,p,[p]);expect(allowedAreaServicesAllowed(w,p)).toBe(false);
});

test('forbidden assisted feeding on a saturated floor retains the original carried portion without nutrition or PRNG',()=>{
  const w=medicalCamp(2),p=w.pawns[0]!,patient=w.pawns[1]!;Object.assign(p,{x:4,z:4});patient.hunger=5;
  addGroundMaterial(w,'food',1,p,'simple-meal');const food=w.piles[0]!;food.owner={type:'pawn',pawnId:p.id};
  p.feed={patientId:patient.id,spot:{x:patient.x-1,z:patient.z},sourcePileId:food.id,carryPileId:food.id,quantity:1,phase:'deliver',progress:0};
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)w.piles.push({id:w.nextId++,kind:'wood',item:'wood',quantity:75,owner:{type:'ground',x,z}});
  restrict(w,p,[p]);const rng=w.rng;processFeeding(w,p,context(w,p));
  expect(p.feed).toBeUndefined();expect(p.interruptedCargo).toBeDefined();expect(food.owner).toEqual({type:'pawn',pawnId:p.id});
  expect(w.piles.filter(q=>q.id===food.id)).toHaveLength(1);expect(patient.hunger).toBe(5);expect(w.rng).toBe(rng);
});

test.each(['horseshoes','chess','visit-sick','watch-television'] as const)('%s scopes the real object or patient and permits an outside contact',activity=>{
  const w=medicalCamp(2),p=w.pawns[0]!,patient=w.pawns[1]!,target={x:7,z:8};
  Object.assign(patient,{x:8,z:8});
  const site=fixtureBuilding(w,activity==='chess'?'chess-table':activity==='watch-television'?'tube-television':'horseshoes',activity==='horseshoes'?12:8,8);
  const seat=activity==='chess'?fixtureBuilding(w,'stool',target.x,target.z):undefined;
  const task={activity,target,buildingId:activity==='visit-sick'?null:site.id,phase:'active' as const,elapsed:0,...(seat?{seatId:seat.id}:{}),...(activity==='visit-sick'?{patientId:patient.id}:{})};
  restrict(w,p,[target]);expect(allowedAreaRecreationAllowed(w,p,task)).toBe(false);
  restrict(w,p,[activity==='visit-sick'?patient:site]);expect(allowedAreaRecreationAllowed(w,p,task)).toBe(true);
  if(activity==='chess'){
    Object.assign(p,target);p.schedule.fill('anything');p.recreation.level=50;p.recreation.task=task;
    expect(processRecreation(w,p,context(w,p))).toBe(true);expect(p.recreation.level).toBeGreaterThan(50);
  }
});

test.each(['skygaze','social-relax'] as const)('%s scopes its actual destination cell',activity=>{
  const w=medicalCamp(),p=w.pawns[0]!,site=fixtureBuilding(w,'table',8,8),target={x:7,z:8};
  const task={activity,target,buildingId:activity==='skygaze'?null:site.id,phase:'travel' as const,elapsed:0};
  restrict(w,p,[site]);expect(allowedAreaRecreationAllowed(w,p,task)).toBe(false);
  restrict(w,p,[target]);expect(allowedAreaRecreationAllowed(w,p,task)).toBe(true);
});

test('research skips an outside first desk and permits its true contact cell outside an admitted desk',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;Object.assign(p,{x:4,z:4});p.priorities.research=1;w.research={project:'batteries',points:0};
  fixtureBuilding(w,'research-bench',6,4);const inside=fixtureBuilding(w,'research-bench',12,4);
  restrict(w,p,[inside]);const proposal=researchProposal(w,p,reach(w,p));expect(proposal?.task.stationId).toBe(inside.id);
  p.research=proposal!.task;expect(allowedAreaServicesAllowed(w,p)).toBe(true);
});

test('animal care selects admitted patient and source while an outside adjacent care spot stays legal',()=>{
  const {world:w}=herdCareCamp(),p=w.pawns[0]!,a=w.wildlife!.animals[0]!,medicine=w.piles[0]!;
  restrict(w,p,[a]);expect(animalCareWanted(w,p)).toBe(true);
  const proposal=animalCareProposal(w,p,reach(w,p));expect(proposal).toBeDefined();expect(proposal!.task.medicine).toBeUndefined();
  p.animalCare=proposal!.task;expect(allowedAreaServicesAllowed(w,p)).toBe(true);
  expect(medicine.owner.type).toBe('ground');restrict(w,p,[p]);expect(animalCareWanted(w,p)).toBe(false);
});

test('slaughter shrink at the final gesture interrupts without incision, blood, death or PRNG',()=>{
  const {world:w}=herdCareCamp(),p=w.pawns[0]!,a=w.wildlife!.animals[0]!;p.priorities.handle=1;
  a.domestic!.slaughter=true;Object.assign(p,{x:a.x-1,z:a.z,moveCooldown:0});
  const task={animalId:a.id,kind:'slaughter' as const,phase:'interact' as const,sourcePileId:0,carryPileId:null,quantity:0,step:0,progress:17};p.animalHandling=task;
  restrict(w,p,[p]);const health=structuredClone(a.health),rng=w.rng,filth=structuredClone(w.filth);
  expect(slaughterWanted(w,p)).toBe(false);processSlaughter(w,p,task,context(w,p));
  expect(p.animalHandling).toBeUndefined();expect(a.health).toEqual(health);expect(w.filth).toEqual(filth);expect(w.rng).toBe(rng);expect(a.domestic!.slaughter).toBe(true);
});

test('direct animal rescue persists its outside exception, replaces return, and shrink releases the same carried edge',()=>{
  const {world:w}=herdCareCamp(),p=w.pawns[0]!,a=w.wildlife!.animals[0]!;w.piles=[];w.structures=[];refreshStock(w);
  Object.assign(p,{x:4,z:4,hunger:100,rest:100});Object.assign(a,{x:12,z:8,path:[]});delete a.motion;
  a.health={...createMedicalRecord(w.tick),body:a.species,bloodLoss:Math.round(BLOOD_UNIT*.65)};reconcileAnimalHealth(w,a);
  const spot=fixtureBuilding(w,'animal-sleeping-spot',6,10);Object.assign(spot,{medical:true});restrict(w,p,[spot]);
  p.allowedAreaReturn={target:{x:spot.x,z:spot.z}};p.path=[{x:5,z:4}];
  expect(animalRescueWanted(w,p)).toBe(false);
  expect(applyAnimalRescue(w,{type:'order-animal-rescue',pawnId:p.id,animalId:a.id})).toEqual({ok:true});
  expect(p.allowedAreaReturn).toBeUndefined();expect(p.animalRescue?.forced).toBe(true);expect(p.path.length).toBeGreaterThan(0);
  until(w,()=>p.animalRescue?.phase==='carry'&&!!p.motion&&p.motion.end>w.tick);
  expect(animalCarrier(w,a.id)).toBe(p);expect(allowedAreaServicesAllowed(w,p)).toBe(true);expect(validateWorld(w)).toEqual([]);
  const edge=structuredClone(a.motion),rng=w.rng,health=structuredClone(a.health);restrict(w,p,[{x:20,z:20}]);reconcileAnimalRescues(w);
  expect(p.animalRescue).toBeUndefined();expect(a.motion).toEqual(edge);expect(a.health).toEqual(health);expect(w.rng).toBe(rng);expect(w.wildlife!.animals.filter(other=>other.id===a.id)).toHaveLength(1);
});
