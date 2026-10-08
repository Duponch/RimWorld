import {expect,test} from 'vitest';
import {assessBody} from '../src/sim/body-capacities.ts';
import {advanceMedical} from '../src/sim/injury-evolution.ts';
import {assessMedical,createMedicalRecord,medicalPain,medicalStatus,reconcileMedicalDeath} from '../src/sim/injury-state.ts';
import {acquireFlu} from '../src/sim/flu-state.ts';
import {IMMUNE_DISEASE_DEFINITIONS,IMMUNE_DISEASE_INITIAL,IMMUNE_DISEASE_UNIT,immuneDiseaseModifiers,immuneDiseaseSeverityPerDay,immuneDiseaseVomitChance} from '../src/sim/immune-diseases-rules.ts';
import {acquireImmuneDisease,immuneDiseaseNextTendCore,immuneDiseaseTargets,immuneDiseaseTendable,immuneDiseasesNeedRest,tendImmuneDisease} from '../src/sim/immune-diseases-state.ts';
import type {ImmuneDiseaseKind} from '../src/sim/immune-diseases-types.ts';
import type {MedicalContext,MedicalRecord} from '../src/sim/injury-types.ts';

const context:MedicalContext={phase:0,posture:'standing',starving:false,hunger:100,rest:100};
const noRandom=()=>{throw new Error('Systemic disease must not consume the shared medical stream');};
function patient(kind:ImmuneDiseaseKind='malaria',severity=IMMUNE_DISEASE_INITIAL):MedicalRecord {
  const record=createMedicalRecord();expect(acquireImmuneDisease(record,kind,1_000_000)).toBe(true);
  record.immuneDiseases![kind]!.severity=severity;return record;
}

test('acquisition preserves residual immunity and each disease remains an independent episode',()=>{
  const record=patient();expect(record.immuneDiseases!.malaria).toEqual({bornAt:0,severity:1_000_000,immunity:0,luck:1_000_000});
  const original=structuredClone(record);expect(acquireImmuneDisease(record,'malaria',900_000)).toBe(false);expect(record).toEqual(original);
  expect(acquireImmuneDisease(record,'plague',1_200_000)).toBe(true);expect(record.immuneDiseases!.malaria).toEqual(original.immuneDiseases!.malaria);
  record.immuneDiseases!.malaria!.severity=0;record.immuneDiseases!.malaria!.immunity=599_999_999;record.tick=30;
  expect(acquireImmuneDisease(record,'malaria',800_000)).toBe(true);
  expect(record.immuneDiseases!.malaria).toEqual({bornAt:30,severity:1_000_000,immunity:599_999_999,luck:800_000});
  record.immuneDiseases!.malaria!.severity=0;record.immuneDiseases!.malaria!.immunity=600_000_000;
  expect(acquireImmuneDisease(record,'malaria',1_000_000)).toBe(false);
  const animal=createMedicalRecord();animal.body='hare';expect(acquireImmuneDisease(animal,'plague',1_000_000)).toBe(false);
  const dead=createMedicalRecord();dead.death={tick:0,cause:'trauma'};expect(acquireImmuneDisease(dead,'malaria',1_000_000)).toBe(false);
  expect(()=>acquireImmuneDisease(createMedicalRecord(),'malaria',799_999)).toThrow();
});

test('primary disease rates and active treatment use their own exact definitions',()=>{
  for(const [kind,untreated,immune,tending] of [['malaria',.3702,-.7297,.232],['plague',.666,-.333,.3628]] as const){
    const record=patient(kind),state=record.immuneDiseases![kind]!;
    expect(immuneDiseaseSeverityPerDay(kind,state,0)).toBe(untreated);
    expect(tendImmuneDisease(record,kind,800)).toBe(true);
    expect(immuneDiseaseSeverityPerDay(kind,state,0)).toBeCloseTo(untreated-tending*.8);
    expect(immuneDiseaseSeverityPerDay(kind,state,3750)).toBe(untreated);
    state.immunity=IMMUNE_DISEASE_UNIT;expect(immuneDiseaseSeverityPerDay(kind,state,0)).toBeCloseTo(immune-tending*.8);
  }
  expect(IMMUNE_DISEASE_DEFINITIONS.malaria).toMatchObject({immunityPerDay:.3145,immunityPerDayNotSick:-.03});
  expect(IMMUNE_DISEASE_DEFINITIONS.plague).toMatchObject({immunityPerDay:.5224,immunityPerDayNotSick:-.02});
});

test('severity uses the actor phase every twenty local ticks while immunity advances each tick',()=>{
  const malaria=patient();advanceMedical(malaria,19,context,noRandom);
  expect(malaria.immuneDiseases!.malaria!.severity).toBe(1_000_000);
  expect(malaria.immuneDiseases!.malaria!.immunity).toBe(19*Math.round(.3145*.95*1e9/6000));
  advanceMedical(malaria,1,context,noRandom);expect(malaria.immuneDiseases!.malaria!.severity).toBe(2_234_000);
  const plague=patient('plague');advanceMedical(plague,6,{...context,phase:7},noRandom);
  expect(plague.immuneDiseases!.plague!.severity).toBe(1_000_000);
  advanceMedical(plague,1,{...context,phase:7},noRandom);expect(plague.immuneDiseases!.plague!.severity).toBe(3_220_000);
  expect(plague.immuneDiseases!.plague!.immunity).toBe(7*Math.round(.5224*1e9/6000));
});

test('a lethal severity threshold wins over immunity acquired on the same medical tick',()=>{
  for(const kind of ['malaria','plague'] as const){
    const record=patient(kind,IMMUNE_DISEASE_UNIT-1),state=record.immuneDiseases![kind]!;
    state.immunity=IMMUNE_DISEASE_UNIT-1;record.tick=19;
    advanceMedical(record,1,context,noRandom);
    expect(record.death).toEqual({tick:20,cause:kind});expect(state.severity).toBe(IMMUNE_DISEASE_UNIT);expect(state.immunity).toBe(IMMUNE_DISEASE_UNIT-1);
    const frozen=structuredClone(record);advanceMedical(record,20,context,noRandom);expect(record).toEqual(frozen);
  }
});

test('immunity gained before the next severity phase changes progression into recovery',()=>{
  for(const kind of ['malaria','plague'] as const){
    const record=patient(kind,500_000_000),state=record.immuneDiseases![kind]!;
    state.immunity=IMMUNE_DISEASE_UNIT-1;record.tick=18;advanceMedical(record,1,context,noRandom);
    expect(state.immunity).toBe(IMMUNE_DISEASE_UNIT);expect(state.severity).toBe(500_000_000);
    expect(immuneDiseaseTendable(record,kind)).toBe(false);expect(immuneDiseasesNeedRest(record)).toBe(false);
    advanceMedical(record,1,context,noRandom);expect(state.severity).toBeLessThan(500_000_000);expect(record.death).toBeUndefined();
  }
});

test('renewal is strict at 7500 Core remaining, replaces quality and extends remaining benefit',()=>{
  const record=patient(),state=record.immuneDiseases!.malaria!;
  expect(tendImmuneDisease(record,'malaria',700)).toBe(true);expect(state.tend).toEqual({quality:700,expiresAtCore:37500});
  expect(immuneDiseaseNextTendCore(state)).toBe(30001);record.tick=3000;
  expect(immuneDiseaseTendable(record,'malaria')).toBe(false);expect(tendImmuneDisease(record,'malaria',900)).toBe(false);
  record.tick=3001;expect(immuneDiseaseTendable(record,'malaria')).toBe(true);
  expect(tendImmuneDisease(record,'malaria',900)).toBe(true);expect(state.tend).toEqual({quality:900,expiresAtCore:75000});
  expect(()=>tendImmuneDisease(record,'malaria',1301)).toThrow();
  state.immunity=IMMUNE_DISEASE_UNIT;expect(tendImmuneDisease(record,'malaria',1000)).toBe(false);expect(state.tend!.quality).toBe(900);
});

test('resolved disease keeps fading immunity and removes only its own exhausted episode',()=>{
  const record=patient();expect(acquireImmuneDisease(record,'plague',1_000_000)).toBe(true);
  const malaria=record.immuneDiseases!.malaria!;malaria.severity=1;malaria.immunity=IMMUNE_DISEASE_UNIT;
  expect(tendImmuneDisease(record,'plague',500)).toBe(true);
  record.tick=19;advanceMedical(record,1,context,noRandom);
  expect(malaria.severity).toBe(0);expect(malaria.immunity).toBe(IMMUNE_DISEASE_UNIT-5000);expect(record.immuneDiseases!.plague!.severity).toBeGreaterThan(0);
  malaria.immunity=5000;advanceMedical(record,1,context,noRandom);expect(record.immuneDiseases!.malaria).toBeUndefined();
  const plague=record.immuneDiseases!.plague!;plague.severity=0;plague.immunity=3333;delete plague.tend;
  advanceMedical(record,1,context,noRandom);expect(record.immuneDiseases).toBeUndefined();
});

test('malaria stages replace offsets and the critical stage caps consciousness at one tenth',()=>{
  const record=patient('malaria',779_999_999);
  expect(immuneDiseaseModifiers(record)).toMatchObject({pain:0,bloodFiltrationOffset:-.1,consciousnessOffset:-.05,manipulationOffset:0});
  expect(assessMedical(record).capacities).toMatchObject({bloodFiltration:.9,consciousness:.94});
  record.immuneDiseases!.malaria!.severity=780_000_000;
  expect(immuneDiseaseModifiers(record)).toMatchObject({pain:.3,bloodFiltrationOffset:-.2,consciousnessOffset:-.12,manipulationOffset:-.08});
  expect(assessMedical(record).capacities.bloodFiltration).toBe(.8);
  record.immuneDiseases!.malaria!.severity=910_000_000;
  expect(immuneDiseaseModifiers(record)).toMatchObject({pain:.3,bloodFiltrationOffset:-.22,consciousnessOffset:0,consciousnessMax:.1,manipulationOffset:-.1});
  expect(assessMedical(record).capacities).toMatchObject({consciousness:.1,bloodFiltration:.78,moving:0,manipulation:0});
  expect(medicalStatus(record)).toBe('downed');reconcileMedicalDeath(record);expect(record.death).toBeUndefined();
});

test('plague has its four exact stage boundaries and pain shock without a false early death',()=>{
  const record=patient('plague',599_999_999);
  expect(immuneDiseaseModifiers(record)).toMatchObject({pain:.2,consciousnessOffset:-.05,manipulationOffset:-.05,breathingOffset:0});
  record.immuneDiseases!.plague!.severity=600_000_000;expect(immuneDiseaseModifiers(record)).toMatchObject({pain:.35,consciousnessOffset:-.2,manipulationOffset:-.2});
  record.immuneDiseases!.plague!.severity=800_000_000;expect(immuneDiseaseModifiers(record)).toMatchObject({pain:.6,consciousnessOffset:-.3,manipulationOffset:-.3,breathingOffset:0});
  record.immuneDiseases!.plague!.severity=900_000_000;expect(immuneDiseaseModifiers(record)).toMatchObject({pain:.85,consciousnessOffset:-.3,manipulationOffset:-.3,breathingOffset:-.15});
  expect(assessMedical(record).painShock).toBe(true);expect(medicalStatus(record)).toBe('downed');reconcileMedicalDeath(record);expect(record.death).toBeUndefined();
});

test('coexisting flu and diseases add physiology and malaria filtration slows both new immunities',()=>{
  const record=patient('malaria',500_000_000);expect(acquireImmuneDisease(record,'plague',1_000_000)).toBe(true);expect(acquireFlu(record,1_000_000)).toBe(true);
  expect(immuneDiseaseModifiers(record)).toMatchObject({pain:.2,consciousnessOffset:-.1,manipulationOffset:-.05,bloodFiltrationOffset:-.1});
  expect(medicalPain(record)).toBe(.2);expect(assessMedical(record).capacities.consciousness).toBe(.78);
  advanceMedical(record,1,context,noRandom);
  expect(record.immuneDiseases!.malaria!.immunity).toBe(Math.round(.3145*.95*1e9/6000));
  expect(record.immuneDiseases!.plague!.immunity).toBe(Math.round(.5224*.95*1e9/6000));
  expect(record.flu!.immunity).toBe(Math.round(.2388*.95*1e9/6000));
  record.immuneDiseases!.malaria!.severity=780_000_000;record.immuneDiseases!.plague!.severity=800_000_000;
  expect(medicalPain(record)).toBeCloseTo(.9);
});

test('blood filtration offset participates in common capacities before multiplication and projection caching',()=>{
  const body=assessBody({damage:[],missing:[],pain:0,bloodFiltrationOffset:-.1,bloodFiltrationFactor:.5});
  expect(body.capacities.bloodFiltration).toBe(.45);
  const record=patient('malaria',500_000_000);record.ageAilments=['bad-back'];
  expect(assessMedical(record).capacities.bloodFiltration).toBe(.9);
  record.immuneDiseases!.malaria!.severity=800_000_000;expect(assessMedical(record).capacities.bloodFiltration).toBe(.8);
  record.immuneDiseases!.malaria!.severity=0;expect(assessMedical(record).capacities.bloodFiltration).toBe(1);
});

test('clinical targets and rest follow immunity and life-threatening definitions per disease',()=>{
  const record=patient('malaria',910_000_000);expect(acquireImmuneDisease(record,'plague',1_000_000)).toBe(true);
  expect(immuneDiseaseTargets(record)).toEqual([{disease:'malaria',priority:1,severity:910},{disease:'plague',priority:.025,severity:1}]);
  expect(immuneDiseasesNeedRest(record)).toBe(true);expect(tendImmuneDisease(record,'malaria',800)).toBe(true);
  expect(immuneDiseaseTargets(record).map(t=>t.disease)).toEqual(['plague']);
  record.immuneDiseases!.malaria!.immunity=IMMUNE_DISEASE_UNIT;record.immuneDiseases!.plague!.immunity=IMMUNE_DISEASE_UNIT;
  expect(immuneDiseaseTargets(record)).toEqual([]);expect(immuneDiseasesNeedRest(record)).toBe(false);
});

test('malaria vomiting uses exact MTB ratios at physical probes',()=>{
  const state=patient().immuneDiseases!.malaria!;
  expect(immuneDiseaseVomitChance(undefined)).toBe(0);state.severity=779_999_999;expect(immuneDiseaseVomitChance(state)).toBe(0);
  state.severity=780_000_000;expect(immuneDiseaseVomitChance(state)).toBe(1/150);
  state.severity=910_000_000;expect(immuneDiseaseVomitChance(state)).toBe(1/75);
});

test('medical batching and resumed primitive episodes preserve every physiological boundary',()=>{
  const batched=patient('malaria',779_000_000);expect(acquireImmuneDisease(batched,'plague',900_000)).toBe(true);
  expect(tendImmuneDisease(batched,'malaria',950)).toBe(true);const stepped=structuredClone(batched);
  advanceMedical(batched,80,context,noRandom);for(let i=0;i<80;i++)advanceMedical(stepped,1,context,noRandom);
  expect(batched).toEqual(stepped);const resumed=JSON.parse(JSON.stringify(batched)) as MedicalRecord;
  advanceMedical(batched,37,context,noRandom);advanceMedical(resumed,37,context,noRandom);expect(resumed).toEqual(batched);
});
