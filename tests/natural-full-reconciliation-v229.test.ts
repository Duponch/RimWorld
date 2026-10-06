import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotMessage} from '../src/bridge/snapshots';
import {readSnapshotChanges} from '../src/bridge/snapshot-changes';
import {NaturalResourcePresentation} from '../src/render/NaturalResourcePresentation';
import {NaturalResourcePresentationV225 as Reference} from './scenarios/natural-presentation-baseline-v225';
import {createWorld} from '../src/sim/index';
import {adoptSiteClimate} from '../src/sim/site-climate';
import {createPlantLife,PLANT_LIFE_INTERVAL} from '../src/sim/plant-life';
import type {Resource,World} from '../src/sim/types';

// Private source ready for tests/. These are query/dependency fixtures with
// actual encoder/decoder admission; manual clock changes are not played saves.
function camp():World {
  const world=createWorld(229,32,32);world.resources=[];
  world.tiles=world.tiles.map(()=>({terrain:'soil'}));
  const add=(r:Omit<Resource,'id'>)=>world.resources.push({...r,id:world.nextId++});
  add({kind:'tree',species:'oak',x:2,z:3,amount:10,growth:.25,growthTick:0});
  add({kind:'berries',species:'berry-bush',x:3,z:3,amount:10,growth:.65,growthTick:0});
  add({kind:'wild-plant',species:'grass',x:4,z:3,amount:10,growth:.25,growthTick:0});
  add({kind:'healroot',x:5,z:3,amount:1,growth:.25,growthTick:0});
  add({kind:'tree',x:6,z:3,amount:10});
  add({kind:'berries',x:7,z:3,amount:10,growth:1,growthTick:0});
  add({kind:'rock',stone:'granite',x:8,z:3,amount:10});
  for(const [i,kind]of (['rice','potato','corn','cotton'] as const).entries())
    add({kind,x:10+i,z:3,amount:8,growth:.2,growthTick:0});
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
  const history:Array<{world:World;before:World;view:World|undefined;viewBefore:World|undefined}>=[];
  const packet=(checkpoint=false)=>structuredClone(encoder.encode(world,0,6,checkpoint));
  const accept=(input:SnapshotMessage<true>)=>{
    const before=structuredClone(input),result=decoder.adopt(input);
    if(result.status!=='applied')throw Error(JSON.stringify(result));
    expect(result.status).toBe('applied');expect(input).toStrictEqual(before);
    expect(result.world).toStrictEqual(world);return result.world;
  };
  const send=(checkpoint=false)=>accept(packet(checkpoint));
  const read=(next:World,reset=false,immutable=true)=>{
    const before=structuredClone(next),expected=reference.read(next,reset,immutable),actual=candidate.read(next,reset,immutable);
    expect(actual).toStrictEqual(expected);expect([...candidate.changes]).toStrictEqual([...reference.changes]);
    if(actual){expect(actual.resources).not.toBe(next.resources);
      actual.resources.forEach((r,i)=>{expect(r).toBe(expected!.resources[i]);expect(next.resources).toContain(r);});}
    for(const [id,change]of candidate.changes){expect(change.resource).toBe(reference.changes.get(id)!.resource);
      if(change.resource)expect(next.resources).toContain(change.resource);}
    expect(next).toStrictEqual(before);
    if(immutable&&readSnapshotChanges(next,next))history.push({world:next,before,view:actual,viewBefore:structuredClone(actual)});
    return {actual,changes:[...candidate.changes]};
  };
  const verify=()=>{for(const old of history){expect(old.world).toStrictEqual(old.before);expect(old.view).toStrictEqual(old.viewBefore);}};
  return {packet,accept,decoder,send,read,verify};
}

test('append-only full recapture preserves existing heap handles across typed capacity growth and due ticks',()=>{
  const world=camp();adoptSiteClimate(world);clock(world,1500);
  const original=world.resources[0]!,{send,read,verify}=harness(world);read(send(),true);
  for(let i=0;i<40;i++){
    const r:Resource={id:world.nextId++,kind:'tree',species:'oak',x:i%25,z:15,
      amount:10,growth:.25-2/180000,growthTick:world.tick,growthLight:'artificial-full'};
    r.plantLife=createPlantLife(world,r,true);world.resources.push(r);read(send());
  }
  original.growth=1;world.resources.push({id:world.nextId++,kind:'tree',x:2,z:17,amount:10});read(send());
  for(const tick of [1501,1502,1503,1531,1532,1533,1562,1563,1564,1565,1599,1600,1601]){
    clock(world,tick);world.resources.push({id:world.nextId++,kind:'tree',x:3,z:17,amount:10});
    const next=send();read(next);expect(read(next).actual).toBeUndefined();
  }
  verify();
});

test('full append fresh inputs, classification, reorder and removal keep exact current refs and fallback output',()=>{
  const world=camp();adoptSiteClimate(world);clock(world,1500);
  const oak=world.resources[0]!,{send,read,verify}=harness(world);read(send(),true);
  const append=()=>{world.resources.push({id:world.nextId++,kind:'tree',x:20,z:19,amount:10});read(send());};
  const cell=oak.z*world.width+oak.x;
  world.tiles[cell]!.terrain='rich-soil';append();
  world.roofing={constructed:[cell],build:[],remove:[],cursor:0};append();
  oak.growthLight='artificial-full';oak.growthThermalFactor=.5;append();
  oak.x++;oak.plantLife!.darkTicks=0;append();
  oak.kind='rice';delete oak.species;append();oak.kind='tree';oak.species='oak';append();
  world.resources.reverse();read(send());
  world.resources=world.resources.filter(r=>r.id!==oak.id);read(send());
  const recreated={...oak,id:world.nextId++};recreated.plantLife=createPlantLife(world,recreated,true);
  world.resources.push(recreated);read(send());
  clock(world,1565);append();read(send(true));append();verify();
});
