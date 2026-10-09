import { expect,test } from 'vitest';
import { activeVitalsMonitor,linkedVitalsMonitor } from '../src/sim/vitals-monitor.ts';
import { bedHealPerDay,bedImmunityFactor,bedSurgeryFactor,bedTendOffset,currentMedicalBed } from '../src/sim/hospital-medical-stats.ts';
import { updatePawnHealth,healthRandom } from '../src/sim/health.ts';
import { acquireFlu } from '../src/sim/flu-state.ts';
import { acquireImmuneDisease } from '../src/sim/immune-diseases-state.ts';
import { advanceMedical } from '../src/sim/injury-evolution.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { processTending } from '../src/sim/tending.ts';
import { processSurgery } from '../src/sim/surgery.ts';
import { surgerySuccessChance,SURGERY_WORK } from '../src/sim/surgery-rules.ts';
import { administerAnesthetic } from '../src/sim/anesthetic.ts';
import { WOODEN_PARTS } from '../src/sim/artificial-parts.ts';
import { RESEARCH_SCALE } from '../src/sim/research.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { newBuildingFuel } from '../src/sim/fuel.ts';
import { reconcilePower } from '../src/sim/power.ts';
import { newDoorState } from '../src/sim/door-rules.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { medicalCamp,controlledInjury } from './scenarios/health.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { medicineCamp } from './scenarios/medicine.ts';
import { surgeryCamp } from './helpers/surgery-v192.ts';
import { woodenSurgeryCamp } from './helpers/wooden-surgery-v275.ts';
import type { NeedContext } from '../src/sim/needs.ts';
import type { Pawn,Structure,World } from '../src/sim/types.ts';

const context=(events:string[]=[]):NeedContext=>({search:()=>null,move:()=>{throw Error('Unexpected movement at the clinical boundary');},release:()=>true,event:message=>events.push(message)});
const pawn=(world:World,id:number):Pawn=>world.pawns.find(p=>p.id===id)!;
function preparedResearch(world:World):void {
  const progress=(cost:number)=>({points:cost*RESEARCH_SCALE,completedAt:world.tick});
  world.research={points:0,project:null,smithing:progress(700),machining:progress(1000),complexFurniture:progress(300),
    microelectronics:progress(3000),multiAnalyzer:progress(4000),hospitalBed:progress(1200),sterileMaterials:progress(600),vitalsMonitor:progress(2500)};
}
function addMonitor(world:World,x:number,z:number,on=true):Structure {
  const monitor:Structure=fixtureBuilding(world,'vitals-monitor',x,z);
  monitor.material='steel';monitor.power={...newPowerState(monitor.kind),on};
  return monitor;
}
function suppliedMonitor(world:World,bed:Structure):Structure {
  const monitor=addMonitor(world,bed.x-1,bed.z+1);
  const generator:Structure=fixtureBuilding(world,'wood-generator',bed.x+2,bed.z+2);
  generator.material='steel';generator.power=newPowerState(generator.kind);generator.fuel={...newBuildingFuel(generator.kind),ticks:45000};
  monitor.power!.parentId=generator.id;reconcilePower(world);monitor.power!.on=true;
  return monitor;
}
function lyingCamp() {
  const world=medicalCamp(2),patient=world.pawns[0]!,doctor=world.pawns[1]!;
  preparedResearch(world);
  const bed:Structure=fixtureBuilding(world,'hospital-bed',10,10);bed.material='steel';bed.medical=true;
  Object.assign(patient,{x:10,z:10,state:'resting',moveCooldown:0});
  patient.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:10,z:10},medical:'bedrest'};
  controlledInjury(world,patient,'left-arm',5000,'bruise');
  const monitor=addMonitor(world,9,11);
  return {world,patient,doctor,bed,monitor};
}
function valid(world:World):void {expect(validateWorld(world),`tick ${world.tick}`).toEqual([]);}
function until(world:World,done:()=>boolean,limit=1000):void {
  for(let tick=0;tick<limit&&!done();tick++)stepWorld(world);
  expect(done(),`transition not reached at tick ${world.tick}`).toBe(true);valid(world);
}

test('monitor links reach all eight neighbours of the rotated hospital footprint, including its foot',()=>{
  for(const orientation of [0,1,2,3] as const){
    const {world,bed,monitor}=lyingCamp();bed.orientation=orientation;
    const direction=([{x:0,z:1},{x:1,z:0},{x:0,z:-1},{x:-1,z:0}] as const)[orientation];
    // Beyond the foot: adjacent to the foot, two cells from the bed anchor.
    monitor.x=bed.x+2*direction.x+(direction.x===0?1:0);
    monitor.z=bed.z+2*direction.z+(direction.z===0?1:0);
    expect(linkedVitalsMonitor(world,bed)).toBe(monitor);
    expect(activeVitalsMonitor(world,bed)).toBe(monitor);
    monitor.x+=2*direction.x;monitor.z+=2*direction.z;
    expect(linkedVitalsMonitor(world,bed)).toBeUndefined();
  }
  const {world,bed}=lyingCamp();bed.kind='bed';expect(linkedVitalsMonitor(world,bed)).toBeUndefined();
});

test('sight blockers invalidate diagonal links and an opened door restores sight without persisted links',()=>{
  const {world,bed,monitor}=lyingCamp();monitor.x=9;monitor.z=12;
  const door:Structure=fixtureBuilding(world,'door',10,12);door.door=newDoorState(world.tick);
  fixtureBuilding(world,'wall',9,11);
  expect(linkedVitalsMonitor(world,bed)).toBeUndefined();
  door.door.open=true;expect(linkedVitalsMonitor(world,bed)).toBe(monitor);
  door.door.open=false;expect(linkedVitalsMonitor(world,bed)).toBeUndefined();
  world.structures=world.structures.filter(s=>s!==door);expect(linkedVitalsMonitor(world,bed)).toBe(monitor);
});

test('selection precedes power, ties use coordinates, and one monitor serves multiple beds without stacking',()=>{
  const {world,bed,monitor}=lyingCamp();monitor.x=9;monitor.z=10;monitor.power!.on=false;
  const other=addMonitor(world,11,10);
  expect(linkedVitalsMonitor(world,bed)).toBe(monitor);expect(activeVitalsMonitor(world,bed)).toBeUndefined();
  expect(bedTendOffset(bed,world)).toBe(.1);
  world.structures=world.structures.filter(s=>s!==monitor);
  const second:Structure=fixtureBuilding(world,'hospital-bed',12,10);second.material='steel';
  expect(activeVitalsMonitor(world,bed)).toBe(other);expect(activeVitalsMonitor(world,second)).toBe(other);
  addMonitor(world,11,11);const before=structuredClone(world);
  for(const hospital of [bed,second]){
    expect(bedTendOffset(hospital,world)).toBe(.17);expect(bedImmunityFactor(hospital,world)).toBe(1.13);
    expect(bedSurgeryFactor(hospital,world)).toBe(1.15);expect(bedHealPerDay(hospital)).toBe(10);
  }
  expect(world).toEqual(before); // Consultation consumes no RNG, identity or link state.
});

test('contextual statistics revert at switch-off, outage and removal; old pure callers preserve their values',()=>{
  const {world,bed,monitor}=lyingCamp();
  expect([bedTendOffset(bed),bedImmunityFactor(bed),bedSurgeryFactor(bed)]).toEqual([.1,1.11,1.1]);
  expect([bedTendOffset({kind:'bed'},world),bedImmunityFactor({kind:'bed'},world),bedSurgeryFactor({kind:'bed'},world)]).toEqual([0,1.07,1]);
  monitor.power!.switchOn=false;expect(bedImmunityFactor(bed,world)).toBe(1.11);
  monitor.power!.switchOn=true;monitor.power!.on=false;expect(bedSurgeryFactor(bed,world)).toBe(1.1);
  monitor.power!.on=true;expect(bedSurgeryFactor(bed,world)).toBe(1.15);
  world.schemaVersion=210 as World['schemaVersion'];expect(activeVitalsMonitor(world,bed)).toBeUndefined();
  world.schemaVersion=211 as World['schemaVersion'];world.structures=[];expect(bedTendOffset(bed,world)).toBe(.1);
});

test('the real bed adapter accelerates all four immunity tracks while natural wound healing and RNG stay unchanged',()=>{
  for(const condition of ['infection','flu','malaria','plague'] as const){
    const {world,patient,monitor}=lyingCamp(),record=patient.health!;
    if(condition==='infection')record.infections={nextId:2,immunity:0,cases:[{id:1,part:'right-arm',bornAt:world.tick,severity:100000000,luck:1000000}]};
    else if(condition==='flu')expect(acquireFlu(record,1000000)).toBe(true);
    else expect(acquireImmuneDisease(record,condition,1000000)).toBe(true);
    const off=structuredClone(world),offPatient=pawn(off,patient.id);off.structures.find(s=>s.id===monitor.id)!.power!.on=false;
    const immunity=(p:Pawn)=>condition==='infection'?p.health!.infections!.immunity:condition==='flu'?p.health!.flu!.immunity:p.health!.immuneDiseases![condition]!.immunity;
    world.tick+=60;off.tick+=60;updatePawnHealth(world,patient);updatePawnHealth(off,offPatient);
    expect(immunity(patient),condition).toBeGreaterThan(immunity(offPatient));
    expect(patient.health!.injuries).toEqual(offPatient.health!.injuries);expect(world.rng).toBe(off.rng);
  }
  // The new exact value is admitted; arbitrary multipliers remain rejected.
  const record=createMedicalRecord();expect(()=>advanceMedical(record,1,{phase:0,posture:'bed',starving:false,bedImmunityFactor:1.13},()=>0)).not.toThrow();
});

test('travel and carried patients receive no remote immunity bonus from the reserved hospital bed',()=>{
  for(const mode of ['travel','carried'] as const){
    const {world,patient,doctor,monitor}=lyingCamp();expect(acquireFlu(patient.health!,1000000)).toBe(true);
    if(mode==='travel'){patient.state='moving';patient.need!.phase='travel';}
    else doctor.rescue={patientId:patient.id,bedId:currentMedicalBed(world,patient)!.id,phase:'carry'};
    const off=structuredClone(world);off.structures.find(s=>s.id===monitor.id)!.power!.on=false;
    expect(currentMedicalBed(world,patient)).toBeUndefined();world.tick+=60;off.tick+=60;
    updatePawnHealth(world,patient);updatePawnHealth(off,pawn(off,patient.id));
    expect(patient.health).toEqual(pawn(off,patient.id).health);expect(world.rng).toBe(off.rng);
  }
});

test('tending consults current power at completion and adds seventy quality points with the same draw',()=>{
  const {world,patient,doctor,monitor}=lyingCamp();doctor.x=9;doctor.z=10;doctor.priorities.doctor=1;
  doctor.skills.medicine={level:4,xp:0,dailyXp:0,passion:0};
  doctor.tend={patientId:patient.id,spot:{x:9,z:10},phase:'tend',progress:590,duration:600};
  const off=structuredClone(world);off.structures.find(s=>s.id===monitor.id)!.power!.on=false;
  processTending(world,doctor,context(),()=>1);processTending(off,pawn(off,doctor.id),context(),()=>1);
  expect(patient.health!.injuries[0]!.tended).toBe(pawn(off,patient.id).health!.injuries[0]!.tended!+70);
  expect(world.rng).toBe(off.rng);expect(doctor.skills.medicine.xp).toBe(pawn(off,doctor.id).skills.medicine.xp);
});

test('physical dose collection, clinical work and a powered monitor resume exactly through save/load',()=>{
  const world=medicineCamp(1,32,'herbal-medicine'),doctor=world.pawns[0]!,patient=world.pawns[1]!,bed=world.structures[0]!;
  preparedResearch(world);bed.kind='hospital-bed';bed.material='steel';doctor.skills.medicine.level=3;
  const monitor=suppliedMonitor(world,bed);
  until(world,()=>doctor.tend?.phase==='tend');expect(currentMedicalBed(world,patient)).toBe(bed);expect(activeVitalsMonitor(world,bed)).toBe(monitor);
  const resumed=deserializeWorld(serializeWorld(world)),off=deserializeWorld(serializeWorld(world));
  const offMonitor=off.structures.find(s=>s.id===monitor.id)!;offMonitor.power!.on=false;offMonitor.power!.switchOn=false;
  for(let tick=0;tick<180&&doctor.skills.medicine.xp===0;tick++){stepWorld(world);stepWorld(resumed);stepWorld(off);}
  expect(doctor.skills.medicine.xp).toBeGreaterThan(0);expect(world).toEqual(resumed);valid(world);valid(resumed);valid(off);
  expect(world.piles.filter(p=>p.kind==='medicine').reduce((sum,p)=>sum+p.quantity,0)).toBe(3);
  for(const injury of patient.health!.injuries){
    const untreatedMonitor=pawn(off,patient.id).health!.injuries.find(i=>i.id===injury.id)!;
    expect(injury.tended).toBe(Math.min(700,untreatedMonitor.tended!+70));
  }
  expect(world.rng).toBe(off.rng);
});

for(const operation of ['amputation','implant'] as const)test(`${operation} reads the active monitor at the actual outcome boundary`,()=>{
  // Prepared final work boundary: logistics/anesthesia were already admitted.
  // The independent played tending test above covers exact World checkpoints.
  const camp=operation==='implant'?woodenSurgeryCamp('peg-leg','left-leg','medicine',32):surgeryCamp('medicine',32);
  const {world}=camp,doctor=pawn(world,camp.doctorId),patient=pawn(world,camp.patientId),bed=world.structures.find(s=>s.id===camp.bedId)!;
  preparedResearch(world);bed.kind='hospital-bed';bed.material='steel';bed.quality='normal';
  const monitor=addMonitor(world,9,11),implant=operation==='implant'?'peg-leg' as const:undefined,part=operation==='implant'?'left-leg' as const:'left-arm' as const;
  doctor.x=9;doctor.z=10;doctor.moveCooldown=0;doctor.path=[];doctor.need=null;doctor.state='working';doctor.priorities.doctor=1;doctor.skills.medicine.level=20;
  patient.x=10;patient.z=10;patient.moveCooldown=0;patient.path=[];patient.state='downed';
  patient.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:10,z:10},medical:'bedrest'};
  patient.surgeryRequest={part,requestedAt:world.tick,...implant?{implant}:{}};
  expect(administerAnesthetic(patient.health!,()=>.5)).toBe(true);
  const work=implant?WOODEN_PARTS[implant].work:SURGERY_WORK;
  doctor.surgery={patientId:patient.id,part,bedId:bed.id,spot:{x:9,z:10},phase:'work',consumedMedicine:'medicine',progress:work-1,workCore:work-10,...implant?{implant}:{}};
  const input={doctor,medicine:'medicine' as const,bedQuality:'normal' as const,patientGlow:1,roomCleanliness:null,outdoors:true,...implant?{recipeFactor:1 as const}:{}};
  const offChance=surgerySuccessChance({...input,bedSurgeryFactor:1.1}),onChance=surgerySuccessChance({...input,bedSurgeryFactor:1.15});
  expect(onChance).toBeGreaterThan(offChance);
  // A prepared stream whose first outcome draw separates the two probabilities.
  let seed=1;for(;seed<1000000;seed++){const value=healthRandom({rng:seed});if(value>=offChance&&value<onChance)break;}
  expect(seed).toBeLessThan(1000000);world.rng=seed;
  const off=structuredClone(world);off.structures.find(s=>s.id===monitor.id)!.power!.on=false;
  const events:string[]=[],offEvents:string[]=[];
  processSurgery(world,doctor,context(events),()=>1,()=>1);processSurgery(off,pawn(off,doctor.id),context(offEvents),()=>1,()=>1);
  expect(doctor.surgery).toBeUndefined();expect(pawn(off,doctor.id).surgery).toBeUndefined();
  expect(events.some(e=>e.includes(implant?'a posé la prothèse':'a amputé le membre'))).toBe(true);
  expect(offEvents.some(e=>e.includes('échoué'))).toBe(true);
  if(implant){expect(patient.health!.artificialParts?.[0]).toMatchObject({part,kind:implant});expect(pawn(off,patient.id).health!.artificialParts).toBeUndefined();}
});
