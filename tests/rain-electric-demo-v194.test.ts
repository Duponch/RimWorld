import { withoutMiningSkill } from './scenarios/legacy-skills.ts';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { prepareRainElectricDemo, RAIN_ELECTRIC_DEMO_ID } from '../scripts/create-test-save-rain-electric-v194.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { PowerTopologyCache, connectedPowerGroups } from '../src/sim/power-topology.ts';
import { isRainElectricalKind, rainElectricalEligible } from '../src/sim/rain-electric.ts';
import { batteryWattDays } from '../src/sim/power-battery.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { weatherRainRate } from '../src/sim/weather.ts';

test('V194 preparation has actual connected fuel/charge, covered/stopped controls and no risk already produced', () => {
  const w = prepareRainElectricDemo();
  expect(validateWorld(w)).toEqual([]); expect(w.seed).toBe(6160); expect(w.tick).toBe(0);
  expect(w.pawns).toHaveLength(3); expect(w.jobs).toHaveLength(0);
  expect(w.rainElectrical).toBeUndefined(); expect(w.fires).toBeUndefined();
  expect(w.structures.every(s => !s.damage && !s.breakdown)).toBe(true);
  const candidates = w.structures.filter(s => isRainElectricalKind(s.kind));
  expect(candidates.map(s => s.kind)).toEqual(['battery', 'heater', 'heater', 'heater']);
  expect(candidates.map(s => rainElectricalEligible(w, s))).toEqual([true, false, false, false]);
  expect(batteryWattDays(candidates[0]!.battery!)).toBe(101);
  expect(candidates[2]!.power!.switchOn).toBe(false);
  expect(weatherRainRate(w)).toBe(1); expect(w.roofing!.constructed).toEqual([10 * 32 + 18]);
  const groups = connectedPowerGroups(w, new PowerTopologyCache().read(w));
  const net = groups.find(g => g.some(s => s.id === candidates[0]!.id))!;
  expect(net.some(s => s.kind === 'wood-generator' && s.fuel!.ticks === 45000 && s.fuel!.burned === 0)).toBe(true);
  expect(net.filter(s => s.kind === 'power-conduit')).toHaveLength(5);
  expect(candidates.slice(1).every(s => s.power!.parentId !== null)).toBe(true);
  expect(w.piles.every(p => p.owner.type === 'ground')).toBe(true);
  expect(w.pawns.every(p => p.jobId === null && p.path.length === 0)).toBe(true);
});

test('a real first continuation adopts the stream, makes the Core97 contact and replays exactly after it', () => {
  const w = prepareRainElectricDemo(), before = deserializeWorld(serializeWorld(w));
  stepWorld(w, 10); stepWorld(before, 10);
  expect(w).toEqual(before); expect(w.rainElectrical).toMatchObject({ adoptedAt: 0, discharges: 1, lastDischarge: { coreTick: 97, kind: 'battery' } });
  expect(w.structures[0]!.damage).toBeGreaterThan(0); expect(w.fires!.ledger.ignitions).toBeGreaterThan(0);
  expect(validateWorld(w)).toEqual([]);
  const replay = deserializeWorld(serializeWorld(w)); stepWorld(w, 30); stepWorld(replay, 30);
  expect(replay).toEqual(w); expect(validateWorld(w)).toEqual([]);
});

test('the published forty-fourth scene matches its strict generated initial state and exact SHA', () => {
  const raw = readFileSync('public/test-saves/v194/pluie-et-appareils.json', 'utf8');
  const manifest = JSON.parse(readFileSync('public/test-saves/manifest.json', 'utf8'));
  expect(manifest.saves.length).toBeGreaterThanOrEqual(44);
  const entry = manifest.saves.find((s: { id: string }) => s.id === RAIN_ELECTRIC_DEMO_ID);
  expect(entry).toMatchObject({ release: 'v194', prepared: true, pawns: 3, colonists: 3, width: 32, height: 32, tick: 0 });
  expect(entry.sha256).toBe(createHash('sha256').update(raw).digest('hex'));
  expect(deserializeWorld(raw)).toEqual(withoutMiningSkill(prepareRainElectricDemo()));
});
