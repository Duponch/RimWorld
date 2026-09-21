import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { expect, onTestFailed, test } from 'vitest';
import { isColonist } from '../src/sim/affiliation.ts';
import { canDesignate } from '../src/sim/engine.ts';
import { equippedWeapon } from '../src/sim/equipment-rules.ts';
import { complexFurnitureUnlocked } from '../src/sim/research.ts';
import { applyCommand, deserializeWorld, serializeWorld, stepWorld, validateWorld } from '../src/sim/index.ts';
import { ticksUntilRot } from '../src/sim/food-preservation.ts';
import { footprintContains } from '../src/sim/definitions.ts';
import { TICKS_PER_DAY } from '../src/sim/types.ts';
import type { Cell, Command, DesignateCommand, StructureKind, World } from '../src/sim/types.ts';
import { crashlandedDecisions } from './scenarios/crashlanded-player.ts';
import { energyDecisions } from './scenarios/energy-player.ts';

/**
 * This is deliberately a natural continuation of the V89 colony.  It does
 * not prepare research points, add ingredients, defer raids, or replace any
 * existing object.  The file is a campaign oracle; the controlled V90 load
 * remains in habitat-apparel-colony.test.ts.
 */
const fixtureBytes = gunzipSync(readFileSync(new URL('./fixtures/colony-v89.json.gz', import.meta.url)));
const load = () => deserializeWorld(fixtureBytes.toString('utf8'));
const livingColonists = (world: World) => world.pawns.filter(pawn => isColonist(pawn) && pawn.state !== 'dead');
const accept = (world: World, command: Command) => {
  const result = applyCommand(world, command);
  expect(result, JSON.stringify(command)).toMatchObject({ ok: true });
};

type Target = { type: 'designate'; kind: StructureKind; material: 'wood'; x: number; z: number; orientation: 0 };
type TargetMap = Partial<Record<'tailor' | 'table' | 'pot' | 'endTable' | 'dresser' | 'chair', Target>>;
interface Observation { tick: number; living: number; food: number; lightLeather: number; apparel: number; sowed: number; cooked: number; treated: number; diningTables: number; raids: number }
interface Checkpoint {
  protocol: 'habitat-apparel-natural-v90';
  world: string;
  startTick: number;
  horizon: number;
  targets: TargetMap;
  initialButcheryCompleted: number;
  productId?: number;
  equipmentOrdered: boolean;
  milestones: Record<string, number>;
  observations: Observation[];
  journal: { tick: number; command: Command }[];
}

const checkpointFile = process.env.HABITAT_APPAREL_NATURAL_CHECKPOINT;
const resumed: Checkpoint | undefined = checkpointFile ? JSON.parse(readFileSync(checkpointFile, 'utf8')) as Checkpoint : undefined;
if (resumed?.protocol !== undefined && resumed.protocol !== 'habitat-apparel-natural-v90') throw Error('Unsupported natural V90 checkpoint.');

function sameCell(a: Cell, b: Cell): boolean { return a.x === b.x && a.z === b.z; }

function lightLeather(world: World): number {
  return world.piles.filter(pile => pile.item === 'light-leather').reduce((sum, pile) => sum + pile.quantity, 0);
}

/** Hunt only healthy, nearby hares and let the existing butcher table convert
 * their real corpses. This is deliberately a player decision, not wildlife or
 * material preparation. */
function acquireLeather(world: World, journal: Checkpoint['journal']): void {
  const actionableTarget = world.hunting?.targets.some(id => world.wildlife?.animals.some(animal => animal.id === id && animal.state !== 'dead' && !animal.health?.death));
  if (lightLeather(world) >= 45 || !world.wildlife || actionableTarget || world.pawns.some(pawn => pawn.hunting)) return;
  const hunter = livingColonists(world).find(pawn => pawn.state !== 'downed' && pawn.state !== 'sleeping' && !pawn.need && !pawn.mental?.crisis && pawn.hunger > 55 && pawn.rest > 55 && !!equippedWeapon(world, pawn));
  if (!hunter) return;
  const distance = (cell: Cell) => (cell.x - hunter.x) ** 2 + (cell.z - hunter.z) ** 2;
  const target = world.wildlife.animals
    .filter(animal => (animal.state === 'idle' || animal.state === 'moving') && !animal.health?.death && !animal.flee && !animal.threat && !animal.retaliation && distance(animal) <= 35 ** 2 && !world.pawns.some(pawn => pawn !== hunter && (pawn.x - animal.x) ** 2 + (pawn.z - animal.z) ** 2 < 9))
    .sort((left, right) => distance(left) - distance(right) || left.id - right.id)[0];
  if (!target || world.hunting?.targets.includes(target.id)) return;
  if (hunter.priorities.hunt !== 1) {
    const priority: Command = { type: 'priority', pawnId: hunter.id, work: 'hunt', value: 1 };
    accept(world, priority); journal.push({ tick: world.tick, command: priority });
  }
  const hunt: Command = { type: 'hunt', animalId: target.id, enabled: true };
  accept(world, hunt); journal.push({ tick: world.tick, command: hunt });
}

function siteNear(world: World, kind: StructureKind, anchor: Cell): Target {
  for (let radius = 2; radius <= 40; radius++) {
    for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;
      const command: DesignateCommand = { type: 'designate', kind, material: 'wood', x: anchor.x + dx, z: anchor.z + dz, orientation: 0 };
      if (canDesignate(world, command).ok && !world.piles.some(pile => pile.owner.type === 'ground'
        && footprintContains({ kind, x: command.x, z: command.z, orientation: 0, footprint: 'standard' }, pile.owner))) {
        return { type: 'designate', kind, material: 'wood', x: command.x, z: command.z, orientation: 0 };
      }
    }
  }
  throw Error(`No natural construction site for ${kind} near ${JSON.stringify(anchor)}.`);
}

test('V90 natural colony continuation: furniture, flower pot and leather apparel use existing V89 stock', () => {
  const raw = JSON.parse(fixtureBytes.toString('utf8')) as World;
  expect(raw.schemaVersion).toBe(89);
  let world = resumed ? deserializeWorld(resumed.world) : load();
  const start = resumed?.startTick ?? world.tick;
  const diagnosticDays = Number(process.env.HABITAT_APPAREL_NATURAL_DAYS ?? 12);
  // This is a resumable diagnostic slice, not an artificial deadline for
  // research, hunting or construction. A checkpoint resumes with a fresh
  // slice while retaining the already observed natural progression.
  const horizon = resumed ? Math.max(resumed.horizon, world.tick + diagnosticDays * TICKS_PER_DAY) : start + diagnosticDays * TICKS_PER_DAY;
  const targets: TargetMap = resumed?.targets ?? {};
  const initialButcheryCompleted = resumed?.initialButcheryCompleted ?? world.butchery?.completed ?? 0;
  const milestones = resumed?.milestones ?? {};
  const observations: Observation[] = resumed?.observations ?? [];
  const journal = resumed?.journal ?? [];
  const failureFile = 'tmp/habitat-apparel-natural-failed.json';
  let equipmentOrdered = resumed?.equipmentOrdered ?? false;
  let productId: number | undefined = resumed?.productId;
  const checkpoint = (): Checkpoint => ({ protocol: 'habitat-apparel-natural-v90', world: serializeWorld(world), startTick: start, horizon, targets, initialButcheryCompleted, productId, equipmentOrdered, milestones, observations, journal });
  onTestFailed(() => writeFileSync(failureFile, JSON.stringify(checkpoint())));

  expect(world.schemaVersion).toBe(90);
  expect(world.scenario).toMatchObject({ id: 'crashlanded', revision: 2 });
  expect(validateWorld(world), `initial natural checkpoint ${world.tick}`).toEqual([]);
  const initialLiving = livingColonists(world).map(pawn => pawn.id);
  expect(initialLiving).toHaveLength(4);
  const saveCheckpoint = (label: string) => {
    const data = JSON.stringify(checkpoint());
    writeFileSync('tmp/habitat-apparel-natural-v90-latest.json', data);
    writeFileSync(`tmp/habitat-apparel-natural-v90-${label}.json`, data);
  };
  const assertSurvival = (context: string) => {
    const survivors = new Set(livingColonists(world).map(pawn => pawn.id));
    if (!initialLiving.every(id => survivors.has(id))) saveCheckpoint(`casualty-${world.tick}`);
    expect(initialLiving.every(id => survivors.has(id)), `The four initial colonists must survive ${context} at ${world.tick}; checkpoint ${failureFile}`).toBe(true);
  };
  const bed = world.structures.find(structure => structure.kind === 'bed');
  expect(bed, 'The V89 fixture must provide an existing bed for nearby furniture.').toBeDefined();
  const researcher = livingColonists(world).find(pawn => pawn.name === 'Ada') ?? livingColonists(world)[0]!;
  const builder = livingColonists(world).find(pawn => pawn.name === 'Noé') ?? livingColonists(world)[1] ?? researcher;
  const tailor = livingColonists(world).find(pawn => pawn.name === 'Mina') ?? livingColonists(world)[2] ?? builder;
  const wearer = tailor;
  const leatherAtStart = lightLeather(world);
  expect(leatherAtStart).toBeGreaterThanOrEqual(0);

  const observe = (lastEventTick: { value: number }, counters: { sowed: number; cooked: number; treated: number; diningTables: number }) => {
    for (const event of world.events.filter(event => event.tick > lastEventTick.value)) {
      if (event.message.includes('a semé') || event.message.includes('travail : semis')) counters.sowed++;
      if (event.message.includes('a cuisiné')) counters.cooked++;
      if (event.message.includes('traité') || event.message.includes('soins')) counters.treated++;
    }
    lastEventTick.value = world.tick;
    if (world.pawns.some(pawn => pawn.need?.kind === 'eat' && pawn.need.dining?.tableId !== null && pawn.need?.dining?.tableId !== undefined)) counters.diningTables++;
    const lightLeather = world.piles.filter(pile => pile.item === 'light-leather').reduce((sum, pile) => sum + pile.quantity, 0);
    observations.push({
      tick: world.tick,
      living: livingColonists(world).length,
      food: world.piles.filter(pile => pile.kind === 'food').reduce((sum, pile) => sum + pile.quantity, 0),
      lightLeather,
      apparel: world.piles.filter(pile => pile.kind === 'apparel').length,
      sowed: counters.sowed,
      cooked: counters.cooked,
      treated: counters.treated,
      diningTables: counters.diningTables,
      raids: world.raids?.active ? 1 : world.raids?.last ? 1 : 0,
    });
    expect(validateWorld(world), `natural observation at ${world.tick}; checkpoint ${failureFile}`).toEqual([]);
    expect(livingColonists(world).length, `colony must retain a living colonist at ${world.tick}`).toBeGreaterThan(0);
    if (counters.sowed > 0 && milestones.sowed === undefined) milestones.sowed = world.tick;
    if (counters.cooked > 0 && milestones.cooked === undefined) milestones.cooked = world.tick;
    if (counters.treated > 0 && milestones.treated === undefined) milestones.treated = world.tick;
    writeFileSync('tmp/habitat-apparel-natural-v90-progress.json', JSON.stringify({ protocol: 'habitat-apparel-natural-v90', startTick: start, horizon, observations }, null, 2));
  };

  const ensure = (key: keyof TargetMap, kind: StructureKind, anchor: Cell) => {
    let target = targets[key] ?? (targets[key] = siteNear(world, kind, anchor));
    const blockedPlan = world.jobs.find(job => job.kind === target.kind && sameCell(job, target)
      && job.construction === 'blueprint' && job.reservedBy === null && job.progress === 0
      && world.piles.some(pile => pile.owner.type === 'ground' && footprintContains(job, pile.owner)));
    if (blockedPlan) {
      const cancel: Command = { type: 'cancel', x: blockedPlan.x, z: blockedPlan.z };
      accept(world, cancel); journal.push({ tick: world.tick, command: cancel });
      target = targets[key] = siteNear(world, kind, anchor);
    }
    const present = world.structures.some(structure => structure.kind === target.kind && sameCell(structure, target))
      || world.jobs.some(job => job.kind === target.kind && sameCell(job, target));
    if (!present) {
      accept(world, target);
      journal.push({ tick: world.tick, command: target });
    }
    return target;
  };

  if (!resumed) {
    accept(world, { type: 'priority', pawnId: researcher.id, work: 'research', value: leatherAtStart >= 45 ? 1 : 0 });
    accept(world, { type: 'priority', pawnId: researcher.id, work: 'hunt', value: leatherAtStart >= 45 ? 0 : 1 });
    accept(world, { type: 'priority', pawnId: builder.id, work: 'build', value: 1 });
    accept(world, { type: 'priority', pawnId: builder.id, work: 'grow', value: 1 });
    accept(world, { type: 'priority', pawnId: tailor.id, work: 'craft', value: 1 });
    if (!complexFurnitureUnlocked(world)) accept(world, { type: 'research-project', project: 'complex-furniture' });
  }

  ensure('tailor', 'tailor-bench', bed!);
  ensure('table', 'table', bed!);
  ensure('pot', 'flower-pot', bed!);
  const butcher = world.structures.find(structure => structure.kind === 'butcher-table');
  expect(butcher, 'The V89 fixture must retain its existing butcher table.').toBeDefined();
  if (butcher && !butcher.bills?.some(bill => bill.recipe === 'butcher-creature')) {
    accept(world, { type: 'bill-add', structureId: butcher.id, recipe: 'butcher-creature' });
  }
  let billAdded = false;
  const previousObservation = observations.at(-1);
  let nextObservation = Math.ceil((world.tick + 1) / 600) * 600;
  let nextDailyCheckpoint = world.tick + TICKS_PER_DAY;
  let checkpointedRaidId: number | undefined;
  const checkpointRaid = () => {
    if (world.raids?.active && checkpointedRaidId !== world.raids.active.id) {
      checkpointedRaidId = world.raids.active.id;
      saveCheckpoint(`pre-raid-${world.raids.active.id}-${world.tick}`);
    }
  };
  const lastEventTick = { value: previousObservation?.tick ?? world.tick };
  const counters = {
    sowed: Math.max(previousObservation?.sowed ?? 0, world.events.filter(event => event.message.includes('a semé') || event.message.includes('travail : semis')).length),
    cooked: previousObservation?.cooked ?? 0,
    treated: previousObservation?.treated ?? 0,
    diningTables: previousObservation?.diningTables ?? 0,
  };
  const targetByKind: Partial<Record<StructureKind, keyof TargetMap>> = {
    'tailor-bench': 'tailor',
    table: 'table',
    'flower-pot': 'pot',
    'end-table': 'endTable',
    dresser: 'dresser',
    'dining-chair': 'chair',
  };
  const completedFurniture = (kind: StructureKind) => {
    const key = targetByKind[kind];
    const target = key === undefined ? undefined : targets[key];
    return !!target && world.structures.some(structure => structure.kind === kind && sameCell(structure, target));
  };
  const wornProduct = () => productId === undefined ? undefined : world.piles.find(pile => pile.id === productId && pile.owner.type === 'apparel' && pile.owner.pawnId === wearer.id);
  const objectivesComplete = () => complexFurnitureUnlocked(world)
    && (['tailor-bench', 'table', 'flower-pot', 'end-table', 'dresser', 'dining-chair'] as StructureKind[]).every(completedFurniture)
    && !!world.structures.find(structure => structure.kind === 'flower-pot' && targets.pot && sameCell(structure, targets.pot))?.flower?.plant
    && counters.sowed > 0 && counters.diningTables > 0 && counters.cooked + counters.treated > 0
    && (world.butchery?.completed ?? 0) > initialButcheryCompleted && !!wornProduct() && equipmentOrdered;

  while (world.tick < horizon) {
    assertSurvival('at a player decision pulse');
    if (productId === undefined) {
      const product = world.piles.find(pile => pile.item === 'light-leather-shirt' && pile.apparel?.material === 'light-leather');
      if (product) {
        productId = product.id;
        equipmentOrdered = product.owner.type === 'apparel' && product.owner.pawnId === wearer.id;
      }
    }
    if (milestones.leatherAcquired === undefined && (lightLeather(world) >= 45 || productId !== undefined)) milestones.leatherAcquired = world.tick;
    const acquiringLeather = milestones.leatherAcquired === undefined;
    const butcherBill = butcher?.bills?.find(bill => bill.recipe === 'butcher-creature');
    const freshUsableCorpses = butcher && butcherBill ? world.piles.filter(pile => pile.item === 'hare-corpse' && pile.owner.type === 'ground'
      && (pile.owner.x - butcher.x) ** 2 + (pile.owner.z - butcher.z) ** 2 <= butcherBill.radius ** 2 && ticksUntilRot(pile, world.tick) > 0) : [];
    const leatherPerCorpse = (world.butchery?.completed ?? 0) > 0 ? Math.max(1, Math.floor((world.butchery?.leather ?? 0) / world.butchery!.completed)) : 14;
    const corpsesNeeded = Math.ceil(Math.max(0, 45 - lightLeather(world)) / leatherPerCorpse);
    for (const animalId of world.hunting?.targets ?? []) {
      const animal = world.wildlife?.animals.find(candidate => candidate.id === animalId);
      if (animal && animal.state !== 'dead' && animal.health?.death) {
        const cancel: Command = { type: 'hunt', animalId, enabled: false };
        accept(world, cancel);
        journal.push({ tick: world.tick, command: cancel });
      }
    }
    for (const [work, value] of [['hunt', acquiringLeather ? 1 : 0], ['research', acquiringLeather ? 0 : 1]] as const) {
      if (researcher.priorities[work] !== value) {
        const priority: Command = { type: 'priority', pawnId: researcher.id, work, value };
        accept(world, priority);
        journal.push({ tick: world.tick, command: priority });
      }
    }
    if (world.raids?.active) {
      checkpointRaid();
      // Reuse the established energy-colony raid policy: everybody is
      // mobilised, unarmed civilians enter the shelter and the armed colonist
      // covers them. The active-raid branch returns before consulting state.
      for (const decision of energyDecisions(world, undefined as never)) {
        accept(world, decision.command);
        journal.push({ tick: world.tick, command: decision.command });
      }
    } else {
      // Outside combat, retain only the established demobilisation, rescue and
      // bedside-care decisions. Construction remains owned by this campaign.
      const support = crashlandedDecisions(world).filter(decision => decision.command.type === 'draft'
        || decision.command.type === 'order-rescue'
        || decision.command.type === 'order-tend'
        || decision.command.type === 'order-feed'
        || decision.command.type === 'priority' && decision.command.work === 'doctor'
        || decision.command.type === 'designate' && decision.command.kind === 'chop'
        || decision.command.type === 'stockpile' && decision.command.filters?.corpse === true);
      for (const decision of support) {
        accept(world, decision.command);
        journal.push({ tick: world.tick, command: decision.command });
      }
      // The inherited first-days player only cuts within 25 cells. This
      // established colony has exhausted that ring: select the nearest
      // remaining trees for real cutting jobs, without supplying free wood.
      const wood = world.piles.filter(pile => pile.item === 'wood').reduce((sum, pile) => sum + pile.quantity, 0);
      if (wood < 160 && !world.jobs.some(job => job.kind === 'chop')) {
        const distance = (cell: Cell) => (cell.x - bed!.x) ** 2 + (cell.z - bed!.z) ** 2;
        const trees = world.resources.filter(resource => resource.kind === 'tree')
          .sort((left, right) => distance(left) - distance(right) || left.id - right.id);
        let designated = 0;
        for (const tree of trees) {
          const command: DesignateCommand = { type: 'designate', kind: 'chop', x: tree.x, z: tree.z };
          if (!canDesignate(world, command).ok) continue;
          accept(world, command);
          journal.push({ tick: world.tick, command });
          if (++designated === 8) break;
        }
      }
    }
    if (acquiringLeather && freshUsableCorpses.length && butcherBill?.target === 0) {
      const command: Command = { type: 'bill-update', structureId: butcher!.id, billId: butcherBill.id, settings: { ...butcherBill, mode: 'times', target: 1, suspended: false } };
      accept(world, command);
      journal.push({ tick: world.tick, command });
    }
    const butcherOrderActive = world.pawns.some(pawn => pawn.cooking?.stationId === butcher?.id
      || pawn.orders.queue.some(order => typeof order !== 'number' && 'cooking' in order && order.cooking.stationId === butcher?.id));
    if (acquiringLeather && freshUsableCorpses.length && !world.raids?.active && !butcherOrderActive) {
      // A contextual player order may interrupt sleep, leisure or ordinary
      // work. Waiting for an entirely idle cook let a fresh reserved corpse
      // rot before the third real butchery in the J6 continuation.
      const cooks = livingColonists(world).filter(pawn => pawn.state !== 'downed' && !pawn.draft && !pawn.mental?.crisis
        && !pawn.tend && !pawn.feed && !pawn.rescue && pawn.priorities.cook > 0)
        .sort((left, right) => (right.skills.cooking?.level ?? 0) - (left.skills.cooking?.level ?? 0) || left.id - right.id);
      for (const cook of cooks) {
        const command: Command = { type: 'order-cook', pawnId: cook.id, structureId: butcher!.id, queue: false };
        const result = applyCommand(world, command);
        if (result.ok) { journal.push({ tick: world.tick, command }); break; }
      }
    }
    if (acquiringLeather && freshUsableCorpses.length < corpsesNeeded) acquireLeather(world, journal);
    if (complexFurnitureUnlocked(world)) {
      ensure('endTable', 'end-table', bed!);
      ensure('dresser', 'dresser', bed!);
      const table = targets.table ?? bed!;
      ensure('chair', 'dining-chair', table);
    }
    const bench = targets.tailor && world.structures.find(structure => structure.kind === 'tailor-bench' && sameCell(structure, targets.tailor!));
    const existingBill = bench?.bills?.find(bill => bill.recipe === 'shirt');
    if (existingBill) billAdded = true;
    if (bench && !billAdded) {
      accept(world, { type: 'bill-add', structureId: bench.id, recipe: 'shirt' });
      const bill = bench.bills?.[0];
      expect(bill).toBeDefined();
      accept(world, { type: 'bill-update', structureId: bench.id, billId: bill!.id, settings: { ...bill!, mode: 'times', target: 1, suspended: false, filters: { ...bill!.filters, cloth: false, 'light-leather': true }, destination: 'drop' } });
      billAdded = true;
    }
    if (billAdded && productId === undefined) {
      const product = world.piles.find(pile => pile.item === 'light-leather-shirt' && pile.apparel?.material === 'light-leather');
      if (product) {
        productId = product.id;
        equipmentOrdered = product.owner.type === 'apparel' && product.owner.pawnId === wearer.id;
      }
    }
    if (productId !== undefined && !equipmentOrdered && !wearer.equipmentTask && wearer.orders.active === null && !wearer.need && wearer.state === 'idle') {
      const product = world.piles.find(pile => pile.id === productId);
      if (product) {
        const result = applyCommand(world, { type: 'order-equipment', pawnId: wearer.id, itemId: product.id, action: 'wear', queue: false });
        if (result.ok) { equipmentOrdered = true; journal.push({ tick: world.tick, command: { type: 'order-equipment', pawnId: wearer.id, itemId: product.id, action: 'wear', queue: false } }); }
      }
    }
    const step = Math.min(world.raids?.active ? 20 : 50, Math.max(1, nextObservation - world.tick), Math.max(1, nextDailyCheckpoint - world.tick));
    stepWorld(world, step);
    checkpointRaid();
    assertSurvival('after simulation');
    if (world.tick >= nextObservation) { observe(lastEventTick, counters); nextObservation += 600; }
    if (world.tick >= nextDailyCheckpoint) {
      saveCheckpoint(`day-${Math.floor((world.tick - start) / TICKS_PER_DAY)}-tick-${world.tick}`);
      nextDailyCheckpoint += TICKS_PER_DAY;
    }
    if (world.tick - start >= 4.5 * TICKS_PER_DAY && objectivesComplete()) {
      saveCheckpoint(`complete-${world.tick}`);
      break;
    }
  }

  writeFileSync('tmp/habitat-apparel-natural-v90-final-checkpoint.json', JSON.stringify(checkpoint()));
  expect(complexFurnitureUnlocked(world)).toBe(true);
  for (const kind of ['tailor-bench', 'table', 'flower-pot', 'end-table', 'dresser', 'dining-chair'] as StructureKind[]) expect(completedFurniture(kind), `Natural furniture ${kind} was not built`).toBe(true);
  const pot = world.structures.find(structure => structure.kind === 'flower-pot' && targets.pot && sameCell(structure, targets.pot));
  expect(pot?.flower?.plant, 'The naturally built pot must receive a physical daylily job.').toBeDefined();
  expect(counters.sowed, 'Existing growing work must continue during the furniture campaign.').toBeGreaterThan(0);
  expect(counters.diningTables, 'A colonist must use a real table/seat during the continuation.').toBeGreaterThan(0);
  expect(counters.cooked + counters.treated).toBeGreaterThan(0);
  expect(world.butchery?.completed ?? 0, `Natural hunting must produce leather from real corpses; start=${leatherAtStart}`).toBeGreaterThan(initialButcheryCompleted);
  const worn = wornProduct();
  expect(worn, 'The leather product must be transferred to a colonist, not merely defined.').toBeDefined();
  expect(equipmentOrdered).toBe(true);
  expect(initialLiving.every(id => world.pawns.some(pawn => pawn.id === id && pawn.state !== 'dead')), `An initial colonist died during the natural V90 campaign; checkpoint ${failureFile}`).toBe(true);
  expect(livingColonists(world).map(pawn => pawn.id)).toEqual(expect.arrayContaining(initialLiving));
  expect(world.tick).toBeLessThanOrEqual(horizon);
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  writeFileSync('tmp/habitat-apparel-natural-v90-result.json', JSON.stringify({ protocol: 'habitat-apparel-natural-v90', valid: true, startTick: start, endTick: world.tick, horizonDays: (world.tick - start) / TICKS_PER_DAY, initialButcheryCompleted, finalButcheryCompleted: world.butchery?.completed ?? 0, leatherAtStart, leatherAtEnd: lightLeather(world), productId, equipmentOrdered, targets, milestones, observations }, null, 2));
}, 600_000);
