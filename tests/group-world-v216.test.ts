import { expect,test } from 'vitest';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { addMaterial,refreshStock } from '../src/sim/materials.ts';
import { previewGroupFormation,groupTradeQuote } from '../src/sim/group-authority.ts';
import { commercialCamp } from './helpers/commercial-v193.ts';
import type { Command,World } from '../src/sim/types.ts';

/** Prepared sources and healthy adults only. Commands and ordinary ticks own
 * all pickup, movement, departure, physiology, trade and unloading below. */
function camp(){
  const f=commercialCamp(16),w=f.world;
  for(const p of w.pawns){p.hunger=95;p.rest=95;p.state='idle';p.path=[];p.moveCooldown=0;delete p.motion;}
  addMaterial(w,'textile',16,{type:'ground',x:6,z:8},'cloth');refreshStock(w);
  addMaterial(w,'food',6,{type:'ground',x:3,z:10},'simple-meal');
  addMaterial(w,'food',6,{type:'ground',x:4,z:10},'simple-meal');refreshStock(w);
  expect(validateWorld(w)).toEqual([]);
  const originals=w.pawns.slice(0,2),memberIds=originals.map(p=>p.id);
  const sources=[{pileId:f.foodId,quantity:4},...f.silverIds.map(pileId=>({pileId,quantity:w.piles.find(p=>p.id===pileId)!.quantity})),
    {pileId:w.piles.find(p=>p.item==='cloth')!.id,quantity:16}];
  return {w,originals,memberIds,sources};
}
function until(w:World,predicate:()=>boolean,limit=7000,onPhase?:(phase:string)=>void):void {
  let phase='';
  for(let i=0;i<limit&&!predicate();i++){
    stepWorld(w);
    const next=w.group?.phase??'none';
    if(next!==phase){phase=next;expect(validateWorld(w),`${next} at ${w.tick}`).toEqual([]);onPhase?.(next);}
  }
  expect(predicate(),JSON.stringify({tick:w.tick,group:w.group?.phase,events:w.events.slice(-4)})).toBe(true);
}
function start(f:ReturnType<typeof camp>):void {
  const {w,memberIds,sources}=f;
  const rng=w.rng,nextId=w.nextId;
  expect(applyCommand(w,{type:'planet-adopt'}).ok).toBe(true);
  expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);
  const before=serializeWorld(w),preview=previewGroupFormation(w,memberIds,sources,w.planet!.civilianTile);
  expect(preview.ok).toBe(true);expect(serializeWorld(w)).toBe(before);
  expect(applyCommand(w,{type:'group-start',memberIds,sources,destination:w.planet!.civilianTile}).ok).toBe(true);
  expect(validateWorld(w)).toEqual([]);
}
function actualPiles(w:World){return [...w.piles,...(w.group&&'items' in w.group?w.group.items:[]),...(w.civilianPost?.stock??[])];}
const itemTotal=(w:World,item:string)=>actualPiles(w).filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);

test('two originals physically load, leave, trade at the finite post, resume identically and unload after their actual return',()=>{
  const f=camp(),{w,originals,memberIds}=f;start(f);
  const geography=JSON.stringify(w.planet!.tiles),phases=new Set<string>();
  until(w,()=>w.group?.phase==='travelling',2000,p=>phases.add(p));
  const g=w.group;if(!g||!('members' in g))throw Error('Departure missing');
  expect(g.members).toEqual(originals);expect(g.members.every((p,i)=>p===originals[i])).toBe(true);
  expect(w.pawns.some(p=>memberIds.includes(p.id))).toBe(false);
  expect(w.piles.some(p=>g.items.some(i=>i.id===p.id))).toBe(false);
  expect(g.ledger).toMatchObject({foodLoaded:4,silverLoaded:700,cargoLoaded:{cloth:16}});
  const fork=deserializeWorld(serializeWorld(w));
  stepWorld(w,37);stepWorld(fork,37);expect(serializeWorld(fork)).toBe(serializeWorld(w));
  until(w,()=>w.group?.phase==='at-site',7000,p=>phases.add(p));
  expect(w.group).toMatchObject({tile:w.planet!.civilianTile});
  const at=w.group;if(!at||!('members' in at))throw Error('Visit missing');
  expect(at.members[0]).toBe(originals[0]);
  const cloth=at.items.find(p=>p.item==='cloth')!,sale=[{pileId:cloth.id,quantity:5}];
  const textiles=itemTotal(w,'cloth'),money=itemTotal(w,'silver'),saleQuote=groupTradeQuote(w,'sell',sale);
  if(!saleQuote.ok)throw Error(saleQuote.reason);
  expect(applyCommand(w,{type:'group-sell',lines:sale,quote:saleQuote.signature}).ok).toBe(true);
  expect(itemTotal(w,'cloth')).toBe(textiles);expect(itemTotal(w,'silver')).toBe(money);
  const medicine=w.civilianPost!.stock.find(p=>p.item==='medicine')!,buy=[{pileId:medicine.id,quantity:2}],buyQuote=groupTradeQuote(w,'buy',buy);
  if(!buyQuote.ok)throw Error(buyQuote.reason);
  expect(applyCommand(w,{type:'group-buy',lines:buy,quote:buyQuote.signature}).ok).toBe(true);
  expect(itemTotal(w,'silver')).toBe(money);expect(validateWorld(w)).toEqual([]);
  const visit=deserializeWorld(serializeWorld(w));stepWorld(w,43);stepWorld(visit,43);
  expect(serializeWorld(visit)).toBe(serializeWorld(w));expect(w.group?.phase).toBe('at-site');
  expect(applyCommand(w,{type:'group-route',destination:w.planet!.homeTile}).ok).toBe(true);
  until(w,()=>!w.group,9000,p=>phases.add(p));
  for(const p of originals)expect(w.pawns.find(q=>q.id===p.id)).toBe(p);
  expect(w.piles.some(p=>p.owner.type==='inventory'&&memberIds.includes(p.owner.pawnId))).toBe(false);
  expect(w.piles.filter(p=>p.item==='medicine'&&p.owner.type==='ground').reduce((n,p)=>n+p.quantity,0)).toBe(2);
  expect(itemTotal(w,'cloth')).toBe(textiles);expect(itemTotal(w,'silver')).toBe(money);
  expect(JSON.stringify(w.planet!.tiles)).toBe(geography);expect(validateWorld(w)).toEqual([]);
  expect(phases).toEqual(new Set(['gathering','loading','leaving','travelling','at-site','unloading','none']));
},60000);

test('cancelling after a real pickup retains its original inventory and a later unload deposits it physically',()=>{
  const f=camp(),{w,memberIds}=f;start(f);
  until(w,()=>!!w.group&&'cursor' in w.group&&w.group.cursor>0,2000);
  const carried=w.piles.filter(p=>p.owner.type==='inventory'&&memberIds.includes(p.owner.pawnId));
  expect(carried.length).toBeGreaterThan(0);const ids=carried.map(p=>p.id),quantities=carried.map(p=>p.quantity);
  expect(applyCommand(w,{type:'group-cancel'}).ok).toBe(true);expect(w.group).toBeUndefined();
  for(let i=0;i<ids.length;i++)expect(w.piles.find(p=>p.id===ids[i])).toMatchObject({quantity:quantities[i],owner:{type:'inventory'}});
  until(w,()=>memberIds.every(id=>{const p=w.pawns.find(p=>p.id===id)!;return p.state==='idle'&&p.path.length===0&&p.moveCooldown===0&&(p.motion?.end??0)<=w.tick;}),200);
  expect(applyCommand(w,{type:'group-unload',memberIds}).ok).toBe(true);
  until(w,()=>!w.group,1000);expect(validateWorld(w)).toEqual([]);
  for(const id of ids)expect(w.piles.find(p=>p.id===id)?.owner.type).toBe('ground');
});

test('cancellation during a captured movement edge preserves that edge and its exact saved continuation',()=>{
  const f=camp(),{w,memberIds}=f;start(f);
  until(w,()=>w.pawns.some(p=>memberIds.includes(p.id)&&(p.motion?.end??0)>w.tick),100);
  const pawn=w.pawns.find(p=>memberIds.includes(p.id)&&(p.motion?.end??0)>w.tick)!,edge=structuredClone(pawn.motion);
  expect(applyCommand(w,{type:'group-cancel'}).ok).toBe(true);
  expect(pawn.motion).toEqual(edge);expect(pawn.path).toEqual([]);expect(validateWorld(w)).toEqual([]);
  const fork=deserializeWorld(serializeWorld(w));stepWorld(w,50);stepWorld(fork,50);
  expect(serializeWorld(fork)).toBe(serializeWorld(w));expect(w.group).toBeUndefined();
});

test('195 validates before the neutral 196 migration and refuses future JSON owners without adoption',()=>{
  const {w}=camp();(w as unknown as {schemaVersion:number}).schemaVersion=195;
  const before=JSON.stringify(w),migrated=deserializeWorld(before);
  expect(migrated.schemaVersion).toBe(196);expect({...migrated,schemaVersion:195}).toEqual(w);
  for(const key of ['planet','group','groupLosses']){
    const bad=structuredClone(w) as World&Record<string,unknown>;bad[key]=key==='groupLosses'?[]:null;
    expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/Historical schema contains future world\/group fields/);
  }
  const bad=JSON.parse(before);bad.pawns[0].hunger=-1;
  expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/Invalid version 195 save/);
});

test('malformed formation commands refuse atomically before generation, reservation, IDs or ownership change',()=>{
  const f=camp(),{w}=f;expect(applyCommand(w,{type:'planet-adopt'}).ok).toBe(true);
  const before=serializeWorld(w);
  const c={type:'group-start',memberIds:f.memberIds,sources:f.sources,destination:w.planet!.civilianTile};
  for(const bad of [{...c,extra:true},{...c,memberIds:[f.memberIds[0],f.memberIds[0]]},{...c,sources:[{pileId:f.sources[0]!.pileId,quantity:1,extra:true}]}]){
    expect(applyCommand(w,bad as Command).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  }
});

test('a diet used only by living travellers still refuses deletion',()=>{
  const f=camp(),{w}=f;
  expect(applyCommand(w,{type:'food-policy-create',name:'Voyage'}).ok).toBe(true);
  const policy=w.foodPolicies.at(-1)!;
  for(const pawnId of f.memberIds)expect(applyCommand(w,{type:'food-policy-assign',pawnId,policyId:policy.id}).ok).toBe(true);
  start(f);until(w,()=>w.group?.phase==='travelling',2000);
  const before=serializeWorld(w);
  expect(applyCommand(w,{type:'food-policy-delete',policyId:policy.id}).ok).toBe(false);
  expect(serializeWorld(w)).toBe(before);expect(validateWorld(w)).toEqual([]);
});
