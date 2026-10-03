import { expect,test } from 'vitest';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { quoteCommercial } from '../src/sim/commercial-post.ts';
import { commercialCamp,commercialContents,commercialItemTotal } from './helpers/commercial-v193.ts';
import type { World } from '../src/sim/types.ts';

function until(w:World,phase:NonNullable<World['commercialTrip']>['phase'],limit=1100):void {
  for(let i=0;i<limit&&w.commercialTrip?.phase!==phase;i++)stepWorld(w);
  expect(w.commercialTrip?.phase).toBe(phase);
}
function atPost(hunger=95):World {
  const {world:w,pawnId,foodId}=commercialCamp();w.pawns.find(p=>p.id===pawnId)!.hunger=hunger;
  expect(applyCommand(w,{type:'commercial-start',pawnId,foodPileId:foodId,quantity:2,silver:600}).ok).toBe(true);
  until(w,'outbound');expect(w.civilianPost).toBeUndefined();until(w,'at-post');expect(validateWorld(w)).toEqual([]);return w;
}
test('actual travel preserves original owners, consumes an identified ration and resumes the visit through its exact automatic deadline',()=>{
  const w=atPost(34),s=w.commercialTrip;if(s?.phase!=='at-post')throw new Error('Expected post');
  expect(w.pawns.some(p=>p.id===s.pawn.id)).toBe(false);expect(w.piles.some(i=>s.items.some(j=>j.id===i.id))).toBe(false);
  expect(s.consumed).toBe(1);expect(commercialItemTotal(w,'survival-meal')).toBe(3);
  expect(s.arrivedAt).toBe(s.departedAt+750);expect(s.decisionUntil).toBe(s.arrivedAt+250);
  const initialPost=JSON.stringify(w.civilianPost),hunger=s.pawn.hunger,rest=s.pawn.rest,age=s.pawn.age!.chronologicalTicks;
  const resumed=deserializeWorld(serializeWorld(w));stepWorld(w,249);stepWorld(resumed,249);expect(serializeWorld(resumed)).toBe(serializeWorld(w));
  expect(w.commercialTrip?.phase).toBe('at-post');expect(s.pawn.hunger).toBeLessThan(hunger);expect(s.pawn.rest).toBeLessThan(rest);
  expect(s.pawn.age!.chronologicalTicks).toBe(age+249);
  stepWorld(w);expect(w.commercialTrip).toMatchObject({phase:'returning',leftPostAt:s.decisionUntil,returnAt:s.decisionUntil+750,silverPaid:0,bought:{medicine:0,component:0}});
  expect(JSON.stringify(w.civilianPost)).toBe(initialPost);expect(validateWorld(w)).toEqual([]);
});
test('real purchase remains off map, then original acquired piles return in inventory and unload on separate physical cells',()=>{
  const w=atPost(),s=w.commercialTrip;if(s?.phase!=='at-post')throw new Error('Expected post');
  const pawnId=s.pawn.id,medicine=w.civilianPost!.stock.find(i=>i.item==='medicine')!,component=w.civilianPost!.stock.find(i=>i.item==='component')!;
  const lines=[{pileId:medicine.id,quantity:2},{pileId:component.id,quantity:1}],q=quoteCommercial(w,lines);if(!q.ok)throw new Error(q.reason);
  const money=commercialItemTotal(w,'silver')+w.civilianPost!.stock.filter(i=>i.item==='silver').reduce((n,i)=>n+i.quantity,0);
  expect(applyCommand(w,{type:'commercial-buy',lines,quote:q.signature}).ok).toBe(true);expect(w.commercialTrip?.phase).toBe('at-post');
  const bought=w.commercialTrip;if(bought?.phase!=='at-post')throw new Error('Expected purchased visit');
  expect(bought).toMatchObject({silverPaid:q.totalSilver,bought:{medicine:2,component:1}});
  expect(bought.items.filter(i=>i.item==='medicine'||i.item==='component').every(i=>i.owner.type==='inventory'&&i.owner.pawnId===pawnId)).toBe(true);
  const acquiredIds=bought.items.filter(i=>i.item==='medicine'||i.item==='component').map(i=>i.id),paidSave=serializeWorld(w);
  expect(applyCommand(w,{type:'commercial-buy',lines,quote:q.signature}).ok).toBe(false);expect(serializeWorld(w)).toBe(paidSave);
  expect(applyCommand(w,{type:'commercial-return'}).ok).toBe(true);const resumed=deserializeWorld(serializeWorld(w));
  stepWorld(w,50);stepWorld(resumed,50);expect(serializeWorld(resumed)).toBe(serializeWorld(w));
  until(w,'unloading');expect(w.pawns.some(p=>p.id===pawnId)).toBe(true);
  for(const id of acquiredIds)expect(w.piles.find(i=>i.id===id)?.owner).toEqual({type:'inventory',pawnId});
  expect(validateWorld(w)).toEqual([]);
  const unloadSave=serializeWorld(w),restored=deserializeWorld(unloadSave);stepWorld(w);stepWorld(restored);expect(serializeWorld(restored)).toBe(serializeWorld(w));
  for(let i=0;i<200&&w.commercialTrip;i++)stepWorld(w);
  expect(w.commercialTrip).toBeUndefined();expect(validateWorld(w)).toEqual([]);
  const cells=new Set<string>();
  for(const id of acquiredIds){const pile=w.piles.find(i=>i.id===id)!;expect(pile.owner.type).toBe('ground');if(pile.owner.type==='ground')cells.add(`${pile.owner.x},${pile.owner.z}`);}
  expect(cells.size).toBe(2);expect(commercialItemTotal(w,'medicine')).toBe(2);expect(commercialItemTotal(w,'component')).toBe(1);
  expect(commercialItemTotal(w,'silver')+w.civilianPost!.stock.filter(i=>i.item==='silver').reduce((n,i)=>n+i.quantity,0)).toBe(money);
});
test('sealed real entry suspends only post-trip needs, preserving owners, stock and exact continuation until the border opens',()=>{
  const w=atPost();expect(applyCommand(w,{type:'commercial-return'}).ok).toBe(true);
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)if(x===0||z===0||x===w.width-1||z===w.height-1)w.tiles[z*w.width+x]={terrain:'rock'};
  until(w,'awaiting-entry');const s=w.commercialTrip;if(s?.phase!=='awaiting-entry')throw new Error('Expected waiting');
  const needs=[s.pawn.hunger,s.pawn.rest],age=s.pawn.age!.chronologicalTicks,post=JSON.stringify(w.civilianPost),ids=commercialContents(w).map(i=>i.id);
  expect(validateWorld(w)).toEqual([]);const resumed=deserializeWorld(serializeWorld(w));stepWorld(w,43);stepWorld(resumed,43);
  expect(serializeWorld(resumed)).toBe(serializeWorld(w));expect([s.pawn.hunger,s.pawn.rest]).toEqual(needs);expect(s.pawn.age!.chronologicalTicks).toBe(age+43);
  expect(JSON.stringify(w.civilianPost)).toBe(post);expect(commercialContents(w).map(i=>i.id)).toEqual(ids);
  w.tiles[s.entry.z*w.width+s.entry.x]={terrain:'grass'};until(w,'unloading',20);
  expect(validateWorld(w)).toEqual([]);expect(w.pawns.filter(p=>p.id===s.pawn.id)).toHaveLength(1);
});
