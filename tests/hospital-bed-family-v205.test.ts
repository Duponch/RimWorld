import { expect,test } from 'vitest';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index.ts';
import { isBedKind } from '../src/sim/bed-kinds.ts';
import { FURNITURE_DEFINITIONS,bedComfort,bedRestEffectiveness,comfortForStructure,materialAllowed } from '../src/sim/furniture-stats.ts';
import { medicalBedPreference,rescueBedAvailable } from '../src/sim/medical-beds.ts';
import { patientProposal,startPatientRest } from '../src/sim/patient-rest.ts';
import { rescueProposal } from '../src/sim/rescue.ts';
import { blockedCells,reachableCells } from '../src/sim/pathfinding.ts';
import { footprintCells } from '../src/sim/definitions.ts';
import { canStandAt,FURNITURE_TRAVEL } from '../src/sim/furniture-travel.ts';
import { validateFurniture } from '../src/sim/furniture-transfer-save.ts';
import { furnitureReady } from '../src/sim/furniture-rules.ts';
import { releaseWork } from '../src/sim/work-release.ts';
import { BED_REST_PER_TICK,updateRest } from '../src/sim/rest.ts';
import { updateWellbeing } from '../src/sim/wellbeing.ts';
import { structureRoomMarketValue,structureRoomStandable } from '../src/sim/room-market-value.ts';
import { captureRoomQuality } from '../src/sim/room-quality.ts';
import { COMPLEX_FURNITURE_RESEARCH_COST,MICROELECTRONICS_RESEARCH_COST,HOSPITAL_BED_RESEARCH_COST } from '../src/sim/research.ts';
import { deconstructionCamp,fixtureBuilding } from './scenarios/deconstruction.ts';
import { medicalCamp,controlledInjury } from './scenarios/health.ts';
import { rescueCamp } from './scenarios/rescue.ts';
import { prisonerUiFixture } from './scenarios/prison-camp.ts';
import type { Structure,World } from '../src/sim/types.ts';

/** Prepared prerequisites support these family tests; research progression is
 * exercised separately by the construction/research tests. */
function hospitalResearch(w:World):void {
  w.research={...w.research??{points:0},project:null,
    complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:w.tick},
    microelectronics:{points:MICROELECTRONICS_RESEARCH_COST,completedAt:w.tick},
    hospitalBed:{points:HOSPITAL_BED_RESEARCH_COST,completedAt:w.tick}};
}
function hospital(w:World,x:number,z:number,medical=true):Structure {
  hospitalResearch(w);
  const bed:Structure={id:w.nextId++,kind:'hospital-bed',material:'steel',quality:'normal',orientation:0,footprint:'standard',x,z,...(medical?{medical:true as const}:{})};
  w.structures.push(bed);return bed;
}
const reach=(w:World,p:World['pawns'][number])=>reachableCells(w,p,blockedCells(w),new Set());
function until(w:World,done:()=>boolean,limit=700):void {
  for(let i=0;i<limit&&!done();i++)stepWorld(w);
  expect(done(),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns.map(p=>({id:p.id,state:p.state,need:p.need,rescue:p.rescue})),packed:w.packed})).toBe(true);
  expect(validateWorld(w)).toEqual([]);
}

test('hospital furniture has its own bases, shared facilities, quality and physical footprint',()=>{
  const w=deconstructionCamp(),bed=hospital(w,10,10);bed.quality='excellent';
  expect(isBedKind('hospital-bed')).toBe(true);expect(isBedKind('table')).toBe(false);
  expect(FURNITURE_DEFINITIONS['hospital-bed']).toMatchObject({width:1,depth:2,stuff:40,coreWork:2800,constructionSkill:8,maxHitPoints:150,beauty:2,comfort:.8,restEffectiveness:1,quality:true});
  expect(materialAllowed('hospital-bed','steel')).toBe(true);expect(materialAllowed('hospital-bed','wood')).toBe(false);expect(materialAllowed('hospital-bed','granite-blocks')).toBe(false);
  expect(footprintCells(bed)).toEqual([{x:10,z:10},{x:10,z:11}]);
  expect(FURNITURE_TRAVEL['hospital-bed']).toEqual(FURNITURE_TRAVEL.bed);
  expect(canStandAt(w,{x:10,z:11})).toBe(false);expect(structureRoomStandable(bed.kind)).toBe(false);
  fixtureBuilding(w,'end-table',11,10);fixtureBuilding(w,'dresser',14,10);
  expect(bedComfort(bed,{endTable:true,dresser:true})).toBeCloseTo(.9*1.24);
  expect(comfortForStructure({structures:w.structures,lineOfSight:()=>true},bed)).toBeCloseTo(.9*1.24);
  expect(comfortForStructure({structures:w.structures,lineOfSight:()=>false},bed)).toBeCloseTo(.8*1.24);
  expect(bedRestEffectiveness(bed)).toBeCloseTo(1.14);
  expect(structureRoomMarketValue({...bed,quality:'normal'})).toBe(400);
  expect(structureRoomMarketValue(bed)).toBe(595);
});

test('medical selection prefers an accessible hospital bed, preserves reservations and falls back physically',()=>{
  const w=rescueCamp(2),[actor,patient,otherActor]=w.pawns,ordinary=w.structures[0]!;
  const bed=hospital(w,20,20);
  expect(medicalBedPreference(bed)).toBeLessThan(medicalBedPreference(ordinary));
  expect(rescueProposal(w,actor!,patient!,reach(w,actor!))?.bedId).toBe(bed.id);
  // A complete enclosing wall makes the preferred bed inaccessible; a label
  // or proximity does not let the carrier jump into it.
  for(let z=19;z<=22;z++)for(let x=19;x<=21;x++)if(z===19||z===22||x===19||x===21)fixtureBuilding(w,'wall',x,z);
  expect(rescueProposal(w,actor!,patient!,reach(w,actor!))?.bedId).toBe(ordinary.id);
  w.structures=w.structures.filter(s=>s.kind!=='wall');
  expect(applyCommand(w,{type:'order-rescue',pawnId:actor!.id,patientId:patient!.id,queue:false}).ok).toBe(true);
  expect(actor!.rescue?.bedId).toBe(bed.id);
  // Designation may wait; actual dismantling cannot steal a reserved bed.
  expect(applyCommand(w,{type:'designate',kind:'uninstall',x:bed.x,z:bed.z}).ok).toBe(true);
  const removal=w.jobs.find(j=>j.kind==='uninstall')!;
  expect(furnitureReady(w,removal,otherActor!)).toBe(false);
  expect(removal.progress).toBe(0);expect(w.structures).toContain(bed);
  expect(applyCommand(w,{type:'cancel',x:bed.x,z:bed.z}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-rescue',pawnId:otherActor!.id,patientId:patient!.id,queue:false}).ok).toBe(false);
  until(w,()=>!actor!.rescue&&patient!.need?.kind==='sleep'&&patient!.need.bedId===bed.id);
  expect(patient!.x).toBe(bed.x);expect(patient!.z).toBe(bed.z);
  expect(patient!.bedId).toBeNull();expect(rescueBedAvailable(w,bed,actor!,actor!.id)).toBe(false);
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,20);stepWorld(copy,20);expect(copy).toEqual(w);
});

test('a patient keeps the valid occupied bed when a hospital destination becomes available',()=>{
  const w=medicalCamp(),patient=w.pawns[0]!;patient.priorities.patient=1;patient.priorities.bedrest=1;
  controlledInjury(w,patient,'torso',3000);
  const ordinary:Structure=fixtureBuilding(w,'bed',14,16);ordinary.medical=true;
  const proposal=patientProposal(w,patient,reach(w,patient))!;expect(proposal.bedId).toBe(ordinary.id);
  startPatientRest(w,patient,proposal);until(w,()=>patient.state==='resting');
  const bed=hospital(w,18,16);
  expect(patientProposal(w,patient,reach(w,patient))?.bedId).toBe(ordinary.id);
  stepWorld(w,70);expect(patient.need?.kind==='sleep'?patient.need.bedId:null).toBe(ordinary.id);
  expect(patient.x).toBe(ordinary.x);expect(patient.z).toBe(ordinary.z);
  expect(rescueBedAvailable(w,bed,patient,patient.id)).toBe(true);
});

test('hospital rest and comfort require an actual immobile bed service',()=>{
  const w=medicalCamp(),p=w.pawns[0]!,bed=hospital(w,12,12);bed.quality='excellent';
  Object.assign(p,{x:bed.x,z:bed.z,state:'resting',rest:50,comfort:79,medicalSleep:true,need:{kind:'sleep',phase:'sleep',medical:'bedrest',bedId:bed.id,target:{x:bed.x,z:bed.z}}});
  updateRest(w,p);expect(p.rest).toBeCloseTo(50+BED_REST_PER_TICK*1.14);
  updateWellbeing(w,p);expect(p.comfort).toBeGreaterThan(79);
  if(p.need?.kind==='sleep')p.need.phase='travel';p.rest=50;p.comfort=79;
  updateRest(w,p);expect(p.rest).toBeLessThan(50+BED_REST_PER_TICK);updateWellbeing(w,p);expect(p.comfort).toBeLessThan(79);
  if(p.need?.kind==='sleep')p.need.phase='sleep';bed.quality='legendary';p.comfort=99.99;updateWellbeing(w,p);expect(p.comfort).toBe(100);
});

test('hospital roles, quality, damage and identity survive actual unpacking, interruption and reinstall',()=>{
  const w=deconstructionCamp(),p=w.pawns[0]!,bed=hospital(w,14,16);bed.quality='excellent';bed.damage=20;
  expect(applyCommand(w,{type:'assign-bed',bedId:bed.id,pawnId:p.id}).ok).toBe(false);
  expect(applyCommand(w,{type:'medical-bed',bedId:bed.id,enabled:false}).ok).toBe(true);
  expect(applyCommand(w,{type:'assign-bed',bedId:bed.id,pawnId:p.id}).ok).toBe(true);
  expect(applyCommand(w,{type:'medical-bed',bedId:bed.id,enabled:true}).ok).toBe(true);expect(p.bedId).toBeNull();
  expect(applyCommand(w,{type:'medical-bed',bedId:bed.id,enabled:false}).ok).toBe(true);
  expect(applyCommand(w,{type:'assign-bed',bedId:bed.id,pawnId:p.id}).ok).toBe(true);
  const originalRng=w.rng;
  expect(applyCommand(w,{type:'designate',kind:'uninstall',x:bed.x,z:bed.z}).ok).toBe(true);
  until(w,()=>w.packed.length===1);expect(w.packed[0]!.building).toBe(bed);expect(p.bedId).toBe(bed.id);
  expect(validateFurniture(w,186,new Set(),true)).toContain('Invalid packed building.');
  const invalid=structuredClone(w);invalid.packed[0]!.building.footprint='legacy-single';expect(validateWorld(invalid).length).toBeGreaterThan(0);
  expect(applyCommand(w,{type:'install',structureId:bed.id,x:23,z:20,orientation:3}).ok).toBe(true);
  until(w,()=>w.packed[0]?.owner.type==='pawn');expect(releaseWork(w,p)).toBe(true);expect(w.packed[0]!.owner.type).toBe('ground');
  until(w,()=>w.packed[0]?.owner.type==='pawn');const copy=deserializeWorld(serializeWorld(w));
  until(w,()=>!w.jobs.length);stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);
  expect(w.structures).toContain(bed);expect(bed).toMatchObject({x:23,z:20,orientation:3,material:'steel',quality:'excellent',damage:20});
  expect(bed.medical).toBeUndefined();expect(p.bedId).toBe(bed.id);expect(w.rng).toBe(originalRng);
});

test('hospital prison role shares the room and capture deposits the same patient into a real bed',()=>{
  const {world:w,actorId,patientId,bedId}=prisonerUiFixture(),actor=w.pawns.find(p=>p.id===actorId)!,patient=w.pawns.find(p=>p.id===patientId)!;
  hospitalResearch(w);
  const bed=w.structures.find(b=>b.id===bedId)!;bed.kind='hospital-bed';bed.material='steel';bed.medical=true;
  const ordinary:Structure=fixtureBuilding(w,'bed',11,10);
  expect(applyCommand(w,{type:'prison-bed',bedId:bed.id,enabled:true}).ok).toBe(true);
  expect(ordinary.prisoner).toBe(true);expect(bed.medical).toBe(true);
  expect(captureRoomQuality(w).room(bed)?.beds).toBe(2);
  expect(rescueBedAvailable(w,bed,actor,actor.id)).toBe(false);
  expect(applyCommand(w,{type:'order-capture',pawnId:actor.id,patientId:patient.id,queue:false}).ok).toBe(true);
  expect(actor.rescue?.bedId).toBe(bed.id);
  until(w,()=>!!patient.prisoner&&!actor.rescue);
  expect(w.pawns.find(p=>p.id===patient.id)).toBe(patient);expect(patient.x).toBe(bed.x);expect(patient.z).toBe(bed.z);expect(patient.bedId).toBeNull();
  expect(bed.medical).toBe(true);expect(bed.prisoner).toBe(true);
});
