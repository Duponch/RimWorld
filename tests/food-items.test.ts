import { expect, test } from 'vitest';
import { createWorld, addGroundMaterial, refreshStock, stepWorld, validateWorld, serializeWorld, deserializeWorld, applyCommand } from '../src/sim/index';
import { mealQuantity, adultHungerFactor, availableNutrition } from '../src/sim/items';
import { reservedSource } from '../src/sim/materials';
import legacyMeal from './fixtures/schema-4-meal.json';

function fixture() {
  const w = createWorld(42, 16, 16); w.resources = []; w.piles = []; w.stockpiles = [];
  w.tiles = w.tiles.map(() => ({ terrain: 'grass' })); w.pawns = w.pawns.slice(0, 2);
  w.pawns.forEach((p, i) => { p.x = 2; p.z = 2 + i * 2; p.hunger = 20; p.rest = 100; p.priorities = { gather: 0, build: 0, haul: 0, grow: 0 , cook: 0 }; });
  refreshStock(w); return w;
}

test('food choice: neutral-adult taste, distance, inaccessible meals, legacy economy and held raw cargo', () => {
  // Fresh berries outrank survival packs by five cells; rice raw-food thought
  // is an optimality penalty, not an absolute prohibition against eating it.
  for (const [berryX, expected] of [[6,'berries'],[9,'berries'],[10,'survival-meal'],[12,'survival-meal']] as const) {
    const w=fixture();w.pawns=w.pawns.slice(0,1);const p=w.pawns[0]!;
    addGroundMaterial(w,'food',20,{x:3,z:2},'rice');
    addGroundMaterial(w,'food',1,{x:5,z:2},'survival-meal');
    addGroundMaterial(w,'food',20,{x:berryX,z:2},'berries');
    stepWorld(w);expect(p.need?.kind).toBe('eat');
    const id=p.need?.kind==='eat'?(p.need.carryPileId??p.need.sourcePileId):0;
    expect(w.piles.find(p=>p.id===id)?.item).toBe(expected);expect(validateWorld(w)).toEqual([]);
  }
  const blocked=fixture();blocked.pawns=blocked.pawns.slice(0,1);
  addGroundMaterial(blocked,'food',20,{x:3,z:2},'rice');addGroundMaterial(blocked,'food',20,{x:10,z:2},'berries');
  for(let z=0;z<blocked.height;z++)blocked.tiles[z*blocked.width+8]={terrain:'water'};
  stepWorld(blocked);expect(blocked.pawns[0]!.need).toMatchObject({kind:'eat',quantity:16});
  expect(blocked.piles.find(p=>p.owner.type==='pawn')?.item).toBe('rice');
  expect(validateWorld(blocked)).toEqual([]);
  const legacy=fixture();legacy.pawns=legacy.pawns.slice(0,1);legacy.foodRules='legacy';
  addGroundMaterial(legacy,'food',20,{x:3,z:2},'rice');addGroundMaterial(legacy,'food',20,{x:5,z:2},'berries');
  stepWorld(legacy);expect(legacy.piles.find(p=>p.owner.type==='pawn')?.item).toBe('rice');
  const carrying=fixture();carrying.pawns=carrying.pawns.slice(0,1);const p=carrying.pawns[0]!;p.hunger=100;p.priorities.haul=1;
  addGroundMaterial(carrying,'food',10,{x:3,z:2},'rice');
  applyCommand(carrying,{type:'stockpile',enabled:true,x:12,z:12,filters:{wood:false,food:true}});
  stepWorld(carrying);expect(p.haul?.phase).toBe('deliver');
  addGroundMaterial(carrying,'food',20,{x:5,z:2},'berries');p.hunger=20;p.needCooldown=0;stepWorld(carrying);
  expect(p.haul).toBeNull();const selected=p.need?.kind==='eat'?p.need.sourcePileId:0;
  expect(carrying.piles.find(pile=>pile.id===selected)?.item).toBe('berries');
  expect(carrying.piles.filter(p=>p.item==='rice').reduce((n,p)=>n+p.quantity,0)).toBe(10);expect(validateWorld(carrying)).toEqual([]);
  // Spoilage preference changes an actual reachable target, with a strict
  // half-day boundary; it does not grant distant food or alter travel length.
  for(const [left,expectedX] of [[3001,3],[3000,10]] as const) {
    const w=fixture();w.pawns=w.pawns.slice(0,1);
    addGroundMaterial(w,'food',20,{x:3,z:2},'berries');addGroundMaterial(w,'food',20,{x:10,z:2},'berries');
    const old=w.piles[1]!;old.rot={progress:14*6000-left,atTick:0};stepWorld(w);
    const task=w.pawns[0]!.need!;expect(task.kind).toBe('eat');
    expect(task.kind==='eat'?task.sourcePileId:null).toBe(expectedX===3?w.piles[0]!.id:old.id);expect(validateWorld(w)).toEqual([]);
  }
});

test.each(['berries','rice'] as const)('aliments (%s) : réservations fractionnées, repas simultanés, interruption et continuation sans conversion ni duplication', item => {
  const w = fixture(); addGroundMaterial(w, 'food', 20, { x: 6, z: 3 }, item);
  let consumed = 0, nutrition = 0; const phases = new Map<string, string>();
  for (let tick = 0; tick < 400; tick++) {
    const finishing = w.pawns.flatMap(p => p.need?.kind === 'eat' && p.need.phase === 'ingest' && p.need.progress === 49 ? [{ id: p.id, quantity: p.need.quantity, hunger: p.hunger }] : []);
    stepWorld(w);
    expect(validateWorld(w), `tick ${w.tick}`).toEqual([]);
    for (const pile of w.piles) expect(reservedSource(w, pile.id)).toBeLessThanOrEqual(pile.quantity);
    for (const p of w.pawns) if (p.need?.kind === 'eat' && !phases.has(p.need.phase)) phases.set(p.need.phase, serializeWorld(w));
    for (const meal of finishing) {
      consumed += meal.quantity; nutrition += meal.quantity * 5;
      expect(w.pawns.find(p => p.id === meal.id)!.hunger).toBeCloseTo(Math.min(100, meal.hunger - 160 / 6000 * adultHungerFactor(meal.hunger) + meal.quantity * 5), 9);
    }
    expect(w.piles.reduce((n,p) => n+p.quantity, 0) + consumed).toBe(20);
    expect(w.piles.every(p => p.item === item)).toBe(true);
  }
  expect(consumed).toBe(20); expect(nutrition).toBe(100); expect(phases.has('pickup')).toBe(true); expect(phases.has('ingest')).toBe(true);
  for (const save of phases.values()) {
    const a = deserializeWorld(save), b = deserializeWorld(save);
    stepWorld(a, 400); stepWorld(b, 400); expect(serializeWorld(a)).toBe(serializeWorld(b));
  }
  expect(w.pawns.every(p=>p.memories.some(m=>m.kind==='ate-raw-food'))).toBe(item==='rice');
  if(item==='rice') { const invalid=structuredClone(w);invalid.pawns[0]!.memories=[invalid.pawns[0]!.memories[0]!,invalid.pawns[0]!.memories[0]!];expect(validateWorld(invalid)).toContain('Duplicate meal memory.'); }
  const interrupted = deserializeWorld(phases.get('ingest')!);
  const p = interrupted.pawns.find(p => p.state === 'eating')!;
  const before = interrupted.stock.food, held = interrupted.piles.find(pile => pile.owner.type === 'pawn' && pile.owner.pawnId === p.id)!;
  p.rest = 0; stepWorld(interrupted);
  expect(interrupted.stock.food).toBe(before); expect(held.owner).toEqual({ type: 'ground', x:p.x,z:p.z }); expect(held.item).toBe(item);
  expect(validateWorld(interrupted)).toEqual([]);
});

test('catalogue : limites par objet, logistique hétérogène, arrondis, faim et migration V4 hostile', () => {
  const switching = fixture(); switching.pawns = [switching.pawns[0]!];
  const hauler = switching.pawns[0]!; hauler.hunger = 100; hauler.priorities.haul = 1;
  addGroundMaterial(switching, 'food', 16, {x:8,z:8}, 'berries');
  applyCommand(switching,{type:'stockpile',enabled:true,x:12,z:12,filters:{wood:false,food:true},capacity:75,priority:4});
  stepWorld(switching); expect(hauler.haul).toMatchObject({phase:'pickup',quantity:10});
  hauler.hunger = 20; hauler.needCooldown = 0; stepWorld(switching, Math.ceil(hauler.moveCooldown)); stepWorld(switching);
  // The future haul is being cancelled: its own reservation must be available
  // to the replacement meal, while other actors' reservations remain binding.
  expect(hauler.need).toMatchObject({kind:'eat',quantity:16}); expect(hauler.haul).toBeNull();
  expect(validateWorld(switching)).toEqual([]);
  const w = fixture(); w.pawns = [w.pawns[0]!]; const p = w.pawns[0]!; p.hunger = 100; p.priorities.haul = 1;
  addGroundMaterial(w, 'food', 21, {x:3,z:3}, 'survival-meal');
  addGroundMaterial(w, 'food', 76, {x:3,z:3}, 'berries');
  expect(w.piles.filter(p=>p.item==='survival-meal').map(p=>p.quantity)).toEqual([10,10,1]);
  expect(w.piles.filter(p=>p.item==='berries').map(p=>p.quantity)).toEqual([75,1]);
  expect(availableNutrition(w)).toBeCloseTo(22.7);
  const berry = w.piles.find(p=>p.item==='berries')!;
  for (const [hunger, expected] of [[20,16],[17.5,16],[12.5,18],[100,1]]) { p.hunger=hunger!; expect(mealQuantity(p,berry,75)).toBe(expected); }
  p.hunger=20;expect(mealQuantity(p,berry,3)).toBe(3);expect(mealQuantity(p,w.piles[0]!,10)).toBe(1);
  p.hunger=100;
  expect(applyCommand(w,{type:'stockpile',enabled:true,x:8,z:8,filters:{wood:false,food:true},capacity:75,priority:4})).toEqual({ok:true});
  for(let i=0;i<450;i++){stepWorld(w);expect(validateWorld(w)).toEqual([]);}
  expect(w.piles.filter(p=>p.item==='berries').reduce((n,p)=>n+p.quantity,0)).toBe(76);
  expect(w.piles.filter(p=>p.item==='survival-meal').reduce((n,p)=>n+p.quantity,0)).toBe(21);
  expect(w.piles.some(p=>p.owner.type==='ground'&&p.owner.x===8&&p.owner.z===8)).toBe(true);
  const empty=fixture();empty.pawns=[empty.pawns[0]!];
  for(const [level,factor] of [[100,1],[24,1],[23.9,0.5],[12,0.5],[11.9,0.25],[0,0]]) {
    empty.pawns[0]!.hunger=level!; stepWorld(empty); expect(empty.pawns[0]!.hunger).toBeCloseTo(Math.max(0,level!-160/6000*factor!),10);
  }
  const migrated=deserializeWorld(JSON.stringify(legacyMeal));
  expect(migrated.foodRules).toBe('legacy'); expect(migrated.piles.filter(p=>p.kind==='food').every(p=>p.item==='legacy-portion')).toBe(true);
  expect(migrated.pawns[0]!.need).toMatchObject({kind:'eat',progress:17,quantity:1});
  const level=migrated.pawns[0]!.hunger;stepWorld(migrated,33);expect(migrated.pawns[0]!.hunger).toBeCloseTo(level-33*0.015+35,8);
  for(const mutate of [
    (x:any)=>{x.piles[0].item='unknown';}, (x:any)=>{x.piles[0].item='wood';},
    (x:any)=>{x.piles[0].quantity=11;}, (x:any)=>{x.foodRules='magic';},
    (x:any)=>{x.pawns[0].need={kind:'eat',phase:'pickup',sourcePileId:x.piles[0].id,carryPileId:null,progress:0,dining:null,quantity:2};},
  ]) {const x=JSON.parse(serializeWorld(w));mutate(x);expect(()=>deserializeWorld(JSON.stringify(x))).toThrow();expect(()=>validateWorld(x)).not.toThrow();}
  const mixed=structuredClone(legacyMeal) as any;mixed.piles[0].item='berries';expect(()=>deserializeWorld(JSON.stringify(mixed))).toThrow();
});
