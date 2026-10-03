import { expect, test } from 'vitest';
import { prepareRainElectricDemo } from '../scripts/create-test-save-rain-electric-v194.ts';
import { applyCommand } from '../src/sim/engine.ts';
import { BATTERY_ENERGY_SCALE } from '../src/sim/power-battery.ts';
import { rainElectricalInspection, powerInspection } from '../src/ui/power-inspection.ts';

test('inspection distinguishes charged exposure, actual roof and inactive apparatus without changing the world', () => {
  const w = prepareRainElectricDemo(), before = JSON.stringify(w);
  const [battery, covered, stopped, exposed] = w.structures;
  expect(rainElectricalInspection(w, battery!)).toContain('risque de décharge');
  expect(rainElectricalInspection(w, covered!)).toContain('protégé par le toit');
  expect(rainElectricalInspection(w, stopped!)).toContain('actuellement arrêté');
  expect(rainElectricalInspection(w, exposed!)).toContain('sans alimentation');
  expect(powerInspection(w, battery!)).toContain('protéger son ancrage par un toit');
  expect(JSON.stringify(w)).toBe(before);
});

test('a requested stop does not claim protection before the actual switch changes', () => {
  // Prepared UI boundary only; the demo/native proves real supply and contact.
  const w = prepareRainElectricDemo(), s = w.structures[3]!; s.power!.on = true;
  expect(applyCommand(w, { type: 'power-flick', structureId: s.id, on: false }).ok).toBe(true);
  const before = JSON.stringify(w);
  expect(w.jobs.some(j => j.flick?.structureId === s.id)).toBe(true);
  expect(rainElectricalInspection(w, s)).toContain('exposé et alimenté');
  expect(JSON.stringify(w)).toBe(before);
  s.power!.switchOn = false;
  expect(rainElectricalInspection(w, s)).toContain('actuellement arrêté');
});

test('requested roof remains exposure, the anchor roof protects and exactly100Wd remains safe', () => {
  const w = prepareRainElectricDemo(), battery = w.structures[0]!;
  expect(applyCommand(w, { type: 'area', action: 'build-roof', from: battery, to: battery }).ok).toBe(true);
  expect(rainElectricalInspection(w, battery)).toContain('risque de décharge');
  battery.battery!.stored = 100 * BATTERY_ENERGY_SCALE;
  expect(rainElectricalInspection(w, battery)).toContain('sans risque de décharge à cette charge');
  battery.battery!.half = true;
  expect(rainElectricalInspection(w, battery)).toContain('risque de décharge');
  w.roofing!.constructed.push(battery.z * w.width + battery.x); w.roofing!.constructed.sort((a, b) => a - b);
  expect(rainElectricalInspection(w, battery)).toContain('protégé par le toit');
});

test('uninvolved electrical categories and pre181 snapshots acquire no new warning', () => {
  const w = prepareRainElectricDemo(), generator = w.structures.find(s => s.kind === 'wood-generator')!;
  expect(rainElectricalInspection(w, generator)).toBe('');
  (w as unknown as {schemaVersion:number}).schemaVersion = 180;
  expect(rainElectricalInspection(w, w.structures[0]!)).toBe('');
});
