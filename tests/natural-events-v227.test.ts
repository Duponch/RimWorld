import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotMessage} from '../src/bridge/snapshots';
import {readSnapshotChanges} from '../src/bridge/snapshot-changes';
import {NaturalResourcePresentation} from '../src/render/NaturalResourcePresentation';
import {NaturalResourcePresentationV225 as Reference} from './scenarios/natural-presentation-baseline-v225';
import {createWorld,stepWorld,validateWorld} from '../src/sim/index';
import {adoptSiteClimate,TICKS_PER_YEAR,type ClimateProfile} from '../src/sim/site-climate';
import {createPlantLife,PLANT_LIFE_INTERVAL} from '../src/sim/plant-life';
import {crashlandedProfile} from '../src/sim/game-profile';
import {deserializeWorld} from '../src/sim/serialization';
import {decodeStoredSave} from '../src/ui/save-storage-codec';
import type {Resource,World} from '../src/sim/types';

// Query/dependency fixtures exercise real transport admission, not a claim that
// their prepared roofs or manually varied clocks are played, persistent saves.
function camp():World {
  const world=createWorld(227,32,32);world.resources=[];
  world.tiles=world.tiles.map(()=>({terrain:'soil'}));
  const species:NonNullable<Resource['species']>[]=['oak','pine','birch','poplar','drago','saguaro','agave','moss','grass','tall-grass','brambles','berry-bush','healroot-wild'];
  for(const [i,kind] of species.entries())world.resources.push({id:world.nextId++,
    kind:kind==='berry-bush'?'berries':i<6?'tree':'wild-plant',species:kind,x:2+i,z:3,
    amount:10,growth:.12+i%4*.15,growthTick:0,growthThermalFactor:1});
  world.resources.push({id:world.nextId++,kind:'berries',x:2,z:5,amount:10,growth:.64,growthTick:0},
    {id:world.nextId++,kind:'tree',x:3,z:5,amount:10},
    {id:world.nextId++,kind:'healroot',x:4,z:5,amount:1,growth:.24,growthTick:0,growthThermalFactor:1});
  for(const [i,kind] of (['rice','potato','corn','cotton'] as const).entries())world.resources.push({
    id:world.nextId++,kind,x:6+i,z:5,amount:8,growth:.2,growthTick:0});
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
  if(value===0)return direction>0?Number.MIN_VALUE:-Number.MIN_VALUE;
  const bits=new DataView(new ArrayBuffer(8));bits.setFloat64(0,value);
  bits.setBigUint64(0,bits.getBigUint64(0)+BigInt((value>0?1:-1)*direction));return bits.getFloat64(0);
}
function harness(world:World,checkHistoryEachRead=true){
  const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder();
  const reference=new Reference(),candidate=new NaturalResourcePresentation();
  const history:Array<{world:World;before:World;actual:World|undefined;expected:World|undefined;actualBefore:World|undefined;expectedBefore:World|undefined}>=[];
  const verifyHistory=()=>{
    for(const old of history){expect(old.world).toStrictEqual(old.before);expect(old.actual).toStrictEqual(old.actualBefore);expect(old.expected).toStrictEqual(old.expectedBefore);}
  };
  const packet=(checkpoint=false)=>structuredClone(encoder.encode(world,0,6,checkpoint));
  const accept=(message:SnapshotMessage<true>)=>{
    const result=decoder.adopt(message);expect(result.status).toBe('applied');
    if(result.status!=='applied')throw Error(JSON.stringify(result));
    expect(result.world).toStrictEqual(world);return result.world;
  };
  const send=(checkpoint=false)=>accept(packet(checkpoint));
  const read=(next:World,reset=false,immutable=true)=>{
    const before=structuredClone(next),expected=reference.read(next,reset,immutable),actual=candidate.read(next,reset,immutable);
    expect(actual).toStrictEqual(expected); // Includes undefined presence and full returned World.
    expect([...candidate.changes]).toStrictEqual([...reference.changes]); // Includes insertion order/removals.
    if(actual){
      expect(actual.resources).not.toBe(next.resources);
      actual.resources.forEach((r,i)=>{expect(r).toBe(expected!.resources[i]);expect(r).toBe(next.resources.find(source=>source.id===r.id));});
    }
    for(const [id,change]of candidate.changes){
      expect(change.resource).toBe(reference.changes.get(id)!.resource);
      if(change.resource)expect(change.resource).toBe(next.resources.find(r=>r.id===id));
    }
    expect(next).toStrictEqual(before);
    // Mutable query fixtures are allowed to edit their World on the next call.
    if(immutable&&readSnapshotChanges(next,next))history.push({world:next,before,actual,expected,
      actualBefore:structuredClone(actual),expectedBefore:structuredClone(expected)});
    if(checkHistoryEachRead)verifyHistory();
    return {actual,changes:[...candidate.changes]};
  };
  return {encoder,decoder,packet,accept,send,read,verifyHistory};
}

test.each([undefined,'temperate-reference','boreal-reference','arid-reference'] as const)('confirmed forecasts preserve every source shape at civil boundaries (%s)',profile=>{
  const world=camp();
  if(profile){adoptSiteClimate(world);world.climate!.profile=profile;}
  else world.gameProfile=crashlandedProfile();
  const {send,read}=harness(world);read(send(),true);
  for(const tick of [1,1499,1500,1501,4799,4800,4801,5999,6000,6001,TICKS_PER_YEAR-1,TICKS_PER_YEAR,TICKS_PER_YEAR+1,TICKS_PER_YEAR+1501]){
    clock(world,tick);read(send());
  }
});

test('zero, quartiles, one and the strict ripe threshold retain adjacent-double behavior',()=>{
  const world=camp();world.resources=[];
  for(const threshold of [0,.25,.5,.65,.75,1])for(const growth of [neighbor(threshold,-1),threshold,neighbor(threshold,1)]){
    if(growth<0||growth>1)continue;
    world.resources.push({id:world.nextId++,kind:'berries',species:'berry-bush',x:2,z:3,amount:10,
      growth,growthTick:0,growthThermalFactor:0});
  }
  const {send,read}=harness(world);read(send(),true);
  for(const tick of [1,1500,1501,6000,12000]){clock(world,tick);expect(read(send()).changes).toHaveLength(0);}
  const legacy={id:world.nextId++,kind:'berries' as const,x:3,z:3,amount:10,growth:.65,growthTick:world.tick,growthThermalFactor:0};
  world.resources.push(legacy);read(send());
  legacy.growth=neighbor(.65,1);expect(read(send()).changes.map(([id])=>id)).toContain(legacy.id);
  legacy.growth=1;read(send());legacy.growth=neighbor(1,-1);read(send());
  clock(world,18000);read(send()); // Shape already one does not make stored immature growth invariant.
});

test('missing anchors, constant regimes and all resident crops retain their own classification',()=>{
  const world=camp();
  for(const [i,r]of world.resources.entries()){
    // Domestic healroot's paired anchor is mandatory at the transport boundary.
    if(i%3===0&&r.kind!=='healroot')delete r.growthTick;
    if(i%3===1)r.growthLight='dark';
    if(i%3===2)r.growthThermalFactor=0;
  }
  const {send,read}=harness(world);read(send(),true);
  for(const tick of [1500,2000,4800,12000]){clock(world,tick);read(send());}
  world.resources[0]!.growthLight='artificial-full';world.resources[0]!.growthTick=world.tick;read(send());
  clock(world,world.tick+5000);read(send());
  const mutable=structuredClone(world);delete mutable.resources.find(r=>r.kind==='healroot')!.growthTick;
  read(mutable,false,false);
});

test('the exact first tick after an artificial-light quartile or ripe crossing is not delayed',()=>{
  const world=camp();world.tick=1500;world.resources=[];
  for(const growth of [0,.25,.5,.75])world.resources.push({id:world.nextId++,kind:'tree',species:'oak',
    x:2,z:3,amount:10,growth,growthTick:1500,growthLight:'artificial-full'});
  world.resources.push({id:world.nextId++,kind:'berries',x:3,z:3,amount:10,growth:.65,growthTick:1500,growthLight:'artificial-full'});
  const {send,read}=harness(world);read(send(),true);
  expect(read(send()).actual).toBeUndefined(); // t-1: the exact quarter/threshold itself.
  clock(world,1501);expect(read(send()).changes.map(([id])=>id)).toEqual(world.resources.map(r=>r.id));
  for(const tick of [1502,4799,4800,4801,5999,6000,6001]){clock(world,tick);read(send());}
});

test('confirmed forecasts remain exact beyond the first windows and at later visible crossings',()=>{
  const world=camp();world.tick=1500;world.resources=[
    {id:world.nextId++,kind:'tree',species:'oak',x:2,z:3,amount:10,growth:.25-96/180000,growthTick:1500,growthLight:'artificial-full'},
    {id:world.nextId++,kind:'tree',species:'pine',x:3,z:3,amount:10,growth:.5-200/120000,growthTick:1500,growthLight:'artificial-full'},
    {id:world.nextId++,kind:'berries',x:4,z:3,amount:10,growth:.65-32/36000,growthTick:1500,growthLight:'artificial-full'},
  ];
  const {send,read,verifyHistory}=harness(world,false);read(send(),true);
  const offsets=new Set([1,30,31,32,33,34,61,62,63,64,65,66,95,96,97,98,127,128,129,199,200,201,202,255,256]);
  const firstChanges=new Map<number,number>();
  // Every intervening revision is admitted; some presentation reads are skipped.
  for(let offset=1;offset<=256;offset++){
    clock(world,1500+offset);const next=send();if(!offsets.has(offset))continue;
    for(const [id]of read(next).changes)if(!firstChanges.has(id))firstChanges.set(id,offset);
    expect(read(next).actual).toBeUndefined(); // A repeated read cannot replay a crossing.
  }
  for(const plant of world.resources.slice(0,2)){
    expect(firstChanges.get(plant.id)).toBeGreaterThan(32);expect(firstChanges.get(plant.id)).toBeLessThanOrEqual(256);
  }
  expect(firstChanges.has(world.resources[2]!.id)).toBe(true);verifyHistory();
});

test('full membership recaptures preserve later deadlines, changed inputs and current references',()=>{
  const world=camp();world.tick=1500;world.resources=[
    {id:world.nextId++,kind:'tree',species:'oak',x:2,z:3,amount:10,growth:.25-96/180000,growthTick:1500,growthLight:'artificial-full'},
    {id:world.nextId++,kind:'berries',x:3,z:3,amount:10,growth:.65-96/36000,growthTick:1500,growthLight:'artificial-full'},
  ];
  const oak=world.resources[0]!,berries=world.resources[1]!,{send,read,verifyHistory}=harness(world,false);
  read(send(),true);
  clock(world,1531);world.resources.reverse();read(send());
  clock(world,1532);world.resources.push({id:world.nextId++,kind:'tree',x:4,z:3,amount:10});read(send());
  clock(world,1533);world.resources=world.resources.filter(r=>r.id!==oak.id);read(send());
  // Recreated identity has a different anchor/base and a new source index.
  clock(world,1534);world.resources.push({...oak,growth:.25-4/180000,growthTick:1534});read(send());
  clock(world,1535);berries.amount++;expect(read(send()).actual).toBeUndefined();
  for(const tick of [1537,1538,1539,1540]){clock(world,tick);read(send());}
  const cell=berries.z*world.width+berries.x;
  world.tiles[cell]!.floor='wood-planks';world.resources.reverse();read(send());
  delete world.tiles[cell]!.floor;delete berries.growthLight;
  world.roofing={constructed:[cell],build:[],remove:[],cursor:0};read(send());
  world.roofing.constructed=[];world.gameProfile=crashlandedProfile();read(send());
  berries.growth=.65-32/36000;berries.growthTick=world.tick;berries.growthLight='artificial-full';read(send());
  for(const tick of [1541,1571,1572,1573,1574,1602,1603,1604,1605]){
    clock(world,tick);const next=send();read(next);expect(read(next).actual).toBeUndefined();
  }
  expect(adoptSiteClimate(world)).toBe(true);world.climate!.calendarOrigin+=17;
  world.resources.reverse();read(send());clock(world,1700);read(send());verifyHistory();
});

test('soil, flooring, roof and civil changes without resource patches invalidate exact dependencies',()=>{
  const world=camp(),{send,read}=harness(world);read(send(),true);clock(world,3000);read(send());
  const plant=world.resources.find(r=>r.kind==='berries'&&r.species)!;const cell=plant.z*world.width+plant.x;
  let prior=send();read(prior);
  for(const terrain of ['rich-soil','gravel','soil'] as const){world.tiles[cell]={terrain};const next=send();
    expect(next.resources).toBe(prior.resources);expect(readSnapshotChanges(prior,next)!.tileIndices).toContain(cell);read(next);prior=next;}
  world.tiles[cell]!.floor='wood-planks';read(send());delete world.tiles[cell]!.floor;read(send());
  world.roofing={constructed:[cell],build:[],remove:[],cursor:0};read(send());
  world.roofing.constructed=[];read(send());
  // build/remove/cursor alone do not change the original binary roof query.
  world.roofing.build=[cell];read(send());delete world.roofing;read(send());
  world.gameProfile=crashlandedProfile();read(send());
  expect(adoptSiteClimate(world)).toBe(true);read(send());
  world.climate!.calendarOrigin+=1500;read(send());
  world.climate!.profile='arid-reference' satisfies ClimateProfile;read(send());
});

test('silent lifecycle patches retain current references for the next returned view',()=>{
  const world=camp();adoptSiteClimate(world);clock(world,500);
  for(const r of world.resources){r.growth=1;r.growthTick=world.tick;}
  const {send,read}=harness(world);const first=read(send(),true).actual!,before=structuredClone(first);
  const silent=world.resources[0]!,visible=world.resources[1]!;
  silent.amount++;silent.plantLife!.darkTicks++;const quiet=send();expect(read(quiet).actual).toBeUndefined();
  visible.x++;const next=send(),view=read(next).actual!;
  expect(view.resources.find(r=>r.id===silent.id)).toBe(next.resources.find(r=>r.id===silent.id));
  expect(first).toStrictEqual(before);
});

test('leaf expiration 5999/6000, renewal and silent deletion preserve source order',()=>{
  const world=camp();adoptSiteClimate(world);const leaf=world.resources[0]!,other=world.resources[1]!;
  const phase=(leaf.id+1)%PLANT_LIFE_INTERVAL;clock(world,phase);
  leaf.plantLife!.leaflessAt=phase;leaf.growth=1;other.growth=1;
  const {send,read}=harness(world);read(send(),true);
  clock(world,phase+5999);read(send());clock(world,phase+6000);
  expect(read(send()).changes.map(([id])=>id)).toContain(leaf.id);
  const renewed=phase+6000;leaf.plantLife!.leaflessAt=renewed;read(send());
  clock(world,renewed+6000);read(send());delete leaf.plantLife!.leaflessAt;expect(read(send()).changes).toHaveLength(0);
  // Earlier source expires later: heap time order must not become output order.
  leaf.plantLife!.leaflessAt=renewed;other.plantLife!.leaflessAt=renewed+(other.id-leaf.id+200)%200;
  clock(world,renewed+10000);leaf.x++;other.x++;const result=read(send());
  const ids=result.changes.map(([id])=>id);expect(ids.indexOf(leaf.id)).toBeLessThan(ids.indexOf(other.id));
});

test('legacy-only growth and leaves remain exact before and after a timed species joins',()=>{
  const world=camp();world.resources=[
    {id:world.nextId++,kind:'tree',x:2,z:3,amount:10},
    {id:world.nextId++,kind:'berries',x:3,z:3,amount:10,growth:.65,growthTick:0,growthLight:'artificial-full'},
  ];
  expect(adoptSiteClimate(world)).toBe(true);world.climate!.calendarOrigin=0;
  const berries=world.resources[1]!,phase=(berries.id+1)%PLANT_LIFE_INTERVAL;
  clock(world,phase);berries.plantLife!.leaflessAt=phase;
  const {send,read,verifyHistory}=harness(world,false);read(send(),true);
  clock(world,1499);expect(read(send()).actual).toBeUndefined();
  clock(world,1500);expect(read(send()).changes.map(([id])=>id)).toContain(berries.id);
  clock(world,phase+5999);expect(read(send()).actual).toBeUndefined();
  clock(world,phase+6000);expect(read(send()).changes.map(([id])=>id)).toContain(berries.id);
  const oak:Resource={id:world.nextId++,kind:'tree',species:'oak',x:4,z:3,amount:10,
    growth:.25,growthTick:world.tick,growthLight:'artificial-full'};
  oak.plantLife=createPlantLife(world,oak);world.resources.push(oak);read(send());
  clock(world,7499);expect(read(send()).actual).toBeUndefined();
  clock(world,7500);expect(read(send()).changes.map(([id])=>id)).toContain(oak.id);
  world.resources=world.resources.filter(r=>r.id!==oak.id);read(send());
  berries.amount++;expect(read(send()).actual).toBeUndefined();
  delete berries.plantLife!.leaflessAt;berries.growth=.65;berries.growthTick=world.tick;read(send());
  clock(world,7501);const next=send(),view=read(next).actual!;
  expect(view.resources.find(r=>r.id===berries.id)).toBe(next.resources.find(r=>r.id===berries.id));
  expect(read(next).actual).toBeUndefined();verifyHistory();
});

test('an initially constant mature species starts exact temporal reads when it becomes immature',()=>{
  const world=camp();world.tick=1500;world.resources=[
    {id:world.nextId++,kind:'tree',species:'oak',x:2,z:3,amount:10,growth:1,growthTick:1500,growthLight:'artificial-full'},
  ];
  const oak=world.resources[0]!,{send,read}=harness(world);read(send(),true);
  expect(read(send()).actual).toBeUndefined();
  oak.growth=.25;read(send());clock(world,1501);
  expect(read(send()).changes.map(([id])=>id)).toEqual([oak.id]);
  for(const tick of [1531,1532,1533,1562,1563,1564,1565]){clock(world,tick);read(send());}
  oak.growth=1;read(send());expect(read(send()).actual).toBeUndefined();
  oak.growth=.5;oak.growthTick=world.tick;read(send());clock(world,1566);
  expect(read(send()).changes.map(([id])=>id)).toEqual([oak.id]);
});

test.each(['add','remove','reorder','classification'] as const)('source %s and explicit resets preserve full fallback',operation=>{
  const world=camp(),{send,read}=harness(world);read(send(),true);
  if(operation==='add')world.resources.push({id:world.nextId++,kind:'berries',x:2,z:8,amount:10,growth:.4,growthTick:0});
  if(operation==='remove')world.resources.splice(2,1);
  if(operation==='reorder')world.resources.reverse();
  if(operation==='classification'){world.resources[0]!.kind='rice';delete world.resources[0]!.species;}
  read(send());read(send(true));read(send(),true);
  world.resources[0]!.amount++;read(send());
});

test('skipped, refused and stale revisions cannot advance an unconfirmed plan',()=>{
  const world=camp(),{packet,send,accept,decoder,read}=harness(world);const initial=send();read(initial,true);
  world.resources[0]!.amount++;const pending=packet();world.resources[1]!.x++;const ahead=packet();
  expect(decoder.adopt(ahead).status).toBe('resync');
  // The earlier packet is compared with its own producer state, not the later source.
  const first=decoder.adopt(pending);expect(first.status).toBe('applied');
  const final=accept(ahead);read(final);
  const broken=packet(),bad=structuredClone(broken);bad.world.relationships={links:[],unexpected:true} as never;
  expect(decoder.adopt(bad).status).toBe('resync');expect(readSnapshotChanges(initial,final)).toBeDefined();
  read(accept(broken));expect(decoder.adopt(broken).status).toBe('stale');read(final);
  clock(world,12000);send();world.resources[0]!.x++;clock(world,24000);read(send());
});

test('64 edges, eviction, checkpoint and different decoder epochs preserve the complete fallback',()=>{
  const world=camp(),{send,read}=harness(world),first=send();read(first,true);
  let latest=first;for(let i=0;i<64;i++){world.resources[0]!.amount=10+i%2;latest=send();}
  expect(readSnapshotChanges(first,latest)).toBeDefined();read(latest);
  const anchor=latest;for(let i=0;i<65;i++){world.resources[1]!.amount=10+i%2;latest=send();}
  expect(readSnapshotChanges(anchor,latest)).toBeUndefined();read(latest);
  read(send(true));
  const foreign=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(world,0,6)));
  expect(foreign.status).toBe('applied');if(foreign.status==='applied')read(foreign.world);
});

test('mutable worlds, same-tick edits, fake immutable clones and high civil clocks use exact historical queries',()=>{
  const world=camp(),{send,read}=harness(world);read(send(),true);
  const mutable=structuredClone(world);read(mutable,false,false);
  mutable.resources[0]!.growth=.9;read(mutable,false,false);
  mutable.roofing={constructed:[mutable.resources[0]!.z*mutable.width+mutable.resources[0]!.x],build:[],remove:[],cursor:0};read(mutable,false,false);
  for(const tick of [2**40-1,2**40,2**40+1,Number.MAX_SAFE_INTEGER-6001,Number.MAX_SAFE_INTEGER]){
    mutable.tick=tick;mutable.climate={revision:1,profile:'temperate-reference',adoptedAt:1,calendarOrigin:2**52+1};
    read(mutable,false,false);read(structuredClone(mutable),false,true);
  }
  read(send());read(send(true),true);
});

test('a decoder-confirmed clock above the agenda bound retains the complete historical path',()=>{
  const world=camp(),{send,read}=harness(world);read(send(),true);
  clock(world,2**40+1);const confirmed=send();expect(readSnapshotChanges(confirmed,confirmed)).toBeDefined();read(confirmed);
  world.resources[0]!.growth=.5;read(send());clock(world,world.tick+1);read(send());
});

test('authentic Aulnes publication and actual lifecycle patches match V225 without mutating any World',async()=>{
  const world=deserializeWorld(await decodeStoredSave(readFileSync('public/test-saves/v224/les-aulnes-sieges.json','utf8')));
  const {send,read,verifyHistory}=harness(world,false);expect(validateWorld(world)).toEqual([]);read(send(),true);
  let lifecyclePatches=0;
    // This unit boundary checks a short authentic prefix. The separate
  // exact replay covers64 ordinary ticks and later lifecycle windows; do not
  // duplicate its entire 250² retained history inside Vitest's30s test budget.
  for(let tick=0;tick<12;tick++){
    const before=new Map(world.resources.filter(r=>r.plantLife).map(r=>[r.id,r.plantLife!.age]));stepWorld(world);
    lifecyclePatches+=world.resources.filter(r=>r.plantLife&&r.plantLife.age!==before.get(r.id)).length;
    expect(validateWorld(world)).toEqual([]);const next=send();if(tick%3!==1)read(next);
  }
  expect(lifecyclePatches).toBeGreaterThan(0);
  // Verify all retained Worlds/views once after all later adoptions. Rechecking
  // the entire 250² history after each read added quadratic assertion work.
  verifyHistory();
});
