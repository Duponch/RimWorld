import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotMessage} from '../src/bridge/snapshots';
import {readSnapshotChanges} from '../src/bridge/snapshot-changes';
import {NaturalResourcePresentation} from '../src/render/NaturalResourcePresentation';
import {NaturalResourcePresentationV225 as Reference} from './scenarios/natural-presentation-baseline-v225';
import {createWorld} from '../src/sim/index';
import {adoptSiteClimate,TICKS_PER_YEAR,type ClimateProfile} from '../src/sim/site-climate';
import {createPlantLife,PLANT_LIFE_INTERVAL} from '../src/sim/plant-life';
import {crashlandedProfile} from '../src/sim/game-profile';
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
function neighbor(value:number,direction:1|-1):number {
  const bits=new DataView(new ArrayBuffer(8));bits.setFloat64(0,value);
  bits.setBigUint64(0,bits.getBigUint64(0)+BigInt(direction));return bits.getFloat64(0);
}
function harness(world:World){
  const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder();
  const candidate=new NaturalResourcePresentation(),reference=new Reference();
  const history:Array<{world:World;before:World;view:World|undefined;viewBefore:World|undefined}>=[];
  const packet=(checkpoint=false)=>structuredClone(encoder.encode(world,0,6,checkpoint));
  const accept=(input:SnapshotMessage<true>)=>{
    const before=structuredClone(input),result=decoder.adopt(input);
    if(result.status!=='applied')throw Error(JSON.stringify(result));
    expect(input).toStrictEqual(before);
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

test.each([undefined,'temperate-reference','boreal-reference','arid-reference'] as const)(
  'full append, reorder and crossings preserve original observations (%s)',profile=>{
    const world=camp();
    if(profile){adoptSiteClimate(world);world.climate!.profile=profile satisfies ClimateProfile;
      world.climate!.calendarOrigin=TICKS_PER_YEAR-70;}
    const {send,read,verify}=harness(world);read(send(),true);
    for(const tick of [1,31,32,33,62,63,64,65,69,70,71,96,127,128,129]){
      clock(world,tick);
      world.resources.push({id:world.nextId++,kind:'tree',x:tick%20,z:7,amount:10});
      const next=send();read(next);expect(read(next).actual).toBeUndefined();
      if(tick===33||tick===70){world.resources.reverse();read(send());}
    }
    world.resources.splice(2,1);read(send());world.resources.push({...world.resources[0]!,id:world.nextId++});read(send());
    verify();
  });

test('full birth at strict fruit and ceil boundaries uses original Number results',()=>{
  const world=camp(),oak=world.resources[0]!,berries=world.resources[1]!;
  clock(world,1500);oak.growthTick=berries.growthTick=1500;
  oak.growthLight=berries.growthLight='artificial-full';
  const {send,read,verify}=harness(world);read(send(),true);
  for(const value of [neighbor(.25,-1),.25,neighbor(.25,1),neighbor(1,-1),1]){
    oak.growth=value;berries.growth=value===1?1:neighbor(.65,value>.25?1:-1);
    world.resources.push({id:world.nextId++,kind:'tree',x:9,z:9,amount:10});read(send());
  }
  oak.growth=.25-96/180000;berries.growth=.65-96/36000;
  oak.growthTick=berries.growthTick=world.tick;read(send());
  for(const tick of [1531,1532,1533,1562,1563,1564,1565,1595,1596,1597]){
    clock(world,tick);world.resources.push({id:world.nextId++,kind:'tree',x:9,z:10,amount:10});read(send());}
  verify();
});

test('silent patches and full births around leaf expiry retain current refs and old views',()=>{
  const world=camp();adoptSiteClimate(world);const leaf=world.resources[0]!,visible=world.resources[1]!;
  const phase=(leaf.id+1)%PLANT_LIFE_INTERVAL;clock(world,phase);leaf.growth=1;leaf.plantLife!.leaflessAt=phase;
  const {send,read,verify}=harness(world);const first=read(send(),true).actual!,before=structuredClone(first);
  for(const tick of [phase+1,phase+31,phase+32,phase+63,phase+5999,phase+6000,phase+6001]){
    clock(world,tick);leaf.amount++;leaf.plantLife!.darkTicks++;
    world.resources.push({id:world.nextId++,kind:'tree',x:10,z:12,amount:10});
    const next=send(),view=read(next).actual!;expect(view.resources.find(r=>r.id===leaf.id)).toBe(next.resources.find(r=>r.id===leaf.id));
  }
  clock(world,phase+6200);leaf.plantLife!.leaflessAt=world.tick;read(send());delete leaf.plantLife!.leaflessAt;read(send());
  visible.x++;read(send());expect(first).toStrictEqual(before);verify();
});

test('fresh full inputs invalidate roof, fertility, light, thermal and civil observations',()=>{
  const world=camp(),oak=world.resources[0]!,cell=oak.z*world.width+oak.x;
  clock(world,1500);const {send,read,verify}=harness(world);read(send(),true);
  const full=()=>{world.resources.push({id:world.nextId++,kind:'tree',x:11,z:15,amount:10});read(send());};
  world.tiles[cell]!.terrain='rich-soil';full();world.tiles[cell]!.floor='wood-planks';full();
  delete world.tiles[cell]!.floor;world.roofing={constructed:[cell],build:[],remove:[],cursor:0};full();
  oak.growthLight='artificial-full';full();oak.growthLight='dark';full();delete oak.growthLight;world.roofing.constructed=[];full();
  oak.growthThermalFactor=0;full();oak.growthThermalFactor=.5;full();delete oak.growthThermalFactor;full();
  world.gameProfile=crashlandedProfile();full();adoptSiteClimate(world);full();
  world.climate!.calendarOrigin+=1500;full();world.climate!.profile='arid-reference';full();
  verify();
});

test('stable sources, stone, source order and crop classification preserve exact Map order',()=>{
  const world=camp(),oak=world.resources[0]!,rock=world.resources[6]!,crop=world.resources[7]!;
  oak.growth=1;const {send,read,verify}=harness(world);read(send(),true);
  rock.stone='limestone';oak.growth=.25;read(send());
  world.resources.reverse();const reversed=read(send());
  expect(reversed.changes.map(([id])=>id)).toContain(rock.id);
  crop.kind='berries';read(send());crop.kind='rice';read(send());
  delete rock.stone;rock.kind='tree';read(send());rock.kind='rock';rock.stone='granite';read(send());
  world.resources=world.resources.filter(r=>r.id!==oak.id);read(send());
  world.resources.push({...oak,growth:.5,x:12});read(send());verify();
});

test('checkpoint, refused same revision, skipped suffix, eviction and mutable fallbacks stay exact',()=>{
  const world=camp(),{packet,accept,decoder,send,read,verify}=harness(world);read(send(),true);
  clock(world,1);const valid=packet(),broken=structuredClone(valid);
  if(broken.kind!=='delta')throw Error('Expected a delta.');
  broken.resources={removed:[],upserted:[{...world.resources[0]!,growthThermalFactor:Infinity}]};
  expect(decoder.adopt(broken).status).toBe('resync');read(accept(valid));
  for(let tick=2;tick<=66;tick++){clock(world,tick);const next=send();if(tick===3||tick===66)read(next);}
  read(send(true));world.resources.push({id:world.nextId++,kind:'tree',x:2,z:11,amount:10});read(send());
  const mutable=structuredClone(world);read(mutable,false,false);mutable.resources[0]!.growth=.5;read(mutable,false,false);
  read(structuredClone(mutable),false,true);read(send());verify();
  const high=camp(),other=harness(high);other.read(other.send(),true);clock(high,2**40+1);other.read(other.send());other.verify();
});
