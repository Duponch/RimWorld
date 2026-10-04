import { expect,test } from 'vitest';
import { PACKAGED_SURVIVAL_CELLS,preparePackagedSurvivalDemo } from '../scripts/create-packaged-survival-v206-test-save.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { ticksUntilRot } from '../src/sim/food-preservation.ts';
import { PACKAGED_SURVIVAL_MEALS_RESEARCH_COST } from '../src/sim/research.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import type { World } from '../src/sim/types.ts';

/** Supplies and completed research are explicit preparation; all rations,
 * loading, border crossings and consumption must happen afterwards. */
function scene(contaminated=false):World {
  const w=preparePackagedSurvivalDemo(),stove=w.structures.find(s=>s.kind==='fueled-stove')!;
  w.research!.packagedSurvivalMeals={points:PACKAGED_SURVIVAL_MEALS_RESEARCH_COST,completedAt:w.tick};
  w.stockpiles.push({id:w.nextId++,...PACKAGED_SURVIVAL_CELLS.storage,filters:{wood:false,food:true},items:{'survival-meal':true},priority:2,capacity:10});
  w.pawns[1]!.priorities.cook=1;w.pawns[2]!.hunger=65;
  // A prepared rare-outcome stream tests real contamination at completion,
  // rather than editing the output ration's condition after it is produced.
  w.rng=contaminated?1:0x12345678;
  expect(applyCommand(w,{type:'bill-add',structureId:stove.id,recipe:'cook-survival-meal'}).ok).toBe(true);
  stove.bills![0]!.target=3;stove.bills![0]!.destination='stockpile';
  expect(validateWorld(w)).toEqual([]);return w;
}
const count=(w:World):number=>w.piles.reduce((n,p)=>n+(p.item==='survival-meal'?p.quantity:0),0)+(w.scout&&'items' in w.scout?w.scout.items.reduce((n,p)=>n+(p.item==='survival-meal'?p.quantity:0),0):0);
function until(w:World,done:()=>boolean,limit=3000):void {
  for(let i=0;i<limit&&!done();i++){stepWorld(w);if(i%100===0)expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}
  expect(done(),JSON.stringify({tick:w.tick,pawns:w.pawns.map(p=>({state:p.state,hunger:p.hunger,cooking:p.cooking})),scout:w.scout,piles:w.piles})).toBe(true);
  expect(validateWorld(w)).toEqual([]);
}
function produce(w:World){
  until(w,()=>w.piles.some(p=>p.item==='survival-meal'&&p.quantity===3&&p.owner.type==='ground')&&!w.pawns[1]!.cooking);
  const ration=w.piles.find(p=>p.item==='survival-meal')!;
  expect(w.piles.some(p=>p.item==='hare-meat'||p.item==='rice')).toBe(false);
  expect(ration.owner).toEqual({type:'ground',...PACKAGED_SURVIVAL_CELLS.storage});
  expect(ration.rot).toBeUndefined();expect(ticksUntilRot(ration,w.tick+10*6000)).toBe(Infinity);
  return ration;
}

test('three physically fabricated rations load the original explorer, feed it off map and return remaining property exactly',()=>{
  const w=scene(),explorer=w.pawns[2]!,originalId=explorer.id;
  expect(count(w)).toBe(0);const ration=produce(w);expect(count(w)).toBe(3);expect(ration.foodPoison).toBeUndefined();
  const gearIds=w.piles.filter(p=>p.owner.type==='apparel'&&p.owner.pawnId===originalId).map(p=>p.id);
  expect(applyCommand(w,{type:'scout-start',pawnId:originalId,pileId:ration.id,quantity:3}).ok).toBe(true);
  expect(w.scout?.phase).toBe('loading');expect(ration.owner.type).toBe('ground');expect(count(w)).toBe(3);
  until(w,()=>w.scout?.phase==='leaving');expect(count(w)).toBe(3);
  expect(w.piles.filter(p=>p.item==='survival-meal'&&p.owner.type==='inventory'&&p.owner.pawnId===originalId)).toHaveLength(1);
  until(w,()=>w.scout?.phase==='travelling');const trip=w.scout!;
  if(trip.phase!=='travelling')throw Error('Traveller expected');
  expect(trip.pawn).toBe(explorer);expect(w.pawns.some(p=>p.id===originalId)).toBe(false);expect(count(w)).toBe(3);
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);
  until(w,()=>!!w.scout&&'consumed' in w.scout&&w.scout.consumed===1);
  expect(count(w)).toBe(2);expect(w.scout&&'pawn' in w.scout?w.scout.pawn.hunger:0).toBeGreaterThan(80);
  const consumedCopy=deserializeWorld(serializeWorld(w));stepWorld(w);stepWorld(consumedCopy);expect(consumedCopy).toEqual(w);
  until(w,()=>!w.scout);expect(w.pawns.filter(p=>p.id===originalId)).toEqual([explorer]);expect(count(w)).toBe(2);
  expect(w.piles.filter(p=>gearIds.includes(p.id)).map(p=>p.id)).toEqual(gearIds);
  expect(w.piles.filter(p=>p.item==='survival-meal')).toHaveLength(1);expect(w.piles.find(p=>p.item==='survival-meal')!.owner.type).toBe('ground');
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('contamination is produced at real completion, remains in the stored batch and atomically refuses scout loading',()=>{
  const w=scene(true),explorer=w.pawns[2]!,ration=produce(w);
  expect(ration.foodPoison?.fraction).toBeGreaterThan(0);expect(count(w)).toBe(3);
  const before=serializeWorld(w);
  expect(applyCommand(w,{type:'scout-start',pawnId:explorer.id,pileId:ration.id,quantity:3}).ok).toBe(false);
  expect(serializeWorld(w)).toBe(before);expect(w.scout).toBeUndefined();expect(deserializeWorld(before)).toEqual(w);
});
