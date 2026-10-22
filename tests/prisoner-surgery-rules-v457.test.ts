import {expect,test} from 'vitest';
import {medicalCamp} from './scenarios/health.ts';
import {createMedicalRecord,addResolvedInjury} from '../src/sim/injury-state.ts';
import {createPrisonerState} from '../src/sim/prisoner-state.ts';
import {HUMAN_YEAR_TICKS} from '../src/sim/human-age.ts';
import {administerAnesthetic} from '../src/sim/anesthetic.ts';
import {installArtificialPart,installWoodenPart} from '../src/sim/artificial-parts.ts';
import {surgeryRequestReason,surgeryInstallRequestReason,surgeryRemoveRequestReason273} from '../src/sim/surgery-rules.ts';
import {isTherapeuticCaptiveSurgery280} from '../src/sim/prisoner-surgery-rules-280.ts';
import {applySurgery,reconcileSurgery,surgeryReason} from '../src/sim/surgery.ts';
import {implantSurgeryReason} from '../src/sim/prosthetic-surgery.ts';
import type {SurgicalLimb} from '../src/sim/surgery-anatomy.ts';

/** Pure admission/command fixture: adult captivity and a clinical condition
 * are declared preparations, not a played capture, wound or operation. The
 * separate service scenario owns physical bed admission, supplies and result. */
function captive(){
  const w=medicalCamp(2,16),p=w.pawns[1]!;
  p.age={biologicalTicks:30*HUMAN_YEAR_TICKS,chronologicalTicks:30*HUMAN_YEAR_TICKS};
  p.faction='outlaws';p.prisoner=createPrisonerState(w,p);p.health=createMedicalRecord(w.tick);
  p.health.infections={nextId:2,immunity:0,cases:[{id:1,part:'left-leg',bornAt:w.tick,severity:100_000_000,luck:1_000_000}]};
  return {w,p};
}
const infected=(part:SurgicalLimb)=>{const c=captive();c.p.health!.infections!.cases[0]!.part=part;return c;};

test.each([['left-arm'],['right-arm'],['left-leg'],['right-leg']] as const)('adult captive with direct infection on %s is admitted only prospectively and without mutation',(part)=>{
  const {p}=infected(part),before=structuredClone(p);
  for(const version of [179,210,273,279,281])expect(surgeryRequestReason(p,part,{version})).toBeDefined();
  expect(surgeryRequestReason(p,part,{version:280})).toBeUndefined();
  expect(surgeryRequestReason(p,part)).toBeUndefined();
  expect(isTherapeuticCaptiveSurgery280(p,part,{version:280})).toBe(true);
  expect(p).toEqual(before);
});

test('infection must be directly on the selected natural root, not only its child or another member',()=>{
  const {p}=captive();p.health!.infections!.cases[0]!.part='left-foot';
  expect(surgeryRequestReason(p,'left-leg',{version:280})).toBeDefined();
  p.health!.infections!.cases[0]!.part='right-leg';
  expect(surgeryRequestReason(p,'left-leg',{version:280})).toBeDefined();
  p.health!.infections!.cases[0]!.part='left-leg';p.health!.missing=[{part:'left-leg',bornAt:p.health!.tick}];
  expect(surgeryRequestReason(p,'left-leg',{version:280})).toBeDefined();
});

test.each([
  ['peg-leg','left-leg'],['wooden-hand','left-hand'],['wooden-foot','right-foot'],
  ['prosthetic-leg','left-leg'],['prosthetic-arm','left-shoulder'],
] as const)('%s is therapeutic for a captive only on its own real missing root %s',(implant,part)=>{
  const {p}=captive();delete p.health!.infections;p.health!.missing=[{part,bornAt:p.health!.tick,tended:true}];
  const before=structuredClone(p);
  expect(surgeryInstallRequestReason(p,part,implant,{version:279})).toBeDefined();
  expect(surgeryInstallRequestReason(p,part,implant,{version:280})).toBeUndefined();
  expect(surgeryInstallRequestReason(p,part,implant,{version:281})).toBeDefined();
  expect(surgeryRequestReason(p,part,{version:280,implant})).toBeUndefined();
  expect(p).toEqual(before);
});

test('a missing arm below a healthy shoulder never authorizes captive shoulder replacement',()=>{
  const {p}=captive();delete p.health!.infections;
  expect(surgeryInstallRequestReason(p,'left-shoulder','prosthetic-arm',{version:280})).toBeDefined();
  p.health!.missing=[{part:'left-arm',bornAt:p.health!.tick,tended:true}];
  expect(surgeryInstallRequestReason(p,'left-shoulder','prosthetic-arm',{version:280})).toBeDefined();
  p.health!.missing=[{part:'left-shoulder',bornAt:p.health!.tick,tended:true}];
  expect(surgeryInstallRequestReason(p,'left-shoulder','prosthetic-arm',{version:280})).toBeUndefined();
  expect(surgeryInstallRequestReason(p,'left-hand','wooden-hand',{version:280})).toBeDefined();
});

test('prosthetic parent and wrong piece remain governed by the existing anatomical authority',()=>{
  const {p}=captive();delete p.health!.infections;p.health!.missing=[{part:'left-leg',bornAt:p.health!.tick,tended:true}];
  expect(installWoodenPart(p.health!,'left-leg','peg-leg')).toBe(true);
  expect(surgeryInstallRequestReason(p,'left-leg','prosthetic-leg',{version:280})).toBeDefined();
  expect(surgeryInstallRequestReason(p,'left-foot','wooden-foot',{version:280})).toBeDefined();
  const other=captive().p;delete other.health!.infections;other.health!.missing=[{part:'right-leg',bornAt:other.health!.tick,tended:true}];
  expect(surgeryInstallRequestReason(other,'right-leg','prosthetic-arm',{version:280})).toBeDefined();
});

test('release intent alone remains captivity while real release, escape and active breakout stop it',()=>{
  const {p,w}=captive();p.prisoner!.mode='release';
  expect(surgeryRequestReason(p,'left-leg',{version:280})).toBeUndefined();
  p.prisoner!.releasedAt=w.tick;expect(surgeryRequestReason(p,'left-leg',{version:280})).toBeDefined();delete p.prisoner!.releasedAt;
  p.prisoner!.escape={x:0,z:5};expect(surgeryRequestReason(p,'left-leg',{version:280})).toBeDefined();delete p.prisoner!.escape;
  p.prisoner!.breakout={rng:1,lastAt:w.tick,active:{startedAt:w.tick,initiatorId:p.id}};
  expect(surgeryRequestReason(p,'left-leg',{version:280})).toBeDefined();
});

test('children, dead bodies and a record belonging to an animal do not acquire therapeutic permission',()=>{
  const {p}=captive();p.age!.biologicalTicks=17*HUMAN_YEAR_TICKS;
  expect(surgeryRequestReason(p,'left-leg',{version:280})).toBeDefined();
  p.age!.biologicalTicks=30*HUMAN_YEAR_TICKS;p.state='dead';
  expect(surgeryRequestReason(p,'left-leg',{version:280})).toBeDefined();
  p.state='idle';p.health!.body='hare';
  expect(surgeryRequestReason(p,'left-leg',{version:280})).toBeDefined();
});

test('anesthesia blocks a fresh captive request but retains an ongoing therapeutic classification',()=>{
  const {p}=captive();expect(administerAnesthetic(p.health!,()=>.5)).toBe(true);
  const before=structuredClone(p);
  expect(surgeryRequestReason(p,'left-leg',{version:280})).toContain('anesthésie');
  expect(surgeryRequestReason(p,'left-leg',{version:280,allowAnesthetic:true})).toBeUndefined();
  expect(surgeryRequestReason(p,'left-leg',{version:279,allowAnesthetic:true})).toBeDefined();
  expect(isTherapeuticCaptiveSurgery280(p,'left-leg',{version:280})).toBe(true);expect(p).toEqual(before);
});

test('removal of a captive artificial part stays outside this lot even with a directly damaged added root',()=>{
  const {p}=captive();delete p.health!.infections;
  expect(installArtificialPart(p.health!,'left-leg','prosthetic-leg')).toBe(true);
  for(const damaged of [false,true]){
    if(damaged)addResolvedInjury(p.health!,'left-leg','bruise',1000,()=>.999999);
    expect(surgeryRemoveRequestReason273(p,'left-leg','prosthetic-leg',{version:280})).toBeDefined();
    expect(surgeryRequestReason(p,'left-leg',{version:280,removeArtificial273:'prosthetic-leg'})).toBeDefined();
  }
});

test('free adults retain their historical healthy replacement and legacy adult permissions',()=>{
  const {p}=captive();delete p.prisoner;p.faction='colony';delete p.age;
  for(const version of [279,280]){
    expect(surgeryRequestReason(p,'left-leg',{version})).toBeUndefined();
    expect(surgeryInstallRequestReason(p,'left-shoulder','prosthetic-arm',{version})).toBeUndefined();
  }
  p.faction='outlanders';expect(surgeryRequestReason(p,'left-leg',{version:280})).toBeDefined();
});

test('command and reconcile use the actual World version rather than the standalone default',()=>{
  const {w,p}=captive();(w as unknown as {schemaVersion:number}).schemaVersion=279;
  const before=structuredClone(w);
  expect(applySurgery(w,{type:'surgery-request',pawnId:p.id,part:'left-leg'}).ok).toBe(false);expect(w).toEqual(before);
  (w as unknown as {schemaVersion:number}).schemaVersion=280;
  expect(applySurgery(w,{type:'surgery-request',pawnId:p.id,part:'left-leg'})).toEqual({ok:true});
  expect(p.surgeryRequest).toEqual({part:'left-leg',requestedAt:w.tick});expect(w.rng).toBe(before.rng);
  p.prisoner!.mode='release';reconcileSurgery(w);expect(p.surgeryRequest).toBeDefined();
  p.prisoner!.releasedAt=w.tick;reconcileSurgery(w);expect(p.surgeryRequest).toBeUndefined();
});

test('runtime refuses a doctor who became captive or foreign before any clinical or physical mutation',()=>{
  for(const kind of ['captive','foreign'] as const){
    const {w,p}=captive(),doctor=w.pawns[0]!;
    if(kind==='captive')doctor.prisoner=createPrisonerState(w,doctor);else doctor.faction='outlanders';
    p.surgeryRequest={part:'left-leg',requestedAt:w.tick};const before=structuredClone(w);
    expect(surgeryReason(w,doctor,p)).toContain('colon libre');expect(w).toEqual(before);
    p.surgeryRequest={part:'left-leg',implant:'prosthetic-leg',requestedAt:w.tick};const implantBefore=structuredClone(w);
    expect(implantSurgeryReason(w,doctor,p)).toContain('colon libre');expect(w).toEqual(implantBefore);
  }
});
