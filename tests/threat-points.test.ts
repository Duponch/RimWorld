import {expect,test} from 'vitest';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {advanceThreatAdaptationHalfDay,computeThreatPoints,loseThreatAdaptationForColonistLoss,
  loseThreatAdaptationForViolentDowning,summaryHealthPercent} from '../src/sim/threat-points.ts';

const base = {knownWealth: 20000, freeColonists: 3, colonistHealthSum: 3,
  elapsedDays: 11, adaptationDays: 0, seedBucket: 26};

test('ordinary points cross the wealth curve and floor independently of the fixed introductory raid', () => {
  const poor = computeThreatPoints(base);
  expect(poor.wealthPoints).toBeCloseTo(2400 * 6000 / 386000);
  expect(poor.colonistPoints).toBeCloseTo(3 * (15 + 125 * 10000 / 390000));
  expect(poor.adaptationFactor).toBe(.8);
  expect(poor.timeFactor).toBeCloseTo(.71);
  expect(poor.unclampedPoints).toBeLessThan(35);
  expect(poor.points).toBe(35);

  const richer = computeThreatPoints({...base, knownWealth: 80000});
  expect(richer.points).toBeCloseTo(178.1266, 2);
  expect(richer.points).toBeGreaterThan(poor.points);
  expect(computeThreatPoints({...base, knownWealth: 1_000_000, elapsedDays: 50,
    adaptationDays: 100, freeColonists: 100, colonistHealthSum: 100}).points).toBe(10000);
});

test('health weighs colonists rather than the entire wealth contribution', () => {
  const healthy = computeThreatPoints({...base, knownWealth: 200000});
  const injured = computeThreatPoints({...base, knownWealth: 200000, colonistHealthSum: 1.5});
  const perColonist = 15 + 125 * 190000 / 390000;
  expect(healthy.colonistPoints - injured.colonistPoints).toBeCloseTo(.65 * 1.5 * perColonist);
  expect(healthy.wealthPoints).toBe(injured.wealthPoints);
  expect(() => computeThreatPoints({...base, colonistHealthSum: 4})).toThrow(RangeError);
});

test('minimum is stable per bucket and rises only after day 12', () => {
  const a = computeThreatPoints({...base, knownWealth: 0, freeColonists: 0,
    colonistHealthSum: 0, elapsedDays: 35});
  const b = computeThreatPoints({...base, knownWealth: 0, freeColonists: 0,
    colonistHealthSum: 0, elapsedDays: 35});
  expect(a.minimum).toBe(b.minimum);
  expect(a.minimum).toBeGreaterThan(35);
  expect(a.minimum).toBeLessThan(70);
  expect(computeThreatPoints({...base, elapsedDays: 12}).minimum).toBe(35);
});

test('adaptation grace, recovery, and event losses use separate Core curves', () => {
  expect(advanceThreatAdaptationHalfDay(0, 29.9)).toBe(0);
  expect(advanceThreatAdaptationHalfDay(0, 30)).toBe(.5);
  expect(advanceThreatAdaptationHalfDay(.5, 30.5)).toBe(.875);
  expect(advanceThreatAdaptationHalfDay(-6, 11)).toBe(-4.5);
  expect(loseThreatAdaptationForViolentDowning(0, 3)).toBe(-6);
  expect(loseThreatAdaptationForColonistLoss(0, 2)).toBe(-30);
  expect(loseThreatAdaptationForColonistLoss(-50, 2)).toBe(-60);
});

test('summary health follows acute injury and fresh missing anatomy, not consciousness', () => {
  const record = createMedicalRecord();
  expect(summaryHealthPercent(record)).toBe(1);
  record.injuries.push({id: 1, part: 'left-arm', kind: 'cut', severity: 15000, bornAt: 0});
  expect(summaryHealthPercent(record)).toBeCloseTo(.8);
  record.injuries[0]!.scar = {threshold: 15000, pain: 0};
  expect(summaryHealthPercent(record)).toBe(1);
  record.missing.push({part: 'left-hand', bornAt: 0});
  expect(summaryHealthPercent(record)).toBeCloseTo(1 - 20 / 75);
  record.missing[0]!.tended = true;
  expect(summaryHealthPercent(record)).toBe(1);
  record.death = {tick: 0, cause: 'trauma'};
  expect(summaryHealthPercent(record)).toBe(0);
});
