import { expect, test } from 'vitest';
import type { StockpileCell, Structure } from '../src/sim/types';
import { storageZoneSignature } from '../src/render/storage-zone-presentation';
import { HomePresentationSignature, StoragePresentationSignature, StructurePresentationSignature } from '../src/render/presentation-signatures';

// Signature-only queries; mixed optional extensions below are deliberately not
// fixtures claiming admissibility as a complete persisted World.
const building = (id: number): Structure => ({ id, kind: 'bed', x: id, z: 4, material: 'wood', orientation: 0, footprint: 'standard' });
const stockpile = (id: number, x: number): StockpileCell => ({ id, x, z: 4, priority: 1, capacity: 75, filters: { wood: true, food: false } });
// Frozen inline producer from V228 ColonyRenderer, independent of cache state.
const originalStructures = (structures: readonly Structure[], axes = '', packages = '') => axes + packages + structures.map(s => `${s.id}:${s.kind}:${s.material}:${s.x}:${s.z}:${s.orientation}:${s.footprint}:${s.medical}:${s.grave?.corpseId}:${s.flower?.plant ? `${s.flower.plant.hitPoints > 0}:${Math.floor(s.flower.plant.growth * 4)}` : ''}:${s.power?.on}:${s.power?.parentId}:${s.power?.switchOn}:${s.breakdown?.brokenAt ?? ''}:${s.fuel ? s.fuel.ticks > 0 : ''}`).join('|');

test('structure signatures recapture mutable scalar fields, source order and exact external prefixes', () => {
  const cache = new StructurePresentationSignature(), first = building(1), second = building(2), source = [first, second];
  const check = (axes = '', packages = '', reset = false) => expect(cache.read(source, axes, packages, reset)).toBe(originalStructures(source, axes, packages));
  check(); check();
  for (const mutation of [
    () => { first.id = 8; }, () => { first.kind = 'table'; }, () => { first.material = 'steel'; },
    () => { first.x = 19; }, () => { first.z = 20; }, () => { first.orientation = 2; },
    () => { first.footprint = 'legacy-single'; }, () => { first.medical = true; },
    () => { first.grave = { colonists: true, strangers: false, corpseId: 10 }; },
    () => { first.power = { on: false, parentId: null }; }, () => { first.power!.on = true; },
    () => { first.power!.parentId = 20; }, () => { first.power!.switchOn = false; },
    () => { first.breakdown = { brokenAt: 1 }; }, () => { first.breakdown!.brokenAt = 2; },
    () => { first.fuel = { ticks: 0, burned: 0, autoRefuel: true }; }, () => { first.fuel!.ticks = 1; },
    () => { source.reverse(); }, () => { source.push(building(3)); }, () => { source.splice(1, 1); },
  ]) { mutation(); check(); check(); }
  check('10,0:11,1', '4:wood:20:20'); check('10,1:11,1', '4:wood:20:20');
  check('10,1:11,1', '4:steel:20:20'); check('', '', true);
  cache.clear(); check(); source.length = 0; check();
});

test('flower/fuel thresholds, nullish rendering, NaN and unsupported coercions retain original bytes', () => {
  const cache = new StructurePresentationSignature(), s = building(1), source = [s];
  s.flower = { allowSow: true, plant: { species: 'daylily', sownAt: 0, lastTick: 0, growth: .249, ageCore: 0, unlitCore: 0, hitPoints: 1 } };
  const check = () => expect(cache.read(source, '', '')).toBe(originalStructures(source));
  check(); Object.assign(s.flower.plant!, { growth: .25 }); check();
  Object.assign(s.flower.plant!, { growth: .251 }); check();
  Object.assign(s.flower.plant!, { hitPoints: 0 }); check();
  s.flower = { allowSow: false }; check(); delete s.flower; check();
  s.x = NaN; check(); check(); s.x = -0; check(); s.x = 0; check();
  Object.assign(s, { medical: null }); check(); delete s.medical; check();
  // Objects interpolated by old code have observable coercion and must not
  // become primitive receipts. These calls each invoke the original formatter.
  let material = 'wood:a', calls = 0;
  Object.assign(s, { material: { toString: () => { calls++; return material; } } });
  expect(cache.read(source, '', '')).toContain('wood:a'); expect(calls).toBe(1);
  material = 'wood:b'; expect(cache.read(source, '', '')).toContain('wood:b'); expect(calls).toBe(2);
  Object.assign(s, { material: Symbol('invalid') });
  expect(() => cache.read(source, '', '')).toThrow(TypeError);
  s.material = 'wood'; check();
});

test('storage signatures retain own enumerable strict-true membership, unknown keys and source ordering', () => {
  const cache = new StoragePresentationSignature(), a = stockpile(1, 2), b = stockpile(1, 3), source = [a, b];
  const check = (reset = false) => expect(cache.read(source, reset)).toBe(storageZoneSignature(source));
  check(); check();
  Object.assign(a.filters, { mystery: true, truthy: 1, stringTrue: 'true', nil: null, 'a,b': true }); check();
  Object.defineProperty(a.filters, 'hidden', { value: true, enumerable: false });
  Object.defineProperty(a.filters, Symbol('symbol'), { value: true, enumerable: true }); check();
  const inherited = Object.create({ inherited: true }); Object.assign(inherited, { food: false, wood: true }); a.filters = inherited; check();
  a.filters.wood = false; check(); a.filters.wood = true; check();
  a.items = {}; check(); a.items.wood = true; check(); delete a.items; check();
  a.filters = { wood: true, food: false }; Object.assign(a.filters, { a: true, b: true }); check();
  // One comma-bearing key and two separate keys intentionally collide in the
  // legacy string. Membership changes must not invent a different signature.
  a.filters = { wood: true, food: false }; Object.assign(a.filters, { 'a,b': true }); check();
  a.priority = 2; check(); a.capacity = 100; check(); a.id = 3; check(); a.x = 7; check(); a.z = 8; check();
  source.reverse(); check(); source.push(stockpile(2, 9)); check(); source.splice(1, 1); check();
  check(true); cache.clear(); check(); source.length = 0; check();
});

test('a failed read cannot publish a partial cache; home preserves mutable order and join semantics', () => {
  const cache = new StoragePresentationSignature(), a = stockpile(1, 1), b = stockpile(2, 2), source = [a, b];
  expect(cache.read(source)).toBe(storageZoneSignature(source));
  a.capacity = 999;
  Object.defineProperty(b.filters, 'broken', { enumerable: true, configurable: true, get: () => { throw new Error('policy getter'); } });
  expect(() => cache.read(source)).toThrow('policy getter');
  Reflect.deleteProperty(b.filters, 'broken');
  expect(cache.read(source)).toBe(storageZoneSignature(source));
  const homes = new HomePresentationSignature(), home = [8, 4, 8];
  const checkHome = () => expect(homes.read(home)).toBe(home.join(','));
  checkHome(); home.reverse(); checkHome(); home[0] = 99; checkHome(); home.push(6); checkHome();
  Object.assign(home, { 0: undefined, 1: null }); checkHome();
  Object.assign(home, { 0: Symbol('bad-home') }); expect(() => homes.read(home)).toThrow(TypeError);
  home[0] = 5; checkHome(); expect(homes.read(undefined)).toBe(''); home.length = 0; checkHome();
});
