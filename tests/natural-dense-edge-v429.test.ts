import {expect,test,vi} from 'vitest';
import {SnapshotEncoder} from '../src/bridge/snapshots';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler';
import {readSnapshotChanges,readSnapshotResourceStructure} from '../src/bridge/snapshot-changes';
import {NaturalResourcePresentation} from '../src/render/NaturalResourcePresentation';
import {NaturalPresentationEvents,NaturalIdPresentationEvents,composeFinalResourceStructure} from '../src/render/natural-presentation-events';
import {NaturalResourcePresentationV225 as Reference} from './scenarios/natural-presentation-baseline-v225';
import {NaturalDirtyContractOracle} from './scenarios/natural-dirty-contract-v233';
import {createWorld} from '../src/sim/engine';
import {plantGrowth} from '../src/sim/plants';
import {campaignPresentation} from '../src/sim/secondary-site-presentation';
import type {World} from '../src/sim/types';

// Numerical query fixture, not a played colony. Its actual transport journals
// have N=256: two dense edges cost 4N+8, above their unchanged 4N budget.
function fixture():World {
  const world=createWorld(429,16,16);world.tiles=world.tiles.map(()=>({terrain:'soil-natural'}));world.resources=[];world.tick=35;
  world.climate={revision:4,tileId:0,irregular262:true,adoptedAt:0,calendarOrigin:0,definition:{latitude:22,longitude:18,meanTemperature:12,rainfall:800,amplitude:18.0703125}};
  for(let i=0;i<256;i++){
    const species=(['oak','berry-bush','healroot-wild','grass'] as const)[i%4]!;
    world.resources.push({id:world.nextId++,kind:species==='oak'?'tree':species==='berry-bush'?'berries':'wild-plant',species,x:i%16,z:Math.floor(i/16),amount:10,growth:.249999+i%3*.1,growthTick:world.tick,growthThermalFactor:0,...(i%2?{growthLight:'artificial-full' as const}:{})});
  }
  return world;
}
function harness(world:World,entry:'scene'|'public'='scene'){
  const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new ResidentPresentationAssembler(),candidate=new NaturalResourcePresentation(),reference=new Reference(),dirty=new NaturalDirtyContractOracle();
  const held:{world:World;before:World}[]=[];
  const send=(checkpoint=false)=>{
    const packet=structuredClone(encoder.encode(world,0,6,checkpoint)),before=structuredClone(packet),expected=structuredClone(campaignPresentation(world)),result=decoder.adopt(packet);
    expect(result.status).toBe('applied');if(result.status!=='applied')throw Error(JSON.stringify(result));
    expect(result.world).toStrictEqual(expected);expect(packet).toStrictEqual(before);return result.world;
  };
  const read=(next:World,reset=false)=>{
    const before=structuredClone(next),expected=reference.read(next,reset,true),actual=entry==='scene'?candidate.readScene(next,reset,true):candidate.read(next,reset,true);
    if(actual&&'changed'in actual)expect(actual).toStrictEqual({changed:expected!==undefined});else expect(actual).toStrictEqual(expected);
    dirty.assert(next,reset,true,candidate.changes,reference.changes);
    for(const [id,value]of candidate.changes)expect(value.resource).toBe(next.resources.find(r=>r.id===id));
    expect(next).toStrictEqual(before);for(const previous of held)expect(previous.world).toStrictEqual(previous.before);held.push({world:next,before});return actual;
  };
  const rebase=(factor:number)=>{
    world.tick+=6;
    for(const resource of world.resources){resource.growth=plantGrowth(world,resource);resource.growthTick=world.tick;if(factor===1)delete resource.growthThermalFactor;else resource.growthThermalFactor=factor;}
    return send();
  };
  return {send,read,rebase,candidate};
}

for(const entry of ['scene','public'] as const)test(`${entry}: dense thermal skipped publications reuse the existing ordinal witness without either initialization`,()=>{
  const world=fixture(),h=harness(world,entry),ordinal=vi.spyOn(NaturalPresentationEvents.prototype,'initialize'),ids=vi.spyOn(NaturalIdPresentationEvents.prototype,'initialize');
  try{
    const a=h.send(true);h.read(a,true);const counts=[ordinal.mock.calls.length,ids.mock.calls.length];expect(counts).toEqual([1,1]);
    h.rebase(.25);h.rebase(.5);const c=h.rebase(1);
    expect(readSnapshotResourceStructure(a,c)).toBeUndefined();
    const changes=readSnapshotChanges(a,c)!;expect(changes.resourceIndices).toHaveLength(256);
    const composed=composeFinalResourceStructure(a,c)!;expect(composed.beforeCount).toBe(256);expect(composed.afterCount).toBe(256);
    expect([...composed.present]).toStrictEqual(changes.resourceIndices.map(ordinal=>[c.resources[ordinal]!.id,ordinal]));expect(composed.added.size).toBe(0);expect(composed.removed.size).toBe(0);
    const result=h.read(c);if(entry==='scene')expect(result&&'changed'in result).toBe(true);
    expect([ordinal.mock.calls.length,ids.mock.calls.length]).toStrictEqual(counts);
    world.tick++;h.read(h.send());expect([ordinal.mock.calls.length,ids.mock.calls.length]).toStrictEqual(counts);
  }finally{ordinal.mockRestore();ids.mockRestore();}
});

test('physical tile and roof changes retain exact dependencies across the ordinal fallback',()=>{
  const world=fixture(),h=harness(world),a=h.send(true);h.read(a,true);
  h.rebase(.25);world.tiles[0]!.terrain='ice';world.roofing={constructed:[0],build:[],remove:[],cursor:0};h.rebase(.5);const c=h.rebase(1);
  expect(readSnapshotResourceStructure(a,c)).toBeUndefined();expect(composeFinalResourceStructure(a,c)!.tileIndices).toContain(0);h.read(c);
  world.tiles[0]!.terrain='soil-natural';world.roofing.constructed=[];world.tick++;h.read(h.send());
});

test('structural/reorder edges, unknown copies, epoch checkpoints and expired ordinal suffixes still refuse the fallback',()=>{
  for(const mutation of ['membership','reorder','checkpoint','eviction'] as const){
    const world=fixture(),h=harness(world),a=h.send(true);h.read(a,true);
    if(mutation==='membership')world.resources=world.resources.slice(1);
    else if(mutation==='reorder')world.resources.reverse();
    if(mutation==='checkpoint')h.send(true);
    if(mutation==='eviction')for(let i=0;i<65;i++){world.tick++;h.send();}
    h.rebase(.25);h.rebase(.5);const c=h.rebase(1);
    expect(readSnapshotChanges(a,c)).toBeUndefined();expect(composeFinalResourceStructure(a,c)).toBeUndefined();h.read(c);
    expect(composeFinalResourceStructure(c,structuredClone(c))).toBeUndefined();
  }
});
