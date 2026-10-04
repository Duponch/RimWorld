import { expect,test } from 'vitest';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { applyCommercialPreparation,previewCommercialLoading } from '../src/sim/commercial-loading.ts';
import { applyCommercialSell,quoteCommercialSell } from '../src/sim/commercial-post.ts';
import { addMaterial,reservedSource,reservedSourcesByPile } from '../src/sim/materials.ts';
import { commercialCamp,commercialContents } from './helpers/commercial-v193.ts';
import type { World } from '../src/sim/types.ts';

function camp(){
  const prepared=commercialCamp(),w=prepared.world,z=Math.floor(w.height/2);
  addMaterial(w,'textile',75,{type:'ground',x:10,z},'cloth');addMaterial(w,'textile',60,{type:'ground',x:11,z},'muffalo-wool');
  const cloth=w.piles.find(i=>i.item==='cloth')!,wool=w.piles.find(i=>i.item==='muffalo-wool')!;cloth.damage=7;
  return {...prepared,clothId:cloth.id,woolId:wool.id};
}
function until(w:World,ready:()=>boolean,max=1500){for(let i=0;i<max&&!ready();i++)stepWorld(w);expect(ready(),`Commercial phase: ${w.commercialTrip?.phase}`).toBe(true);}
const count=(w:World,item:string)=>commercialContents(w).filter(i=>i.item===item).reduce((n,i)=>n+i.quantity,0);

test('V203 zero-money expedition reserves textiles, takes them at real contact and returns unsold freight to physical deposits',()=>{
  const {world:w,pawnId,foodId,clothId,woolId}=camp(),p=w.pawns.find(i=>i.id===pawnId)!;
  const cargo=[{pileId:clothId,quantity:75},{pileId:woolId,quantity:60}];
  expect(previewCommercialLoading(w,p,2,0,cargo)).toEqual({grams:4230,capacityGrams:35000});
  expect(applyCommercialPreparation(w,{type:'commercial-start',pawnId,foodPileId:foodId,quantity:2,silver:0,cargo})).toEqual({ok:true});
  expect(reservedSource(w,clothId)).toBe(75);expect(reservedSourcesByPile(w).get(woolId)).toBe(60);expect(reservedSource(w,clothId,pawnId)).toBe(0);
  until(w,()=>w.commercialTrip?.phase==='loading'&&w.commercialTrip.cursor===2);
  expect(w.piles.find(i=>i.id===clothId)).toMatchObject({quantity:75,damage:7,owner:{type:'inventory',pawnId}});
  expect(Math.abs(p.x-10)+Math.abs(p.z-8)).toBeLessThanOrEqual(1);expect(reservedSource(w,clothId)).toBe(0);
  expect(validateWorld(w)).toEqual([]);const loaded=deserializeWorld(serializeWorld(w));stepWorld(loaded,7);stepWorld(w,7);expect(serializeWorld(loaded)).toBe(serializeWorld(w));
  until(w,()=>w.commercialTrip?.phase==='at-post');
  const t=w.commercialTrip;if(t?.phase!=='at-post')throw Error('Missing visit');
  expect(w.pawns.some(i=>i.id===pawnId)).toBe(false);expect(w.piles.some(i=>i.id===clothId||i.id===woolId)).toBe(false);
  expect(t).toMatchObject({cargo:{cloth:75,'muffalo-wool':60},sold:{cloth:0,'muffalo-wool':0},silverEarned:0});
  const lines=[{pileId:clothId,quantity:60},{pileId:woolId,quantity:40}],q=quoteCommercialSell(w,lines);if(!q.ok)throw Error(q.reason);
  expect(applyCommercialSell(w,{type:'commercial-sell',lines,quote:q.signature})).toEqual({ok:true});expect(validateWorld(w)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(w));expect(serializeWorld(resumed)).toBe(serializeWorld(w));
  expect(applyCommand(w,{type:'commercial-return'}).ok).toBe(true);expect(applyCommand(resumed,{type:'commercial-return'}).ok).toBe(true);
  until(w,()=>w.commercialTrip?.phase==='unloading');until(resumed,()=>resumed.commercialTrip?.phase==='unloading');expect(serializeWorld(resumed)).toBe(serializeWorld(w));
  expect(w.piles.find(i=>i.id===clothId)?.owner).toEqual({type:'inventory',pawnId});
  until(w,()=>!w.commercialTrip);until(resumed,()=>!resumed.commercialTrip);expect(serializeWorld(resumed)).toBe(serializeWorld(w));
  expect(count(w,'cloth')).toBe(15);expect(count(w,'muffalo-wool')).toBe(20);expect(count(w,'silver')).toBe(821);
  expect(w.piles.find(i=>i.id===clothId)).toMatchObject({quantity:15,damage:7,owner:{type:'ground'}});
  expect(w.piles.find(i=>i.id===woolId)).toMatchObject({quantity:20,owner:{type:'ground'}});expect(validateWorld(w)).toEqual([]);
});

test('V203 cancellation after a textile pickup releases only the remaining claim and preserves loaded condition through explicit unloading',()=>{
  const {world:w,pawnId,foodId,clothId,woolId}=camp();
  expect(applyCommercialPreparation(w,{type:'commercial-start',pawnId,foodPileId:foodId,quantity:2,silver:0,cargo:[{pileId:clothId,quantity:50},{pileId:woolId,quantity:40}]}).ok).toBe(true);
  until(w,()=>w.commercialTrip?.phase==='loading'&&w.commercialTrip.cursor===2);
  const t=w.commercialTrip;if(t?.phase!=='loading')throw Error('Missing manifest');const heldId=t.manifest[1]!.carriedPileId!;
  expect(applyCommercialPreparation(w,{type:'commercial-cancel'})).toEqual({ok:true});expect(reservedSource(w,woolId)).toBe(0);
  expect(w.piles.find(i=>i.id===heldId)).toMatchObject({quantity:50,damage:7,owner:{type:'inventory',pawnId}});expect(count(w,'cloth')).toBe(75);
  expect(applyCommercialPreparation(w,{type:'commercial-unload',pawnId})).toEqual({ok:true});until(w,()=>!w.commercialTrip);
  expect(count(w,'cloth')).toBe(75);expect(count(w,'muffalo-wool')).toBe(60);expect(w.piles.some(i=>i.owner.type==='inventory'&&i.owner.pawnId===pawnId)).toBe(false);expect(validateWorld(w)).toEqual([]);
});

test('V203 inaccessible/reserved freight, unknown items, duplicates and empty zero-money manifests reject before reservations or identity allocation',()=>{
  for(const issue of ['blocked','reserved','unknown','duplicate','empty'] as const){
    const {world:w,pawnId,foodId,clothId}=camp();let cargo=[{pileId:clothId,quantity:30}];
    if(issue==='blocked')for(let z=0;z<w.height;z++)w.tiles[z*w.width+9]={terrain:'rock'};
    if(issue==='reserved'){const carrier=w.pawns[1]!;carrier.haul={phase:'pickup',sourcePileId:clothId,quantity:60,destination:{type:'aside',x:3,z:12},carryPileId:null};}
    if(issue==='unknown')cargo=[{pileId:foodId,quantity:1}];
    if(issue==='duplicate')cargo=[...cargo,...cargo];if(issue==='empty')cargo=[];
    const before=structuredClone(w);
    expect(applyCommercialPreparation(w,{type:'commercial-start',pawnId,foodPileId:foodId,quantity:2,silver:0,cargo}).ok).toBe(false);expect(w).toEqual(before);
    expect(reservedSourcesByPile(w).get(clothId)??0).toBe(issue==='reserved'?60:0);
  }
});

test('V203 destruction of a future freight source cancels without creating cargo or undoing already collected inventory',()=>{
  const {world:w,pawnId,foodId,clothId,woolId}=camp();
  expect(applyCommercialPreparation(w,{type:'commercial-start',pawnId,foodPileId:foodId,quantity:2,silver:0,cargo:[{pileId:clothId,quantity:30},{pileId:woolId,quantity:40}]}).ok).toBe(true);
  until(w,()=>w.commercialTrip?.phase==='loading'&&w.commercialTrip.cursor===1);
  w.piles=w.piles.filter(i=>i.id!==woolId);stepWorld(w);
  expect(w.commercialTrip).toBeUndefined();expect(reservedSource(w,clothId)).toBe(0);expect(count(w,'cloth')).toBe(75);expect(count(w,'muffalo-wool')).toBe(0);
  expect(w.piles.find(i=>i.item==='survival-meal'&&i.owner.type==='inventory'&&i.owner.pawnId===pawnId)?.quantity).toBe(2);
});
