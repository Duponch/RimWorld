import { describe, expect, test } from 'vitest';
import { addGroundMaterial, applyCommand, createWorld, deserializeWorld, hashWorld, refreshStock, serializeWorld, stepWorld, validateWorld } from '../src/sim/index.ts';
import type { Command, ResourceKind, World } from '../src/sim/index.ts';
import legacyFixture from './fixtures/schema-1-active-construction.json';

function fixture(pawnCount = 3): World {
  const world = createWorld(42, 16, 16);
  world.tiles = world.tiles.map(() => ({ terrain: 'grass' }));
  world.resources = []; world.piles = []; world.stockpiles = [];
  world.pawns = world.pawns.slice(0, pawnCount);
  world.pawns.forEach((pawn, index) => { pawn.x = 2 + index; pawn.z = 2; pawn.hunger = 100; pawn.rest = 100; });
  addGroundMaterial(world, 'wood', 12, { x: 1, z: 5 });
  addGroundMaterial(world, 'food', 18, { x: 1, z: 6 }); refreshStock(world);
  return world;
}
function resource(world: World, x: number, z: number, kind: ResourceKind, amount = 12): void {
  world.resources.push({ id: world.nextId++, x, z, kind, amount });
}
function command(world: World, order: Command): void { expect(applyCommand(world, order), JSON.stringify(order)).toEqual({ ok: true }); }
function order(world: World, kind: 'chop' | 'harvest' | 'wall' | 'bed', x: number, z: number, orientation: 0 | 1 | 2 | 3 = 0): void {
  command(world, { type: 'designate', kind, x, z, orientation });
}
function zone(world: World, x: number, z: number, capacity = 75, wood = true, food = false): void {
  command(world, { type: 'stockpile', x, z, enabled: true, filters: { wood, food }, capacity, priority: 4 });
}
// Independent material oracle: fixture building costs are intentionally not imported from the engine.
function woodMass(world: World): number {
  return world.piles.reduce((sum, pile) => sum + (pile.kind === 'wood' ? pile.quantity : 0), 0)
    + world.resources.reduce((sum, item) => sum + (item.kind === 'tree' ? item.amount : 0), 0)
    + world.structures.reduce((sum, item) => sum + (item.kind === 'bed' ? 8 : 5), 0);
}
function foodMass(world: World): number {
  return world.piles.reduce((sum, pile) => sum + (pile.kind === 'food' ? pile.quantity : 0), 0)
    + world.resources.reduce((sum, item) => sum + (item.kind === 'berries' ? item.amount : 0), 0);
}
function groundAt(world: World, x: number, z: number): number {
  return world.piles.reduce((sum, pile) => sum + (pile.owner.type === 'ground' && pile.owner.x === x && pile.owner.z === z ? pile.quantity : 0), 0);
}
function audit(world: World, expectedWood: number): void {
  const context = `seed=${world.seed} tick=${world.tick}`;
  expect(woodMass(world), context).toBe(expectedWood); expect(validateWorld(world), context).toEqual([]);
  const free = { wood: 0, food: 0 };
  for (const pile of world.piles) if (pile.owner.type !== 'job') free[pile.kind] += pile.quantity;
  expect(world.stock, context).toEqual(free);
  const overcommitted = world.piles.filter(pile => {
    const reserved = world.pawns.reduce((sum, pawn) => sum + (pawn.haul?.phase === 'pickup' && pawn.haul.sourcePileId === pile.id ? pawn.haul.quantity : 0), 0);
    return reserved > pile.quantity;
  }).map(pile => pile.id);
  expect(overcommitted, `${context} overcommitted piles`).toEqual([]);
}
function until(world: World, predicate: () => boolean, description: string, limit = 2000): void {
  const mass = woodMass(world);
  for (let tick = 0; tick < limit && !predicate(); tick++) { stepWorld(world); audit(world, mass); }
  expect(predicate(), `${description}; tick=${world.tick}; pawns=${JSON.stringify(world.pawns)}; jobs=${JSON.stringify(world.jobs)}`).toBe(true);
}
function checkedTicks(world: World, ticks: number): void {
  const mass = woodMass(world);
  for (let tick = 0; tick < ticks; tick++) { stepWorld(world); audit(world, mass); }
}
// Captured from the schema-1 engine before migration; the border bed exercises legacy footprints.
function legacySave(): string { return JSON.stringify(legacyFixture); }

describe('deterministic colony simulation', () => {
  test('replay and saves at pickup, carrying, delivery and construction resume exactly', () => {
    expect(hashWorld(createWorld(9))).toBe(hashWorld(createWorld(9))); expect(hashWorld(createWorld(9))).not.toBe(hashWorld(createWorld(10)));
    function scenario(): World {
      const world = fixture(1); resource(world, 13, 13, 'tree'); resource(world, 10, 10, 'berries');
      world.pawns[0]!.priorities.haul = 1;
      order(world, 'chop', 13, 13); order(world, 'harvest', 10, 10); order(world, 'bed', 7, 8, 1); return world;
    }
    const original = scenario(); const replay = scenario(); const captures = new Map<string, string>(); const mass = woodMass(original);
    for (let tick = 0; tick < 1400; tick++) {
      stepWorld(original); audit(original, mass);
      const pawn = original.pawns[0]!;
      const stage = pawn.haul?.phase ?? (original.jobs.some(job => job.progress > 0 && job.kind === 'bed') ? 'construction' : null);
      if (stage && !captures.has(stage)) captures.set(stage, serializeWorld(original));
      if (!captures.has('delivered') && original.piles.some(pile => pile.owner.type === 'job')) captures.set('delivered', serializeWorld(original));
    }
    expect([...captures.keys()].sort()).toEqual(['construction', 'deliver', 'delivered', 'pickup']);
    for (const saved of captures.values()) {
      const resumed = deserializeWorld(saved); stepWorld(resumed, original.tick - resumed.tick); expect(hashWorld(resumed)).toBe(hashWorld(original));
    }
    for (const chunk of [111, 300, 7, 482, 500]) stepWorld(replay, chunk);
    expect(hashWorld(original)).toBe(hashWorld(replay)); expect(original.jobs).toHaveLength(0);
    expect(original.resources).toHaveLength(0); expect(original.structures).toHaveLength(1);
    const before = hashWorld(original); stepWorld(original, 0); expect(hashWorld(original)).toBe(before);
    for (const ticks of [-1, 0.1, Infinity, 100001]) expect(() => stepWorld(original, ticks)).toThrow();
  });

  test('shared piles, partial capacities and interruptions preserve matter at every transfer boundary', () => {
    // Chapters 9/10/32, SYS-041..061: G0 portion of scene A, before recipes and electricity.
    const shared = fixture(); shared.piles = []; refreshStock(shared);
    addGroundMaterial(shared, 'wood', 20, { x: 1, z: 6 }); refreshStock(shared);
    addGroundMaterial(shared, 'wood', 3, { x: 12, z: 8 });
    shared.pawns.forEach(pawn => { pawn.priorities = { gather: 0, build: 0, haul: 1 }; });
    zone(shared, 12, 8, 8); zone(shared, 12, 10, 7); stepWorld(shared); audit(shared, 23);
    expect(shared.pawns.filter(pawn => pawn.haul !== null)).toHaveLength(2);
    expect(shared.pawns.reduce((sum, pawn) => sum + (pawn.haul?.quantity ?? 0), 0)).toBe(12);
    expect(new Set(shared.pawns.filter(pawn => pawn.haul).map(pawn => pawn.haul!.sourcePileId)).size).toBe(1);
    expect(shared.piles.some(pile => pile.owner.type === 'ground' && pile.quantity === 20)).toBe(true);
    until(shared, () => shared.pawns.every(pawn => pawn.haul === null) && groundAt(shared, 12, 8) === 8 && groundAt(shared, 12, 10) === 7, 'two fractional deliveries');
    expect(groundAt(shared, 1, 6)).toBe(8); checkedTicks(shared, 60);
    expect(groundAt(shared, 12, 8)).toBe(8); expect(groundAt(shared, 12, 10)).toBe(7);
    expect(shared.piles.filter(pile => pile.owner.type === 'ground' && pile.owner.x === 12 && pile.owner.z === 8)).toHaveLength(1);
    for (const boundary of ['pickup', 'deliver'] as const) for (const interruption of ['disable', 'filter', 'remove'] as const) {
      const world = fixture(1); world.piles = []; refreshStock(world);
      addGroundMaterial(world, 'wood', 12, { x: 1, z: 6 }); refreshStock(world);
      world.pawns[0]!.priorities = { gather: 0, build: 0, haul: 1 }; zone(world, 13, 12, 8);
      until(world, () => world.pawns[0]!.haul?.phase === boundary, `${interruption} during ${boundary}`);
      expect(world.piles.some(pile => pile.owner.type === 'pawn')).toBe(boundary === 'deliver');
      const snapshot = serializeWorld(world);
      const change: Command = interruption === 'disable' ? { type: 'priority', pawnId: world.pawns[0]!.id, work: 'haul', value: 0 }
        : { type: 'stockpile', x: 13, z: 12, enabled: interruption !== 'remove', filters: { wood: false, food: true }, capacity: 8, priority: 4 };
      command(world, change); audit(world, 12); const resumed = deserializeWorld(snapshot); command(resumed, change);
      checkedTicks(world, 120); stepWorld(resumed, 120); expect(hashWorld(resumed)).toBe(hashWorld(world));
      expect(world.pawns[0]!.haul).toBeNull(); expect(groundAt(world, 13, 12)).toBe(0);
      expect(world.piles.every(pile => pile.owner.type === 'ground')).toBe(true);
      if (boundary === 'pickup') expect(groundAt(world, 1, 6)).toBe(12);
      command(world, { type: 'priority', pawnId: world.pawns[0]!.id, work: 'haul', value: 1 }); zone(world, 13, 12, 8);
      until(world, () => groundAt(world, 13, 12) === 8, 'interrupted cargo remains usable');
    }
    for (const boundary of ['pickup', 'deliver'] as const) {
      const world = fixture(1); order(world, 'bed', 10, 10);
      until(world, () => world.pawns[0]!.haul?.phase === boundary, `cancel construction during ${boundary}`);
      const snapshot = serializeWorld(world); command(world, { type: 'cancel', x: 10, z: 11 });
      const resumed = deserializeWorld(snapshot); command(resumed, { type: 'cancel', x: 10, z: 11 });
      checkedTicks(world, 120); stepWorld(resumed, 120); expect(hashWorld(resumed)).toBe(hashWorld(world));
      expect(world.jobs).toHaveLength(0); expect(world.pawns[0]!.haul).toBeNull();
      expect(world.piles.every(pile => pile.owner.type === 'ground')).toBe(true); expect(world.stock.wood).toBe(12);
      if (boundary === 'pickup') expect(groundAt(world, 1, 5)).toBe(12);
    }
    const construction = fixture(1); order(construction, 'bed', 10, 10);
    until(construction, () => construction.piles.some(pile => pile.owner.type === 'job'), 'actual delivery');
    expect(construction.piles.filter(pile => pile.owner.type === 'job').reduce((sum, pile) => sum + pile.quantity, 0)).toBe(8);
    expect(construction.stock.wood).toBe(4); command(construction, { type: 'cancel', x: 10, z: 11 });
    audit(construction, 12); expect(construction.jobs).toHaveLength(0); expect(construction.stock.wood).toBe(12);
    expect(construction.piles.every(pile => pile.owner.type === 'ground')).toBe(true);
    // Cancellation releases local material; a replacement cannot silently consume a pile under its footprint.
    order(construction, 'wall', 11, 10); until(construction, () => construction.structures.length === 1, 'released material can supply another plan');
    const partial = fixture(1); partial.piles = []; refreshStock(partial);
    addGroundMaterial(partial, 'wood', 3, { x: 1, z: 5 }); order(partial, 'bed', 10, 10);
    until(partial, () => partial.jobs[0]!.escrow.wood === 3, 'partial delivery remains at the frame');
    checkedTicks(partial, 80); expect(partial.jobs[0]!.progress).toBe(0); expect(partial.stock.wood).toBe(0);
    const partialResumed = deserializeWorld(serializeWorld(partial)); const resumeTick = partial.tick;
    for (const copy of [partial, partialResumed]) addGroundMaterial(copy, 'wood', 5, { x: 13, z: 3 });
    until(partial, () => partial.structures.length === 1, 'later source completes the same partially supplied frame');
    stepWorld(partialResumed, partial.tick - resumeTick); expect(hashWorld(partialResumed)).toBe(hashWorld(partial));
    expect(partial.stock.wood).toBe(0); audit(partial, 8);
    const surplus = fixture(2); surplus.piles = []; refreshStock(surplus);
    addGroundMaterial(surplus, 'wood', 20, { x: 1, z: 5 }); zone(surplus, 1, 5, 20); zone(surplus, 12, 8, 20);
    command(surplus, { type: 'stockpile', x: 1, z: 5, enabled: true, capacity: 8 });
    until(surplus, () => groundAt(surplus, 1, 5) === 8 && groundAt(surplus, 12, 8) === 12 && surplus.pawns.every(pawn => !pawn.haul), 'reduced capacity evacuates only excess to equal-priority storage');
    checkedTicks(surplus, 80); expect(groundAt(surplus, 1, 5)).toBe(8); expect(groundAt(surplus, 12, 8)).toBe(12);
  });

  test('eligibility, rotated footprints and congestion preserve reachable work and atomic commands', () => {
    const prioritized = fixture(1); prioritized.pawns[0]!.priorities = { gather: 1, build: 4, haul: 4 };
    resource(prioritized, 10, 10, 'berries'); order(prioritized, 'harvest', 10, 10); order(prioritized, 'wall', 2, 3);
    stepWorld(prioritized); expect(prioritized.jobs.find(job => job.id === prioritized.pawns[0]!.jobId)!.kind).toBe('harvest');
    const world = fixture(1); resource(world, 5, 5, 'berries'); resource(world, 10, 4, 'tree');
    for (const [x, z] of [[4, 5], [6, 5], [5, 4], [5, 6]]) world.tiles[z! * world.width + x!] = { terrain: 'water' };
    order(world, 'harvest', 5, 5); order(world, 'chop', 10, 4); order(world, 'bed', 12, 12, 1);
    const before = hashWorld(world);
    const invalid = [
      { type: 'designate', kind: 'wall', x: 2, z: 2 }, { type: 'designate', kind: 'wall', x: 4, z: 5 },
      { type: 'designate', kind: 'wall', x: 10, z: 4 }, { type: 'designate', kind: 'chop', x: 10, z: 4 },
      { type: 'designate', kind: 'wall', x: 13, z: 12 }, { type: 'designate', kind: 'bed', x: 15, z: 15, orientation: 1 },
      { type: 'designate', kind: 'bed', x: 14, z: 14, orientation: 4 }, { type: 'designate', kind: 'harvest', x: 1, z: 1 },
      { type: 'designate', kind: 'wall', x: -1, z: 0 }, { type: 'designate', kind: 'wall', x: 1.5, z: 0 }, { type: 'cancel', x: 1, z: 1 },
      { type: 'priority', pawnId: -1, work: 'gather', value: 2 }, { type: 'priority', pawnId: world.pawns[0]!.id, work: 'build', value: 5 },
      { type: 'stockpile', x: 1, z: 7, enabled: true, capacity: 0 }, { type: 'stockpile', x: 1, z: 7, enabled: true, filters: null },
      { type: 'explode' }, null,
    ];
    for (const rejected of invalid) { expect(applyCommand(world, rejected as Command).ok, JSON.stringify(rejected)).toBe(false); expect(hashWorld(world)).toBe(before); }
    checkedTicks(world, 800); expect(world.resources.map(item => item.kind)).toEqual(['berries']);
    expect(world.jobs).toHaveLength(1); expect(world.jobs[0]!.status).toBe('pending'); expect(world.jobs[0]!.reservedBy).toBeNull();
    expect(world.pawns[0]!.jobId).toBeNull(); expect(world.structures).toHaveLength(1);
    const corridor = fixture(2); corridor.piles = []; refreshStock(corridor); corridor.tiles = corridor.tiles.map(() => ({ terrain: 'rock' }));
    for (let x = 1; x <= 12; x++) corridor.tiles[4 * corridor.width + x] = { terrain: 'grass' };
    corridor.pawns[0]!.x = 1; corridor.pawns[0]!.z = 4; corridor.pawns[1]!.x = 3; corridor.pawns[1]!.z = 4;
    corridor.pawns[1]!.priorities = { gather: 0, build: 0, haul: 0 };
    resource(corridor, 10, 4, 'tree'); order(corridor, 'chop', 10, 4); checkedTicks(corridor, 500);
    expect(corridor.jobs).toHaveLength(0); expect(corridor.resources).toHaveLength(0); expect(corridor.pawns[1]!.x).toBeGreaterThan(3);
    // The source is already accessible: only the destination route needs an idle blocker to yield.
    const deliveryCorridor = fixture(2); deliveryCorridor.piles = []; refreshStock(deliveryCorridor);
    deliveryCorridor.tiles = deliveryCorridor.tiles.map(() => ({ terrain: 'rock' }));
    for (let x = 1; x <= 12; x++) deliveryCorridor.tiles[4 * deliveryCorridor.width + x] = { terrain: 'grass' };
    deliveryCorridor.tiles[5 * deliveryCorridor.width + 4] = { terrain: 'grass' };
    deliveryCorridor.pawns[0]!.x = 1; deliveryCorridor.pawns[0]!.z = 4;
    deliveryCorridor.pawns[1]!.x = 4; deliveryCorridor.pawns[1]!.z = 4;
    deliveryCorridor.pawns[1]!.priorities = { gather: 0, build: 0, haul: 0 };
    addGroundMaterial(deliveryCorridor, 'wood', 10, { x: 1, z: 4 }); zone(deliveryCorridor, 12, 4);
    until(deliveryCorridor, () => groundAt(deliveryCorridor, 12, 4) === 10, 'stationary blocker yields toward delivery destination', 500);
    // Only a late source is eligible. Exhausting one pair window must not starve it or break replay.
    const windowed = fixture(2); windowed.piles = []; windowed.stockpiles = [];
    for (let i = 0; i < 200; i++) windowed.piles.push({ id: windowed.nextId++, kind: i === 199 ? 'wood' : 'food', quantity: 1, owner: { type: 'ground', x: 1, z: 5 } });
    for (let index = 0; windowed.stockpiles.length < 200; index++) {
      const x = index % 16, z = Math.floor(index / 16); if (x === 1 && z === 5) continue;
      windowed.stockpiles.push({ id: windowed.nextId++, x, z, filters: { wood: true, food: false }, capacity: 75, priority: 4 });
    }
    refreshStock(windowed); stepWorld(windowed); expect(windowed.logisticsCursor).toBe(32768);
    expect(windowed.pawns.every(pawn => !pawn.haul)).toBe(true);
    const cursorResume = deserializeWorld(serializeWorld(windowed));
    stepWorld(windowed, 100); stepWorld(cursorResume, 100);
    expect(hashWorld(windowed)).toBe(hashWorld(cursorResume)); audit(windowed, 1);
    expect(windowed.piles.some(pile => pile.kind === 'wood' && pile.owner.type === 'ground' && (pile.owner.x !== 1 || pile.owner.z !== 5))).toBe(true);
    const crowded = createWorld(7, 24, 24); crowded.tiles = crowded.tiles.map(() => ({ terrain: 'grass' })); crowded.resources = [];
    const template = crowded.pawns[0]!;
    crowded.pawns = Array.from({ length: 40 }, (_, index) => ({ ...template, id: crowded.nextId++, x: 1 + (index % 10) * 2,
      z: 1 + Math.floor(index / 10) * 2, path: [], priorities: { gather: 2, build: 0, haul: 0 } }));
    for (let index = 0; index < 40; index++) {
      const x = 1 + (index % 10) * 2; const z = 13 + Math.floor(index / 10) * 2;
      resource(crowded, x, z, 'tree'); order(crowded, 'chop', x, z);
    }
    stepWorld(crowded); expect(crowded.jobs.filter(job => job.status === 'active').length).toBeLessThanOrEqual(8);
    checkedTicks(crowded, 1000); expect(crowded.jobs).toHaveLength(0); expect(crowded.resources).toHaveLength(0);
  });

  test('exhaustion preserves delivered material and progress; nearby beds accelerate recovery', () => {
    const world = fixture(1); order(world, 'wall', 8, 8); until(world, () => world.jobs[0]!.progress >= 5, 'construction started');
    const progress = world.jobs[0]!.progress; const before = world.stock.wood; world.pawns[0]!.rest = 20; stepWorld(world);
    expect(world.pawns[0]!.state).toBe('sleeping'); expect(world.jobs[0]!.reservedBy).toBeNull();
    expect(world.jobs[0]!.progress).toBe(progress); expect(world.stock.wood).toBe(before);
    expect(world.piles.filter(pile => pile.owner.type === 'job').reduce((sum, pile) => sum + pile.quantity, 0)).toBe(5);
    checkedTicks(world, 700); expect(world.structures).toHaveLength(1); expect(world.stock.wood).toBe(7);
    const ground = fixture(1); ground.pawns[0]!.rest = 19; const bed = deserializeWorld(serializeWorld(ground));
    bed.structures.push({ id: bed.nextId++, kind: 'bed', x: 2, z: 3, orientation: 0, footprint: 'standard' });
    stepWorld(ground, 100); stepWorld(bed, 100);
    expect(bed.pawns[0]!.rest - ground.pawns[0]!.rest).toBeCloseTo(10, 8); expect(validateWorld(bed)).toEqual([]);
  });

  test('hunger interrupts construction without undoing delivery and allows recovery through gathering', () => {
    const world = fixture(1); world.piles = world.piles.filter(pile => pile.kind !== 'food'); refreshStock(world);
    order(world, 'wall', 8, 8); until(world, () => world.jobs[0]!.progress >= 5, 'construction before hunger');
    world.pawns[0]!.hunger = 10; resource(world, 5, 2, 'berries', 6); order(world, 'harvest', 5, 2); stepWorld(world);
    expect(world.jobs.find(job => job.kind === 'wall')!.status).toBe('pending'); expect(world.stock.wood).toBe(7);
    checkedTicks(world, 400); expect(world.resources).toHaveLength(0); expect(world.pawns[0]!.hunger).toBeGreaterThan(40);
    expect(world.stock.food).toBeGreaterThan(0); expect(world.structures).toHaveLength(1);
  });

  test('new walls reroute travel and rotated furniture keeps its full placement footprint', () => {
    const world = fixture(1); resource(world, 12, 2, 'tree'); order(world, 'chop', 12, 2); stepWorld(world);
    const next = world.pawns[0]!.path[0]!; order(world, 'wall', next.x, next.z);
    let detoured = false; const initialWood = woodMass(world);
    for (let index = 0; index < 600; index++) {
      stepWorld(world); if (world.pawns[0]!.z !== 2) detoured = true; audit(world, initialWood);
      expect(world.pawns.some(pawn => pawn.x === next.x && pawn.z === next.z)).toBe(false);
    }
    expect(detoured).toBe(true); expect(world.resources).toHaveLength(0); expect(world.structures).toHaveLength(1); expect(world.jobs).toHaveLength(0);
    const bed = fixture(1); bed.pawns[0]!.x = 8; bed.pawns[0]!.z = 3;
    resource(bed, 8, 13, 'tree'); order(bed, 'chop', 8, 13); stepWorld(bed); order(bed, 'bed', 7, 8, 1);
    expect(applyCommand(bed, { type: 'designate', kind: 'wall', x: 8, z: 8 }).ok).toBe(false);
    const mass = woodMass(bed);
    // Beds remain traversable furniture in G0; placement must nevertheless occupy both cells.
    for (let tick = 0; tick < 800; tick++) { stepWorld(bed); audit(bed, mass); }
    expect(bed.jobs).toHaveLength(0); expect(bed.structures).toHaveLength(1); expect(bed.resources).toHaveLength(0);
  });

  test('schema-1 migration preserves stock, escrow, beds and identity; corrupt schema-2 saves are rejected', () => {
    const migrated = deserializeWorld(legacySave());
    expect(migrated.schemaVersion).toBe(2); expect(migrated.pawns[0]!.id).toBe(4); expect(migrated.structures[0]!.id).toBe(10);
    expect(migrated.structures[0]).toMatchObject({ x: 7, z: 7, footprint: 'legacy-single' });
    expect(migrated.pawns[0]!.priorities).toMatchObject({ gather: 2, build: 2 }); audit(migrated, 20); expect(foodMass(migrated)).toBe(18);
    expect(hashWorld(deserializeWorld(legacySave()))).toBe(hashWorld(migrated));
    const migrationResumed = deserializeWorld(serializeWorld(migrated)); checkedTicks(migrated, 500); stepWorld(migrationResumed, 500);
    expect(hashWorld(migrated)).toBe(hashWorld(migrationResumed)); expect(migrated.structures).toHaveLength(2);
    // V1 refunded escrow on interruption while retaining work already done. Migration must retain that valid state.
    const interruptedLegacy = JSON.parse(legacySave());
    interruptedLegacy.jobs[0].status = 'pending'; interruptedLegacy.jobs[0].reservedBy = null;
    interruptedLegacy.jobs[0].progress = 40; interruptedLegacy.jobs[0].escrow.wood = 0; interruptedLegacy.stock.wood = 12;
    interruptedLegacy.pawns[0].jobId = null; interruptedLegacy.pawns[0].state = 'idle'; interruptedLegacy.pawns[0].path = [];
    const interrupted = deserializeWorld(JSON.stringify(interruptedLegacy)); audit(interrupted, 20);
    expect(interrupted.jobs[0]).toMatchObject({ progress: 40, escrow: { wood: 0, food: 0 } });
    stepWorld(interrupted); expect(interrupted.jobs[0]!.progress).toBe(40);
    checkedTicks(interrupted, 500); expect(interrupted.structures).toHaveLength(2);
    const invalidLegacy = JSON.parse(legacySave()); invalidLegacy.jobs[0].escrow.wood = 100; expect(() => deserializeWorld(JSON.stringify(invalidLegacy))).toThrow();
    const world = fixture(1); resource(world, 6, 6, 'tree'); order(world, 'bed', 10, 10);
    until(world, () => world.pawns[0]!.haul?.phase === 'pickup', 'save during reservation'); const serialized = serializeWorld(world);
    const corruptions: ((data: any) => void)[] = [
      data => { data.schemaVersion = 3; }, data => { data.rng = 0; }, data => { data.tick = -1; }, data => { data.width = 129; },
      data => { data.logisticsCursor = -1; },
      data => { data.stock.wood = -1; }, data => { data.pawns[0] = null; }, data => { data.pawns[0].hunger = null; },
      data => { data.pawns[0].priorities = null; }, data => { data.pawns[0].path = [{ x: 15, z: 15 }]; },
      data => { data.pawns[0].jobId = 99999; }, data => { data.pawns[0].state = 'sleeping'; }, data => { data.pawns[0].planCooldown = 21; },
      data => { data.resources[0].id = data.pawns[0].id; }, data => { data.resources[0].amount = 0; },
      data => { data.resources.push({ ...data.resources[0], id: data.nextId++ }); }, data => { data.jobs[0].escrow.wood = 100; },
      data => { data.jobs[0].progress = 120; }, data => { data.jobs[0].orientation = 4; }, data => { data.jobs[0].kind = 'teleport'; },
      data => { data.piles[0].quantity = 0; }, data => { data.piles[0].owner = { type: 'pawn', pawnId: 99999 }; },
      data => { data.piles[0].owner = { type: 'job', jobId: 99999 }; }, data => { data.pawns[0].haul.quantity = 76; },
      data => { data.pawns[0].haul.sourcePileId = 99999; }, data => { data.pawns[0].haul.destination = { type: 'stockpile', stockpileId: 99999 }; },
      data => { data.nextId = 1; }, data => { data.tiles = []; }, data => { data.events = {}; },
      data => { const pawn = data.pawns[0]; data.tiles[pawn.z * data.width + pawn.x].terrain = 'water'; },
    ];
    for (const corrupt of corruptions) {
      const data = JSON.parse(serialized); corrupt(data); expect(() => deserializeWorld(JSON.stringify(data)), corrupt.toString()).toThrow();
      expect(() => validateWorld(data), corrupt.toString()).not.toThrow();
    }
    for (const text of ['', '{', 'null', '[]', '{}']) expect(() => deserializeWorld(text)).toThrow();
    expect(serializeWorld(world)).toBe(serialized);
  });

  test('five seeded two-day colonies conserve matter each tick through command churn and real outcomes', () => {
    for (const seed of [1, 7, 42, 271, 65535]) {
      const world = createWorld(seed, 24, 24); const initialResources = world.resources.length;
      const initialWood = woodMass(world); const initialFood = foodMass(world); let meals = 0;
      for (const item of world.resources) if (item.kind !== 'rock') command(world, { type: 'designate', kind: item.kind === 'tree' ? 'chop' : 'harvest', x: item.x, z: item.z });
      for (const [x, z] of [[10, 14], [11, 14], [12, 14], [13, 14]]) order(world, 'bed', x!, z!);
      zone(world, 9, 11); zone(world, 14, 11, 75, false, true);
      for (let tick = 0; tick < 12000; tick++) {
        if (tick > 0 && tick % 550 === 0) {
          // Construction cancellation is exercised above; a new plan cannot occupy its dropped material.
          const gathering = world.jobs.filter(job => job.kind === 'chop' || job.kind === 'harvest');
          const job = gathering[(tick / 550 + seed) % Math.max(1, gathering.length)];
          if (job) { command(world, { type: 'cancel', x: job.x, z: job.z }); applyCommand(world, { type: 'designate', kind: job.kind, x: job.x, z: job.z, orientation: job.orientation }); }
        }
        const hunger = world.pawns.map(pawn => pawn.hunger); stepWorld(world); audit(world, initialWood);
        // Current G0 recovery consumes one food unit; observe recovery independently of the inventory total.
        meals += world.pawns.filter((pawn, index) => pawn.hunger > hunger[index]!).length;
        expect(foodMass(world) + meals, `food seed=${seed} tick=${world.tick}`).toBe(initialFood);
        if (tick === 450 || tick === 6550) {
          const resumed = deserializeWorld(serializeWorld(world)); const copy = deserializeWorld(serializeWorld(world));
          stepWorld(resumed, 73); for (let step = 0; step < 73; step++) stepWorld(copy); expect(hashWorld(resumed)).toBe(hashWorld(copy));
        }
      }
      expect(world.resources.length, `seed=${seed}`).toBeLessThan(initialResources - 10); expect(world.structures.length, `seed=${seed}`).toBeGreaterThanOrEqual(4);
      expect(world.pawns.every(pawn => pawn.hunger > 20)).toBe(true); expect(world.pawns.every(pawn => pawn.rest > 20 || pawn.state === 'sleeping')).toBe(true);
      expect(meals).toBeGreaterThan(0); expect(world.events.some(event => event.type === 'need')).toBe(true);
      expect(hashWorld(deserializeWorld(serializeWorld(world)))).toBe(hashWorld(world));
    }
  }, 30000);
});
