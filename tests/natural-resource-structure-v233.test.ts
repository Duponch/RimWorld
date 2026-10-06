import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotMessage} from '../src/bridge/snapshots';
import {readSnapshotResourceStructure} from '../src/bridge/snapshot-changes';
import {NaturalResourcePresentation} from '../src/render/NaturalResourcePresentation';
import {NaturalResourcePresentationV225 as Reference} from './scenarios/natural-presentation-baseline-v225';
import {createWorld} from '../src/sim/index';
import {adoptSiteClimate} from '../src/sim/site-climate';
import {PLANT_LIFE_INTERVAL} from '../src/sim/plant-life';
import {floraSize,isResidentCrop} from '../src/render/flora-presentation';
import {harvestable,isPlant} from '../src/sim/plants';
import {plantLeafless} from '../src/sim/plant-life';
import type {Resource,World} from '../src/sim/types';

// Small admitted transport/query fixtures. Their controlled memberships and
// civil boundaries are not claims of an ordinary played, persistent colony.
function camp():World {
  const world=createWorld(233,32,32);world.resources=[];world.tiles=world.tiles.map(()=>({terrain:'soil'}));
  for(const [i,species]of (['oak','pine','berry-bush','grass','healroot-wild'] as const).entries())world.resources.push({
    id:world.nextId++,kind:species==='berry-bush'?'berries':i<2?'tree':'wild-plant',species,x:3+i,z:3,
    amount:10,growth:.17+i*.12,growthTick:0,growthThermalFactor:1});
  world.resources.push({id:world.nextId++,kind:'tree',x:3,z:5,amount:10},
    {id:world.nextId++,kind:'berries',x:4,z:5,amount:10,growth:.64,growthTick:0},
    {id:world.nextId++,kind:'rice',x:5,z:5,amount:8,growth:.2,growthTick:0});
  return world;
}
function clock(world:World,tick:number):void {
  world.tick=tick;
  for(const r of world.resources)if(r.plantLife){
    r.plantLife.nextCheck=tick+(r.id-tick%PLANT_LIFE_INTERVAL+PLANT_LIFE_INTERVAL)%PLANT_LIFE_INTERVAL+1;
    r.plantLife.age=Math.max(0,r.plantLife.nextCheck-PLANT_LIFE_INTERVAL-r.plantLife.since);
  }
}
function harness(world:World){
  const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder();
  const candidate=new NaturalResourcePresentation(),reference=new Reference();
  const packets=new WeakMap<object,World>();
  const held:Array<{world:World;before:World;view:World|undefined;viewBefore:World|undefined}>=[];
  const packet=(checkpoint=false):SnapshotMessage<true>=>{
    const message=structuredClone(encoder.encode(world,0,6,checkpoint));packets.set(message,structuredClone(world));return message;
  };
  const accept=(message:SnapshotMessage<true>):World=>{
    const source=packets.get(message);if(!source)throw Error('Packet provenance missing.');
    const before=structuredClone(message),result=decoder.adopt(message);expect(result.status).toBe('applied');
    if(result.status!=='applied')throw Error(JSON.stringify(result));
    expect(result.world).toStrictEqual(source);expect(message).toStrictEqual(before);return result.world;
  };
  const read=(next:World,reset=false,immutable=true):World|undefined=>{
    const before=structuredClone(next),expected=reference.read(next,reset,immutable),actual=candidate.read(next,reset,immutable);
    expect(actual).toStrictEqual(expected);
    if(actual){
      expect(actual.resources).not.toBe(next.resources);
      expect(actual.resources.map(r=>r.id)).toStrictEqual(next.resources.filter(r=>!isResidentCrop(r)).map(r=>r.id));
      for(const r of actual.resources)expect(r).toBe(next.resources.find(source=>source.id===r.id));
    }
    // Changed dirtiness is intentionally narrower; each issued change still
    // has the current C identity and exact original numerical observations.
    for(const [id,change]of candidate.changes){
      const current=next.resources.find(r=>r.id===id&&!isResidentCrop(r));
      expect(change.resource).toBe(current);
      expect(change.size).toBe(current?floraSize(next,current):0);
      if(current){expect(plantLeafless(next,current)).toBe(plantLeafless(next,change.resource!));expect(harvestable(next,current)).toBe(harvestable(next,change.resource!));}
    }
    expect(next).toStrictEqual(before);
    for(const old of held){expect(old.world).toStrictEqual(old.before);expect(old.view).toStrictEqual(old.viewBefore);}
    if(immutable)held.push({world:next,before,view:actual,viewBefore:structuredClone(actual)});
    return actual;
  };
  return {candidate,reference,decoder,packet,accept,send:(checkpoint=false)=>accept(packet(checkpoint)),read};
}

test('final C composition skips invisible births, renews reborn order and remains correct after decoder D',()=>{
  const world=camp(),h=harness(world),a=h.send();h.read(a,true);
  const original=world.resources[0]!,tail=world.resources[1]!;
  world.resources.push({id:world.nextId++,kind:'tree',species:'birch',x:12,z:3,amount:10,growth:.3,growthTick:0});
  const temporary=world.resources[world.resources.length-1]!;clock(world,1);h.send();
  world.resources=world.resources.filter(r=>r.id!==temporary.id&&r.id!==original.id);clock(world,2);h.send();
  world.resources.push({...original,x:13});tail.growth=.26;tail.growthTick=2;clock(world,3);
  const c=h.send();expect(readSnapshotResourceStructure(a,c)).toBeDefined();
  world.resources[1]!.x=15;clock(world,4);h.send(); // A later decoder D is never used to resolve C.
  const view=h.read(c);expect(view!.resources[view!.resources.length-1]!.id).toBe(original.id);
  expect(view!.resources.some(r=>r.id===temporary.id)).toBe(false);
  expect(h.candidate.changes.has(temporary.id)).toBe(false);
  expect(h.candidate.changes.get(original.id)!.resource).toBe(c.resources[c.resources.length-1]);
});

test('birth/remove/classification/move and silent refs preserve final views without ordinal dirty amplification',()=>{
  const world=camp(),h=harness(world);h.read(h.send(),true);
  const survivor=world.resources[1]!,silent=world.resources[5]!;
  world.resources=world.resources.filter(r=>r.id!==world.resources[0]!.id);clock(world,1);
  h.read(h.send());expect(h.candidate.changes.has(survivor.id)).toBe(false);
  silent.amount++;clock(world,2);const silentFrame=h.send();h.read(silentFrame);
  survivor.x=10;clock(world,3);const moved=h.send(),view=h.read(moved)!;
  expect(view.resources.find(r=>r.id===silent.id)).toBe(moved.resources.find(r=>r.id===silent.id));
  const cluster=world.resources.find(r=>r.species==='grass')!;
  cluster.kind='rice';delete cluster.species;clock(world,4);h.read(h.send());
  expect(h.candidate.changes.get(cluster.id)).toStrictEqual({resource:undefined,size:0});
  cluster.kind='wild-plant';cluster.species='grass';clock(world,5);h.read(h.send());
  expect(h.candidate.changes.get(cluster.id)!.resource!.species).toBe('grass');
});

test('ID forecasts retain original thresholds, leaf expiry, roofs and civil boundaries after membership',()=>{
  const world=camp();adoptSiteClimate(world);clock(world,1500);
  for(const r of world.resources)if(isPlant(r)&&r.kind!=='rice'){
    r.growth=.25-96/180000;r.growthTick=1500;r.growthLight='artificial-full';
  }
  const leaf=world.resources[2]!,phase=(leaf.id+1)%PLANT_LIFE_INTERVAL;leaf.growth=1;leaf.plantLife!.leaflessAt=phase;
  const h=harness(world);h.read(h.send(),true);
  world.resources=world.resources.filter(r=>r.id!==world.resources[0]!.id);clock(world,1501);h.read(h.send());
  const cell=world.resources[0]!.z*world.width+world.resources[0]!.x;
  world.roofing={constructed:[cell],build:[],remove:[],cursor:0};clock(world,1502);h.read(h.send());
  world.roofing.constructed=[];world.tiles[cell]!.floor='wood-planks';clock(world,1503);h.read(h.send());
  delete world.tiles[cell]!.floor;
  for(const tick of [1531,1532,1563,1596,4799,4800,5999,6000,phase+5999,phase+6000,7499,7500,7501,359999,360000,360001]){
    clock(world,tick);h.read(h.send());
  }
});

test('reorder, wrong domain, eviction, checkpoint and mutable edits force the complete historical capture',()=>{
  const world=camp(),h=harness(world),initial=h.send();h.read(initial,true);
  world.resources.reverse();clock(world,1);const reordered=h.send();
  expect(readSnapshotResourceStructure(initial,reordered)).toBeUndefined();h.read(reordered);
  const otherEncoder=new SnapshotEncoder({structureDelta:true}),otherDecoder=new SnapshotDecoder();
  const foreign=otherDecoder.adopt(structuredClone(otherEncoder.encode(world,0,6,true)));
  if(foreign.status!=='applied')throw Error(JSON.stringify(foreign));
  expect(readSnapshotResourceStructure(reordered,foreign.world)).toBeUndefined();h.read(foreign.world);
  h.read(h.send(true),true);
  const base=h.send();h.read(base);
  for(let i=0;i<65;i++){clock(world,2+i);h.send();}
  clock(world,67);const evicted=h.send();expect(readSnapshotResourceStructure(base,evicted)).toBeUndefined();h.read(evicted);
  clock(world,68);const recovered=h.send(true);h.read(recovered,true);
  const mutable=structuredClone(recovered);h.read(mutable,false,false);
  mutable.resources[0]!.x=17;h.read(mutable,false,false);
  expect([...h.candidate.changes]).toStrictEqual([...h.reference.changes]);
});
