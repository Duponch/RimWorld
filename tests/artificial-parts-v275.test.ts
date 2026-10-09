import { expect,test } from 'vitest';
import { installWoodenPart,woodenPartInstallReason,artificialPartCovering,WOODEN_PARTS } from '../src/sim/artificial-parts.ts';
import { addResolvedInjury,assessMedical,createMedicalRecord,freshMissing,medicalBleedUnits,medicalPain,medicalStatus,partMissing,remainingPartHealth } from '../src/sim/injury-state.ts';
import { advanceMedical } from '../src/sim/injury-evolution.ts';
import { injuryInfectionChance } from '../src/sim/infection-rules.ts';
import { medicalPartInjuryRule,HP_UNIT } from '../src/sim/injury-rules.ts';
import { BODY_PARTS,HUMAN_BODY } from '../src/sim/body-definition.ts';
import { pawnBody } from '../src/sim/health-rules.ts';
import { resolveUnarmoredBullet,selectBulletPart } from '../src/sim/bullet-impact.ts';
import { resolveUnarmoredMelee } from '../src/sim/melee-impact.ts';
import { resolveBombImpact } from '../src/sim/bomb-impact.ts';
import { resolveSurgeryOutcome } from '../src/sim/surgery-outcomes.ts';
import { applySurgeryDamage } from '../src/sim/surgery-damage.ts';
import { medicalCamp } from './scenarios/health.ts';
import type { MedicalRecord } from '../src/sim/injury-types.ts';
import type { WoodenPartKind,WoodenPartSite } from '../src/sim/artificial-parts-types.ts';

function missing(part:WoodenPartSite):MedicalRecord {
  const h=createMedicalRecord(10000);h.missing=[{part,bornAt:0}];return h;
}
function installed(part:WoodenPartSite='left-leg',kind:WoodenPartKind='peg-leg'):MedicalRecord {
  const h=missing(part);expect(installWoodenPart(h,part,kind)).toBe(true);return h;
}

test('all six missing sites restore their own capacity without multiplying substitute efficiency over descendants',()=>{
  for(const [kind,part,capacity,expected] of [
    ['peg-leg','left-leg','moving',.8],['peg-leg','right-leg','moving',.8],
    ['wooden-hand','left-hand','manipulation',.8],['wooden-hand','right-hand','manipulation',.8],
    ['wooden-foot','left-foot','moving',.9],['wooden-foot','right-foot','moving',.9],
  ] as const){
    const h=missing(part);expect(assessMedical(h).capacities[capacity]).toBe(.5);
    expect(installWoodenPart(h,part,kind)).toBe(true);
    expect(assessMedical(h).capacities[capacity]).toBe(expected);
    expect(h.artificialParts).toEqual([{part,kind,installedAt:10000}]);
    expect(partMissing(h,part)).toBe(false);
    for(const child of HUMAN_BODY.filter(p=>p.parent===part)){
      expect(h.missing).toContainEqual({part:child.id,bornAt:10000,nonFresh:true});
      expect(partMissing(h,child.id)).toBe(true);expect(artificialPartCovering(h,child.id)?.part).toBe(part);
    }
    expect(medicalPain(h)).toBe(0);expect(medicalBleedUnits(h)).toBe(0);
  }
});

test('a person without both legs can stand after one peg leg, then walk at sixty percent with two',()=>{
  const h=missing('left-leg');h.missing.push({part:'right-leg',bornAt:0});
  expect(medicalStatus(h)).toBe('downed');expect(assessMedical(h).capacities.moving).toBe(0);
  expect(installWoodenPart(h,'left-leg','peg-leg')).toBe(true);
  expect(assessMedical(h).capacities.moving).toBe(.3);expect(medicalStatus(h)).toBe('mobile');
  expect(installWoodenPart(h,'right-leg','peg-leg')).toBe(true);
  expect(assessMedical(h).capacities.moving).toBe(.6);expect(medicalStatus(h)).toBe('mobile');
});

test('installation refuses intact, incompatible, absent-parent, artificial-parent, animal and dead bodies without mutation',()=>{
  const healthy=createMedicalRecord(10000),wrong=missing('left-hand'),parent=missing('left-leg'),nested=installed(),animal=missing('left-leg'),dead=missing('left-leg');
  animal.body='hare';dead.death={tick:10000,cause:'trauma'};
  for(const [record,part,kind] of [
    [healthy,'left-leg','peg-leg'],[wrong,'left-hand','peg-leg'],[parent,'left-foot','wooden-foot'],
    [nested,'left-foot','wooden-foot'],[nested,'left-leg','peg-leg'],[animal,'left-leg','peg-leg'],[dead,'left-leg','peg-leg'],
  ] as const){
    const before=structuredClone(record);
    expect(woodenPartInstallReason(record,part,kind)).toBeTypeOf('string');
    expect(installWoodenPart(record,part,kind)).toBe(false);expect(record).toEqual(before);
  }
  expect(woodenPartInstallReason(undefined,'left-leg','peg-leg')).toBeTypeOf('string');
});

test('an unreconciled lethal condition cannot be removed by installation',()=>{
  const h=missing('left-leg');h.bloodLoss=300_000_000;const before=structuredClone(h);
  expect(installWoodenPart(h,'left-leg','peg-leg')).toBe(false);expect(h).toEqual(before);
});

test('artificial wounds cause no pain, blood, scar or exposure and consume no clinical random draws',()=>{
  const h=installed();let draws=0;
  const wound=addResolvedInjury(h,'left-leg','cut',6*HP_UNIT,()=>{draws++;return 0;});
  expect(wound).toMatchObject({part:'left-leg',kind:'cut',severity:6000});
  expect(wound?.scar).toBeUndefined();expect(wound?.infection).toBeUndefined();expect(draws).toBe(0);
  expect(medicalPain(h)).toBe(0);expect(medicalBleedUnits(h)).toBe(0);
  expect(injuryInfectionChance(h,wound!)).toBe(0);
  expect(medicalPartInjuryRule(h,'left-leg')).toMatchObject({solid:true,skin:false,bleed:0,scarFactor:0});
  expect(assessMedical(h).capacities.moving).toBe(.73);
});

test('Core common healing still heals nonpermanent damage to an installed part',()=>{
  const h=installed();const wound=addResolvedInjury(h,'left-leg','gunshot',5000,()=>.99)!;
  advanceMedical(h,60,{phase:0,posture:'standing',starving:false},()=>0);
  expect(wound.severity).toBeLessThan(5000);expect(wound.severity).toBeGreaterThan(0);
  expect(h.artificialParts?.[0]).toEqual({part:'left-leg',kind:'peg-leg',installedAt:10000});
  expect(medicalPain(h)).toBe(0);expect(medicalBleedUnits(h)).toBe(0);
});

test('destruction removes the substitute and all child markers, leaving a nonfresh missing root at the real tick',()=>{
  const h=installed();h.tick=10023;
  addResolvedInjury(h,'left-leg','crack',BODY_PARTS['left-leg'].hp*HP_UNIT,()=>.99);
  expect(h.artificialParts).toBeUndefined();expect(h.injuries).toEqual([]);
  expect(h.missing).toEqual([{part:'left-leg',bornAt:10023,nonFresh:true}]);
  expect(freshMissing(h,h.missing[0]!)).toBe(false);expect(medicalPain(h)).toBe(0);expect(medicalBleedUnits(h)).toBe(0);
  expect(assessMedical(h).capacities.moving).toBe(.5);
  expect(installWoodenPart(h,'left-leg','peg-leg')).toBe(true);expect(assessMedical(h).capacities.moving).toBe(.8);
});

test('destruction of a natural parent also removes its artificial child and retains the natural stump wound',()=>{
  const h=installed('left-foot','wooden-foot');h.tick++;
  addResolvedInjury(h,'left-leg','bruise',BODY_PARTS['left-leg'].hp*HP_UNIT,()=>.99);
  expect(h.artificialParts).toBeUndefined();expect(h.missing).toEqual([{part:'left-leg',bornAt:h.tick}]);
  expect(freshMissing(h,h.missing[0]!)).toBe(true);expect(medicalPain(h)).toBeGreaterThan(0);expect(medicalBleedUnits(h)).toBeGreaterThan(0);
});

test('hit selection excludes replaced natural descendants, even with explicit internal targeting',()=>{
  const h=installed(),before=structuredClone(h);
  expect(resolveUnarmoredBullet(h,{part:'left-femur',damage:5},()=>.5).record).toEqual(h);
  expect(addResolvedInjury(h,'left-foot','cut',5000,()=>.5)).toBeNull();expect(h).toEqual(before);
  for(const roll of [0,.1,.2,.3,.4,.5,.6,.7,.8,.9,.999]){
    const part=selectBulletPart(h,()=>roll,'bottom');
    expect(part===null||part==='left-leg'||!artificialPartCovering(h,part)).toBe(true);
  }
});

test('melee and bomb use solid injury definitions; ordinary bullets preserve their Core gunshot definition',()=>{
  const h=installed(),original=structuredClone(h);
  const melee=resolveUnarmoredMelee(h,{part:'left-leg',kind:'cut',damage:2},()=>0);
  expect(melee.record.injuries.find(i=>i.part==='left-leg')?.kind).toBe('crack');
  expect(medicalPain(melee.record)).toBe(0);expect(medicalBleedUnits(melee.record)).toBe(0);
  const bomb=resolveBombImpact(h,{part:'left-leg',damage:2},()=>.99);
  expect(bomb.record.injuries[0]?.kind).toBe('crack');
  const bullet=resolveUnarmoredBullet(h,{part:'left-leg',damage:2},()=>.99);
  expect(bullet.record.injuries[0]?.kind).toBe('gunshot');
  expect(bullet.record.artificialParts?.[0]).not.toBe(h.artificialParts?.[0]);
  expect(medicalPain(bullet.record)).toBe(0);expect(medicalBleedUnits(bullet.record)).toBe(0);
  expect(h).toEqual(original);
});

test('medical assessment sees damage in place and rebuilding a missing part within the same tick',()=>{
  const h=missing('left-leg');expect(assessMedical(h).capacities.moving).toBe(.5);
  expect(installWoodenPart(h,'left-leg','peg-leg')).toBe(true);expect(assessMedical(h).capacities.moving).toBe(.8);
  const injury=addResolvedInjury(h,'left-leg','gunshot',3000,()=>.99)!;
  expect(assessMedical(h).capacities.moving).toBe(.77);
  injury.severity=6000;expect(assessMedical(h).capacities.moving).toBe(.73);
  const pawn=medicalCamp().pawns[0]!;pawn.health=h;expect(pawnBody(pawn).capacities.moving).toBe(.73);
});

test('installation surgery can fail on a missing site and damage present neighbours without installing anything',()=>{
  const h=missing('left-hand'),before=structuredClone(h);
  expect(()=>resolveSurgeryOutcome(h,'left-hand',.98,()=>0)).toThrow('Invalid surgery outcome');
  const success=resolveSurgeryOutcome(h,'left-hand',.98,()=>0,{allowMissingPart:true});
  expect(success.kind).toBe('success');expect(success.record.artificialParts).toBeUndefined();
  const failed=resolveSurgeryOutcome(h,'left-hand',0,()=>.9,{allowMissingPart:true});
  expect(failed.kind).toBe('minor');expect(failed.hits.length).toBeGreaterThan(0);
  expect(failed.record.artificialParts).toBeUndefined();expect(partMissing(failed.record,'left-hand')).toBe(true);
  expect(h).toEqual(before);
});

test('a surgical failure hitting an already installed substitute uses the shared solid physiology',()=>{
  const h=installed(),hit=applySurgeryDamage(h,'left-leg',2,'crush',()=>.99);
  expect(hit.layers[0]?.kind).toBe('crack');expect(medicalPain(h)).toBe(0);expect(medicalBleedUnits(h)).toBe(0);
});

test('the three definitions retain Core efficiencies, surgical work units and doctor threshold',()=>{
  expect(WOODEN_PARTS['peg-leg']).toMatchObject({efficiency:.6,work:1500,medicineSkill:3});
  expect(WOODEN_PARTS['wooden-hand']).toMatchObject({efficiency:.6,work:1500,medicineSkill:3});
  expect(WOODEN_PARTS['wooden-foot']).toMatchObject({efficiency:.8,work:1000,medicineSkill:3});
});
