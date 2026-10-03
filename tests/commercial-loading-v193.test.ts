import { expect,test } from 'vitest';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { previewCommercialLoading } from '../src/sim/commercial-loading.ts';
import { addMaterial,reservedSource,reservedSourcesByPile } from '../src/sim/materials.ts';
import { commercialCamp,commercialItemTotal } from './helpers/commercial-v193.ts';
import type { World } from '../src/sim/types.ts';

function until(w:World,ready:()=>boolean,max=500):void {
  for(let i=0;i<max&&!ready();i++)stepWorld(w);
  expect(ready(),`Commercial phase after ${max} ticks: ${w.commercialTrip?.phase??'none'}`).toBe(true);
}
test('multi-pile preparation reserves once, takes sources at contact and conserves splits before physical exit',()=>{
  const {world:w,pawnId,foodId,silverIds}=commercialCamp(),p=w.pawns.find(p=>p.id===pawnId)!,initialNext=w.nextId;
  expect(validateWorld(w)).toEqual([]);
  expect(previewCommercialLoading(w,p,2,600)).toEqual({grams:5400,capacityGrams:35000});
  expect(applyCommand(w,{type:'commercial-start',pawnId,foodPileId:foodId,quantity:2,silver:600}).ok).toBe(true);
  expect(w.commercialTrip).toMatchObject({phase:'loading',cursor:0,manifest:[{sourcePileId:foodId,quantity:2},{sourcePileId:silverIds[0],quantity:500},{sourcePileId:silverIds[1],quantity:100}]});
  for(const [id,n] of [[foodId,2],[silverIds[0],500],[silverIds[1],100]]){
    expect(reservedSource(w,id!)).toBe(n);expect(reservedSourcesByPile(w).get(id!)).toBe(n);expect(reservedSource(w,id!,pawnId)).toBe(0);
  }
  until(w,()=>w.commercialTrip?.phase==='loading'&&w.commercialTrip.cursor===1);
  const s=w.commercialTrip;if(s?.phase!=='loading')throw new Error('Expected loading');
  expect(s.manifest[0]!.carriedPileId).toBe(initialNext);
  const held=w.piles.find(i=>i.id===initialNext)!;
  expect(held).toMatchObject({quantity:2,damage:7,owner:{type:'inventory',pawnId}});
  expect(Math.abs(p.x-5)+Math.abs(p.z-8)).toBeLessThanOrEqual(1);
  expect(w.piles.find(i=>i.id===foodId)).toMatchObject({quantity:2,damage:7,owner:{type:'ground'}});
  expect(reservedSource(w,foodId)).toBe(0);
  expect(validateWorld(w)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(w));stepWorld(w,7);stepWorld(resumed,7);expect(serializeWorld(resumed)).toBe(serializeWorld(w));
  until(w,()=>w.commercialTrip?.phase==='leaving');
  expect(w.piles.find(i=>i.id===silverIds[0])?.owner).toEqual({type:'inventory',pawnId});
  expect(w.piles.find(i=>i.id===silverIds[1])).toMatchObject({quantity:100,owner:{type:'ground'}});
  expect(commercialItemTotal(w,'silver')).toBe(700);expect(commercialItemTotal(w,'survival-meal')).toBe(4);
  expect(w.nextId).toBe(initialNext+2);expect(validateWorld(w)).toEqual([]);
  until(w,()=>w.commercialTrip?.phase==='outbound');
  expect(w.pawns.some(q=>q.id===pawnId)).toBe(false);expect(p.moveCooldown).toBe(0);expect(p.motion).toBeUndefined();
  expect(validateWorld(w)).toEqual([]);
});
test('cancel after first pickup releases only remaining ground claims, and explicit unloading is real and resumable',()=>{
  const {world:w,pawnId,foodId,silverIds}=commercialCamp();
  expect(applyCommand(w,{type:'commercial-start',pawnId,foodPileId:foodId,quantity:2,silver:600}).ok).toBe(true);
  until(w,()=>w.commercialTrip?.phase==='loading'&&w.commercialTrip.cursor===1);
  const s=w.commercialTrip;if(s?.phase!=='loading')throw new Error('Expected loading');
  const id=s.manifest[0]!.carriedPileId!;
  expect(applyCommand(w,{type:'commercial-cancel'}).ok).toBe(true);expect(w.commercialTrip).toBeUndefined();
  expect(w.piles.find(i=>i.id===id)?.owner).toEqual({type:'inventory',pawnId});
  expect(silverIds.map(id=>reservedSource(w,id))).toEqual([0,0]);expect(validateWorld(w)).toEqual([]);
  expect(applyCommand(w,{type:'commercial-unload',pawnId}).ok).toBe(true);
  expect(w.piles.find(i=>i.id===id)?.owner.type).toBe('inventory');
  const resumed=deserializeWorld(serializeWorld(w));stepWorld(w,5);stepWorld(resumed,5);expect(serializeWorld(resumed)).toBe(serializeWorld(w));
  until(w,()=>!w.commercialTrip);
  const deposited=w.piles.find(i=>i.id===id);expect(deposited?.owner.type).toBe('ground');expect(deposited?.damage).toBe(7);
  expect(commercialItemTotal(w,'survival-meal')).toBe(4);expect(validateWorld(w)).toEqual([]);
});
test('insufficient money, unreachable sources and occupied inventory refuse preparation without committing IDs or state',()=>{
  for(const kind of ['money','route','inventory'] as const){
    const {world:w,pawnId,foodId,silverIds}=commercialCamp();
    if(kind==='route')for(let z=0;z<w.height;z++)w.tiles[z*w.width+7]={terrain:'rock'};
    if(kind==='inventory')addMaterial(w,'food',2,{type:'inventory',pawnId},'survival-meal');
    expect(validateWorld(w)).toEqual([]);
    const before=serializeWorld(w);
    expect(applyCommand(w,{type:'commercial-start',pawnId,foodPileId:foodId,quantity:2,silver:kind==='money'?701:600}).ok).toBe(false);
    expect(serializeWorld(w)).toBe(before);expect(silverIds.map(id=>reservedSource(w,id))).toEqual([0,0]);
  }
});
test('real automatic hauling cannot acquire commercial reserved silver but may collect the unreserved remainder',()=>{
  const {world:w,pawnId,foodId,silverIds}=commercialCamp(),hauler=w.pawns[1]!;
  expect(applyCommand(w,{type:'stockpile',enabled:true,x:3,z:12,capacity:500,priority:1,filters:{wood:false,food:false,silver:true}}).ok).toBe(true);
  expect(applyCommand(w,{type:'commercial-start',pawnId,foodPileId:foodId,quantity:2,silver:600}).ok).toBe(true);
  expect(applyCommand(w,{type:'priority',pawnId:hauler.id,work:'haul',value:1}).ok).toBe(true);
  until(w,()=>!!hauler.haul,100);
  expect(hauler.haul?.sourcePileId).toBe(silverIds[1]);expect(hauler.haul?.quantity).toBe(10);
  expect(validateWorld(w)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(w));stepWorld(w,20);stepWorld(resumed,20);expect(serializeWorld(resumed)).toBe(serializeWorld(w));
  until(w,()=>w.commercialTrip?.phase==='outbound');
  expect(commercialItemTotal(w,'silver')).toBe(700);expect(validateWorld(w)).toEqual([]);
});
