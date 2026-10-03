import { expect,test,vi } from 'vitest';
import { administerAnesthetic,anestheticStage,anestheticModifiers,validAnesthetic, type AnestheticState } from '../src/sim/anesthetic.ts';
import { advanceMedical } from '../src/sim/injury-evolution.ts';
import { assessMedical,createMedicalRecord,medicalPain,medicalBleed,medicalStatus,reconcileMedicalDeath } from '../src/sim/injury-state.ts';
import { validateMedicalRecord } from '../src/sim/injury-validation.ts';
import { assessBody,HEALTHY_BODY } from '../src/sim/body-capacities.ts';
import { pawnBody } from '../src/sim/health-rules.ts';
import { BLOOD_UNIT } from '../src/sim/injury-rules.ts';
import { createWorld } from '../src/sim/engine.ts';
import type { MedicalContext,MedicalRecord } from '../src/sim/injury-types.ts';

const context:MedicalContext={phase:0,posture:'bed',starving:false,hunger:100,rest:100,restingBonus:true};
const noDraw=()=>{throw Error('Anesthetic progression must not draw the PRNG');};
const valid=(record:MedicalRecord,version=179,animal=false)=>validateMedicalRecord(record,true,true,true,true,animal,false,true,true,true,true,true,version,true);
const copy=(record:MedicalRecord)=>JSON.parse(JSON.stringify(record)) as MedicalRecord;
const maximumDelay=()=>1-Number.EPSILON;
/** Prepared projections isolate exact threshold math; clinical cadence and
 * canonical save forms are exercised separately through advanceMedical. */
const projection=(severity:number):AnestheticState=>({bornAt:0,expiresAtCore:120000,severity,remainder:0});

test('administration draws one inclusive Core deadline and every admission refusal leaves the record and PRNG untouched',()=>{
  for(const [draw,delay] of [[0,45000],[.5,82500],[1-Number.EPSILON,120000]] as const) {
    const record=createMedicalRecord(103),random=vi.fn(()=>draw);
    expect(administerAnesthetic(record,random)).toBe(true);expect(random).toHaveBeenCalledTimes(1);
    expect(record.anesthetic).toEqual({bornAt:103,expiresAtCore:1030+delay,severity:1_000_000_000,remainder:0});
    expect(valid(record)).toBeNull();expect(medicalStatus(record)).toBe('downed');expect(record.death).toBeUndefined();
    const before=copy(record);random.mockClear();
    expect(administerAnesthetic(record,random)).toBe(false);expect(random).not.toHaveBeenCalled();expect(record).toEqual(before);
  }
  const dead=createMedicalRecord();dead.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(dead);
  for(const record of [dead,{...createMedicalRecord(),body:'hare' as const},createMedicalRecord(Math.floor(Number.MAX_SAFE_INTEGER/10))]) {
    const before=copy(record),random=vi.fn(()=>.5);
    expect(administerAnesthetic(record,random)).toBe(false);expect(random).not.toHaveBeenCalled();expect(record).toEqual(before);
  }
  for(const draw of [-.1,1,NaN,Infinity]) {
    const record=createMedicalRecord(100),before=copy(record);
    expect(()=>administerAnesthetic(record,()=>draw)).toThrow(/random/i);expect(record).toEqual(before);
  }
});

test('inclusive severity stages apply all capacities before rounding, with sedation incapable but never intrinsically lethal',()=>{
  expect([0,1,599_999_999,600_000_000,799_999_999,800_000_000,1_000_000_000].map(anestheticStage))
    .toEqual(['none','wearing-off','wearing-off','woozy','woozy','sedated','sedated']);
  const cases=[
    {severity:1_000_000_000,consciousness:.01,moving:0,manipulation:0,talking:0,eating:0,sight:1,digestion:1,status:'downed'},
    {severity:800_000_000,consciousness:.01,moving:0,manipulation:0,talking:0,eating:0,sight:1,digestion:1,status:'downed'},
    {severity:799_999_999,consciousness:.7,moving:.5,manipulation:.5,talking:.5,eating:.7,sight:.85,digestion:.8,status:'mobile'},
    {severity:600_000_000,consciousness:.7,moving:.5,manipulation:.5,talking:.5,eating:.7,sight:.85,digestion:.8,status:'mobile'},
    {severity:599_999_999,consciousness:.9,moving:.85,manipulation:.8,talking:.9,eating:.9,sight:1,digestion:1,status:'mobile'},
  ] as const;
  const pawn=createWorld(192,16,16).pawns[0]!;
  for(const {severity,status,...expected} of cases) {
    const record=createMedicalRecord();record.anesthetic=projection(severity);pawn.health=record;
    const body=assessMedical(record);
    expect(body.capacities).toMatchObject(expected);expect(body.vitalFailure).toBe(false);expect(body.painShock).toBe(false);
    expect(medicalStatus(record)).toBe(status);expect(pawnBody(pawn)).toEqual(body);reconcileMedicalDeath(record);expect(record.death).toBeUndefined();
  }
  // Newly introduced scalar offsets must also bypass the healthy-body shortcut,
  // and talking's condition offset precedes the existing food-poison factor.
  expect(assessBody({damage:[],missing:[],pain:0,sightOffset:-.15}).capacities.sight).toBe(.85);
  expect(assessBody({damage:[],missing:[],pain:0,digestionOffset:-.2}).capacities.digestion).toBe(.8);
  expect(assessBody({damage:[],missing:[],pain:0,talkingOffset:-.2,talkingFactor:.8}).capacities.talking).toBe(.64);
  const chronic=createMedicalRecord();chronic.ageAilments=['bad-back','frail'];chronic.anesthetic=projection(700_000_000);
  expect(assessMedical(chronic).capacities).toMatchObject({consciousness:.7,moving:0,manipulation:.1});
  expect(assessMedical(chronic).vitalFailure).toBe(false);
});

test('the total pain factor composes with wounds, fresh missing roots and systemic conditions without stopping blood or masking vital damage',()=>{
  const record=createMedicalRecord();record.nextInjuryId=2;
  record.injuries=[{id:1,part:'right-arm',kind:'cut',severity:2000,bornAt:0}];
  record.missing=[{part:'left-thumb',bornAt:0}];record.heatstroke=350_000_000;
  record.infections={nextId:2,immunity:0,cases:[{id:1,part:'left-leg',bornAt:0,severity:330_000_000,luck:1_000_000}]};
  record.flu={bornAt:0,severity:833_000_000,immunity:0,luck:1_000_000};
  record.foodPoisoning={bornAt:0,severity:300000,cause:'unknown',item:'simple-meal'};
  const raw=.025+.1+.15+.08+.05+.2,bleed=medicalBleed(record),clinical=copy(record);
  expect(medicalPain(record)).toBeCloseTo(raw,12);
  for(const [severity,factor] of [[1_000_000_000,0],[700_000_000,.8],[500_000_000,.95]] as const) {
    record.anesthetic=projection(severity);
    expect(medicalPain(record)).toBeCloseTo(raw*factor,12);expect(medicalBleed(record)).toBe(bleed);
    const unmasked=copy(record);delete unmasked.anesthetic;expect(unmasked).toEqual(clinical);
  }
  const blood=createMedicalRecord();blood.bloodLoss=.6*BLOOD_UNIT;blood.anesthetic=projection(700_000_000);
  expect(assessMedical(blood).capacities.consciousness).toBe(.1); // minimum of the two ceilings.
  const lethal=createMedicalRecord();lethal.nextInjuryId=2;lethal.injuries=[{id:1,part:'brain',kind:'crush',severity:10000,bornAt:0}];lethal.anesthetic=projection(1_000_000_000);
  reconcileMedicalDeath(lethal);expect(lethal.death?.cause).toBe('vital-failure');
});

/** Independent arithmetic oracle enumerates the actual hash boundaries and
 * accumulates a BigInt numerator, without the production decay helper. */
function clockOracle(bornAt:number,end:number,phase:number,draw:number):AnestheticState|undefined {
  const expiresAtCore=bornAt*10+45000+Math.floor(draw*75001);let pulses=0n;
  for(let tick=bornAt+1;tick<=end;tick++) {
    if(tick*10>=expiresAtCore)return;
    if(tick%20===phase%20)pulses++;
    if(pulses*8_000_000n>=3_000_000_000n)return;
  }
  const numerator=pulses*8_000_000n;
  return {bornAt,expiresAtCore,severity:1_000_000_000-Number(numerator/3n),remainder:Number(numerator%3n)};
}
test('real medical hash ticks and exact remainder match an independent clock across arbitrary partitions, JSON continuation and expiry',()=>{
  for(const {bornAt,phase,draw,end} of [{bornAt:0,phase:0,draw:1-Number.EPSILON,end:7500},{bornAt:9,phase:19,draw:0,end:4510},{bornAt:101,phase:7,draw:.37,end:7500}]) {
    const initial=createMedicalRecord(bornAt);administerAnesthetic(initial,()=>draw);
    const whole=copy(initial),partitioned=copy(initial),ctx={...context,phase};
    advanceMedical(whole,end-bornAt,ctx,noDraw);
    let resumed=copy(initial);
    const checkpoints=[bornAt+1,bornAt+19,bornAt+20,bornAt+1499,bornAt+1500,bornAt+1520,bornAt+2999,bornAt+3000,bornAt+3020,end-1,end]
      .filter(tick=>tick<=end).sort((a,b)=>a-b);
    for(const tick of checkpoints) {
      advanceMedical(partitioned,tick-partitioned.tick,ctx,noDraw);advanceMedical(resumed,tick-resumed.tick,ctx,noDraw);
      expect(partitioned.anesthetic).toEqual(clockOracle(bornAt,tick,phase,draw));expect(valid(partitioned)).toBeNull();
      resumed=copy(resumed);expect(valid(resumed)).toBeNull();expect(resumed).toEqual(partitioned);
    }
    expect(whole).toEqual(partitioned);expect(resumed).toEqual(whole);
  }
  const boundaries=createMedicalRecord();administerAnesthetic(boundaries,maximumDelay);
  for(const [tick,severity,remainder,stage] of [[1500,800000000,0,'sedated'],[1520,797333334,2,'woozy'],[3000,600000000,0,'woozy'],[3020,597333334,2,'wearing-off']] as const) {
    advanceMedical(boundaries,tick-boundaries.tick,context,noDraw);
    expect(boundaries.anesthetic).toMatchObject({severity,remainder});expect(anestheticStage(boundaries.anesthetic!.severity)).toBe(stage);
  }
  const fractional=createMedicalRecord();administerAnesthetic(fractional,()=>1/75001);
  expect(fractional.anesthetic!.expiresAtCore).toBe(45001);
  advanceMedical(fractional,4500,context,noDraw);expect(fractional.anesthetic).toBeDefined();
  advanceMedical(fractional,1,context,noDraw);expect(fractional.anesthetic).toBeUndefined();
});

test('same-record changes invalidate physiological projections, while anesthesia permits continuing hunger, bleeding and disease evolution',()=>{
  const record=createMedicalRecord(),pawn=createWorld(192,16,16).pawns[0]!;pawn.health=record;
  expect(pawnBody(pawn)).toBe(HEALTHY_BODY);administerAnesthetic(record,maximumDelay);
  const sedated=pawnBody(pawn);expect(sedated.capacities.consciousness).toBe(.01);expect(pawnBody(pawn)).toBe(sedated);
  record.anesthetic!.severity=700_000_000;const woozy=pawnBody(pawn);expect(woozy).not.toBe(sedated);expect(woozy.capacities.sight).toBe(.85);
  delete record.anesthetic;expect(pawnBody(pawn)).toBe(HEALTHY_BODY);
  // Prepared clinical ailments. advanceMedical is real; this is not a claim
  // that the operation naturally acquired these diseases.
  const patient=createMedicalRecord();patient.nextInjuryId=2;
  patient.injuries=[{id:1,part:'right-arm',kind:'cut',severity:2000,bornAt:0}];
  patient.infections={nextId:2,immunity:0,cases:[{id:1,part:'left-arm',bornAt:0,severity:100_000_000,luck:1_000_000}]};
  patient.flu={bornAt:0,severity:1_000_000,immunity:0,luck:1_000_000};administerAnesthetic(patient,maximumDelay);
  advanceMedical(patient,60,{...context,phase:7,starving:true,hunger:0,malnutritionRate:906000},noDraw);
  expect(medicalStatus(patient)).toBe('downed');expect(medicalPain(patient)).toBe(0);
  expect(patient.injuries[0]!.severity).toBe(2000);expect(patient.bloodLoss).toBeGreaterThan(0);expect(patient.malnutrition).toBeGreaterThan(0);
  expect(patient.infections!.cases[0]!.severity).toBeGreaterThan(100_000_000);expect(patient.infections!.immunity).toBeGreaterThan(0);
  expect(patient.flu!.severity).toBeGreaterThan(1_000_000);expect(patient.flu!.immunity).toBeGreaterThan(0);expect(valid(patient)).toBeNull();
});

test('strict human schema gates, malformed clocks/decay and frozen deaths preserve historical medical records',()=>{
  const record=createMedicalRecord(50);administerAnesthetic(record,maximumDelay);expect(valid(record)).toBeNull();expect(valid(record,178)).not.toBeNull();
  const historical=copy(record);delete historical.anesthetic;expect(valid(historical,178)).toBeNull();expect(historical).toEqual(createMedicalRecord(50));
  const animal={...copy(record),body:'hare' as const};expect(valid(animal,179,true)).not.toBeNull();
  const invalid:((r:MedicalRecord)=>void)[]=[r=>r.anesthetic!.bornAt=51,r=>r.anesthetic!.bornAt=-1,
    r=>r.anesthetic!.expiresAtCore=500,r=>r.anesthetic!.expiresAtCore=500+44999,r=>r.anesthetic!.expiresAtCore=500+120001,
    r=>r.anesthetic!.severity=0,r=>r.anesthetic!.severity=1_000_000_001,r=>r.anesthetic!.severity=999_999_999,
    r=>r.anesthetic!.remainder=3,r=>r.anesthetic!.remainder=.5,r=>(r.anesthetic as unknown as {future?:boolean}).future=true];
  for(const mutate of invalid){const bad=copy(record);mutate(bad);expect(valid(bad)).not.toBeNull();}
  expect(validAnesthetic(null,50,true)).toBe(false);expect(validAnesthetic(record.anesthetic,Number.MAX_SAFE_INTEGER,true)).toBe(false);
  const dead=copy(record);dead.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(dead);expect(valid(dead)).toBeNull();
  const before=copy(dead);advanceMedical(dead,12000,context,noDraw);expect(dead).toEqual(before);expect(valid(dead)).toBeNull();
  const wrongCause=copy(dead);wrongCause.death!.cause='vital-failure';expect(valid(wrongCause)).not.toBeNull();
});
