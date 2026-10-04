import { expect,test } from 'vitest';
import { withoutMiningSkill, withoutTelevisionRecreation,withMigratedTelevisionRecreation } from './scenarios/legacy-skills.ts';
import { applyCommand,stepWorld,deserializeWorld,serializeWorld,validateWorld,SCHEMA_VERSION } from '../src/sim/index.ts';
import { quoteCommercial,quoteCommercialSell } from '../src/sim/commercial-post.ts';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { PresentationChanges } from '../src/bridge/presentation-changes.ts';
import { validateCommercialRegistry } from '../src/sim/commercial-save.ts';
import { prepareCommercialSalesDemo } from '../scripts/create-test-save-commercial-sales-v203.ts';
import { commercialCamp } from './helpers/commercial-v193.ts';
import type { World } from '../src/sim/types.ts';

function start(){
  const w=prepareCommercialSalesDemo(),p=w.pawns[0]!;
  expect(applyCommand(w,{type:'commercial-start',pawnId:p.id,foodPileId:w.piles.find(i=>i.item==='survival-meal')!.id,
    quantity:3,silver:0,cargo:w.piles.filter(i=>i.item==='cloth'||i.item==='muffalo-wool').map(i=>({pileId:i.id,quantity:i.quantity}))}).ok).toBe(true);
  return w;
}
function until(w:World,phase:string,limit=1800){for(let n=0;n<limit&&w.commercialTrip?.phase!==phase;n++)stepWorld(w);expect(w.commercialTrip?.phase).toBe(phase);}
function post(){const w=start();until(w,'at-post');return w;}
function sell(w:World){const s=w.commercialTrip;if(s?.phase!=='at-post')throw Error('post');
  const lines=s.items.filter(i=>i.item==='cloth'||i.item==='muffalo-wool').map(i=>({pileId:i.id,quantity:i.item==='cloth'?60:40}));
  const q=quoteCommercialSell(w,lines);if(!q.ok)throw Error(q.reason);
  expect(applyCommand(w,{type:'commercial-sell',lines,quote:q.signature}).ok).toBe(true);return q.totalSilver;
}
function buy(w:World){const lines=w.civilianPost!.stock.filter(i=>i.item==='medicine'||i.item==='component').slice(0,2).map(i=>({pileId:i.id,quantity:1}));
  const q=quoteCommercial(w,lines);if(!q.ok)throw Error(q.reason);
  expect(applyCommand(w,{type:'commercial-buy',lines,quote:q.signature}).ok).toBe(true);return q.totalSilver;
}

test('184 validates before neutral migration and rejects sales fields including undefined properties',()=>{
  const {world:w,pawnId,foodId}=commercialCamp();
  expect(applyCommand(w,{type:'commercial-start',pawnId,foodPileId:foodId,quantity:2,silver:600}).ok).toBe(true);
  until(w,'at-post');delete w.worldIncidents;
  const old=withoutTelevisionRecreation(withoutMiningSkill(structuredClone(w)));Object.assign(old,{schemaVersion:184});
  const migrated=deserializeWorld(JSON.stringify(old));expect({...migrated,schemaVersion:184}).toEqual(withMigratedTelevisionRecreation(old));
  expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
  const future=start();Object.assign(future,{schemaVersion:184});
  expect(()=>deserializeWorld(JSON.stringify(future))).toThrow(/Invalid version 184/);
  for(const field of ['cargo','sold','silverEarned']){
    const bad=structuredClone(old);Object.assign(bad.commercialTrip!,{[field]:undefined});
    expect(validateCommercialRegistry(bad,184)).not.toEqual([]);
  }
  for(const [target,key,value] of [['commercialTrip','cargo',{cloth:1,'muffalo-wool':0}],['commercialTrip','sold',{cloth:0,'muffalo-wool':0}],['commercialTrip','silverEarned',0],['civilianPost','sold',{cloth:0,'muffalo-wool':0}],['civilianPost','silverPaid',0]] as const){
    const bad=structuredClone(old);Object.assign(bad[target]!,{[key]:value});
    expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/Invalid version 184/);
  }
});

test('loading, exit, visit, sale, buy, return and unloading resume exactly with real owners and goods',()=>{
  let w=start();const phases=new Set<string>();let resumed=deserializeWorld(serializeWorld(w));
  function checkpoint(){expect(validateWorld(w)).toEqual([]);expect(serializeWorld(resumed)).toBe(serializeWorld(w));resumed=deserializeWorld(serializeWorld(w));}
  checkpoint();
  for(let n=0;n<1800&&w.commercialTrip?.phase!=='at-post';n++){
    stepWorld(w);stepWorld(resumed);const phase=w.commercialTrip?.phase;
    if(phase&&!phases.has(phase)){phases.add(phase);checkpoint();}
  }
  until(w,'at-post',0);checkpoint();
  const gained=sell(w);sell(resumed);checkpoint();const paid=buy(w);buy(resumed);checkpoint();
  expect(gained).toBeGreaterThan(paid);expect(paid).toBeGreaterThan(0);
  expect(w.commercialTrip).toMatchObject({silverQuantity:0,silverEarned:gained,silverPaid:paid,sold:{cloth:60,'muffalo-wool':40}});
  expect(applyCommand(w,{type:'commercial-return'}).ok).toBe(true);expect(applyCommand(resumed,{type:'commercial-return'}).ok).toBe(true);checkpoint();
  for(let n=0;n<1800&&w.commercialTrip;n++){
    stepWorld(w);stepWorld(resumed);const phase=w.commercialTrip?.phase;
    if(phase&&!phases.has(phase)){phases.add(phase);checkpoint();}
  }
  checkpoint();expect(w.commercialTrip).toBeUndefined();
  for(const [item,quantity] of [['cloth',15],['muffalo-wool',20],['silver',gained-paid],['medicine',1],['component',1]] as const){
    expect(w.piles.filter(i=>i.item===item).reduce((n,i)=>n+i.quantity,0)).toBe(quantity);
    expect(w.piles.filter(i=>i.item===item).every(i=>i.owner.type==='ground')).toBe(true);
  }
  expect(w.civilianPost!.stock.filter(i=>i.item==='cloth').reduce((n,i)=>n+i.quantity,0)).toBe(60);
  expect(w.civilianPost!.stock.filter(i=>i.item==='muffalo-wool').reduce((n,i)=>n+i.quantity,0)).toBe(40);
  expect([...phases]).toEqual(['loading','leaving','outbound','at-post','returning','unloading']);
});

test('sale and buy at the same tick publish immutable snapshots and refuse a corrupted sales ledger atomically',()=>{
  const w=post(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),observer=new PresentationChanges();
  function adopt(){const packet=structuredClone(encoder.encode(w,0,1));const r=decoder.adopt(packet);expect(r.status).toBe('applied');if(r.status!=='applied')throw Error(r.status);expect(r.world).toEqual(w);return {packet,world:r.world};}
  const before=adopt(),beforeRaw=JSON.stringify(before.world);expect(observer.capture(w)).toBe(true);expect(observer.capture(w)).toBe(false);
  const tick=w.tick;sell(w);expect(observer.capture(w)).toBe(true);const sold=adopt(),soldRaw=JSON.stringify(sold.world);
  buy(w);expect(observer.capture(w)).toBe(true);const bought=adopt();expect(bought.world.tick).toBe(tick);
  expect(JSON.stringify(before.world)).toBe(beforeRaw);expect(JSON.stringify(sold.world)).toBe(soldRaw);
  const good=structuredClone(encoder.encode(w,0,1)),bad=structuredClone(good);if(bad.world.commercialTrip&&'silverEarned' in bad.world.commercialTrip)bad.world.commercialTrip.silverEarned!++;
  const refusal=decoder.adopt(bad);expect(refusal.status).toBe('resync');
  expect(JSON.stringify(bought.world)).toBe(JSON.stringify(w));
  const recovered=decoder.adopt(good);expect(recovered.status).toBe('applied');
  if(recovered.status==='applied')expect(recovered.world).toEqual(w);
});

test('cargo, counter and unexpected ownership corruption refuse strict saves',()=>{
  const w=post();sell(w);buy(w);const before=serializeWorld(w);
  for(const mutate of [
    (v:World)=>{if(v.commercialTrip&&'pawn' in v.commercialTrip)v.commercialTrip.silverEarned!++;},
    (v:World)=>{if(v.commercialTrip&&'pawn' in v.commercialTrip)v.commercialTrip.sold!.cloth++;},
    (v:World)=>{if(v.commercialTrip&&'pawn' in v.commercialTrip)delete v.commercialTrip.cargo;},
    (v:World)=>{v.civilianPost!.sold!.cloth--;},
    (v:World)=>{v.civilianPost!.silverPaid!--;},
    (v:World)=>{v.civilianPost!.stock.find(i=>i.item==='cloth')!.id=v.pawns[0]!.id;},
  ]){const bad=structuredClone(w);mutate(bad);expect(validateWorld(bad)).not.toEqual([]);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
  expect(serializeWorld(w)).toBe(before);
});

test('initial freight remains bounded by at most31 textile sources even after it has been sold',()=>{
  const w=post(),bad=structuredClone(w),trip=bad.commercialTrip;
  if(trip?.phase!=='at-post')throw Error('post');
  trip.cargo={cloth:2326,'muffalo-wool':0};trip.sold={cloth:2326,'muffalo-wool':0};trip.silverEarned=1;
  expect(validateCommercialRegistry(bad,185)).toContain('Invalid commercial cargo.');
  expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
});
