import type { WorldEvent } from '../../src/sim/types.ts';

/** Physical food-account conversion confirmed by a completed simple-meal job. */
export interface SimpleMealTotals {
  operations: number;
  singleOperations: number;
  bulkOperations: number;
  portions: number;
  ingredients: number;
  unitDelta: number;
}

/** Persist alongside a campaign checkpoint, never inside World. */
export interface SimpleMealLedger {
  totals: SimpleMealTotals;
  /** Lifetime multiplicity, kept for checkpoint diagnostics. */
  seen: Record<string, number>;
  /** Ordered event window disambiguates an old event from a later identical one. */
  window: string[];
  /** Latest event tick accepted; stale snapshots cannot rewind the window. */
  lastTick: number;
}

const SINGLE = /^.+ a cuisiné 1 repas simple \((\d+) baies, (\d+) riz(?:, (\d+) viande)?(?:, (\d+) pommes de terre)?(?:, (\d+) maïs)?(?:, (\d+) fruits d’agave)?\)\.$/;
const BULK = /^.+ a cuisiné 4 repas simples\.$/;

function portionsFor(event: WorldEvent): 0 | 1 | 4 {
  if (!event || event.type !== 'job' || !Number.isSafeInteger(event.tick) || event.tick < 0 || typeof event.message !== 'string') return 0;
  if (BULK.test(event.message)) return 4;
  const match = SINGLE.exec(event.message);
  if (!match) return 0;
  const counts = match.slice(1).map(value => value === undefined ? 0 : Number(value));
  return counts.every(Number.isSafeInteger) && counts.reduce((sum, count) => sum + count, 0) === 10 ? 1 : 0;
}

function eventKey(event: WorldEvent): string {
  return JSON.stringify([event?.tick, event?.type, event?.message]);
}

function sharedWindowTail(previous: readonly string[], current: readonly string[]): number {
  for (let size = Math.min(previous.length, current.length); size > 0; size--) {
    if (previous.slice(-size).every((key, index) => key === current[index])) return size;
  }
  return 0;
}

function latestEventTick(events: readonly WorldEvent[]): number {
  let latest = -1;
  for (const event of events) if (event && Number.isSafeInteger(event.tick) && event.tick >= 0) latest = Math.max(latest, event.tick);
  return latest;
}

/** Seed the already visible event window without crediting past cooking. */
export function createSimpleMealLedger(initialEvents: readonly WorldEvent[] = []): SimpleMealLedger {
  const seen: Record<string, number> = {};
  for (const event of initialEvents) if (portionsFor(event)) {
    const key = eventKey(event);
    seen[key] = (seen[key] ?? 0) + 1;
  }
  return {
    totals: { operations: 0, singleOperations: 0, bulkOperations: 0, portions: 0, ingredients: 0, unitDelta: 0 },
    seen,
    window: initialEvents.map(eventKey),
    lastTick: latestEventTick(initialEvents),
  };
}

/** Observe a World.events snapshot; overlapping windows never credit an event twice. */
export function observeSimpleMealLedger(ledger: SimpleMealLedger, events: readonly WorldEvent[]): SimpleMealTotals {
  const latest = latestEventTick(events);
  if (latest < 0 || latest < ledger.lastTick) return ledger.totals;
  const current = events.map(eventKey);
  // A delayed snapshot can be a shorter prefix ending at the same tick.
  // A real bounded journal evicts its head, never its newly appended tail.
  if (latest === ledger.lastTick && current.length < ledger.window.length
    && current.every((key, index) => key === ledger.window[index])) return ledger.totals;
  const overlap = sharedWindowTail(ledger.window, current);
  for (let index = overlap; index < events.length; index++) {
    const event = events[index]!;
    const portions = portionsFor(event);
    if (!portions) continue;
    const key = current[index]!;
    ledger.seen[key] = (ledger.seen[key] ?? 0) + 1;
    ledger.totals.operations++;
    ledger.totals.singleOperations += portions === 1 ? 1 : 0;
    ledger.totals.bulkOperations += portions === 4 ? 1 : 0;
    ledger.totals.portions += portions;
    ledger.totals.ingredients += portions * 10;
    ledger.totals.unitDelta += portions * 9;
  }
  ledger.window = current;
  ledger.lastTick = latest;
  return ledger.totals;
}
