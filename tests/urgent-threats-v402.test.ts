import { expect, test } from 'vitest';
import { UrgentThreatObserver, UrgentThreatDelivery, validUrgentThreatSnapshot } from '../src/bridge/urgent-threats';
import type { World } from '../src/sim/types';
import type { WildAnimal } from '../src/sim/wildlife-state';
// Deliberately partial observer inputs only; these are never serialized as saves.
const world = () => ({ tick: 10, wildlife: { animals: [] } } as unknown as World);
function raid(w: World, id = 1, mech = false) {
  w.raids ??= { profile: 'camp-raids-v1', rng: 1, nextCheck: null, serial: 0, completed: 0, departed: [] };
  if (mech) w.raids.mechActive = { id, startedAt: w.tick, members: [id + 100], lost: [], phase: 'staging' } as unknown as NonNullable<World['raids']>['mechActive'];
  else w.raids.active = { id, startedAt: w.tick, members: [id + 100], lost: [], phase: 'assault', deadline: 1000, lossPermille: 500 };
}
function rage(w: World, id: number) {
  w.wildlife!.animals.push({ id, state: 'idle', manhunter: { startedAtCore: w.tick * 10, rng: 1, zeroRestTicks: 0 } } as WildAnimal);
}
test('bootstrap suppresses existing active episodes and archives can never reappear as arrivals', () => {
  const w = world(); raid(w); rage(w, 20); const observer = new UrgentThreatObserver(); observer.bootstrap(w);
  expect(observer.capture(w, 'any-threat')).toBe(false); delete w.raids!.active;
  observer.capture(w, 'any-threat'); w.raids!.last = { id: 1, tick: 10, reason: 'defended', killed: 0, downed: 0, escaped: 0 };
  expect(observer.capture(w, 'any-threat')).toBe(false); expect(observer.snapshot().serial).toBe(0);
});
test('new secondary map is primed before its first tick, whose real arrival is observed remotely', () => {
  const w = world(), other = world(), observer = new UrgentThreatObserver(); observer.bootstrap(w);
  w.secondarySite = { map: other } as unknown as World['secondarySite']; observer.prepareMaps(w);
  raid(other, 8, true); w.tick++;
  expect(observer.capture(w, 'major')).toBe(true);
  expect(observer.snapshot().rows).toEqual([{ site: 'secondary', kind: 'mechanoid', totalArrivals: 1, lastTick: 11, lastCount: 1, actorId: 108 }]);
  w.secondarySite!.selected = true; observer.prepareMaps(w); expect(observer.capture(w, 'major')).toBe(false);
});
test('two Single episodes remain small under Major, while AnyThreat pauses on a later episode', () => {
  const w = world(), observer = new UrgentThreatObserver(); observer.bootstrap(w); rage(w, 1); rage(w, 2);
  expect(observer.capture(w, 'major')).toBe(false); expect(observer.snapshot().rows[0]!.totalArrivals).toBe(2);
  rage(w, 3); expect(observer.capture(w, 'any-threat')).toBe(true);
  w.wildlife!.animals[2]!.state = 'downed'; observer.capture(w, 'any-threat'); w.wildlife!.animals[2]!.state = 'idle';
  expect(observer.capture(w, 'any-threat')).toBe(false); expect(observer.snapshot().serial).toBe(3);
});
test('Never announces without pausing; toggling mode does not replay an episode', () => {
  const w = world(), observer = new UrgentThreatObserver(); observer.bootstrap(w); raid(w);
  expect(observer.capture(w, 'never')).toBe(false); expect(observer.snapshot().serial).toBe(1);
  expect(observer.capture(w, 'any-threat')).toBe(false); expect(observer.snapshot().pauseRevision).toBe(0);
});
test('queued speed and an explicit request that discovers its own pause cannot override it', () => {
  const w = world(), observer = new UrgentThreatObserver(); observer.bootstrap(w); const old = observer.token(); raid(w); observer.capture(w, 'major');
  expect(observer.requestedSpeed(6, { explicit: true, token: old }, old)).toBe(0);
  const known = observer.token(); expect(observer.requestedSpeed(6, undefined, known)).toBe(0);
  expect(observer.requestedSpeed(1, { explicit: true, token: known }, known)).toBe(1);
  delete w.raids!.active; observer.capture(w, 'major'); const before = observer.token(); raid(w, 2); observer.capture(w, 'major');
  expect(observer.requestedSpeed(6, { explicit: true, token: before }, before)).toBe(0);
});
test('first received cumulative packet delivers from zero; rejected adoption does not consume arrivals; view/resync cannot replay', () => {
  const w = world(), observer = new UrgentThreatObserver(), delivery = new UrgentThreatDelivery(); observer.bootstrap(w); raid(w); observer.capture(w, 'major');
  const packet = observer.snapshot(); expect(delivery.accepts(packet, w.tick, 0)).toBe(true);
  expect(delivery.token()).toEqual({ generation: 0, pauseRevision: 0 }); // Decoder has not applied yet.
  expect(delivery.commit(packet, w.tick)?.rows[0]!.delta).toBe(1);
  expect(delivery.accepts(packet, w.tick, 0)).toBe(true); expect(delivery.commit(packet, w.tick)).toBeUndefined();
  const stale = { ...packet, serial: 0, rows: [] }; expect(delivery.accepts(stale, w.tick, 0)).toBe(false);
  observer.bootstrap(w); expect(delivery.accepts(observer.snapshot(), w.tick, 0)).toBe(true);
  expect(delivery.commit(observer.snapshot(), w.tick)).toBeUndefined();
});
test('metadata rejects malformed, getters, symbols, future ticks, held positive speed and row regression', () => {
  const w = world(), observer = new UrgentThreatObserver(); observer.bootstrap(w); raid(w); observer.capture(w, 'major'); const packet = observer.snapshot();
  let reads = 0; const getter = Object.defineProperty({ ...packet }, 'serial', { get() { reads++; return 1; } });
  expect(validUrgentThreatSnapshot(getter, 10, 0)).toBe(false); expect(reads).toBe(0);
  expect(validUrgentThreatSnapshot({ ...packet, [Symbol()]: 1 }, 10, 0)).toBe(false);
  expect(validUrgentThreatSnapshot(packet, 10, 6)).toBe(false);
  expect(validUrgentThreatSnapshot({ ...packet, rows: [{ ...packet.rows[0]!, lastTick: 11 }] }, 10, 0)).toBe(false);
  const delivery = new UrgentThreatDelivery(); delivery.commit(packet, 10);
  expect(delivery.accepts({ ...packet, rows: [{ ...packet.rows[0]!, actorId: 999 }] }, 10, 0)).toBe(false);
  const never = { ...packet, pauseRevision: 0, urgentHeld: false }, quiet = new UrgentThreatDelivery(); quiet.commit(never, 10);
  expect(quiet.accepts({ ...never, pauseRevision: 1, urgentHeld: true }, 10, 0)).toBe(false);
  expect(quiet.accepts({ ...never, urgentHeld: true }, 10, 0)).toBe(false);
});
