import { expect,test } from 'vitest';
import { applyCommand,refreshStock,stepWorld,validateWorld } from '../src/sim/index.ts';
import { applyScoutCommand } from '../src/sim/caravan-loading.ts';
import { reservedSource } from '../src/sim/materials.ts';
import { medicalCamp } from './scenarios/health.ts';
import type { MaterialPile,World } from '../src/sim/types.ts';

function camp(quantity=5):{w:World;food:MaterialPile} {
  const w=medicalCamp(2),p=w.pawns[0]!;
  p.x=9;p.z=16;p.hunger=95;p.rest=95;
  const food:MaterialPile={id:w.nextId++,kind:'food',item:'survival-meal',quantity,owner:{type:'ground',x:18,z:16}};
  w.piles.push(food);refreshStock(w);
  return {w,food};
}
function until(w:World,ready:()=>boolean,max=800):void {
  for(let i=0;i<max&&!ready();i++)stepWorld(w);
  expect(ready(),`Scout phase after ${max} ticks: ${w.scout?.phase??'none'}`).toBe(true);
}

test('scout reserves a real source, reaches it, splits exact food into personal inventory, then walks to an edge',()=>{
  const {w,food}=camp(),actor=w.pawns[0]!,initialNextId=w.nextId;
  expect(validateWorld(w)).toEqual([]);
  expect(applyCommand(w,{type:'scout-start',pawnId:actor.id,pileId:food.id,quantity:2}).ok).toBe(true);
  expect(w.scout).toMatchObject({phase:'loading',pawnId:actor.id,sourcePileId:food.id,quantity:2});
  expect(food.owner.type).toBe('ground');expect(reservedSource(w,food.id)).toBe(2);
  until(w,()=>w.scout?.phase==='leaving');
  expect(Math.max(Math.abs(actor.x-18),Math.abs(actor.z-16))).toBeLessThanOrEqual(1);
  expect(food.quantity).toBe(3);
  const carried=w.piles.find(i=>i.id===initialNextId)!;
  expect(carried).toMatchObject({kind:'food',item:'survival-meal',quantity:2,owner:{type:'inventory',pawnId:actor.id}});
  expect(w.nextId).toBe(initialNextId+1);
  expect(reservedSource(w,food.id)).toBe(0);
  expect(validateWorld(w)).toEqual([]);
  until(w,()=>w.scout?.phase==='travelling',1200);
  expect(w.pawns).not.toContain(actor);
  expect(w.scout?.phase).toBe('travelling');
  expect(validateWorld(w)).toEqual([]);
});

test('cancelling after pickup retains the identified rations; cancelling in transit preserves the active edge',()=>{
  const {w,food}=camp(3),actor=w.pawns[0]!;
  expect(applyScoutCommand(w,{type:'scout-start',pawnId:actor.id,pileId:food.id,quantity:3}).ok).toBe(true);
  until(w,()=>w.scout?.phase==='leaving');
  expect(food.owner).toEqual({type:'inventory',pawnId:actor.id});
  expect(w.piles.filter(i=>i.id===food.id)).toHaveLength(1);
  expect(applyCommand(w,{type:'scout-cancel'}).ok).toBe(true);
  expect(w.scout).toBeUndefined();
  expect(food.owner).toEqual({type:'inventory',pawnId:actor.id});
  expect(food.quantity).toBe(3);
  expect(validateWorld(w)).toEqual([]);

  const obstacle:MaterialPile={id:w.nextId++,kind:'wood',item:'wood',quantity:1,owner:{type:'ground',x:actor.x,z:actor.z}};
  w.piles.push(obstacle);refreshStock(w);
  const before=JSON.stringify(w);
  expect(applyScoutCommand(w,{type:'scout-unload',pawnId:actor.id}).ok).toBe(false);
  expect(JSON.stringify(w)).toBe(before);
  w.piles.splice(w.piles.indexOf(obstacle),1);refreshStock(w);
  const unloadCell={x:actor.x,z:actor.z},foodId=food.id;
  expect(applyScoutCommand(w,{type:'scout-unload',pawnId:actor.id}).ok).toBe(true);
  expect(food.id).toBe(foodId);
  expect(food.owner).toEqual({type:'ground',...unloadCell});
  expect(validateWorld(w)).toEqual([]);

  const next=camp(3),walker=next.w.pawns[0]!;
  expect(applyScoutCommand(next.w,{type:'scout-start',pawnId:walker.id,pileId:next.food.id,quantity:3}).ok).toBe(true);
  until(next.w,()=>walker.moveCooldown>0&&!!walker.motion,100);
  const motion=structuredClone(walker.motion),position={x:walker.x,z:walker.z};
  expect(applyScoutCommand(next.w,{type:'scout-cancel'}).ok).toBe(true);
  expect(walker.motion).toEqual(motion);
  expect({x:walker.x,z:walker.z}).toEqual(position);
  expect(walker.path).toEqual([]);
  expect(next.food.owner.type).toBe('ground');
});

test('unavailable, contaminated, and unreachable source refusals do not mutate the world',()=>{
  const {w,food}=camp(2),actor=w.pawns[0]!,other=w.pawns[1]!;
  other.need={kind:'eat',phase:'pickup',sourcePileId:food.id,carryPileId:null,quantity:1,progress:0,dining:null};
  let before=JSON.stringify(w);
  expect(applyScoutCommand(w,{type:'scout-start',pawnId:actor.id,pileId:food.id,quantity:2}).ok).toBe(false);
  expect(JSON.stringify(w)).toBe(before);
  other.need=null;
  food.foodPoison={fraction:1,cause:'unknown'};
  before=JSON.stringify(w);
  expect(applyScoutCommand(w,{type:'scout-start',pawnId:actor.id,pileId:food.id,quantity:2}).ok).toBe(false);
  expect(JSON.stringify(w)).toBe(before);
  delete food.foodPoison;
  for(let z=0;z<w.height;z++)w.tiles[z*w.width+14]={terrain:'rock'};
  before=JSON.stringify(w);
  expect(applyScoutCommand(w,{type:'scout-start',pawnId:actor.id,pileId:food.id,quantity:2}).ok).toBe(false);
  expect(JSON.stringify(w)).toBe(before);
});
