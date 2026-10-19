import {expect,test} from 'vitest';
import {createWorld} from '../src/sim/engine';
import {plantGrowth} from '../src/sim/plants';
import {plantLeafless} from '../src/sim/plant-life';
import {readHydroponicCells} from '../src/sim/hydroponics';
import {SnapshotEncoder} from '../src/bridge/snapshots';
import {WorkerNaturalAppearance} from '../src/bridge/worker-natural-appearance';
import {readPreparedCropFrame,readPreparedNaturalFrame,collectPreparedCropChanges,collectPreparedNaturalChanges} from '../src/bridge/prepared-natural-frame';
import {RESIDENT_CROP_KINDS,type CropVisualDelta} from '../src/bridge/natural-appearance-values';
import {cropRows,editCropGrowth,omitLastCrop} from './crop-column-fixtures-v433';
import {readResidentNaturalSidecar} from '../src/bridge/resident-protocol';
import {cropHarness} from './crop-worker-fixtures-v433';
import type {World} from '../src/sim/types';

export function field():World {
 const world=createWorld(433,32,32);world.tiles=world.tiles.map(()=>({terrain:'soil'}));world.resources=[];world.structures=[];world.growingZones=[];
 for(const [row,kind]of RESIDENT_CROP_KINDS.entries())for(let column=0;column<3;column++)world.resources.push({id:world.nextId++,kind,x:5+column,z:5+row,amount:8,growth:1,growthTick:world.tick});
 return world;
}
test('Worker crop numbers equal literal unrestricted readers, without quantization, mutation or RNG',()=>{
 const world=field(),encoder=new SnapshotEncoder({structureDelta:true}),producer=new WorkerNaturalAppearance();
 const model=new Map<number,{growth:number;leafless:boolean;blighted:boolean;supported:boolean}>();
 world.resources.forEach((r,i)=>{r.growth=.17+i*.031;r.growthTick=0;});
 // Numerical projection fixture only: no claim these synthetic leaf timers or
 // orphan basin metadata were acquired by gameplay or accepted as a SAVE.
 world.resources[0]!.plantLife={since:0,age:0,darkTicks:0,leaflessAt:0,nextCheck:200};
 world.growingZones=[{id:world.nextId++,basinId:world.nextId++,cells:[world.resources[1]!.z*world.width+world.resources[1]!.x],plant:'rice',allowSow:true,allowCut:true}];
 for(const tick of [0,1,1500,1501,1531,4500,5999,6000]){
  world.tick=tick;const before=structuredClone(world),packet=encoder.encode(world,0,1),delta=producer.capture(world,packet),support=readHydroponicCells(world);
  if(delta.checkpoint)model.clear();for(const id of delta.crops.removed)model.delete(id);for(const row of cropRows(delta.crops)){expect(world.resources[row.ordinal]?.id).toBe(row.id);model.set(row.id,row);}
  for(const resource of world.resources){const row=model.get(resource.id)!;expect(Object.is(row.growth,plantGrowth(world,resource))).toBe(true);expect(row.leafless).toBe(plantLeafless(world,resource));expect(row.blighted).toBe(!!resource.blight);expect(row.supported).toBe(support.has(resource.z*world.width+resource.x));}
  expect(world).toEqual(before);
 }
});

test('crop-only changes keep natural pages quiet and old played Worlds retain their exact numbers',()=>{
 const h=cropHarness(field()),first=h.send(),firstCrops=readPreparedCropFrame(first)!,firstNatural=readPreparedNaturalFrame(first)!;
 h.world.resources[0]!.growth=.2;const second=h.send(),secondCrops=readPreparedCropFrame(second)!;
 h.world.resources[0]!.growth=.4;h.world.resources[1]!.growth=.3;const latest=h.send(),latestCrops=readPreparedCropFrame(latest)!;
 expect(firstCrops.lookup(h.world.resources[0]!.id)?.growth).toBe(1);expect(secondCrops.lookup(h.world.resources[0]!.id)?.growth).toBe(.2);expect(latestCrops.lookup(h.world.resources[0]!.id)?.growth).toBe(.4);
 expect(collectPreparedCropChanges(firstCrops,latestCrops)).toEqual([h.world.resources[0]!.id,h.world.resources[1]!.id]);
 expect(collectPreparedNaturalChanges(firstNatural,readPreparedNaturalFrame(latest)!)).toEqual([]);
 for(let i=0;i<70;i++){h.world.resources[2]!.growth=.1+i/100;h.send();}
 expect(firstCrops.lookup(h.world.resources[0]!.id)?.growth).toBe(1);
});

test('malformed crop draft and late rejection do not consume the valid predecessor',()=>{
 const h=cropHarness(field()),first=h.send(),old=readPreparedCropFrame(first)!;h.world.resources[0]!.growth=.23;const packet=h.packet(),raw=readResidentNaturalSidecar(packet) as {crops:CropVisualDelta};
 const restore=editCropGrowth(raw.crops,0,NaN);expect(h.reader.adopt(packet).status).toBe('resync');expect(old.lookup(h.world.resources[0]!.id)?.growth).toBe(1);
 restore();expect(h.reader.adopt(packet,()=>false).status).toBe('resync');const retry=h.reader.adopt(packet);expect(retry.status).toBe('applied');if(retry.status!=='applied')return;
 expect(readPreparedCropFrame(retry.world)!.lookup(h.world.resources[0]!.id)?.growth).toBe(.23);
});

test('missing predecessor and incomplete checkpoint are refused; valid adjacent retry and full checkpoint remain usable',()=>{
 const h=cropHarness(field()),first=h.send(),old=readPreparedCropFrame(first)!;
 h.world.resources[0]!.growth=.19;const skipped=h.packet();h.world.resources[1]!.growth=.29;const next=h.packet();
 expect(h.reader.adopt(next).status).toBe('resync');expect(old.lookup(h.world.resources[0]!.id)?.growth).toBe(1);
 expect(h.reader.adopt(skipped).status).toBe('applied');expect(h.reader.adopt(next).status).toBe('applied');
 const checkpoint=h.packet(true),raw=readResidentNaturalSidecar(checkpoint) as {crops:CropVisualDelta},complete=raw.crops;raw.crops=omitLastCrop(complete);
 expect(h.reader.adopt(checkpoint).status).toBe('resync');raw.crops=complete;const result=h.reader.adopt(checkpoint);expect(result.status).toBe('applied');
 if(result.status==='applied')expect(collectPreparedCropChanges(old,readPreparedCropFrame(result.world)!)).toBeUndefined();
});

test('a late Worker failure after staging crop changes keeps all crop captures retryable',()=>{
 const world=field(),encoder=new SnapshotEncoder({structureDelta:true}),producer=new WorkerNaturalAppearance();producer.capture(world,encoder.encode(world,0,1));
 world.resources[0]!.growth=.13;const packet=encoder.encode(world,0,1),last=world.resources.at(-1)!,id=last.id;last.id=0;
 expect(()=>producer.capture(world,packet)).toThrow('Invalid natural visual resource ID');last.id=id;
 expect(cropRows(producer.capture(world,packet).crops).map(row=>row.id)).toEqual([world.resources[0]!.id]);
});
