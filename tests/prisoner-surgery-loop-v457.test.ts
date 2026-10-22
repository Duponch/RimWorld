import {expect,test} from 'vitest';
import {prisonerSurgeryCamp457} from './scenarios/prisoner-surgery-v457.ts';
import {writeTestFileSync} from './test-output.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {lyingPatient} from '../src/sim/care-access.ts';
import {medicalBleedUnits} from '../src/sim/injury-state.ts';
import {pawnBody} from '../src/sim/health-rules.ts';
import type {Command,World} from '../src/sim/types.ts';

const units=(w:World,item:string)=>w.piles.reduce((n,p)=>n+(p.item===item?p.quantity:0),0);
const publishedClinicalState=(w:World)=>({schemaVersion:w.schemaVersion,tick:w.tick,rng:w.rng,nextId:w.nextId,
  pawns:w.pawns,piles:w.piles,packed:w.packed,structures:w.structures,events:w.events});

test('one detained adult plays infected leg amputation, postoperative care, natural anesthesia recovery and real replacement of that same root',()=>{
  const f=prisonerSurgeryCamp457('infected-leg'),w=f.world;
  const patient=w.pawns.find(p=>p.id===f.patientId)!,doctor=w.pawns.find(p=>p.id===f.doctorId)!;
  const initial={rng:w.rng,nextId:w.nextId,tick:w.tick,prisoner:structuredClone(patient.prisoner!),faction:patient.faction,
    medicine:units(w,'medicine'),piece:units(w,'prosthetic-leg'),food:units(w,'survival-meal')};
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  let predecessor:{world:World;clinical:ReturnType<typeof publishedClinicalState>}|undefined;
  let stage='prepared',postoperativeTendObserved=false;
  const command=(c:Command)=>{const r=applyCommand(w,c);expect(r.ok,r.reason).toBe(true);};
  const valid=()=>expect(validateWorld(w),`whole World at ${stage}, tick ${w.tick}`).toEqual([]);
  const reload=()=>{const text=serializeWorld(w),copy=deserializeWorld(text);expect(serializeWorld(copy)).toBe(text);return copy;};
  const checkpoint=(name:string)=>{
    stage=name;valid();reload();
    const captured=structuredClone(publishedClinicalState(w));
    const adopted=decoder.adopt(structuredClone(encoder.encode(w,0,0)));
    expect(adopted.status,adopted.status==='resync'?adopted.reason:stage).toBe('applied');
    // Public Worlds are read projections with campaign references, not RAW
    // campaign save roots. Compare the complete changed clinical/physical
    // domains while the independent reload above remains a whole-World test.
    if(adopted.status==='applied'){
      expect(publishedClinicalState(adopted.world)).toEqual(captured);
      expect(publishedClinicalState(w)).toEqual(captured);
      if(predecessor)expect(publishedClinicalState(predecessor.world)).toEqual(predecessor.clinical);
      predecessor={world:adopted.world,clinical:captured};
    }
    writeTestFileSync(`artifacts/prisoner-surgery-v457/loop/${name}.json`,serializeWorld(w));
  };
  const until=(done:()=>boolean,limit=2000)=>{
    for(let n=0;n<limit&&!done();n++){
      stepWorld(w);
      if(w.pawns.some(p=>p.tend?.patientId===patient.id&&p.tend.phase==='tend'))postoperativeTendObserved=true;
    }
    // Persist the real terminal/timeout state before an outcome assertion. A
    // retained failed state is diagnostic, never a fabricated success proof.
    writeTestFileSync(`artifacts/prisoner-surgery-v457/loop/${stage}-latest.json`,JSON.stringify(w));
    expect(done(),`${stage} not reached by tick ${w.tick}`).toBe(true);valid();
  };
  try {
    checkpoint('prepared');
    expect(initial).toMatchObject({medicine:6,piece:1,food:20});
    expect(patient.priorities.patient).toBe(0);expect(patient.priorities.bedrest).toBe(0);
    expect(patient.health!.missing).toEqual([]);expect(patient.health!.anesthetic).toBeUndefined();

    // These are actual player work permissions. Starting property and every
    // random stream/clinical state remain untouched after preparation.
    command({type:'priority',pawnId:f.helperId,work:'warden',value:1});
    command({type:'surgery-request',pawnId:patient.id,part:'left-leg'});
    checkpoint('amputation-request');
    until(()=>lyingPatient(patient));
    expect(patient.need).toMatchObject({kind:'sleep',phase:'sleep',bedId:f.bedId});
    command({type:'priority',pawnId:doctor.id,work:'doctor',value:1});
    stage='amputation-work';until(()=>doctor.surgery?.phase==='work');
    expect(units(w,'medicine')).toBe(5);expect(units(w,'prosthetic-leg')).toBe(1);
    expect(patient.health!.anesthetic).toBeDefined();checkpoint('amputation-work');
    stage='amputation-result';until(()=>!patient.surgeryRequest&&!w.pawns.some(p=>p.surgery?.patientId===patient.id));
    checkpoint('amputation-result');
    expect(patient.health!.death).toBeUndefined();
    expect(patient.health!.missing.some(m=>m.part==='left-leg')).toBe(true);
    expect(patient.health!.infections?.cases.some(c=>c.part==='left-leg')??false).toBe(false);
    expect(units(w,'medicine')).toBe(5);expect(doctor.skills.medicine.xp).toBeGreaterThan(0);
    const amputationXp=doctor.skills.medicine.xp;

    stage='postoperative-tended';
    until(()=>patient.health!.missing.some(m=>m.part==='left-leg'&&m.tended===true));
    checkpoint('postoperative-tended');
    expect(postoperativeTendObserved).toBe(true);expect(medicalBleedUnits(patient.health!)).toBe(0);
    expect(units(w,'medicine')).toBe(4);expect(units(w,'prosthetic-leg')).toBe(1);
    expect(patient.health!.anesthetic).toBeDefined();

    stage='naturally-awake';
    until(()=>!patient.health!.anesthetic&&patient.state!=='downed'&&patient.state!=='dead'&&pawnBody(patient).canBeAwake,12000);
    checkpoint('naturally-awake');
    expect(w.pawns.find(p=>p.id===f.patientId)).toBe(patient);
    expect(patient.prisoner?.capturedAt).toBe(initial.prisoner.capturedAt);
    expect(patient.faction).toBe(initial.faction);expect(patient.prisoner?.releasedAt).toBeUndefined();
    expect(patient.health!.death).toBeUndefined();expect(patient.health!.malnutrition).toBeUndefined();
    expect(patient.health!.missing.some(m=>m.part==='left-leg'&&m.tended===true)).toBe(true);
    expect(patient.health!.artificialParts).toBeUndefined();
    expect(units(w,'survival-meal')).toBeGreaterThan(0);expect(units(w,'survival-meal')).toBeLessThan(initial.food);
    expect(patient.priorities.patient).toBe(0);expect(patient.priorities.bedrest).toBe(0);

    command({type:'surgery-install',pawnId:patient.id,part:'left-leg',implant:'prosthetic-leg'});
    checkpoint('prosthesis-request');
    stage='prosthesis-work';until(()=>doctor.surgery?.implant==='prosthetic-leg'&&doctor.surgery.phase==='work');
    checkpoint('prosthesis-work');
    expect(patient.need).toMatchObject({kind:'sleep',phase:'sleep',bedId:f.bedId});
    expect(units(w,'medicine')).toBe(3);expect(units(w,'prosthetic-leg')).toBe(1);
    expect(doctor.surgery!.ingredients?.map(i=>[i.item,i.quantity,i.stage])).toEqual([
      ['prosthetic-leg',1,'placed'],['medicine',1,'placed'],
    ]);
    const continued=reload(),resumedAt=w.tick;
    stage='prosthesis-result';until(()=>!patient.surgeryRequest&&!w.pawns.some(p=>p.surgery?.patientId===patient.id));
    checkpoint('prosthesis-result');
    expect(patient.health!.death).toBeUndefined();
    expect(patient.health!.artificialParts).toEqual([{part:'left-leg',kind:'prosthetic-leg',installedAt:patient.health!.tick}]);
    expect(patient.health!.missing.some(m=>m.part==='left-leg')).toBe(false);
    expect(units(w,'medicine')).toBe(2);expect(units(w,'prosthetic-leg')).toBe(0);
    expect(w.piles.some(p=>p.id===f.pieceId)).toBe(false);
    expect(doctor.skills.medicine.xp).toBeGreaterThan(amputationXp);
    expect(patient.prisoner?.capturedAt).toBe(initial.prisoner.capturedAt);expect(patient.faction).toBe(initial.faction);
    stepWorld(continued,w.tick-resumedAt);expect(serializeWorld(continued)).toBe(serializeWorld(w));
    reload();
  } finally {
    writeTestFileSync('artifacts/prisoner-surgery-v457/loop/continuation.json',JSON.stringify(w));
    writeTestFileSync('artifacts/prisoner-surgery-v457/loop/record.json',JSON.stringify({stage,tick:w.tick,preparation:f.preparation,initial,
      patientId:patient.id,doctorId:doctor.id,bedId:f.bedId,pieceId:f.pieceId,rng:w.rng,nextId:w.nextId,
      medicine:units(w,'medicine'),piece:units(w,'prosthetic-leg'),food:units(w,'survival-meal'),postoperativeTendObserved,
      health:patient.health,prisoner:patient.prisoner,events:w.events},null,2));
  }
},60000);
