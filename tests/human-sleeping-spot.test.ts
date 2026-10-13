import { expect,test } from 'vitest';
import { medicalCamp,controlledInjury } from './scenarios/health.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { applyCommand,canDesignate,stepWorld } from '../src/sim/engine.ts';
import { canPlaceHumanSleepingSpot,placeHumanSleepingSpot,removeHumanSleepingSpot } from '../src/sim/human-sleeping-spot.ts';
import { footprintCells } from '../src/sim/definitions.ts';
import { bedSlotCell,bedSlotBodyCenter,bedSlotClaimed } from '../src/sim/bed-slots.ts';
import { processSleeping } from '../src/sim/sleeping.ts';
import { updateRest,BED_REST_PER_TICK,GROUND_REST_PER_TICK } from '../src/sim/rest.ts';
import { updateWellbeing } from '../src/sim/wellbeing.ts';
import { bedComfort,bedRestEffectiveness } from '../src/sim/furniture-stats.ts';
import { currentMedicalBed,bedHealPerDay,bedImmunityFactor,bedSurgeryFactor } from '../src/sim/hospital-medical-stats.ts';
import { rescueBedAvailable,rescueBedPlaces } from '../src/sim/medical-beds.ts';
import { applyRescue } from '../src/sim/rescue.ts';
import { carrierOf } from '../src/sim/rescue-state.ts';
import { prisonBedValid } from '../src/sim/prison-space.ts';
import { blockedCells,reachableCells } from '../src/sim/pathfinding.ts';
import { releaseWork } from '../src/sim/work-release.ts';
import { addMaterial,addGroundMaterial } from '../src/sim/materials.ts';
import { ITEM_DEFINITIONS } from '../src/sim/items.ts';
import { structureMaxHp,structureFlammability } from '../src/sim/thing-damage-rules.ts';
import { updatePawnHealth } from '../src/sim/health.ts';
import { tendingReason } from '../src/sim/tending.ts';
import { feedingProposal } from '../src/sim/feeding.ts';
import { surgeryReason } from '../src/sim/surgery.ts';
import { surgerySuccessChance } from '../src/sim/surgery-rules.ts';
import { processPatientRest } from '../src/sim/patient-rest.ts';
import { validateWorld,serializeWorld,deserializeWorld } from '../src/sim/serialization.ts';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots.ts';
import type { NeedContext } from '../src/sim/needs.ts';
import type { Orientation,Pawn,Structure,World } from '../src/sim/types.ts';

function camp(count=1){const w=medicalCamp(count);for(const p of w.pawns){delete p.background;Object.assign(p,{x:3+p.id%5,z:4,hunger:100,rest:20,need:null,jobId:null,haul:null,cooking:null,path:[],moveCooldown:0,motion:null});p.schedule.fill('sleep');}return w;}
function spot(w:World,x=14,z=14,orientation:Orientation=0){expect(placeHumanSleepingSpot(w,{type:'designate',kind:'sleeping-spot',x,z,orientation}).ok).toBe(true);return w.structures.at(-1)!;}
function context(w:World,p:Pawn):NeedContext{return {search:()=>reachableCells(w,p,blockedCells(w),new Set()),move:()=>{},release:()=>releaseWork(w,p),event:()=>{}};}
function installed(w:World,p:Pawn,b:Structure,medical=false){Object.assign(p,bedSlotCell(b,0),{bedId:medical?null:b.id,path:[],moveCooldown:0,motion:null,state:medical?'downed':'sleeping'});p.need={kind:'sleep',phase:'sleep',bedId:b.id,target:bedSlotCell(b,0)!,...medical?{medical:'patient' as const}:{}};}
function until(w:World,predicate:()=>boolean,max=400){for(let n=0;n<max&&!predicate();n++)stepWorld(w,1);expect(predicate(),`Expected physical transition at ${w.tick}`).toBe(true);}
function roundTrip(w:World){expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);const adoption=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));expect(adoption.status).toBe('applied');if(adoption.status==='applied')expect(adoption.world).toEqual(w);}

test.each([0,1,2,3] as const)('free floor spot rotation %i keeps both actual cells and no construction payload',orientation=>{
  const w=camp(),before={rng:w.rng,id:w.nextId,piles:structuredClone(w.piles),jobs:structuredClone(w.jobs)},b=spot(w,14,14,orientation);
  const direction=[{x:0,z:1},{x:1,z:0},{x:0,z:-1},{x:-1,z:0}][orientation]!;
  expect(footprintCells(b)).toEqual([{x:14,z:14},{x:14+direction.x,z:14+direction.z}]);
  expect(bedSlotCell(b,0)).toEqual({x:14,z:14});expect(bedSlotCell(b,1)).toBeUndefined();expect(bedSlotBodyCenter(b,0)).toEqual({x:14+direction.x*.5,z:14+direction.z*.5});
  expect(Object.keys(b).sort()).toEqual(['footprint','id','kind','orientation','x','z']);
  expect(w.nextId).toBe(before.id+1);expect(w.rng).toBe(before.rng);expect(w.piles).toEqual(before.piles);expect(w.jobs).toEqual(before.jobs);
  expect(structureMaxHp(b)).toBe(0);expect(structureFlammability(b)).toBe(0);
});

test('pose preserves crops, growing zones and the same ground objects on both cells',()=>{
  const w=camp();w.resources.push({id:w.nextId++,kind:'rice',x:14,z:15,amount:18,growth:.5,growthTick:w.tick});
  w.growingZones.push({id:w.nextId++,cells:[14*w.width+14,15*w.width+14],plant:'rice',allowSow:true,allowCut:true});
  addGroundMaterial(w,'wood',3,{x:14,z:14});const before=structuredClone({resources:w.resources,zones:w.growingZones,piles:w.piles});
  expect(applyCommand(w,{type:'designate',kind:'sleeping-spot',x:14,z:14}).ok).toBe(true);
  expect({resources:w.resources,zones:w.growingZones,piles:w.piles}).toEqual(before);expect(w.jobs).toHaveLength(0);
});

test.each(['water','rock','tree','building','plan'] as const)('second-cell %s obstruction refuses atomically',obstacle=>{
  const w=camp();if(obstacle==='water'||obstacle==='rock')w.tiles[15*w.width+14]!.terrain=obstacle;
  else if(obstacle==='tree')w.resources.push({id:w.nextId++,kind:'tree',x:14,z:15,amount:30});
  else if(obstacle==='building')fixtureBuilding(w,'wall',14,15);
  else expect(applyCommand(w,{type:'designate',kind:'wall',x:14,z:15}).ok).toBe(true);
  const before=structuredClone(w);expect(applyCommand(w,{type:'designate',kind:'sleeping-spot',x:14,z:14}).ok).toBe(false);expect(w).toEqual(before);
});

test('malformed and boundary placement, material, and transport are refused before allocation',()=>{
  const w=camp(),before=structuredClone(w);
  for(const c of [{x:14,z:31},{x:NaN,z:14},{x:14,z:14,orientation:4},{x:14,z:14,material:'wood'},{x:14,z:14,targetId:42}])
    expect(canPlaceHumanSleepingSpot(w,{type:'designate',kind:'sleeping-spot',...c} as Parameters<typeof canPlaceHumanSleepingSpot>[1]).ok).toBe(false);
  expect(canDesignate(w,{type:'designate',kind:'sleeping-spot',x:14,z:14},true).ok).toBe(false);expect(w).toEqual(before);
});

test('three assigned people travel to distinct heads, sleep exclusively, and restore actual rest',()=>{
  const w=camp(3),beds=[spot(w,14,14),spot(w,16,14,1),spot(w,18,14,2)];
  for(const [i,p] of w.pawns.entries())expect(applyCommand(w,{type:'assign-bed',bedId:beds[i]!.id,pawnId:p.id}).ok).toBe(true);
  const starts=w.pawns.map(p=>({x:p.x,z:p.z}));until(w,()=>w.pawns.every(p=>p.state==='sleeping'));
  for(const [i,p] of w.pawns.entries()){expect({x:p.x,z:p.z}).toEqual(bedSlotCell(beds[i]!,0));expect({x:p.x,z:p.z}).not.toEqual(starts[i]);expect(p.need).toMatchObject({kind:'sleep',phase:'sleep',bedId:beds[i]!.id});expect(bedSlotClaimed(w,beds[i]!,0,p.id)).toBe(false);}
  const rest=w.pawns.map(p=>p.rest);stepWorld(w,1);for(const [i,p] of w.pawns.entries())expect(p.rest-rest[i]!).toBeCloseTo(GROUND_REST_PER_TICK,12);
});

test('spot sleep matches free ground recovery and preserves historical wood/stone bed arithmetic',()=>{
  for(const [kind,material,gain] of [['sleeping-spot',undefined,GROUND_REST_PER_TICK],['bed','wood',BED_REST_PER_TICK],['bed','granite-blocks',BED_REST_PER_TICK*.9]] as const){
    const w=camp(),p=w.pawns[0]!,b:Structure=kind==='sleeping-spot'?spot(w):fixtureBuilding(w,kind,14,14);if(material)b.material=material;installed(w,p,b);const before=p.rest;
    expect(processSleeping(w,p,context(w,p),false)).toBe(true);expect(p.rest-before).toBeCloseTo(gain,12);
  }
  const w=camp(),p=w.pawns[0]!;p.state='sleeping';p.need={kind:'sleep',phase:'sleep',bedId:null,target:{x:p.x,z:p.z}};const before=p.rest;processSleeping(w,p,context(w,p),false);expect(p.rest-before).toBeCloseTo(GROUND_REST_PER_TICK,12);
});

test('unfinished movement does not grant spot sleep, room observations or comfort',()=>{
  const w=camp(),p=w.pawns[0]!,b=spot(w);installed(w,p,b);p.need!.phase='travel';p.state='moving';p.motion={from:{x:14,z:13},to:{x:14,z:14},start:w.tick,end:w.tick+2,speedFactor:1,terrainDelay:0};p.moveCooldown=2;const rest=p.rest;
  processSleeping(w,p,context(w,p),false);expect(p.rest).toBe(rest);expect(p.need).toMatchObject({phase:'travel'});expect(p.need?.kind==='sleep'?p.need.roomRest:undefined).toBeUndefined();
  p.comfort=0;updateWellbeing(w,p);expect(p.comfort).toBe(0);expect(currentMedicalBed(w,p)).toBeUndefined();
});

test('autonomous medical travel keeps its final edge until real spot rest, export and adoption',()=>{
  const w=camp(),p=w.pawns[0]!,b=spot(w);b.medical=true;p.schedule.fill('work');p.priorities.bedrest=1;controlledInjury(w,p,'left-arm',5000);
  until(w,()=>p.need?.kind==='sleep'&&p.need.medical==='bedrest'&&p.x===b.x&&p.z===b.z&&p.moveCooldown>0);
  expect(p.need).toMatchObject({kind:'sleep',phase:'travel',bedId:b.id});expect(currentMedicalBed(w,p)).toBeUndefined();roundTrip(w);
  const need=structuredClone(p.need),health=structuredClone(p.health),rng=w.rng;
  expect(processPatientRest(w,p,context(w,p))).toBe(true);expect(p.need).toEqual(need);expect(p.health).toEqual(health);expect(w.rng).toBe(rng);
  until(w,()=>p.state==='resting'&&p.need?.kind==='sleep'&&p.need.phase==='sleep');
  expect(p.moveCooldown).toBe(0);expect((p.motion?.end??0)<=w.tick).toBe(true);expect(currentMedicalBed(w,p)).toBe(b);expect(p.need?.kind==='sleep'?p.need.roomRest:undefined).toBeDefined();roundTrip(w);
});

test('actual patient at the spot has ground rest and 40 comfort with no bedside bonuses',()=>{
  const w=camp(),p=w.pawns[0]!,b=spot(w);b.medical=true;installed(w,p,b,true);p.medicalSleep=true;p.comfort=39.9;fixtureBuilding(w,'end-table',13,14);fixtureBuilding(w,'dresser',15,12);
  expect(currentMedicalBed(w,p)).toBe(b);const before=p.rest;updateRest(w,p);expect(p.rest-before).toBeCloseTo(GROUND_REST_PER_TICK,12);updateWellbeing(w,p);expect(p.comfort).toBe(40);
  expect(bedComfort({...b,quality:'legendary'},{dresser:true,endTable:true})).toBe(.4);expect(bedRestEffectiveness({...b,quality:'legendary'})).toBe(.8);
  expect(bedHealPerDay(b)).toBe(0);expect(bedImmunityFactor(b,w)).toBe(1);expect(bedSurgeryFactor(b,w)).toBe(.7);
  p.x++;expect(currentMedicalBed(w,p)).toBeUndefined();
});

test('a genuine rescue carries the same injured person into the single medical head',()=>{
  const w=camp(2),[doctor,patient]=w.pawns as [Pawn,Pawn],b=spot(w);doctor.schedule.fill('work');doctor.priorities.doctor=1;b.medical=true;
  Object.assign(patient,{x:9,z:8});controlledInjury(w,patient,'left-leg',30000);controlledInjury(w,patient,'right-leg',30000);
  expect(rescueBedPlaces(w,b,patient,doctor.id)).toEqual([{cell:{x:14,z:14}}]);expect(applyRescue(w,{pawnId:doctor.id,patientId:patient.id,queue:false}).ok).toBe(true);
  until(w,()=>doctor.rescue?.phase==='carry');expect(carrierOf(w,patient.id)).toBe(doctor);until(w,()=>!doctor.rescue);
  expect({x:patient.x,z:patient.z}).toEqual({x:14,z:14});expect(patient.need).toMatchObject({kind:'sleep',phase:'sleep',bedId:b.id});expect(currentMedicalBed(w,patient)).toBe(b);expect(w.pawns.filter(p=>p.id===patient.id)).toHaveLength(1);
});

test('real clinical evolution heals at ground rate without the material bed bonus',()=>{
  const losses:number[]=[];
  for(const kind of ['sleeping-spot','bed'] as const){
    const w=camp(),p=w.pawns[0]!,b=kind==='sleeping-spot'?spot(w):fixtureBuilding(w,'bed',14,14);controlledInjury(w,p,'left-arm',10000);installed(w,p,b,true);
    const injury=p.health!.injuries[0]!,before=injury.severity;w.tick+=60;updatePawnHealth(w,p);losses.push(before-injury.severity);
  }
  expect(losses).toEqual([120,160]);
});

test('installed spot admits bedside care, physical feeding and surgery using the actual 0.7 factor',()=>{
  const w=camp(2),[doctor,patient]=w.pawns as [Pawn,Pawn],b=spot(w);doctor.priorities.doctor=1;doctor.skills.medicine.level=5;doctor.schedule.fill('work');b.medical=true;
  controlledInjury(w,patient,'left-arm',10000);installed(w,patient,b,true);patient.hunger=10;delete patient.age;
  expect(tendingReason(w,doctor,patient)).toBeUndefined();addGroundMaterial(w,'food',1,{x:10,z:10},'survival-meal');
  expect(feedingProposal(w,doctor,patient,reachableCells(w,doctor,blockedCells(w),new Set()))?.task.spot).toBeDefined();
  patient.health!.infections={nextId:2,immunity:0,cases:[{id:1,part:'left-arm',bornAt:w.tick,severity:100000000,luck:1000000}]};
  patient.surgeryRequest={part:'left-arm',requestedAt:w.tick};expect(surgeryReason(w,doctor,patient)).toBeUndefined();
  const input={doctor,medicine:'medicine' as const,patientGlow:1,roomCleanliness:0,outdoors:false};
  const ground=surgerySuccessChance({...input,bedSurgeryFactor:bedSurgeryFactor(b,w)}),material=surgerySuccessChance({...input,bedSurgeryFactor:bedSurgeryFactor({kind:'bed'},w)});
  expect(ground/material).toBeCloseTo(.7,12);
});

test('a forbidden or unreachable assigned spot cannot grant ownership service remotely',()=>{
  for(const blocked of ['area','walls'] as const){
    const w=camp(),p=w.pawns[0]!,b=spot(w);p.bedId=b.id;
    if(blocked==='area'){const id=w.nextId++;w.allowedAreas=[{id,label:'Sol autorisé',color:0,cells:[p.z*w.width+p.x]}];p.allowedAreaId=id;}
    else for(const c of [{x:14,z:13},{x:13,z:14},{x:15,z:14},{x:14,z:16},{x:13,z:15},{x:15,z:15}])fixtureBuilding(w,'wall',c.x,c.z);
    processSleeping(w,p,context(w,p),true);expect(p.need).toMatchObject({kind:'sleep',bedId:null});expect(currentMedicalBed(w,p)).toBeUndefined();expect({x:p.x,z:p.z}).not.toEqual(bedSlotCell(b,0));
  }
});

test('prison role requires an enclosed room, can also be medical, and clears civil assignments',()=>{
  const w=camp(),p=w.pawns[0]!,b=spot(w);expect(applyCommand(w,{type:'prison-bed',bedId:b.id,enabled:true}).ok).toBe(false);
  for(let x=12;x<=17;x++){fixtureBuilding(w,'wall',x,12);fixtureBuilding(w,'wall',x,17);}for(let z=13;z<17;z++){fixtureBuilding(w,'wall',12,z);fixtureBuilding(w,'wall',17,z);}
  expect(applyCommand(w,{type:'assign-bed',bedId:b.id,pawnId:p.id}).ok).toBe(true);
  expect(applyCommand(w,{type:'prison-bed',bedId:b.id,enabled:true}).ok).toBe(true);expect(p.bedId).toBeNull();expect(prisonBedValid(w,b)).toBe(true);
  expect(applyCommand(w,{type:'medical-bed',bedId:b.id,enabled:true}).ok).toBe(true);expect(b).toMatchObject({medical:true,prisoner:true});expect(rescueBedAvailable(w,b,p,p.id)).toBe(false);expect(rescueBedAvailable(w,b,p,p.id,true)).toBe(true);
});

test('instant removal from the foot releases the sleeper, preserving identity and ground possessions',()=>{
  const w=camp(),p=w.pawns[0]!,b=spot(w);installed(w,p,b);addGroundMaterial(w,'wood',3,{x:14,z:15});const piles=structuredClone(w.piles),rng=w.rng,id=w.nextId;
  expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:14,z:15,targetId:b.id}).ok).toBe(true);
  expect(w.structures).toHaveLength(0);expect(w.jobs).toHaveLength(0);expect(p.need).toBeNull();expect(p.bedId).toBeNull();expect(p.state).toBe('idle');expect(w.piles).toEqual(piles);expect(w.nextId).toBe(id);expect(w.rng).toBe(rng);
});

test('cargo preflight prevents partial rectangle removal then transfers the exact held pile after space is freed',()=>{
  const w=camp(2),[a,b]=w.pawns as [Pawn,Pawn],first=spot(w,14,14),second=spot(w,16,14);installed(w,a,first);installed(w,b,second);
  addMaterial(w,'wood',1,{type:'pawn',pawnId:a.id});const held=w.piles.find(p=>p.owner.type==='pawn')!;
  const cells=[...footprintCells(first),...footprintCells(second)];for(const c of cells)addGroundMaterial(w,'silver',ITEM_DEFINITIONS.silver.stackLimit,c);
  w.tiles=w.tiles.map((tile,i)=>cells.some(c=>c.z*w.width+c.x===i)?tile:{terrain:'water'});const command={type:'area',action:'deconstruct',from:{x:14,z:14},to:{x:16,z:15}} as const,before=structuredClone(w);
  expect(applyCommand(w,command).ok).toBe(false);expect(w).toEqual(before);
  w.piles=w.piles.filter(p=>!(p.owner.type==='ground'&&p.owner.x===14&&p.owner.z===15));const rng=w.rng,id=w.nextId;
  expect(applyCommand(w,command).ok).toBe(true);expect(w.structures).toHaveLength(0);expect(w.jobs).toHaveLength(0);expect(held).toMatchObject({id:held.id,quantity:1,owner:{type:'ground'}});expect(a.need).toBeNull();expect(b.need).toBeNull();expect(w.rng).toBe(rng);expect(w.nextId).toBe(id);
});

test('retiring a civil assignment does not interrupt unrelated work and needs no new identity',()=>{
  const w=camp(),p=w.pawns[0]!,b=spot(w);p.bedId=b.id;p.state='moving';p.path=[{x:4,z:4}];w.nextId=Number.MAX_SAFE_INTEGER;const path=structuredClone(p.path);
  expect(removeHumanSleepingSpot(w,b).ok).toBe(true);expect(p.bedId).toBeNull();expect(p.path).toEqual(path);expect(p.state).toBe('moving');expect(w.nextId).toBe(Number.MAX_SAFE_INTEGER);
});

test('actual owner death releases only the floor assignment and retains the original corpse and spot through save/adoption',()=>{
  const w=camp(),p=w.pawns[0]!,b=spot(w);installed(w,p,b);const id=p.id,spotId=b.id;
  controlledInjury(w,p,'head',50000);expect(p.state).toBe('dead');expect(p.health?.death).toBeDefined();expect(p.bedId).toBeNull();expect(p.need).toBeNull();
  stepWorld(w,1);expect(w.structures.find(s=>s.id===spotId)).toBe(b);expect(w.pawns.filter(q=>q.id===id)).toEqual([p]);
  const body=w.piles.find(i=>i.humanCorpse?.pawnId===id);expect(body).toBeDefined();expect(p.body?.pileId).toBe(body!.id);expect(body!.owner).toEqual({type:'ground',x:b.x,z:b.z});roundTrip(w);
});
