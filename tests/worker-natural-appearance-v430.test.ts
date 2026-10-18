import {expect,test} from 'vitest';
import {createWorld} from '../src/sim/engine';
import {plantGrowth,harvestable} from '../src/sim/plants';
import {plantLeafless} from '../src/sim/plant-life';
import {initializeHydroponicBasin} from '../src/sim/hydroponics';
import {CLIMATE_DEFINITIONS,TICKS_PER_YEAR} from '../src/sim/site-climate';
import type {Resource,World} from '../src/sim/types';
import {SnapshotEncoder,type SnapshotMessage} from '../src/bridge/snapshots';
import {isResidentCrop,type NaturalVisualDelta,type NaturalVisualUpsert} from '../src/bridge/natural-appearance-values';
import {WorkerNaturalAppearance} from '../src/bridge/worker-natural-appearance';

// This is the literal pre-extraction expression, independently evaluated with
// public plantGrowth. These numerical fixtures claim no played/SAVE history.
const originalMedicinal=(r:Pick<Resource,'kind'|'species'>):boolean=>r.kind==='healroot'||r.species==='healroot-wild';
const originalSize=(world:World,r:Resource):number=>!r.species&&!originalMedicinal(r)?1:(r.growth??1)===1?1:.3+.7*Math.ceil(plantGrowth(world,r)*4)/4;
type Values=Omit<NaturalVisualUpsert,'ordinal'>;
function fixture(revision:0|1|2|4=4):World {
  const world=createWorld(430,16,16);world.tick=1500;world.tiles=world.tiles.map(()=>({terrain:'soil-natural'}));world.resources=[];
  const rows:ReadonlyArray<readonly [Resource['kind'],Resource['species']]>=[['tree','oak'],['berries','berry-bush'],['wild-plant','grass'],
    ['wild-plant','glowstool'],['wild-plant','agarilux'],['wild-plant','bryolux'],['healroot',undefined],['rice',undefined],['rock',undefined]];
  for(const [i,[kind,species]]of rows.entries())world.resources.push({id:world.nextId++,kind,...species?{species}:{},x:1+i,z:2,amount:10,
    growth:i===0?.25:i===1?.65:.17+i%4*.13,growthTick:i<2?1500:1200,growthThermalFactor:1,...(i<2?{growthLight:'artificial-full' as const}:i%2?{growthLight:'dark' as const}:{})});
  world.resources[0]!.plantLife={since:0,age:0,darkTicks:0,leaflessAt:0,nextCheck:1600};
  world.roofing={constructed:[34],build:[],remove:[],cursor:0,natural:{thin:[36],thick:[37]}};
  const common={adoptedAt:0,calendarOrigin:1500};
  if(revision===0)delete world.climate;
  else world.climate=revision===1?{...common,revision,profile:'temperate-reference'}:revision===2?{...common,revision,definition:{...CLIMATE_DEFINITIONS['temperate-reference']}}:
    {...common,revision,tileId:0,irregular262:true,definition:{...CLIMATE_DEFINITIONS['temperate-reference'],amplitude:18.0703125}};
  return world;
}
function harness(world=fixture()) {
  const encoder=new SnapshotEncoder({structureDelta:true}),producer=new WorkerNaturalAppearance(),model=new Map<number,Values>();
  function apply(delta:NaturalVisualDelta):void {
    if(delta.checkpoint)model.clear();
    for(const id of delta.removed)model.delete(id);
    for(const {ordinal,...row}of delta.upsert){expect(world.resources[ordinal]?.id).toBe(row.id);model.set(row.id,row);}
  }
  function assertExact():void {
    const expected=new Map<number,Values>();
    for(const r of world.resources)if(!isResidentCrop(r))expected.set(r.id,{id:r.id,size:originalSize(world,r),ripe:r.kind==='berries'&&harvestable(world,r),leafless:plantLeafless(world,r),harvestable:harvestable(world,r)});
    expect(model).toStrictEqual(expected);
    for(const [id,row]of expected)expect(Object.is(model.get(id)!.size,row.size),`exact size ID${id}`).toBe(true);
  }
  function read(checkpoint=false):NaturalVisualDelta {
    const packet=encoder.encode(world,0,1,checkpoint),before=structuredClone(world),wire=structuredClone(packet);
    const delta=producer.capture(world,packet);apply(delta);assertExact();
    expect(world).toStrictEqual(before);expect(packet).toStrictEqual(wire);return delta;
  }
  return {world,encoder,producer,model,apply,assertExact,read};
}

test.each([0,1,2,4] as const)('current publication matches every public value exactly for climate%s and varied ticks',revision=>{
  const h=harness(fixture(revision)),first=h.read(),frozen=structuredClone(first);
  expect(first.checkpoint).toBe(true);expect(Object.hasOwn(first,'baseRevision')).toBe(false);
  expect(first.upsert).toHaveLength(h.world.resources.filter(r=>!isResidentCrop(r)).length);
  for(const tick of [1501,1531,1563,4499,4500,5999,6000,6001,TICKS_PER_YEAR-1,TICKS_PER_YEAR,TICKS_PER_YEAR+1]){h.world.tick=tick;h.read();}
  expect(first).toStrictEqual(frozen);
});

test('same-tick metadata is silent, while shape identity, blight, and hydroponic support remain dirty',()=>{
  const h=harness();h.read();const tree=h.world.resources[0]!,healroot=h.world.resources[6]!;
  tree.amount++;tree.plantLife!.age++;expect(h.read().upsert).toStrictEqual([]);
  tree.x++;expect(h.read().upsert.map(r=>r.id)).toStrictEqual([tree.id]);
  tree.species='birch';expect(h.read().upsert.map(r=>r.id)).toStrictEqual([tree.id]);
  tree.blight={since:0,severity:.1,lastHarmTick:0,nextCheck:1600,rng:123};expect(h.read().upsert.some(r=>r.id===tree.id)).toBe(true);
  const rock=h.world.resources[8]!;rock.stone='granite';expect(h.read().upsert.map(r=>r.id)).toStrictEqual([rock.id]);
  healroot.growth=1;h.read();
  const basin={id:h.world.nextId++,kind:'hydroponics-basin' as const,x:healroot.x,z:healroot.z,orientation:0 as const,footprint:'standard' as const};
  h.world.structures.push(basin);initializeHydroponicBasin(h.world,basin);
  expect(h.read().upsert.map(r=>r.id)).toStrictEqual([healroot.id]);
  h.world.structures=[];expect(h.read().upsert.map(r=>r.id)).toStrictEqual([healroot.id]);
});

test('removal, birth, ordinal shifts and crop transitions publish the complete final membership',()=>{
  const h=harness();h.read();const removed=h.world.resources.shift()!,crop=h.world.resources.find(isResidentCrop)!;
  const delta=h.read();expect(delta.removed).toStrictEqual([removed.id]);expect(delta.upsert).toStrictEqual([]);
  const born:Resource={id:h.world.nextId++,kind:'wild-plant',species:'agave',x:12,z:3,amount:1,growth:1};h.world.resources.unshift(born);
  expect(h.read().upsert.map(r=>r.id)).toStrictEqual([born.id]);
  crop.kind='healroot';expect(h.read().upsert.map(r=>r.id)).toStrictEqual([crop.id]);
  crop.kind='rice';expect(h.read().removed).toStrictEqual([crop.id]);
  expect(h.read().upsert).toStrictEqual([]);
});

test('eclipse, substrate, natural roofs and same-tick thermal/light edits retain the literal values',()=>{
  const h=harness();h.read();
  h.world.miscIncidents={profile:'cassandra-misc-v1',adoptedAt:0,rng:123,nextCheck:1600,introDone:true,checks:1,opportunities:1,heatwaves:0,
    weather:{adoptedAt:0,coldSnaps:0,eclipses:1,lastEclipseStart:1500,eclipse:{start:1500,end:4500}}};
  h.read();
  for(const terrain of ['gravel','rich-soil','ice','soil-natural'] as const){h.world.tiles=h.world.tiles.map(()=>({terrain}));h.read();}
  for(const resource of h.world.resources){resource.growthThermalFactor=.125;resource.growthLight='dark';}h.read();
  h.world.roofing!.natural={thin:[34,35],thick:[36,37,38]};h.read();
  for(const tick of [1501,4499,4500,4501,6000]){h.world.tick=tick;h.read();}
  delete h.world.miscIncidents.weather!.eclipse;h.read();
});

test('late preparation failure keeps the predecessor and all primitive captures retryable',()=>{
  const h=harness();h.read();h.world.resources[0]!.x++;
  const packet=h.encoder.encode(h.world,0,1),unchanged=structuredClone(packet),second=h.world.resources[1]!,validId=second.id;
  second.id=0;expect(()=>h.producer.capture(h.world,packet)).toThrow('Invalid natural visual resource ID');second.id=validId;
  const retry=h.producer.capture(h.world,packet);expect(retry.upsert.map(r=>r.id)).toStrictEqual([h.world.resources[0]!.id]);
  h.apply(retry);h.assertExact();expect(packet).toStrictEqual(unchanged);
  expect(()=>h.producer.capture(h.world,packet)).toThrow('Mismatched natural visual publication');
});

test('checkpoints and mapless clear reset the membership without retaining an old World',()=>{
  const h=harness();h.read();h.world.tick++;const checkpoint=h.read(true);expect(checkpoint.checkpoint).toBe(true);
  h.producer.clear();h.encoder.campaignHeader();h.world.resources=h.world.resources.slice(2);const returned=h.read();
  expect(returned.checkpoint).toBe(true);expect(returned.removed).toStrictEqual([]);expect(returned.upsert).toHaveLength(h.model.size);
});

test('a malformed removed/current collision is refused without consuming the valid adjacent publication',()=>{
  const h=harness();h.read();h.world.resources[0]!.x++;const packet=h.encoder.encode(h.world,0,1);
  expect(packet.kind).toBe('delta');if(packet.kind!=='delta')throw Error('Expected adjacent delta');
  const invalid:SnapshotMessage<true>={...packet,resources:{...packet.resources!,removed:[h.world.resources[0]!.id]}};
  expect(()=>h.producer.capture(h.world,invalid)).toThrow('Natural visual resource is both present and removed');
  const retry=h.producer.capture(h.world,packet);h.apply(retry);h.assertExact();
});
