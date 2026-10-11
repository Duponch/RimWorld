import { expect,test } from 'vitest';
import { medicalCamp,controlledInjury } from './scenarios/health.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { bedSlotCell,bedSlotClaimed } from '../src/sim/bed-slots.ts';
import { applyMedicalBed,rescueBedAvailable,rescueBedPlaces } from '../src/sim/medical-beds.ts';
import { applyPrisonBed,reconcilePrisoners } from '../src/sim/prisoners.ts';
import { prisonBedValid } from '../src/sim/prison-space.ts';
import { applyRescue,rescueProposal,startRescue,processRescue,reconcileRescues } from '../src/sim/rescue.ts';
import { carrierOf,syncPatient } from '../src/sim/rescue-state.ts';
import { patientProposal,startPatientRest,processPatientRest } from '../src/sim/patient-rest.ts';
import { currentMedicalBed,bedHealPerDay,bedImmunityFactor,bedTendOffset } from '../src/sim/hospital-medical-stats.ts';
import { tendingProposal,applyTending } from '../src/sim/tending.ts';
import { applyFeeding,feedingProposal } from '../src/sim/feeding.ts';
import { surgeryReason } from '../src/sim/surgery.ts';
import { implantSurgeryReason } from '../src/sim/prosthetic-surgery.ts';
import { updateRest,BED_REST_PER_TICK } from '../src/sim/rest.ts';
import { updateWellbeing } from '../src/sim/wellbeing.ts';
import { advanceRoomRest } from '../src/sim/room-experience.ts';
import { captureRoomQuality } from '../src/sim/room-quality.ts';
import { WorkEnvironmentCache } from '../src/sim/work-environment.ts';
import { reservedServiceCells } from '../src/sim/service-reservations.ts';
import { leaveTransitCell } from '../src/sim/transit-exit.ts';
import { allowedAreaServicesAllowed } from '../src/sim/allowed-area-services.ts';
import { blockedCells,reachableCells } from '../src/sim/pathfinding.ts';
import { addGroundMaterial,refreshStock } from '../src/sim/materials.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots.ts';
import { releaseWork } from '../src/sim/work-release.ts';
import { COMPLEX_FURNITURE_RESEARCH_COST } from '../src/sim/research.ts';
import type { NeedContext } from '../src/sim/needs.ts';
import type { BedSlot,Cell,Pawn,World } from '../src/sim/types.ts';

function camp(count=4){
  const world=medicalCamp(count),bed=fixtureBuilding(world,'double-bed',14,14);
  Object.assign(bed,{material:'wood',quality:'normal'});
  world.research={points:0,project:null,complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:world.tick}};
  for(const p of world.pawns){delete p.background;Object.assign(p,{x:3+p.id%4,z:4,hunger:100,rest:80});}
  return {world,bed};
}
const reach=(w:World,p:Pawn)=>reachableCells(w,p,blockedCells(w),new Set());
function context(w:World,p:Pawn):NeedContext{return {search:()=>reach(w,p),move:()=>{},release:()=>releaseWork(w,p),event:()=>{}};}
function until(w:World,predicate:()=>boolean,max=600){for(let n=0;n<max&&!predicate();n++)stepWorld(w,1);expect(predicate(),`Expected transition at tick ${w.tick}`).toBe(true);}
function fallen(w:World,p:Pawn,x:number,z:number){Object.assign(p,{x,z});controlledInjury(w,p,'left-leg',30000);controlledInjury(w,p,'right-leg',30000);}
function own(w:World,p:Pawn,bedId:number,slot:BedSlot,installed=false){
  const bed=w.structures.find(b=>b.id===bedId)!,head=bedSlotCell(bed,slot)!;p.bedId=bedId;p.bedSlot=slot;
  if(installed){Object.assign(p,head);p.path=[];p.moveCooldown=0;p.motion=null;p.need={kind:'sleep',phase:'sleep',bedId,target:head};if(p.state!=='downed'){p.state='sleeping';p.schedule.fill('sleep');}}
}
function restrict(w:World,p:Pawn,cells:Cell[]){const id=w.nextId++;w.allowedAreas=[{id,label:'Chevet',color:0,cells:cells.map(c=>c.z*w.width+c.x).sort((a,b)=>a-b)}];p.allowedAreaId=id;}
function roundTrip(w:World){
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const decoded=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));
  expect(decoded.status).toBe('applied');if(decoded.status==='applied')expect(decoded.world).toEqual(w);
}

test('two civil rescues claim different durable places and a third patient cannot reserve either',()=>{
  const {world:w,bed}=camp(5),[a,b,p,q,r]=w.pawns as [Pawn,Pawn,Pawn,Pawn,Pawn];
  a.priorities.doctor=1;b.priorities.doctor=1;fallen(w,p,9,7);fallen(w,q,10,8);fallen(w,r,11,8);
  own(w,p,bed.id,0);own(w,q,bed.id,1);
  const first=rescueProposal(w,a,p,reach(w,a)),second=rescueProposal(w,b,q,reach(w,b));
  expect(first?.bedSlot).toBe(0);expect(second?.bedSlot).toBe(1);startRescue(w,a,first!);startRescue(w,b,second!);
  expect(bedSlotClaimed(w,bed,0)).toBe(true);expect(bedSlotClaimed(w,bed,1)).toBe(true);
  expect(rescueBedAvailable(w,bed,p,a.id,false,0)).toBe(true);
  expect(rescueBedAvailable(w,bed,q,b.id,false,0)).toBe(false);
  expect(rescueBedPlaces(w,bed,r,a.id)).toEqual([]);expect(rescueProposal(w,a,q,reach(w,a))).toBeUndefined();roundTrip(w);
});

test('real carry mirrors the patient edge and reloads before depositing into head1 beside a sleeping owner',()=>{
  const {world:w,bed}=camp(3),[actor,patient,neighbor]=w.pawns as [Pawn,Pawn,Pawn];
  actor.priorities.doctor=1;fallen(w,patient,9,7);own(w,patient,bed.id,1);own(w,neighbor,bed.id,0,true);
  const neighborTarget=structuredClone(neighbor.need),id=patient.id,hunger=patient.hunger;
  expect(applyRescue(w,{pawnId:actor.id,patientId:patient.id,queue:false}).ok).toBe(true);
  until(w,()=>actor.rescue?.phase==='carry'&&(actor.motion?.end??0)>w.tick);
  expect(patient.motion).toEqual(actor.motion);expect(carrierOf(w,id)).toBe(actor);expect(patient.hunger).toBeLessThan(hunger);roundTrip(w);
  const restored=deserializeWorld(serializeWorld(w)),restoredActor=restored.pawns.find(p=>p.id===actor.id)!;
  until(w,()=>!actor.rescue);
  until(restored,()=>!restoredActor.rescue);expect(restored).toEqual(w);
  expect(w.pawns.filter(p=>p.id===id)).toHaveLength(1);expect(patient.need).toMatchObject({kind:'sleep',phase:'sleep',bedId:bed.id,target:bedSlotCell(bed,1)});
  expect({x:patient.x,z:patient.z}).toEqual(bedSlotCell(bed,1));expect(patient.bedSlot).toBe(1);
  expect(neighbor.need?.kind==='sleep'?neighbor.need.target:null).toEqual(neighborTarget?.kind==='sleep'?neighborTarget.target:null);roundTrip(w);
});

test('a carried order cancellation keeps the same person and unfinished edge without randomness',()=>{
  const {world:w,bed}=camp(2),[actor,patient]=w.pawns as [Pawn,Pawn];
  actor.priorities.doctor=1;fallen(w,patient,9,7);own(w,patient,bed.id,1);
  expect(applyRescue(w,{pawnId:actor.id,patientId:patient.id,queue:false}).ok).toBe(true);
  until(w,()=>actor.rescue?.phase==='carry'&&(actor.motion?.end??0)>w.tick);
  const edge=structuredClone(patient.motion),position={x:patient.x,z:patient.z},rng=w.rng,id=patient.id;
  expect(applyCommand(w,{type:'clear-orders',pawnId:actor.id}).ok).toBe(true);
  expect(carrierOf(w,id)).toBeUndefined();expect(patient.motion).toEqual(edge);expect({x:patient.x,z:patient.z}).toEqual(position);
  expect(patient.bedId).toBe(bed.id);expect(patient.bedSlot).toBe(1);expect(w.rng).toBe(rng);expect(w.pawns.filter(p=>p.id===id)).toHaveLength(1);
});

test('an unfinished final edge cannot deposit the carried patient or grant bed physiology',()=>{
  const {world:w,bed}=camp(2),[actor,patient]=w.pawns as [Pawn,Pawn];actor.priorities.doctor=1;fallen(w,patient,9,7);own(w,patient,bed.id,1);
  const proposal=rescueProposal(w,actor,patient,reach(w,actor))!;startRescue(w,actor,proposal,true);
  actor.rescue!.phase='carry';Object.assign(actor,bedSlotCell(bed,1));actor.path=[];
  actor.motion={from:{x:15,z:13},to:{x:15,z:14},start:w.tick,end:w.tick+3,speedFactor:1,terrainDelay:0};actor.moveCooldown=3;syncPatient(w,actor);
  const rest=patient.rest,rng=w.rng;processRescue(w,actor,context(w,actor));updateRest(w,patient);
  expect(actor.rescue?.phase).toBe('carry');expect(patient.need).toBeNull();expect(currentMedicalBed(w,patient)).toBeUndefined();expect(patient.rest).toBeLessThan(rest);expect(w.rng).toBe(rng);
  w.tick+=3;actor.moveCooldown=0;patient.moveCooldown=0;patient.health!.tick=w.tick;
  processRescue(w,actor,context(w,actor));expect(actor.rescue).toBeUndefined();expect(patient.need).toMatchObject({bedId:bed.id,target:bedSlotCell(bed,1)});
});

test('a rescue reserves only head1 and its arriving carrier keeps the captured edge instead of leaving the bed',()=>{
  const {world:w,bed}=camp(2),[actor,patient]=w.pawns as [Pawn,Pawn];actor.priorities.doctor=1;fallen(w,patient,9,7);own(w,patient,bed.id,1);
  startRescue(w,actor,rescueProposal(w,actor,patient,reach(w,actor))!,true);
  const head0=bedSlotCell(bed,0)!,head1=bedSlotCell(bed,1)!,reserved=reservedServiceCells(w,patient.id);
  expect(reserved.has(head1.z*w.width+head1.x)).toBe(true);expect(reserved.has(head0.z*w.width+head0.x)).toBe(false);
  actor.rescue!.phase='carry';Object.assign(actor,head1);actor.path=[];actor.transitExit=true;
  actor.motion={from:{x:15,z:13},to:head1,start:w.tick,end:w.tick+3,speedFactor:1,terrainDelay:0};actor.moveCooldown=3;syncPatient(w,actor);
  const before={x:actor.x,z:actor.z,path:structuredClone(actor.path),motion:structuredClone(actor.motion),cooldown:actor.moveCooldown,patientMotion:structuredClone(patient.motion)},budget={remaining:1,pairs:0};
  expect(leaveTransitCell(w,actor,()=>{throw new Error('No navigation is needed at the reserved rescue head.');},budget)).toBe(false);
  expect({x:actor.x,z:actor.z,path:actor.path,motion:actor.motion,cooldown:actor.moveCooldown,patientMotion:patient.motion}).toEqual(before);
  expect(actor.transitExit).toBeUndefined();expect(budget.remaining).toBe(1);expect(actor.rescue?.phase).toBe('carry');
});

test('an empty double can select allowed head1 before ranking even when head0 is forbidden',()=>{
  const {world:w,bed}=camp(2),[actor,patient]=w.pawns as [Pawn,Pawn];actor.priorities.doctor=1;fallen(w,patient,9,7);
  restrict(w,actor,[patient,bedSlotCell(bed,1)!]);
  const proposal=rescueProposal(w,actor,patient,reach(w,actor));expect(proposal?.bedSlot).toBe(1);startRescue(w,actor,proposal!);
  expect(allowedAreaServicesAllowed(w,actor)).toBe(true);
  w.allowedAreas![0]!.cells=[patient.z*w.width+patient.x];const rng=w.rng;reconcileRescues(w);
  expect(actor.rescue).toBeUndefined();expect(patient.bedSlot).toBe(1);expect(w.rng).toBe(rng);
});

test('head1 nonoperative patient rest keeps normal healing, quality rest and physical comfort',()=>{
  const {world:w,bed}=camp(1),p=w.pawns[0]!;controlledInjury(w,p,'right-arm',3000);p.priorities.bedrest=1;p.rest=40;own(w,p,bed.id,1);
  const proposal=patientProposal(w,p,reach(w,p))!;expect(proposal.bedSlot).toBe(1);startPatientRest(w,p,proposal);
  expect(currentMedicalBed(w,p)).toBeUndefined();Object.assign(p,bedSlotCell(bed,1));p.path=[];p.moveCooldown=0;
  expect(processPatientRest(w,p,context(w,p))).toBe(true);expect(p.state).toBe('resting');expect(currentMedicalBed(w,p)).toBe(bed);
  expect(bedHealPerDay(bed)).toBe(4);expect(bedImmunityFactor(bed,w)).toBe(1.07);expect(bedTendOffset(bed,w)).toBe(0);
  p.medicalSleep=true;const before=p.rest;updateRest(w,p);expect(p.rest-before).toBeCloseTo(BED_REST_PER_TICK);
  p.state='sleeping';p.comfort=0;updateWellbeing(w,p);expect(p.comfort).toBeGreaterThan(0);
});

test('head1 receives real medicine and an assisted meal at its outer bedside',()=>{
  const {world:w,bed}=camp(3),[doctor,patient,neighbor]=w.pawns as [Pawn,Pawn,Pawn];
  doctor.priorities.doctor=1;doctor.skills.medicine={level:8,xp:0,dailyXp:0,passion:0};fallen(w,patient,9,7);controlledInjury(w,patient,'right-arm',3000,'cut');
  patient.medicalCare='herbal';own(w,patient,bed.id,1,true);own(w,neighbor,bed.id,0,true);
  addGroundMaterial(w,'medicine',10,{x:7,z:7},'herbal-medicine');addGroundMaterial(w,'food',5,{x:8,z:7},'simple-meal');refreshStock(w);
  const medicineId=w.piles.find(p=>p.kind==='medicine')!.id,proposal=tendingProposal(w,doctor,patient,reach(w,doctor));
  expect(proposal).toBeDefined();expect(proposal!.task.spot).not.toEqual(bedSlotCell(bed,0));
  expect(applyTending(w,{pawnId:doctor.id,patientId:patient.id,queue:false}).ok).toBe(true);
  until(w,()=>patient.health!.injuries.some(i=>i.tended!==undefined));
  const remainingMedicine=w.piles.filter(p=>p.item==='herbal-medicine').reduce((total,p)=>total+p.quantity,0);
  expect(remainingMedicine).toBeGreaterThan(0);expect(remainingMedicine).toBeLessThan(10);
  expect(w.piles.find(p=>p.id===medicineId)?.owner.type).toBe('ground');
  expect(w.piles.find(p=>p.id===medicineId)?.quantity).toBeGreaterThan(0);
  releaseWork(w,doctor);doctor.priorities.doctor=0;patient.hunger=20;const hunger=patient.hunger;
  doctor.priorities.doctor=1;expect(feedingProposal(w,doctor,patient,reach(w,doctor))).toBeDefined();
  expect(applyFeeding(w,{pawnId:doctor.id,patientId:patient.id,queue:false}).ok).toBe(true);
  until(w,()=>!doctor.feed&&patient.hunger>hunger);expect(patient.bedSlot).toBe(1);expect(currentMedicalBed(w,patient)).toBe(bed);roundTrip(w);
});

test('the second head earns the existing bedroom observation without an extra calendar draw',()=>{
  const {world:w,bed}=camp(1),p=w.pawns[0]!;
  for(let x=12;x<=17;x++){fixtureBuilding(w,'wall',x,12);fixtureBuilding(w,'wall',x,17);}
  for(let z=13;z<17;z++){fixtureBuilding(w,'wall',12,z);fixtureBuilding(w,'wall',17,z);}
  own(w,p,bed.id,1,true);if(p.need?.kind==='sleep')p.need.roomRest={nextAt:w.tick,applied:false};const rng=w.rng;
  expect(captureRoomQuality(w).room(p)?.beds).toBe(1);expect(new WorkEnvironmentCache().read(w).room(p)?.role).toBe('bedroom');advanceRoomRest(w,p);
  expect(p.roomMemories?.some(m=>m.kind==='bedroom')).toBe(true);expect(w.rng).toBe(rng);
});

test.each([false,true])('medical and prison roles refuse the civil double before mutation (%s)',enabled=>{
  const {world:w,bed}=camp(1),p=w.pawns[0]!;own(w,p,bed.id,1,true);const before=structuredClone(w);
  expect(applyMedicalBed(w,{type:'medical-bed',bedId:bed.id,enabled}).ok).toBe(false);
  expect(applyPrisonBed(w,{bedId:bed.id,enabled}).ok).toBe(false);expect(w).toEqual(before);
});

test('a pending implant request survives but chooses a simple bed and cannot operate on either double head',()=>{
  const {world:w,bed}=camp(2),[doctor,patient]=w.pawns as [Pawn,Pawn];
  doctor.priorities.doctor=1;doctor.skills.medicine.level=8;controlledInjury(w,patient,'left-hand',30000);
  own(w,patient,bed.id,1,true);patient.priorities.patient=1;
  patient.surgeryRequest={part:'left-hand',implant:'wooden-hand',requestedAt:w.tick};
  expect(implantSurgeryReason(w,doctor,patient)).toContain('lit simple');expect(surgeryReason(w,doctor,patient)).toContain('lit simple');
  const simple=fixtureBuilding(w,'bed',18,14),rng=w.rng,request=structuredClone(patient.surgeryRequest);
  const proposal=patientProposal(w,patient,reach(w,patient))!;expect(proposal.bedId).toBe(simple.id);expect(proposal).not.toHaveProperty('bedSlot');
  startPatientRest(w,patient,proposal);expect(patient.bedSlot).toBeUndefined();expect(patient.surgeryRequest).toEqual(request);expect(w.rng).toBe(rng);
});

test('merging a prison room leaves the double civil and the ordinary world remains valid',()=>{
  const {world:w,bed}=camp(1),p=w.pawns[0]!;Object.assign(bed,{x:14,z:10});
  for(let x=7;x<=17;x++){fixtureBuilding(w,'wall',x,7);fixtureBuilding(w,'wall',x,17);}
  for(let z=8;z<17;z++){fixtureBuilding(w,'wall',7,z);fixtureBuilding(w,'wall',17,z);fixtureBuilding(w,'wall',11,z);}
  const prison=fixtureBuilding(w,'bed',9,10);Object.assign(prison,{prisoner:true});own(w,p,bed.id,1,true);
  const opening=w.structures.find(s=>s.kind==='wall'&&s.x===11&&s.z===10)!;
  w.structures=w.structures.filter(s=>s!==opening);reconcilePrisoners(w);
  expect(bed).not.toHaveProperty('prisoner');expect(p.bedId).toBe(bed.id);expect(p.bedSlot).toBe(1);expect(prisonBedValid(w,bed)).toBe(false);roundTrip(w);
});

test('a historical simple rescue has no slot metadata and keeps its original target',()=>{
  const {world:w,bed}=camp(2),[actor,patient]=w.pawns as [Pawn,Pawn];w.structures=w.structures.filter(b=>b!==bed);
  actor.priorities.doctor=1;fallen(w,patient,9,7);const simple=fixtureBuilding(w,'bed',14,14);
  const proposal=rescueProposal(w,actor,patient,reach(w,actor))!;expect(proposal).not.toHaveProperty('bedSlot');startRescue(w,actor,proposal);
  expect(actor.rescue).not.toHaveProperty('bedSlot');expect(patient).not.toHaveProperty('bedSlot');until(w,()=>!actor.rescue);
  expect(patient.need).toMatchObject({bedId:simple.id,target:{x:simple.x,z:simple.z}});roundTrip(w);
});
