import { expect,test } from 'vitest';
import { advanceMedical } from '../src/sim/injury-evolution';
import { addResolvedInjury,addResolvedInjuryBatch,assessMedical,createMedicalRecord,medicalPain,medicalStatus,tendInjury } from '../src/sim/injury-state';
import type { MedicalContext,MedicalRecord } from '../src/sim/injury-types';
import { HP_UNIT } from '../src/sim/injury-rules';
import { validateMedicalRecord } from '../src/sim/injury-validation';
import { INFECTION_INITIAL,INFECTION_UNIT,infectionAcquisitionFactor,infectionContractAllowed,infectionImmunityPerDay,infectionLuck,infectionSeverityPerDay,infectionStage,immunityGainSpeed,injuryInfectionChance } from '../src/sim/infection-rules';
import { captureInfectionTendRoom,infectionNeedsRest,infectionNextTendCore,infectionTargets,infectionTendable,tendInfection } from '../src/sim/infection-state';
import type { BodyPartId } from '../src/sim/body-definition';

const standing:MedicalContext={phase:0,posture:'standing',starving:false,hunger:100,rest:100,infectionSeed:73};
const resting:MedicalContext={...standing,posture:'bed',restingBonus:true};
const noRisk=()=>.999999;
function draws(values:number[]) {let n=0;return {random:()=>{if(n>=values.length)throw new Error(`Unexpected random draw ${n}`);return values[n++]!;},count:()=>n};}
const valid=(record:MedicalRecord)=>expect(validateMedicalRecord(record,true,true,true,true,record.body==='hare',true)).toBeNull();
/** A real accepted wound and two successful exposure decisions. No disease
 * injection in this fixture, unlike the isolated numerical boundary fixtures. */
function acquired(context=standing):MedicalRecord {
  const record=createMedicalRecord(),rolls=draws([.99,0,0]);
  const injury=addResolvedInjury(record,'left-arm','cut',12000,rolls.random)!;
  expect(rolls.count()).toBe(3);expect(injury.infection?.dueCore).toBe(15000);
  tendInjury(record,injury.id,0);
  advanceMedical(record,1500,context,()=>0);
  expect(record.infections?.cases).toHaveLength(1);valid(record);return record;
}
function isolated(severity=.001,immunity=0,part:BodyPartId='left-arm',body?:'hare'):MedicalRecord {
  const record=createMedicalRecord();if(body)record.body=body;
  record.infections={nextId:2,immunity:Math.round(immunity*INFECTION_UNIT),cases:[{id:1,part,bornAt:0,severity:Math.round(severity*INFECTION_UNIT),luck:1_000_000}]};
  return record;
}

test('exposure: wound mapping, solid/permanent exclusions, inclusive initial roll and Core deadline survive merging',()=>{
  const human=createMedicalRecord(),hare={...createMedicalRecord(),body:'hare' as const};
  for(const [kind,chance] of [['cut',.15],['crush',.15],['gunshot',.15],['bite',.3],['bruise',0],['crack',0],['execution-cut',0]] as const) {
    expect(injuryInfectionChance(human,{kind,part:'torso'})).toBe(chance);
    expect(injuryInfectionChance(hare,{kind,part:'torso'})).toBeCloseTo(chance*.1);
  }
  expect(injuryInfectionChance(human,{kind:'cut',part:'skull'})).toBe(0);
  expect(injuryInfectionChance(human,{kind:'cut',part:'torso',scar:{threshold:1000,pain:0}})).toBe(0);
  const initial=draws([.15,.0001]);
  const wound=addResolvedInjury(human,'left-arm','crush',2000,initial.random)!;
  expect(wound.infection).toEqual({dueCore:15003,roomFactor:1000});expect(initial.count()).toBe(2);
  human.tick=100;const unchanged=structuredClone(wound.infection);
  addResolvedInjury(human,'left-arm','crush',1000,()=>{throw Error('Merge must not reroll exposure');});
  expect(human.injuries).toHaveLength(1);expect(wound.bornAt).toBe(100);expect(wound.infection).toEqual(unchanged);
  const failed=createMedicalRecord();const failedRoll=draws([.1500001]);
  expect(addResolvedInjury(failed,'left-arm','cut',1000,failedRoll.random)?.infection).toBeUndefined();expect(failedRoll.count()).toBe(1);
  const animalRoll=draws([.016]);expect(addResolvedInjury(hare,'torso','cut',1000,animalRoll.random)?.infection).toBeUndefined();
  const guaranteed=draws([.015,0]);expect(addResolvedInjury(hare,'left-front-leg','cut',1000,guaranteed.random)?.infection?.dueCore).toBe(15000);
  valid(human);valid(failed);valid(hare);
});

test('acquisition: current severity and captured room quality, no reroll after refusal, healed wounds or old neutral wounds',()=>{
  const record=createMedicalRecord(),rolls=draws([.99,0,0]);
  const wound=addResolvedInjury(record,'left-arm','cut',12000,rolls.random)!;
  expect(infectionAcquisitionFactor(wound)).toBe(1);
  expect(captureInfectionTendRoom(record,wound.id,200)).toBe(false);
  tendInjury(record,wound.id,1300);expect(captureInfectionTendRoom(record,wound.id,200)).toBe(true);
  expect(infectionAcquisitionFactor(wound)).toBeCloseTo(.08);
  wound.severity=HP_UNIT;expect(infectionAcquisitionFactor(wound)).toBeCloseTo(.008);
  advanceMedical(record,1500,{...standing,starving:true},()=>.008);
  expect(record.infections).toBeUndefined();expect(wound.infection).toBeUndefined();
  advanceMedical(record,5000,{...standing,starving:true},()=>{throw Error('No repeat exposure');});valid(record);
  const healed=createMedicalRecord();addResolvedInjury(healed,'left-arm','cut',1000,draws([0,0]).random);
  advanceMedical(healed,1500,resting,()=>0);expect(healed.injuries).toEqual([]);expect(healed.infections).toBeUndefined();
  const historical=createMedicalRecord();addResolvedInjury(historical,'left-arm','crush',2000,noRisk);
  advanceMedical(historical,5000,{...standing,starving:true},()=>{throw Error('Absent risk stays neutral');});
  expect(historical.infections).toBeUndefined();valid(historical);
});

test('deadline and physiological cadence are retained across continuation; acquisition does not immediately increase severity',()=>{
  const record=createMedicalRecord(),rolls=draws([.99,0,.0001]);
  const wound=addResolvedInjury(record,'left-arm','cut',12000,rolls.random)!;tendInjury(record,wound.id,0);
  const context={...standing,phase:7,starving:true};
  advanceMedical(record,1500,context,()=>0);expect(record.infections).toBeUndefined();
  const resumed=JSON.parse(JSON.stringify(record)) as MedicalRecord;
  advanceMedical(record,1,context,()=>0);advanceMedical(resumed,1,context,()=>0);
  expect(record).toEqual(resumed);expect(record.infections?.cases[0]).toMatchObject({bornAt:1501,severity:INFECTION_INITIAL});
  advanceMedical(record,5,context,()=>0);expect(record.infections?.cases[0]?.severity).toBe(INFECTION_INITIAL);
  advanceMedical(record,1,context,()=>0);expect(record.infections?.cases[0]?.severity).toBe(INFECTION_INITIAL+2_800_000);
  advanceMedical(resumed,6,context,()=>0);expect(record).toEqual(resumed);valid(record);
});

test('acquisition shares one immunity without duplicate anatomy; later permanent scars retain the original exposure',()=>{
  const record=createMedicalRecord();
  for(const part of ['left-arm','left-arm','torso'] as const){
    const wound=addResolvedInjury(record,part,'cut',2000,draws([0,0]).random)!;tendInjury(record,wound.id,0);
  }
  const finalRolls=draws([0,0]);advanceMedical(record,1500,{...standing,starving:true},finalRolls.random);
  expect(finalRolls.count()).toBe(2);expect(record.infections!.cases.map(c=>c.part)).toEqual(['left-arm','torso']);
  expect(record.injuries.every(i=>i.infection===undefined)).toBe(true);
  expect(record.infections!.immunity).toBe(Math.round(infectionImmunityPerDay(record,{...standing,starving:true})*INFECTION_UNIT/6000));valid(record);
  const scarred=createMedicalRecord();const wound=addResolvedInjury(scarred,'left-arm','cut',6000,draws([0,0,0,0]).random)!;
  tendInjury(scarred,wound.id,1000);advanceMedical(scarred,1500,resting,()=>0);
  expect(wound.scar).toEqual({threshold:1000,pain:0});expect(scarred.infections?.cases).toHaveLength(1);valid(scarred);
  const immune=createMedicalRecord();const exposed=addResolvedInjury(immune,'torso','cut',2000,draws([0,0]).random)!;tendInjury(immune,exposed.id,0);
  immune.infections={nextId:2,cases:[],immunity:INFECTION_UNIT};
  advanceMedical(immune,1500,{...standing,starving:true},()=>{throw Error('Residual immunity rejects before RNG');});
  expect(immune.infections.cases).toEqual([]);expect(exposed.infection).toBeUndefined();valid(immune);
});

test('hare disease uses its own anatomy and natural exposure factor, then the same persistent disease course',()=>{
  const record={...createMedicalRecord(),body:'hare' as const};
  const wound=addResolvedInjury(record,'left-rear-leg','cut',2000,draws([.015,0]).random)!;
  // Isolate disease progression from blood loss without giving the animal a
  // veterinary action: this numerical fixture uses a scar after the real hit.
  wound.scar={threshold:2000,pain:0};
  advanceMedical(record,1500,standing,()=>0);expect(record.infections!.cases[0]!.part).toBe('left-rear-leg');valid(record);
  const copy=JSON.parse(JSON.stringify(record)) as MedicalRecord;
  advanceMedical(record,10000,standing,noRisk);for(let i=0;i<100;i++)advanceMedical(copy,100,standing,noRisk);
  expect(record).toEqual(copy);expect(record.death?.cause).toBe('infection');valid(record);
});

test('part ownership: acquired infection outlives its wound, amputation removes the subtree, immunity and identities survive',()=>{
  const record=acquired(resting),condition=record.infections!.cases[0]!;
  expect(infectionNeedsRest(record)).toBe(true);expect(tendInfection(record,condition.id,1000)).toBe(true);
  // Follow physical healing while preserving the independently acquired case.
  advanceMedical(record,2300,resting,()=>0);expect(record.injuries).toEqual([]);expect(record.infections?.cases).toHaveLength(1);
  const nextId=record.infections!.nextId,immunity=record.infections!.immunity;
  addResolvedInjury(record,'left-shoulder','cut',40000,noRisk);
  expect(record.infections!.cases).toEqual([]);expect(record.infections!.nextId).toBe(nextId);expect(record.infections!.immunity).toBe(immunity);valid(record);
  const two=isolated(.1);two.infections!.cases.push({id:2,part:'right-arm',bornAt:0,severity:100_000_000,luck:1_200_000});two.infections!.nextId=3;
  expect(infectionContractAllowed(two,'left-arm')).toBe(false);expect(infectionContractAllowed(two,'torso')).toBe(true);
  const first=infectionImmunityPerDay(two,standing);two.infections!.cases.shift();
  expect(infectionImmunityPerDay(two,standing)).toBeCloseTo(first*1.2);
  two.infections!.immunity=599_399_999;expect(infectionContractAllowed(two,'torso')).toBe(true);
  two.infections!.immunity=599_400_000;expect(infectionContractAllowed(two,'torso')).toBe(false);valid(two);
});

test('tending: strict overlap, cumulative expiry, isolated priorities, full immunity disallows renewal but retains active benefit',()=>{
  const record=isolated(.329999999),condition=record.infections!.cases[0]!;
  expect(infectionTargets(record)).toEqual([{infectionId:1,part:'left-arm',priority:.025,severity:329.999999}]);
  expect(tendInfection(record,1,800)).toBe(true);expect(condition.tend).toEqual({quality:800,expiresAtCore:37500});
  const before=structuredClone(record);expect(tendInfection(record,1,0)).toBe(false);expect(record).toEqual(before);
  record.tick=3000;expect(infectionTendable(record,condition)).toBe(false);expect(infectionNextTendCore(condition)).toBe(30001);
  record.tick=3001;condition.severity=780_000_000;
  expect(infectionTargets(record)[0]).toMatchObject({priority:1,severity:780});
  expect(tendInfection(record,1,1000)).toBe(true);expect(condition.tend?.expiresAtCore).toBe(75000);valid(record);
  record.infections!.immunity=INFECTION_UNIT;
  expect(infectionNeedsRest(record)).toBe(false);expect(infectionTendable(record,condition)).toBe(false);
  expect(infectionSeverityPerDay(record,condition)).toBeCloseTo(-1.23);
  record.tick=7500;expect(infectionSeverityPerDay(record,condition)).toBe(-.7);
  expect(infectionTargets(record)).toEqual([]);valid(record);
});

test('stage effects combine without damaging anatomy and without scaling animal disease pain as a wound',()=>{
  for(const [severity,stage,pain] of [[.329999999,'minor',.05],[.33,'major',.08],[.779999999,'major',.08],[.78,'extreme',.12],[.869999999,'extreme',.12],[.87,'critical',.85]] as const) {
    const human=isolated(severity),animal=isolated(severity,0,'torso','hare');
    expect(infectionStage(human.infections!.cases[0]!.severity)).toBe(stage);
    expect(medicalPain(human)).toBe(pain);expect(medicalPain(animal)).toBe(pain);
    expect(human.injuries).toEqual([]);expect(animal.injuries).toEqual([]);
    const h=assessMedical(human),a=assessMedical(animal);
    expect(h.capacities.breathing).toBe(stage==='critical'?.95:1);expect(a.capacities.breathing).toBe(h.capacities.breathing);
    if(stage==='critical'){expect(h.capacities.consciousness).toBe(.1);expect(medicalStatus(human)).toBe('downed');}
    else expect(medicalStatus(human)).toBe('mobile');
    valid(human);valid(animal);
  }
  const record=isolated(.78),previous=assessMedical(record);record.infections!.cases[0]!.severity=870_000_000;
  expect(assessMedical(record)).not.toBe(previous);expect(assessMedical(record).capacities.breathing).toBe(.95);
});

test('immunity factors: exact hunger/rest boundaries, real bed/rest, blood filtration, stable luck without world RNG',()=>{
  const record=isolated();
  for(const [hunger,multiplier] of [[0,.7],[.001,.9],[11.999,.9],[12,1]] as const)expect(immunityGainSpeed(record,{...standing,hunger})).toBe(multiplier);
  const hare=isolated(.001,0,'torso','hare');
  expect(immunityGainSpeed(hare,{...standing,hunger:17.999})).toBe(.9);expect(immunityGainSpeed(hare,{...standing,hunger:18})).toBe(1);
  for(const [rest,multiplier] of [[0,.8],[.999,.8],[1,.92],[13.999,.92],[14,.96],[27.999,.96],[28,1]] as const)expect(immunityGainSpeed(record,{...standing,rest})).toBe(multiplier);
  expect(immunityGainSpeed(record,{...standing,posture:'ground'})).toBe(1);
  expect(immunityGainSpeed(record,{...standing,posture:'ground',restingBonus:true})).toBe(1.1);
  expect(immunityGainSpeed(record,resting)).toBeCloseTo(1.177);
  expect(immunityGainSpeed(record,standing,.5)).toBe(.75);
  expect(immunityGainSpeed(record,{phase:0,posture:'standing',starving:false})).toBe(1);
  expect(infectionLuck(73,1)).toBe(infectionLuck(73,1));expect(infectionLuck(73,2)).not.toBe(infectionLuck(73,1));
  for(let id=1;id<=32;id++){const luck=infectionLuck(73,id);expect(Number.isInteger(luck)&&luck>=800000&&luck<=1200000).toBe(true);}
  advanceMedical(record,100,standing,()=>{throw Error('Disease evolution does not consume world RNG');});
  expect(record.infections!.immunity).toBe(10_735_000);valid(record);
});

test('medical outcome: untreated acquired disease kills; renewed physical results permit immunity, convalescence and residual decay',()=>{
  const doomed=acquired();advanceMedical(doomed,9000,standing,()=>0);
  expect(doomed.death?.cause).toBe('infection');expect(doomed.infections!.immunity).toBeLessThan(INFECTION_UNIT);valid(doomed);
  const corpse=structuredClone(doomed);advanceMedical(doomed,6000,resting,()=>{throw Error('Dead physiology must stop');});expect(doomed).toEqual(corpse);
  const survivor=acquired(resting);let renewals=0,immuneAt:number|null=null,healedAt:number|null=null;
  for(let ticks=0;ticks<24000;ticks++) {
    for(const c of survivor.infections!.cases)if(infectionTendable(survivor,c)){expect(tendInfection(survivor,c.id,1000)).toBe(true);renewals++;}
    advanceMedical(survivor,1,resting,()=>0);
    expect(survivor.death).toBeUndefined();
    if(immuneAt===null&&survivor.infections!.immunity===INFECTION_UNIT){immuneAt=survivor.tick;expect(survivor.infections!.cases.length).toBeGreaterThan(0);}
    if(!survivor.infections!.cases.length){healedAt=survivor.tick;break;}
  }
  expect(renewals).toBeGreaterThanOrEqual(2);expect(immuneAt).not.toBeNull();expect(healedAt!).toBeGreaterThan(immuneAt!);
  expect(survivor.infections!.immunity).toBeGreaterThan(0);expect(infectionNeedsRest(survivor)).toBe(false);
  const clone=JSON.parse(JSON.stringify(survivor)) as MedicalRecord;
  advanceMedical(survivor,18000,standing,noRisk);for(let i=0;i<180;i++)advanceMedical(clone,100,standing,noRisk);
  expect(survivor).toEqual(clone);expect(survivor.infections).toEqual({nextId:2,cases:[],immunity:0});valid(survivor);
});

test('lethal threshold precedes simultaneous immunity and invalid capacities refuse before mutation or randomness',()=>{
  const record=isolated(.999,.999999999);record.tick=19;
  advanceMedical(record,1,standing,()=>{throw Error('No wound RNG');});
  expect(record.death).toEqual({tick:20,cause:'infection'});expect(record.infections!.immunity).toBe(999_999_999);valid(record);
  const immune=isolated(.999,1);immune.tick=19;advanceMedical(immune,1,standing,noRisk);
  expect(immune.death).toBeUndefined();expect(immune.infections!.cases[0]!.severity).toBeLessThan(999_000_000);valid(immune);
  const tooOld=createMedicalRecord(Math.floor(Number.MAX_SAFE_INTEGER/10));const oldCopy=structuredClone(tooOld);
  expect(()=>addResolvedInjuryBatch(tooOld,[{part:'left-arm',kind:'cut',severity:1000}],()=>{throw Error('Unexpected RNG');})).toThrow('clock');expect(tooOld).toEqual(oldCopy);
  const exhausted=createMedicalRecord();addResolvedInjury(exhausted,'left-arm','cut',1000,draws([0,0]).random);exhausted.infections={nextId:Number.MAX_SAFE_INTEGER,cases:[],immunity:0};
  const before=structuredClone(exhausted);expect(()=>advanceMedical(exhausted,1500,standing,()=>{throw Error('Unexpected RNG');})).toThrow('identities');expect(exhausted).toEqual(before);
  for(const context of [{...standing,hunger:NaN},{...standing,rest:101},{...standing,infectionSeed:-1}]) {
    const r=createMedicalRecord(),copy=structuredClone(r);expect(()=>advanceMedical(r,1,context,noRisk)).toThrow('interval');expect(r).toEqual(copy);
  }
});
