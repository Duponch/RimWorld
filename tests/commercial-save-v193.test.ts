import { expect,test } from 'vitest';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld,SCHEMA_VERSION } from '../src/sim/index.ts';
import { validateCommercialRegistry } from '../src/sim/commercial-save.ts';
import { commercialCamp } from './helpers/commercial-v193.ts';
import type { World } from '../src/sim/types.ts';

function prepared():World {
  const {world,pawnId,foodId}=commercialCamp();expect(applyCommand(world,{type:'commercial-start',pawnId,foodPileId:foodId,quantity:2,silver:600}).ok).toBe(true);return world;
}
function atPost():World {
  const w=prepared();for(let i=0;i<1200&&w.commercialTrip?.phase!=='at-post';i++)stepWorld(w);
  expect(w.commercialTrip?.phase).toBe('at-post');return w;
}
test('strict schema179 migrates neutrally and refuses either future commercial field even when the future container is empty',()=>{
  const {world}=commercialCamp(),old=JSON.parse(serializeWorld(world));old.schemaVersion=179;
  const restored=deserializeWorld(JSON.stringify(old));expect(restored.schemaVersion).toBe(SCHEMA_VERSION);
  expect({...restored,schemaVersion:179}).toEqual(old);expect(restored.commercialTrip).toBeUndefined();expect(restored.civilianPost).toBeUndefined();
  for(const field of ['commercialTrip','civilianPost'])expect(()=>deserializeWorld(JSON.stringify({...old,[field]:{}}))).toThrow(/Invalid version 179/);
});
test('malformed arbitrary containers and owners are rejected before projecting without exceptions',()=>{
  const w=atPost(),s=w.commercialTrip;if(s?.phase!=='at-post')throw new Error('Expected post');
  for(const value of [null,[],{},'trip',{...s,pawn:null},{...s,pawn:'pawn'},{...s,items:null},{...s,items:[null]},
    {...s,items:[{...s.items[0],owner:null}]},{...s,items:[{...s.items[0],owner:'inventory'}]}]){
    const invalid={...w,commercialTrip:value} as unknown as World;
    expect(()=>validateCommercialRegistry(invalid,180)).not.toThrow();expect(validateCommercialRegistry(invalid,180)).not.toEqual([]);
    expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow();
  }
});
test('manifest cursor and quantitative reservation corruption reject strict loading continuations',()=>{
  const w=prepared(),state=w.commercialTrip;if(state?.phase!=='loading')throw new Error('Expected loading');expect(validateWorld(w)).toEqual([]);
  const mutations=[
    (v:World)=>{if(v.commercialTrip?.phase==='loading')v.commercialTrip.cursor=1;},
    (v:World)=>{if(v.commercialTrip?.phase==='loading')v.commercialTrip.manifest[1]!.sourcePileId=v.commercialTrip.manifest[0]!.sourcePileId;},
    (v:World)=>{if(v.commercialTrip?.phase==='loading')v.commercialTrip.manifest[0]!.carriedPileId=v.commercialTrip.manifest[0]!.sourcePileId;},
    (v:World)=>{if(v.commercialTrip?.phase==='loading')v.commercialTrip.silverQuantity++;},
    (v:World)=>{const s=v.commercialTrip;if(s?.phase==='loading')v.piles.find(i=>i.id===s.manifest[1]!.sourcePileId)!.quantity=499;},
  ];
  for(const mutate of mutations){const invalid=structuredClone(w);mutate(invalid);expect(validateWorld(invalid)).not.toEqual([]);expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow();}
});
test('clock, ownership, money and post stock identity corruption refuse off-map save without changing the valid source',()=>{
  const w=atPost(),before=serializeWorld(w),s=w.commercialTrip;if(s?.phase!=='at-post')throw new Error('Expected post');
  const mutations=[
    (v:World)=>{if(v.commercialTrip?.phase==='at-post')v.commercialTrip.decisionUntil++;},
    (v:World)=>{if(v.commercialTrip?.phase==='at-post')v.commercialTrip.arrivedAt++;},
    (v:World)=>{if(v.commercialTrip?.phase==='at-post')v.commercialTrip.items.find(i=>i.item==='silver')!.quantity--;},
    (v:World)=>{if(v.commercialTrip?.phase==='at-post')v.commercialTrip.consumed++;},
    (v:World)=>{if(v.commercialTrip?.phase==='at-post')v.commercialTrip.bought.medicine=1;},
    (v:World)=>{if(v.commercialTrip?.phase==='at-post')v.pawns.push(structuredClone(v.commercialTrip.pawn));},
    (v:World)=>{if(v.commercialTrip?.phase==='at-post')v.civilianPost!.stock[0]!.id=v.commercialTrip.items[0]!.id;},
    (v:World)=>{v.civilianPost!.stock[0]!.id=v.pawns[0]!.id;},
  ];
  for(const mutate of mutations){const invalid=structuredClone(w);mutate(invalid);expect(validateWorld(invalid)).not.toEqual([]);expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow();}
  expect(serializeWorld(w)).toBe(before);
});
