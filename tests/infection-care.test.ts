import { expect,test } from 'vitest';
import { medicineCamp } from './scenarios/medicine';
import { medicalCamp,controlledInjury } from './scenarios/health';
import { fixtureBuilding } from './scenarios/deconstruction';
import { createMedicalRecord } from '../src/sim/injury-state';
import { applyCommand,stepWorld } from '../src/sim/engine';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization';
import { newDoorState } from '../src/sim/door-rules';
import { medicalRestNeeded,treatmentTargets,treatmentTarget,treatmentBatch,medicineCount,urgentTreatment } from '../src/sim/care-rules';
import { patientWork,reconcilePatientRest } from '../src/sim/patient-rest';
import { infectionRoomFactor } from '../src/sim/infection-room';
import { infectionNextTendCore } from '../src/sim/infection-state';
import type { Infection } from '../src/sim/infection-types';
import type { Pawn,World } from '../src/sim/types';

function illness(w:World,p:Pawn,severity=100_000_000,part:Infection['part']='left-arm'):Infection {
  p.health??=createMedicalRecord(w.tick);
  const state=p.health.infections??={nextId:1,cases:[],immunity:0};
  const c={id:state.nextId++,part,bornAt:w.tick,severity,luck:1_000_000};state.cases.push(c);return c;
}
function valid(w:World){expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}
function until(w:World,f:()=>boolean,n=1200){for(let i=0;i<n&&!f();i++)stepWorld(w);expect(f(),JSON.stringify({tick:w.tick,p:w.pawns.map(p=>({state:p.state,need:p.need,tend:p.tend}))})).toBe(true);valid(w);}
function replay(w:World,n=3){const c=deserializeWorld(serializeWorld(w));stepWorld(c,n);stepWorld(w,n);expect(c).toEqual(w);valid(w);}
const medicine=(w:World)=>w.piles.reduce((n,p)=>n+(p.kind==='medicine'?p.quantity:0),0);
function enclosure(w:World,x=3,z=11){
  for(let iz=z-2;iz<=z+2;iz++)for(let ix=x-2;ix<=x+2;ix++)if(ix===x-2||ix===x+2||iz===z-2||iz===z+2){
    const b=fixtureBuilding(w,iz===z-2&&ix===x?'door':'wall',ix,iz);
    if(b.kind==='door')Object.assign(b,{material:'wood',door:newDoorState(w.tick)});
  }
}

test('infection room factor averages real terrain, excludes walls and doorways, and rechecks topology without a roof bonus',()=>{
  const w=medicalCamp(),cell={x:3,z:11};
  expect(infectionRoomFactor(w,cell)).toBe(1000);
  enclosure(w);expect(infectionRoomFactor(w,cell)).toBe(600);
  const inside=[];for(let z=10;z<=12;z++)for(let x=2;x<=4;x++)inside.push(z*w.width+x);
  w.roofing={constructed:[...inside],build:[],remove:[],cursor:0};
  expect(infectionRoomFactor(w,cell)).toBe(600);
  for(const i of inside)w.tiles[i]={terrain:'rough-stone',stone:'granite'};
  expect(infectionRoomFactor(w,cell)).toBe(500);
  w.tiles[inside[0]!]={terrain:'soil'};expect(infectionRoomFactor(w,cell)).toBe(511);
  w.tiles[inside[1]!]={terrain:'water'};expect(infectionRoomFactor(w,cell)).toBe(511);
  // Neither an individual's presence nor the soil under an adjacent door
  // replaces the floor average. Doorway itself has no proper-room statistic.
  w.pawns[0]!.x=cell.x;w.pawns[0]!.z=cell.z;
  expect(infectionRoomFactor(w,cell)).toBe(511);
  expect(infectionRoomFactor(w,{x:3,z:9})).toBe(1000);
  const door=w.structures.find(s=>s.kind==='door')!;door.door!.open=true;door.door!.from=1;
  expect(infectionRoomFactor(w,cell)).toBe(511);
  // In-place barrier mutation invalidates the cache: no array/tick shortcut.
  const wall=w.structures.find(s=>s.x===1&&s.z===11)!;wall.kind='stool';wall.quality='normal';
  expect(infectionRoomFactor(w,cell)).toBe(1000);
  wall.kind='wall';delete wall.quality;expect(infectionRoomFactor(w,cell)).toBe(511);
});

test('diseases rank separately from bleeding and the 20 HP medicine batch, while rest and treatment remain distinct',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;p.medicalCare='industrial';p.priorities.patient=1;p.priorities.bedrest=3;
  controlledInjury(w,p,'right-arm',5000,'cut');controlledInjury(w,p,'right-leg',5000,'bruise');
  const minor=illness(w,p,300_000_000),extreme=illness(w,p,780_000_000,'left-leg');
  expect(treatmentTarget(p)).toEqual({infectionId:extreme.id});
  const targets=treatmentTargets(p);expect(targets[0]).toMatchObject({priority:1,severity:780});
  expect(treatmentBatch(targets,true)).toHaveLength(1);expect(medicineCount(targets)).toBe(3);
  extreme.tend={quality:800,expiresAtCore:w.tick*10+37500};
  expect(treatmentTarget(p)).toEqual({injuryId:p.health!.injuries[0]!.id});
  expect(treatmentBatch(treatmentTargets(p),true).map(t=>t.injuryId)).toEqual(p.health!.injuries.map(i=>i.id));
  p.health!.injuries=[];expect(urgentTreatment(p)).toBe(false);
  minor.tend={quality:800,expiresAtCore:w.tick*10+37500};
  expect(treatmentTarget(p)).toBeUndefined();expect(patientWork(p)).toBe('bedrest');expect(medicalRestNeeded(p)).toBe(true);
  p.medicalCare='none';expect(patientWork(p)).toBe('bedrest');
  p.health!.infections!.immunity=1_000_000_000;
  expect(treatmentTarget(p)).toBeUndefined();expect(patientWork(p)).toBeUndefined();
  expect(p.health!.infections!.cases).toHaveLength(2); // Immunity is not instant disappearance.
  valid(w);
});

test('infection care collects and consumes a real dose, preserves its bed between rounds and renews only after the strict overlap boundary',()=>{
  const w=medicineCamp(),d=w.pawns[0]!,p=w.pawns[1]!;p.health!.injuries=[];
  const c=illness(w,p);until(w,()=>d.tend?.phase==='pickup');
  expect(medicine(w)).toBe(4);expect(c.tend).toBeUndefined();expect(d.skills.medicine.xp).toBe(0);replay(w);
  until(w,()=>d.tend?.phase==='tend');
  expect(medicine(w)).toBe(4);expect(w.piles.some(s=>s.owner.type==='pawn'&&s.owner.pawnId===d.id)).toBe(true);replay(w);
  until(w,()=>!!c.tend);const first=c.tend!,bed=p.need?.kind==='sleep'?p.need.bedId:null;
  expect(first.expiresAtCore).toBe(w.tick*10+37500);expect(medicine(w)).toBe(3);
  expect(d.skills.medicine.xp).toBe(122500);
  expect(p.need).toMatchObject({kind:'sleep',phase:'sleep',medical:'bedrest',bedId:bed});
  replay(w,15);expect(p.need).toMatchObject({medical:'bedrest',bedId:bed});
  // This boundary fixture advances the authoritative clocks together; the
  // evolution race itself is covered by kernel and played-colony scenarios.
  w.tick=(first.expiresAtCore-7500)/10;p.health!.tick=w.tick;
  expect(treatmentTarget(p)).toBeUndefined();
  expect(applyCommand(w,{type:'order-tend',pawnId:d.id,patientId:p.id,queue:false}).ok).toBe(false);
  w.tick++;p.health!.tick=w.tick;expect(w.tick*10).toBeGreaterThan(infectionNextTendCore(c));
  expect(treatmentTarget(p)).toEqual({infectionId:c.id});valid(w);
  expect(applyCommand(w,{type:'order-tend',pawnId:d.id,patientId:p.id,queue:false}).ok).toBe(true);
  replay(w);until(w,()=>c.tend!==first);
  expect(c.tend!.expiresAtCore).toBe(first.expiresAtCore+37500);expect(medicine(w)).toBe(2);expect(d.skills.medicine.xp).toBe(245000);
  expect(p.need).toMatchObject({medical:'bedrest',bedId:bed});replay(w);
  p.health!.infections!.immunity=1_000_000_000;reconcilePatientRest(w);
  expect(p.need).toBeNull();expect(treatmentTarget(p)).toBeUndefined();expect(c.tend).toBeDefined();valid(w);
});

test('wound tending captures the patient room only on completion; interrupted infection treatment retains its medicine and XP',()=>{
  const w=medicineCamp(),d=w.pawns[0]!,p=w.pawns[1]!,wound=p.health!.injuries[0]!;
  wound.infection={dueCore:w.tick*10+20000,roomFactor:1000};enclosure(w);
  until(w,()=>d.tend?.phase==='tend');expect(wound.infection.roomFactor).toBe(1000);replay(w);
  until(w,()=>wound.tended!==undefined);const captured=wound.infection!.roomFactor;
  expect(captured).toBe(infectionRoomFactor(w,p));expect(captured).toBeLessThan(1000);
  const snapshot=deserializeWorld(serializeWorld(w));expect(snapshot.pawns[1]!.health!.injuries[0]!.infection!.roomFactor).toBe(captured);
  const wall=w.structures.find(s=>s.kind==='wall'&&s.x===1&&s.z===11)!;wall.kind='stool';wall.quality='normal';
  expect(infectionRoomFactor(w,p)).toBe(1000);expect(wound.infection!.roomFactor).toBe(captured);
  const v=medicineCamp();v.pawns[1]!.health!.injuries=[];illness(v,v.pawns[1]!);
  until(v,()=>v.pawns[0]!.tend?.phase==='tend');stepWorld(v,4);replay(v);
  const checkpoint=serializeWorld(v);
  for(const cause of ['policy','immunity'] as const) {
    const copy=deserializeWorld(checkpoint),doctor=copy.pawns[0]!,patient=copy.pawns[1]!,c=patient.health!.infections!.cases[0]!;
    const xp=doctor.skills.medicine.xp,quantity=medicine(copy);
    if(cause==='policy')expect(applyCommand(copy,{type:'medical-care',pawnId:patient.id,care:'none'}).ok).toBe(true);
    else patient.health!.infections!.immunity=1_000_000_000;
    stepWorld(copy);expect(doctor.tend).toBeUndefined();expect(c.tend).toBeUndefined();expect(doctor.skills.medicine.xp).toBe(xp);expect(medicine(copy)).toBe(quantity);
    if(cause==='policy')expect(patient.need).toMatchObject({kind:'sleep',medical:'bedrest'});
    else expect(patient.need).toBeNull();
    replay(copy);
  }
});
