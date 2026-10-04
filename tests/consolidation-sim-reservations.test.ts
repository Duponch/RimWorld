import { expect, test } from 'vitest';
import { applyCommand, createWorld, stepWorld } from '../src/sim/engine.ts';
import { addGroundMaterial, refreshStock, reservedSource, reservedSourcesByPile } from '../src/sim/materials.ts';
import { newCookingBill } from '../src/sim/cooking-bills.ts';
import { planWork } from '../src/sim/work-planner.ts';
import { blockedCells } from '../src/sim/pathfinding.ts';
import { deserializeWorld, serializeWorld, validateWorld } from '../src/sim/serialization.ts';
import { initialGrave } from '../src/sim/burial.ts';
import { funeralFixture } from './scenarios/hygiene-ui.ts';
import type { Pawn, World } from '../src/sim/types.ts';

function checkReservations(w: World): void {
  for (const except of [undefined, ...w.pawns.map(p => p.id)]) {
    const captured = reservedSourcesByPile(w, except);
    for (const pile of w.piles) expect(captured.get(pile.id) ?? 0).toBe(reservedSource(w, pile.id, except));
  }
  expect(validateWorld(w)).toEqual([]);
}
function plan(w: World, p: Pawn): void {
  planWork(w, p, () => blockedCells(w), new Set(), {remaining:8, pairs:32768});
  checkReservations(w); // Observe admission before end-of-tick reconciliation.
}
function queuedCooking() {
  const w = createWorld(42, 32, 32); w.tick = 2000;
  w.tiles = w.tiles.map(() => ({terrain:'grass'}));
  w.resources = []; w.jobs = []; w.piles = []; w.stockpiles = []; w.structures = []; w.pawns = w.pawns.slice(0,2);
  w.pawns.forEach((p,i) => {
    Object.assign(p, {x:8+i, z:10, hunger:100, rest:100}); p.schedule.fill('anything');
    for (const k of Object.keys(p.priorities) as (keyof Pawn['priorities'])[]) p.priorities[k] = 0;
  });
  const [actor, other] = w.pawns;
  actor!.priorities.gather = 1; actor!.priorities.cook = 1; other!.priorities.haul = 1;
  const bill = newCookingBill(w.nextId++); bill.destination = 'drop';
  const station = {id:w.nextId++, kind:'campfire' as const, x:15, z:8, orientation:0 as const, footprint:'standard' as const,
    bills:[bill], fuel:{ticks:6000, burned:0, autoRefuel:false}};
  w.structures.push(station); w.resources.push({id:w.nextId++, kind:'tree', x:10, z:12, amount:12});
  expect(applyCommand(w, {type:'designate', kind:'chop', x:10, z:12}).ok).toBe(true);
  addGroundMaterial(w, 'food', 10, {x:8,z:8}, 'rice'); const source = w.piles[0]!;
  expect(applyCommand(w, {type:'order-job', pawnId:actor!.id, jobId:w.jobs[0]!.id, queue:false}).ok).toBe(true);
  expect(applyCommand(w, {type:'order-cook', pawnId:actor!.id, structureId:station.id, queue:true}).ok).toBe(true);
  expect(applyCommand(w, {type:'stockpile', x:20, z:8, enabled:true, capacity:75, priority:3, filters:{wood:false,food:true}}).ok).toBe(true);
  refreshStock(w); checkReservations(w);
  return {w, actor:actor!, other:other!, source};
}

test('automatic haul preserves an admitted queued recipe before reconciliation, across replay and explicit cancellation', () => {
  const {w, actor, other, source} = queuedCooking();
  expect(reservedSource(w, source.id)).toBe(10);
  expect(reservedSource(w, source.id, actor.id)).toBe(10); // Own waiting orders still compete.
  plan(w, other); expect(other.haul).toBeNull(); expect(actor.orders.queue).toHaveLength(1);
  const copy = deserializeWorld(serializeWorld(w));
  for (let i=0; i<3; i++) {stepWorld(w); stepWorld(copy); checkReservations(w); expect(serializeWorld(w)).toBe(serializeWorld(copy));}
  expect(actor.orders.queue).toHaveLength(1); expect(source.quantity).toBe(10);
  actor.priorities.cook = 0; actor.priorities.gather = 0;
  expect(applyCommand(w, {type:'clear-orders', pawnId:actor.id}).ok).toBe(true);
  expect(reservedSource(w, source.id)).toBe(0);
  plan(w, other); expect(other.haul).toMatchObject({sourcePileId:source.id,quantity:10,phase:'pickup'});
  for (let i=0; i<12 && other.haul?.phase==='pickup'; i++) {stepWorld(w); checkReservations(w);}
  expect(other.haul?.phase).toBe('deliver');
  expect(w.piles.reduce((n,p) => n+(p.item==='rice'?p.quantity:0),0)).toBe(10);
});

test('automatic haul preserves a corpse reserved by a direct burial, then releases its source claim at physical pickup', () => {
  const {w, actor, other, body} = funeralFixture(); actor.priorities.build = 0;
  const grave = {id:w.nextId++,kind:'grave' as const,x:25,z:16,orientation:0 as const,footprint:'standard' as const,grave:initialGrave()};
  w.structures.push(grave);
  expect(applyCommand(w, {type:'stockpile',x:24,z:8,enabled:true,capacity:1,priority:4,filters:{wood:false,food:false,corpse:true}}).ok).toBe(true);
  expect(applyCommand(w, {type:'order-bury',pawnId:actor.id,bodyPawnId:body.id,graveId:grave.id}).ok).toBe(true);
  const id = body.body!.pileId!; checkReservations(w); expect(reservedSource(w,id)).toBe(1);
  plan(w, other); expect(other.haul).toBeNull(); expect(actor.burial?.phase).toBe('pickup');
  const copy = deserializeWorld(serializeWorld(w));
  for (let i=0; i<25 && actor.burial?.phase==='pickup'; i++) {
    stepWorld(w); stepWorld(copy); checkReservations(w); expect(serializeWorld(w)).toBe(serializeWorld(copy));
    expect(actor.burial).toBeDefined();
  }
  expect(actor.burial?.phase).not.toBe('pickup'); expect(reservedSource(w,id)).toBe(0);
  const corpse = w.piles.find(p => p.id===id)!; expect(corpse.owner).toEqual({type:'pawn',pawnId:actor.id});
  expect(applyCommand(w, {type:'clear-orders',pawnId:actor.id}).ok).toBe(true);
  checkReservations(w); expect(w.piles.find(p => p.id===id)?.owner.type).toBe('ground');
  expect(w.piles.filter(p => p.item==='human-corpse')).toHaveLength(1);
});
