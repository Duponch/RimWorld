import { expect,test } from 'vitest';
import { startingPawn } from '../src/sim/starting-pawns.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { HUMAN_YEAR_TICKS } from '../src/sim/human-age.ts';
import { administerAnesthetic } from '../src/sim/anesthetic.ts';
import { medicalSurgerySpeed,medicalSurgeryDoctorChance,surgerySuccessChance,surgeryBaseXp,surgeryRequestReason,SURGERY_PARTS,SURGERY_WORK } from '../src/sim/surgery-rules.ts';
import { medicalCamp } from './scenarios/health.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { captureCleanliness } from '../src/sim/filth-room.ts';
import { surgeryOutdoors } from '../src/sim/surgery-room.ts';

const patient=()=>{
  const p=startingPawn(1,'Patient',5,5,0,50);p.age={biologicalTicks:30*HUMAN_YEAR_TICKS,chronologicalTicks:30*HUMAN_YEAR_TICKS};
  p.health=createMedicalRecord(100);
  p.health.infections={nextId:2,immunity:0,cases:[{id:1,part:'left-arm',bornAt:90,severity:200000000,luck:1000000}]};
  return p;
};
test('therapeutic request requires a directly infected present adult free-colon limb and is read only',()=>{
  const p=patient(),before=structuredClone(p);
  expect(SURGERY_PARTS).toEqual(['left-arm','right-arm','left-leg','right-leg']);
  expect(surgeryRequestReason(p,'left-arm')).toBeUndefined();expect(p).toEqual(before);
  expect(surgeryRequestReason(p,'right-arm')).toBeDefined();expect(surgeryRequestReason(p,'heart')).toBeDefined();
  p.health!.infections!.cases[0]!.part='left-hand';expect(surgeryRequestReason(p,'left-arm')).toBeDefined();
  p.health!.infections!.cases[0]!.part='left-arm';p.health!.infections!.immunity=1000000000;
  expect(surgeryRequestReason(p,'left-arm')).toBeUndefined();
  p.health!.missing.push({part:'left-shoulder',bornAt:100});expect(surgeryRequestReason(p,'left-arm')).toBeDefined();
});
test('request excludes captives, guests, children and dead actors but accepts actually downed patients',()=>{
  const p=patient();p.state='downed';expect(surgeryRequestReason(p,'left-arm')).toBeUndefined();
  p.faction='outlanders';expect(surgeryRequestReason(p,'left-arm')).toBeDefined();delete p.faction;
  p.prisoner={capturedAt:100} as NonNullable<typeof p.prisoner>;expect(surgeryRequestReason(p,'left-arm')).toBeDefined();delete p.prisoner;
  p.age!.biologicalTicks=17*HUMAN_YEAR_TICKS;expect(surgeryRequestReason(p,'left-arm')).toBeDefined();
  delete p.age;expect(surgeryRequestReason(p,'left-arm')).toBeUndefined(); // Historical bodies were adult.
  p.state='dead';expect(surgeryRequestReason(p,'left-arm')).toBeDefined();
});
test('existing anesthetic blocks a new request through wearing off; ongoing operation guard can retain it',()=>{
  const p=patient();expect(administerAnesthetic(p.health!,()=>.5)).toBe(true);
  p.health!.anesthetic!.severity=100000000;
  const before=structuredClone(p);
  expect(surgeryRequestReason(p,'left-arm')).toMatch(/anesthésie/);
  expect(surgeryRequestReason(p,'left-arm',{allowAnesthetic:true})).toBeUndefined();expect(p).toEqual(before);
});
test('work is dynamic, uses actual Glow and completion XP is actual Core working time',()=>{
  const p=patient();p.health=createMedicalRecord();p.skills.medicine.level=8;
  expect(medicalSurgerySpeed(p,.3)).toBeCloseTo(.88);expect(medicalSurgerySpeed(p,0)).toBeCloseTo(.704);
  p.skills.medicine.level=20;expect(medicalSurgerySpeed(p,1)).toBeCloseTo(1.6);
  p.health.missing=[{part:'left-arm',bornAt:0}];expect(medicalSurgerySpeed(p,1)).toBeLessThan(1.6);
  expect(SURGERY_WORK).toBe(2000);expect(surgeryBaseXp(2000)).toBe(3200000);expect(surgeryBaseXp(4000)).toBe(6400000);
});
test('chance combines doctor, consumed medicine and current bed room without tending quality cap',()=>{
  const doctor=patient();doctor.health=createMedicalRecord();doctor.skills.medicine.level=8;
  const base={doctor,medicine:'medicine' as const,patientGlow:.5,roomCleanliness:0,outdoors:false};
  expect(medicalSurgeryDoctorChance(doctor)).toBeCloseTo(.8);expect(surgerySuccessChance(base)).toBeCloseTo(.96);
  expect(surgerySuccessChance({...base,medicine:'herbal-medicine'})).toBeCloseTo(.8448);
  expect(surgerySuccessChance({...base,medicine:'glitterworld-medicine'})).toBe(.98);
  expect(surgerySuccessChance({...base,patientGlow:0,roomCleanliness:null,outdoors:true})).toBeCloseTo(.3672);
  expect(surgerySuccessChance({...base,bedQuality:'awful'})).toBeCloseTo(.864);
  expect(surgerySuccessChance({...base,roomCleanliness:-5})).toBeCloseTo(.576);
  doctor.skills.medicine.level=0;expect(medicalSurgeryDoctorChance(doctor)).toBeCloseTo(.1);
  doctor.skills.medicine.level=20;expect(medicalSurgeryDoctorChance(doctor)).toBeCloseTo(1.1);
});

function roofRoom(side:number,open:number){
  const w=medicalCamp(0,32),cells:number[]=[];
  for(let z=1;z<=side+2;z++)for(let x=1;x<=side+2;x++){
    if(x===1||z===1||x===side+2||z===side+2)fixtureBuilding(w,'wall',x,z);
    else cells.push(z*w.width+x);
  }
  w.roofing={constructed:cells.slice(0,cells.length-open),build:[],remove:[],cursor:0};
  return {w,cells,anchor:{x:2,z:2}};
}
test('surgical outdoor ratio is strictly above 25%, with actual anchor and no second room flood',()=>{
  const {w,cells,anchor}=roofRoom(4,4),capture=captureCleanliness(w);
  expect(capture.topology.at(anchor.x,anchor.z)).toMatchObject({kind:'space',cellCount:16});
  const before=structuredClone(w);expect(surgeryOutdoors(w,anchor,capture)).toBe(false);expect(w).toEqual(before);
  w.roofing!.constructed=cells.slice(0,11);expect(surgeryOutdoors(w,anchor,capture)).toBe(true);
});
test('more than 100 open cells independently applies even when open proportion stays below 25%',()=>{
  const {w,cells,anchor}=roofRoom(22,100),capture=captureCleanliness(w);
  expect(capture.topology.at(2,2)).toMatchObject({cellCount:484});expect(surgeryOutdoors(w,anchor,capture)).toBe(false);
  w.roofing!.constructed=cells.slice(0,cells.length-101);expect(surgeryOutdoors(w,anchor,capture)).toBe(true);
});
test('unroofed anchor applies in an otherwise covered room; outside map/solid roomless has no factor',()=>{
  const {w,cells,anchor}=roofRoom(4,0),capture=captureCleanliness(w);
  expect(surgeryOutdoors(w,anchor,capture)).toBe(false);
  w.roofing!.constructed=cells.slice(1);expect(surgeryOutdoors(w,anchor,capture)).toBe(true);
  expect(surgeryOutdoors(w,{x:1,z:1},capture)).toBe(false);expect(surgeryOutdoors(w,{x:-1,z:0},capture)).toBe(false);
  // The recognized map-edge space is a real RoomSpace even though cleanliness
  // excludes it; bare exterior therefore still applies the anchor criterion.
  expect(surgeryOutdoors(w,{x:0,z:0},capture)).toBe(true);
});
