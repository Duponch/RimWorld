import { expect, test, vi } from 'vitest';
import { applyCommand, stepWorld } from '../src/sim/engine.ts';
import { animalNutritionMax } from '../src/sim/animal-life.ts';
import { animalSpecies } from '../src/sim/animal-species.ts';
import { corpseFresh, corpseYield, CORPSE_ROT_TICKS } from '../src/sim/corpses.ts';
import { corpsePartAbsent, projectCorpseConsumption, selectCorpsePart } from '../src/sim/corpse-anatomy.ts';
import { butcheryEfficiency } from '../src/sim/cooking-statistics.ts';
import { butcherStationEfficiency } from '../src/sim/food-workstations.ts';
import { rotAge } from '../src/sim/food-preservation.ts';
import { addGroundMaterial, refreshStock, reservedSource } from '../src/sim/materials.ts';
import { animalMealTarget, animalPileFood, finishAnimalMeal } from '../src/sim/wildlife-food.ts';
import { WeightedSearch } from '../src/sim/weighted-search.ts';
import { deserializeWorld, serializeWorld } from '../src/sim/serialization.ts';
import type { Command, MaterialPile, World } from '../src/sim/types.ts';
import { animal, body, predationCamp, replayPredation, untilPredation, validPredation } from './helpers/predation-v190-fixture.ts';

const command = (w: World, c: Command) => expect(applyCommand(w, c), JSON.stringify(c)).toMatchObject({ ok: true });
const amount = (w: World, item: MaterialPile['item']) => w.piles.filter(p => p.item === item).reduce((n, p) => n + p.quantity, 0);

test('healthy living prey is pursued, struck, converted after its fall, and ingested at contact across exact resumptions', () => {
  const { w, foxId, preyId } = predationCamp();
  const initialFood = animal(w, foxId).food;
  expect(animal(w, preyId).health!.injuries).toEqual([]);
  expect(w.piles).toEqual([]); expect(w.wildlife!.eatenNutrition).toBe(0);
  untilPredation(w, () => !!animal(w, foxId).predation && !!animal(w, foxId).motion);
  expect(animal(w, foxId).predation).toMatchObject({ targetId: preyId, firstHit: true });
  expect(reservedSource(w, preyId)).toBe(0); // A living animal is never reserved as a pile.
  expect(animal(w, preyId).health!.injuries).toEqual([]);
  replayPredation(w);

  untilPredation(w, () => !!animal(w, foxId).strike);
  const fox = animal(w, foxId), prey = animal(w, preyId), earlyCorpse = body(w, preyId);
  const preyHealth = prey?.health ?? earlyCorpse!.corpse!.health;
  const preyCell = prey ?? (earlyCorpse!.owner as { x: number; z: number });
  expect(fox.strike!.targetId).toBe(preyId);
  expect(fox.strike!.atCore).toBeGreaterThanOrEqual((fox.motion?.end ?? 0) * 10);
  expect(Math.max(Math.abs(fox.x - preyCell.x), Math.abs(fox.z - preyCell.z))).toBeLessThanOrEqual(1);
  expect(fox.predation?.firstHit).toBe(false);
  expect(preyHealth.injuries.length + preyHealth.missing.length).toBeGreaterThan(0);
  expect(w.wildlife!.eatenNutrition).toBe(0); expect(fox.food).toBeLessThan(initialFood);
  replayPredation(w);

  untilPredation(w, () => !!body(w, preyId));
  const corpse = body(w, preyId)!, frozen = structuredClone(corpse.corpse!.health);
  expect(w.wildlife!.animals.some(a => a.id === preyId)).toBe(false);
  expect(corpse).toMatchObject({ id: preyId, item: 'hare-corpse', quantity: 1, owner: { type: 'ground' }, corpse: { animalId: preyId, species: 'hare' } });
  expect(frozen.death).toBeDefined(); expect(frozen.death!.tick).toBeLessThanOrEqual(w.tick);
  expect(corpse.corpse!.consumedParts).toBeUndefined();
  expect(w.wildlife!.eatenNutrition).toBe(0);
  const recovery = animal(w, foxId).strike;
  if (recovery) {
    expect(recovery.targetId).toBe(preyId);
    const save = deserializeWorld(serializeWorld(w));
    expect(animal(save, foxId).strike).toEqual(recovery);
    replayPredation(w);
    if (w.tick * 10 < recovery.untilCore) expect(animal(w, foxId).strike).toEqual(recovery);
    expect(body(w, preyId)).toBeDefined();
  }
  untilPredation(w, () => animal(w, foxId).meal?.id === preyId);
  expect(reservedSource(w, preyId)).toBe(1);
  expect(reservedSource(w, preyId, foxId)).toBe(0);
  expect(animalMealTarget(w, animal(w, foxId))).toEqual(body(w, preyId)!.owner);
  replayPredation(w);

  let firstEatingTick: number | undefined;
  untilPredation(w, () => {
    if (w.wildlife!.eatenNutrition > 0) return true;
    const a = animal(w, foxId);
    if (a.state === 'eating' && a.meal?.id === preyId) firstEatingTick ??= w.tick;
    expect(body(w, preyId)!.corpse!.health).toEqual(frozen);
    return false;
  });
  expect(firstEatingTick).toBeDefined();
  expect(w.tick - firstEatingTick!).toBeGreaterThanOrEqual(animalSpecies('red-fox').ingestTicks);
  expect(w.wildlife!.eatenNutrition).toBeGreaterThan(0);
  expect(animal(w, foxId).food).toBeGreaterThan(initialFood);
  const remaining = body(w, preyId);
  if (remaining) {
    expect(remaining.quantity).toBe(1); expect(remaining.corpse!.health).toEqual(frozen);
    expect(remaining.corpse!.consumedParts!.length).toBeGreaterThan(0);
    expect(remaining.corpse!.consumedParts!.every(p => p.atTick >= frozen.death!.tick && p.atTick <= w.tick)).toBe(true);
  } else expect(w.wildlife!.eatenItems).toBe(1);
  replayPredation(w, 12);
});

test('accessible prepared food far beyond a nearby prey wins and remains physical through approach and saved ingestion', () => {
  const { w, foxId, preyId } = predationCamp();
  addGroundMaterial(w, 'food', 1, { x: 27, z: 25 }, 'survival-meal'); refreshStock(w);
  const food = w.piles.find(p => p.item === 'survival-meal')!;
  untilPredation(w, () => animal(w, foxId).meal?.id === food.id);
  const fox = animal(w, foxId);
  expect(fox.predation).toBeUndefined(); expect(reservedSource(w, food.id)).toBe(1);
  expect(Math.abs(fox.x - 27) + Math.abs(fox.z - 25)).toBeGreaterThan(1);
  const before = serializeWorld(w);
  finishAnimalMeal(w, fox); // A negative contact probe cannot grant remote nutrition.
  expect(serializeWorld(w)).toBe(before);
  replayPredation(w, 3);
  expect(w.piles.find(p => p.id === food.id)?.quantity).toBe(1);
  expect(animal(w, preyId).health!.injuries).toEqual([]);
  untilPredation(w, () => animal(w, foxId).state === 'eating');
  expect(Math.abs(animal(w, foxId).x - 27) + Math.abs(animal(w, foxId).z - 25)).toBeLessThanOrEqual(1);
  expect((animal(w, foxId).motion?.end ?? 0) <= w.tick).toBe(true);
  replayPredation(w, 20);
  expect(w.piles.find(p => p.id === food.id)?.quantity).toBe(1);
  untilPredation(w, () => w.wildlife!.eatenItems === 1);
  expect(w.piles.some(p => p.id === food.id)).toBe(false);
  expect(w.wildlife!.eatenNutrition).toBeCloseTo(.9);
  expect(animal(w, foxId).food).toBeGreaterThan(animalNutritionMax(animal(w, foxId)) * .9);
  expect(animal(w, foxId).predation).toBeUndefined();
  expect(animal(w, preyId).health!.death).toBeUndefined();
  expect(animal(w, preyId).health!.injuries).toEqual([]); replayPredation(w);
});

test('a partially eaten corpse stays exclusive, then physical butchery uses only its remaining anatomy after pickup and work resumptions', () => {
  const { w, foxId, preyId } = predationCamp();
  // Prepared hunger still opens the predator's <30% search, with a smaller deficit.
  animal(w, foxId).food = .16;
  untilPredation(w, () => !!body(w, preyId));
  const originalHealth = structuredClone(body(w, preyId)!.corpse!.health);
  const originalYield = corpseYield(body(w, preyId)!);
  untilPredation(w, () => animal(w, foxId).meal?.id === preyId);
  command(w, { type: 'designate', kind: 'butcher-spot', x: 19, z: 16 });
  const station = w.structures.find(s => s.kind === 'butcher-spot')!;
  command(w, { type: 'bill-add', structureId: station.id });
  const bill = station.bills![0]!, cook = w.pawns[0]!;
  command(w, { type: 'bill-update', structureId: station.id, billId: bill.id, settings: { ...bill, destination: 'drop' } });
  cook.skills.cooking = { level: 8, xp: 0, dailyXp: 0, passion: 0 };
  command(w, { type: 'priority', pawnId: cook.id, work: 'cook', value: 1 });
  for (let i = 0; i < 10; i++) {
    stepWorld(w); validPredation(w);
    expect(reservedSource(w, preyId)).toBe(1);
    expect(cook.cooking).toBeNull(); expect(body(w, preyId)!.owner.type).toBe('ground');
  }
  untilPredation(w, () => !animal(w, foxId).meal && !!body(w, preyId)?.corpse!.consumedParts?.length);
  const corpse = body(w, preyId)!, remainingYield = corpseYield(corpse), parts = structuredClone(corpse.corpse!.consumedParts);
  expect(corpse.quantity).toBe(1); expect(corpse.corpse!.health).toEqual(originalHealth);
  expect(remainingYield.meat).toBeLessThan(originalYield.meat);
  expect(remainingYield.leather).toBeLessThan(originalYield.leather);
  expect(w.wildlife!.eatenItems).toBe(0); expect(w.butchery).toBeUndefined();
  const consumedNutrition = w.wildlife!.eatenNutrition;
  untilPredation(w, () => cook.cooking?.ingredients.some(i => i.stage === 'held') === true);
  expect(body(w, preyId)!.owner).toEqual({ type: 'pawn', pawnId: cook.id });
  expect(body(w, preyId)!.corpse!.consumedParts).toEqual(parts); replayPredation(w);
  untilPredation(w, () => cook.cooking?.phase === 'work' && cook.cooking.progress > 0);
  expect(body(w, preyId)!.owner).toMatchObject({ type: 'ground' });
  expect(cook.x).toBe(station.x); expect(cook.z).toBe(station.z - 1);
  replayPredation(w, 3);
  const factor = butcheryEfficiency(cook) * butcherStationEfficiency(station);
  untilPredation(w, () => bill.target === 0 && !cook.cooking);
  expect(w.butchery?.completed).toBe(1); expect(body(w, preyId)).toBeUndefined();
  for (const key of ['meat', 'leather'] as const) {
    expect(w.butchery![key]).toBeGreaterThanOrEqual(Math.floor(remainingYield[key] * factor));
    expect(w.butchery![key]).toBeLessThanOrEqual(Math.ceil(remainingYield[key] * factor));
  }
  expect(amount(w, 'hare-meat')).toBe(w.butchery!.meat);
  expect(amount(w, 'light-leather')).toBe(w.butchery!.leather);
  expect(w.wildlife!.eatenNutrition).toBe(consumedNutrition); expect(w.wildlife!.eatenItems).toBe(0);
  expect(cook.skills.cooking!.xp).toBeGreaterThan(0); replayPredation(w, 10);
});

test('one shared weighted field per tick rotates between two hungry hunters without reserving a living prey', () => {
  const { w, foxId, preyId } = predationCamp();
  const other = structuredClone(animal(w, foxId)); other.id = w.nextId++; other.x = 10; other.z = 16;
  w.wildlife!.animals.push(other); validPredation(w);
  const seen = new Set<number>();
  const search = vi.spyOn(WeightedSearch.prototype, 'advance');
  try {
    for (let i = 0; i < 8; i++) {
      search.mockClear(); stepWorld(w); validPredation(w);
      expect(new Set(search.mock.contexts).size, `global path field identities at tick ${w.tick}`).toBeLessThanOrEqual(1);
      for (const id of [foxId, other.id]) if (animal(w, id).predation?.targetId === preyId) seen.add(id);
      if (w.wildlife!.animals.some(a => a.id === preyId)) expect(reservedSource(w, preyId)).toBe(0);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([foxId, other.id].sort((a, b) => a - b));
  } finally { search.mockRestore(); }
  replayPredation(w, 12);
});

test('the real killed corpse is rejected at its thermal rot boundary, without rewriting its anatomy or death', () => {
  const { w, foxId, preyId } = predationCamp();
  untilPredation(w, () => !!body(w, preyId));
  const corpse = body(w, preyId)!, before = structuredClone(corpse);
  expect(corpseFresh(corpse, w.tick)).toBe(true);
  const remaining = CORPSE_ROT_TICKS - rotAge(corpse, w.tick);
  const boundary = w.tick + Math.ceil(remaining / (corpse.rot?.rate ?? 1));
  expect(corpseFresh(corpse, boundary - 1)).toBe(true);
  expect(corpseFresh(corpse, boundary)).toBe(false);
  // Read-only future eligibility query: no clock jump or forged living actor state.
  expect(animalPileFood({ ...w, tick: boundary }, animal(w, foxId), corpse)).toBe(false);
  expect(corpse).toEqual(before); expect(w.wildlife!.eatenNutrition).toBe(0);
  validPredation(w); replayPredation(w);
});

test('prepared rare terminal ingestion waits for a saved committed recovery, then removes one body and credits nutrition once through real ticks', () => {
  const { w, foxId, preyId } = predationCamp();
  untilPredation(w, () => animal(w, foxId).state === 'eating' && animal(w, foxId).meal?.id === preyId);
  const corpse = body(w, preyId)!, fox = animal(w, foxId), medical = structuredClone(corpse.corpse!.health);
  // Rare boundary fixture: the kill and approach above were real. Only the
  // remaining external anatomy, near-finished interval and concurrent recovery
  // are prepared here; this does not claim that normal cadence overlaps them.
  for (const part of ['tail', 'neck', 'left-front-leg', 'right-front-leg', 'left-rear-leg', 'right-rear-leg'] as const) {
    if (corpsePartAbsent(corpse.corpse!, part)) continue;
    const projected = projectCorpseConsumption(corpse.corpse!, part, w.tick)!;
    expect(projected.consumesWhole).toBe(false); corpse.corpse!.consumedParts = projected.consumedParts;
  }
  const selected = selectCorpsePart(corpse.corpse!, animalNutritionMax(fox) - fox.food)!;
  expect(selected.part).toBe('torso'); expect(selected.consumesWhole).toBe(true);
  fox.meal!.progress = 49;
  expect(corpse.owner.type).toBe('ground');
  const cell = corpse.owner as { x: number; z: number }, witness = w.pawns[0]!;
  witness.x = cell.x; witness.z = cell.z > 0 ? cell.z - 1 : cell.z + 1;
  witness.path = []; delete witness.motion; witness.state = 'idle';
  witness.melee = { order: null, strike: { targetId: preyId, atCore: w.tick * 10 - 10, untilCore: w.tick * 10 + 110, tool: 'left-fist', outcome: 'hit' } };
  const recovery = structuredClone(witness.melee.strike), anatomy = structuredClone(corpse.corpse!.consumedParts);
  const nutrition = w.wildlife!.eatenNutrition, items = w.wildlife!.eatenItems;
  validPredation(w);
  const saved = serializeWorld(w), restored = deserializeWorld(saved);
  expect(restored).toEqual(w); expect(restored.pawns[0]!.melee!.strike).toEqual(recovery);
  const unchanged = serializeWorld(w);
  finishAnimalMeal(w, fox); // Contact is real, but pending recovery forbids terminal removal.
  expect(body(w, preyId)!.corpse!.consumedParts).toEqual(anatomy);
  expect(w.wildlife!.eatenNutrition).toBe(nutrition); expect(w.wildlife!.eatenItems).toBe(items);
  expect(w.rng).toBe(JSON.parse(unchanged).rng); expect(fox.meal!.progress).toBe(0);
  // Restore the valid progress49 checkpoint; the real worker cadence performs
  // the same rejected completion, preserving the committed recovery reference.
  const running = deserializeWorld(saved), resumed = deserializeWorld(saved);
  let attempted = false;
  for (let i = 0; i < 10 && !attempted; i++) {
    stepWorld(running); stepWorld(resumed); validPredation(running); expect(resumed).toEqual(running);
    attempted = animal(running, foxId).meal?.progress === 0;
  }
  expect(attempted).toBe(true);
  expect(running.pawns[0]!.melee!.strike).toEqual(recovery);
  expect(body(running, preyId)!.corpse!.health).toEqual(medical);
  expect(body(running, preyId)!.corpse!.consumedParts).toEqual(anatomy);
  expect(running.wildlife!.eatenNutrition).toBe(nutrition); expect(running.wildlife!.eatenItems).toBe(items);
  replayPredation(running);
  untilPredation(running, () => !body(running, preyId), 500);
  expect(running.pawns[0]!.melee?.strike).toBeFalsy();
  expect(running.wildlife!.eatenItems).toBe(items + 1);
  expect(running.wildlife!.eatenNutrition).toBeCloseTo(nutrition + selected.nutrition, 12);
  expect(animal(running, foxId).meal).toBeUndefined();
  const terminalNutrition = running.wildlife!.eatenNutrition;
  replayPredation(running, 70);
  expect(running.wildlife!.eatenItems).toBe(items + 1);
  expect(running.wildlife!.eatenNutrition).toBe(terminalNutrition);
});
