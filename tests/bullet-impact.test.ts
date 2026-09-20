import { withoutShootingSkills,withMigratedShootingSkills } from './scenarios/legacy-skills';
import { expect,test } from 'vitest';
import { BODY_COVERAGE,BODY_INDEX,BODY_PARTS,HUMAN_BODY,type BodyPartId } from '../src/sim/body-definition';
import { resolveUnarmoredBullet,selectBulletPart } from '../src/sim/bullet-impact';
import { damageUnarmoredPawnWithBullet } from '../src/sim/bullet-damage';
import { addResolvedInjury,addResolvedInjuryBatch,createMedicalRecord,medicalBleed,medicalPain,remainingPartHealth,partMissing } from '../src/sim/injury-state';
import { advanceMedical } from '../src/sim/injury-evolution';
import { validateMedicalRecord } from '../src/sim/injury-validation';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization';
import { stepWorld } from '../src/sim/engine';
import { healthRandom } from '../src/sim/health';
import { SCHEMA_VERSION } from '../src/sim/types';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import { medicalCamp,medicalCarrier } from './scenarios/health';
import { careCamp } from './scenarios/care';

const noScar=()=>.999999;
const valid=(record:ReturnType<typeof createMedicalRecord>)=>expect(validateMedicalRecord(record)).toBeNull();

test('anatomical selection follows exposed coverage, filters and remaining parts instead of uniform entries',()=>{
  const r=createMedicalRecord(),counts=new Map<BodyPartId,number>(),n=100000;
  for(let i=0;i<n;i++){const part=selectBulletPart(r,()=>(i+.5)/n)!;counts.set(part,(counts.get(part)??0)+1);}
  const total=BODY_COVERAGE.reduce((a,b)=>a+b,0);
  for(const [i,p] of HUMAN_BODY.entries())expect(Math.abs((counts.get(p.id)??0)-n*BODY_COVERAGE[i]/total),p.id).toBeLessThan(1.01);
  expect(counts.has('waist')).toBe(false);expect(counts.get('torso')!).toBeGreaterThan(counts.get('brain')!*10);
  addResolvedInjury(r,'left-arm','cut',30000,noScar);
  for(let i=0;i<100;i++) {
    const part=selectBulletPart(r,()=>(i+.5)/100,'top','inside')!;
    expect(BODY_PARTS[part]).toMatchObject({height:'top',depth:'inside'});expect(partMissing(r,part)).toBe(false);
  }
  // Height fallback keeps depth. A lost head makes top/outside unavailable.
  addResolvedInjury(r,'neck','cut',25000,noScar);
  for(let i=0;i<100;i++){const part=selectBulletPart(r,()=>(i+.5)/100,'top','outside')!;expect(BODY_PARTS[part].depth).toBe('outside');expect(BODY_PARTS[part].height).not.toBe('top');}
  const untouched=createMedicalRecord();let reads=0;
  const explicit=resolveUnarmoredBullet(untouched,{part:'torso',damage:2},()=>{reads++;return .999999;});
  expect(explicit.selected).toBe('torso');expect(reads).toBe(1); // infection eligibility only; no selection or zero-chance scar draw
});

test('outside overkill preserves one HP using current health and Bullet range; core and organs are not protected',()=>{
  const empty=createMedicalRecord();
  const saved=resolveUnarmoredBullet(empty,{part:'left-thumb',damage:12},()=>.8);
  expect(saved.preserved).toBe(true);expect(remainingPartHealth(saved.record,'left-thumb')).toBe(1000);
  const lost=resolveUnarmoredBullet(empty,{part:'left-thumb',damage:12},()=>.7);
  expect(lost.preserved).toBe(false);expect(partMissing(lost.record,'left-thumb')).toBe(true);
  const again=resolveUnarmoredBullet(saved.record,{part:'left-thumb',damage:1},()=>.8);
  expect(again.layers[0].severity).toBe(0);expect(again.record).toEqual(saved.record);
  for(const part of ['torso','heart'] as const){const result=resolveUnarmoredBullet(empty,{part,damage:BODY_PARTS[part].hp},noScar);expect(result.preserved).toBe(false);expect(result.record.death?.cause).toBe('vital-failure');valid(result.record);}
  expect(empty).toEqual(createMedicalRecord());valid(saved.record);valid(lost.record);
});

test('internal Bullet repeats full damage outward, retains Gunshot on bone, and completes a lethal impact atomically',()=>{
  const r=createMedicalRecord(700);
  const lung=resolveUnarmoredBullet(r,{part:'left-lung',damage:4},noScar);
  expect(lung.layers.map(h=>[h.part,h.severity])).toEqual([['left-lung',4000],['torso',4000]]);
  expect(lung.record.injuries.map(i=>i.kind)).toEqual(['gunshot','gunshot']);expect(medicalBleed(lung.record)).toBeCloseTo(.48);valid(lung.record);
  const brain=resolveUnarmoredBullet(r,{part:'brain',damage:12},noScar);
  expect(brain.layers.map(h=>h.part)).toEqual(['brain','skull','head']);
  expect(brain.record.death).toEqual({tick:700,cause:'vital-failure'});expect(brain.record.missing.map(m=>m.part)).toEqual(['brain']);
  expect(brain.record.injuries.map(i=>[i.part,i.kind,i.severity])).toEqual([['skull','gunshot',12000],['head','gunshot',12000]]);valid(brain.record);
  const before=structuredClone(brain.record);expect(resolveUnarmoredBullet(brain.record,{damage:12},()=>{throw Error('dead draw');}).record).toEqual(before);
  const damaged=createMedicalRecord();addResolvedInjury(damaged,'head','bruise',14000,noScar);
  const propagated=resolveUnarmoredBullet(damaged,{part:'skull',damage:12},noScar);
  // No second overkill roll protects the outer duplicated hit.
  expect(propagated.record.missing.map(m=>m.part)).toEqual(['head']);valid(propagated.record);
  const bone=resolveUnarmoredBullet(r,{part:'ribcage',damage:4},noScar);
  expect(bone.record.injuries[0].kind).toBe('gunshot');expect(medicalBleed(bone.record)).toBeCloseTo(.24);
});

test('Gunshot keeps distinct wounds, pain/bleeding/scars and exact healing continuation; invalid batches are atomic',()=>{
  const r=createMedicalRecord();addResolvedInjuryBatch(r,[{part:'left-arm',kind:'gunshot',severity:5000},{part:'left-arm',kind:'gunshot',severity:5000}],noScar);
  expect(r.injuries).toHaveLength(2);expect(medicalPain(r)).toBe(.125);expect(medicalBleed(r)).toBeCloseTo(.6);valid(r);
  expect(validateMedicalRecord(r,false)).not.toBeNull();
  const stable=structuredClone(r);let draws=0;
  expect(()=>addResolvedInjuryBatch(r,[{part:'right-arm',kind:'gunshot',severity:2000},{part:'head',kind:'gunshot',severity:-1}],()=>{draws++;return .5;})).toThrow();expect(r).toEqual(stable);expect(draws).toBe(0);
  expect(()=>resolveUnarmoredBullet(r,{damage:NaN},()=>{draws++;return .5;})).toThrow();expect(draws).toBe(0);
  const scar=resolveUnarmoredBullet(createMedicalRecord(),{part:'left-eye',damage:2},()=>0).record;
  expect(scar.injuries[0].scar).toEqual({threshold:2000,pain:0});valid(scar);
  const rng={rng:7331},copy=structuredClone(r),rngCopy={...rng},context={phase:2,posture:'bed' as const,starving:false};
  advanceMedical(r,6000,context,()=>healthRandom(rng));for(let i=0;i<6000;i++)advanceMedical(copy,1,context,()=>healthRandom(rngCopy));
  expect(copy).toEqual(r);expect(rngCopy).toEqual(rng);valid(r);
});

test('world impact, snapshot and physical care preserve the new lesions through save and replay',()=>{
  const w=careCamp(),patient=w.pawns[1]!,doctor=w.pawns[0]!;delete patient.health;
  damageUnarmoredPawnWithBullet(w,patient,{part:'left-lung',damage:4});
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const snap=decoder.adopt(structuredClone(encoder.encode(w,0,0)));expect(snap.status).toBe('applied');if(snap.status==='applied')expect(snap.world).toEqual(w);
  const clone=deserializeWorld(serializeWorld(w));let tending=false,travelling=false;
  for(let i=0;i<1200&&patient.health!.injuries.some(h=>h.tended===undefined);i++) {
    stepWorld(w);stepWorld(clone);tending||=doctor.tend?.phase==='tend';travelling||=doctor.tend?.phase==='approach';
    if(i%30===0)expect(validateWorld(w)).toEqual([]);
  }
  expect(travelling&&tending).toBe(true);expect(patient.health!.injuries).toHaveLength(2);expect(patient.health!.injuries.every(h=>h.kind==='gunshot'&&h.tended!==undefined)).toBe(true);
  expect(doctor.skills.medicine.xp).toBeGreaterThan(0);expect(medicalBleed(patient.health!)).toBe(0);expect(clone).toEqual(w);expect(validateWorld(w)).toEqual([]);
  const post=decoder.adopt(structuredClone(encoder.encode(w,1,0)));expect(post.status).toBe('applied');if(post.status==='applied')expect(post.world).toEqual(w);
});

test('V53 migration is strict and injury-free; incapacity preserves captured movement and cargo at the impact tick',()=>{
  const old=medicalCamp();(old as {schemaVersion:number}).schemaVersion=53;withoutShootingSkills(old);
  expect(deserializeWorld(JSON.stringify(old))).toEqual(withMigratedShootingSkills({...old,schemaVersion:SCHEMA_VERSION}));
  const w=medicalCarrier(),p=w.pawns[0]!,motion=structuredClone(p.motion),cargo=w.piles.filter(s=>s.owner.type==='pawn'&&s.owner.pawnId===p.id).map(s=>({id:s.id,quantity:s.quantity,item:s.item}));
  damageUnarmoredPawnWithBullet(w,p,{part:'left-leg',damage:100});damageUnarmoredPawnWithBullet(w,p,{part:'right-leg',damage:100});
  expect(p.state).toBe('downed');expect(p.motion).toEqual(motion);expect(p.path).toEqual([]);expect(p.jobId).toBeNull();
  expect(w.piles.filter(s=>s.owner.type==='pawn'&&s.owner.pawnId===p.id).map(s=>({id:s.id,quantity:s.quantity,item:s.item}))).toEqual(cargo);expect(validateWorld(w)).toEqual([]);
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,40);stepWorld(copy,40);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);
  const smuggled=medicalCamp();damageUnarmoredPawnWithBullet(smuggled,smuggled.pawns[0]!,{part:'torso',damage:2});(smuggled as {schemaVersion:number}).schemaVersion=53;
  expect(()=>deserializeWorld(JSON.stringify(smuggled))).toThrow(/Invalid version 53/);
  const malformed=structuredClone(old);malformed.pawns[0]!.hunger=NaN;expect(()=>deserializeWorld(JSON.stringify(malformed))).toThrow(/Invalid version 53/);
  const failure=medicalCamp(),target=failure.pawns[0]!;target.health=createMedicalRecord(failure.tick);target.health.nextInjuryId=Number.MAX_SAFE_INTEGER;
  const before=JSON.stringify(failure);expect(()=>damageUnarmoredPawnWithBullet(failure,target,{damage:12})).toThrow(/capacity/);expect(JSON.stringify(failure)).toBe(before);
});
