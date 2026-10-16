import {expect,test} from 'vitest';
import {deserializeWorld,serializeWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {SCHEMA_VERSION} from '../src/sim/types.ts';
import {bridgeWorkshopV387} from './scenarios/bridge-v387.ts';
import {preparedV377LocalCheckpoint} from './scenarios/secondary-site-v377.ts';

test('253 is validated on both real maps before neutral254; future shallow cells and malformed map data are refused before migration',()=>{
 const w=preparedV377LocalCheckpoint().initial;(w as {schemaVersion:number}).schemaVersion=253;const raw=JSON.parse(JSON.stringify(w));
 expect(deserializeWorld(JSON.stringify(w))).toEqual({...raw,schemaVersion:SCHEMA_VERSION});
 for(const side of ['home','secondary'] as const){const bad=structuredClone(w),map=side==='home'?bad:bad.secondarySite!.map;map.tiles[0]={terrain:'water-shallow'};expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/version253/);
 const malformed=structuredClone(w);(side==='home'?malformed:malformed.secondarySite!.map).tiles=[];expect(()=>deserializeWorld(JSON.stringify(malformed))).toThrow(/version253/);}
});

test('current full/delta retains literal shallow water and old full/delta cannot acquire it, even at the same tick',()=>{
 const w=bridgeWorkshopV387(32).world,i=16*w.width+16;w.tiles[i]={terrain:'water-shallow'};
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();expect(decoder.adopt(structuredClone(encoder.encode(w,0,0))).status).toBe('applied');
 w.tiles[i]!.bridge=true;const packet=structuredClone(encoder.encode(w,0,0));const adopted=decoder.adopt(packet);expect(adopted.status).toBe('applied');if(adopted.status!=='applied')throw Error('Expected bridge delta');expect(adopted.world.tiles[i]).toEqual({terrain:'water-shallow',bridge:true});
 const old=structuredClone(new SnapshotEncoder().encode(w,0,0));(old.world as {schemaVersion:number}).schemaVersion=253;expect(new SnapshotDecoder().adopt(old).status).toBe('resync');
 const history=bridgeWorkshopV387(32).world;(history as {schemaVersion:number}).schemaVersion=253;const henc=new SnapshotEncoder(),hdec=new SnapshotDecoder(),first=structuredClone(henc.encode(history,0,0));if(first.kind!=='checkpoint')throw Error('Expected initial checkpoint');expect(hdec.adopt(first).status).toBe('applied');
 history.tiles[i]={terrain:'water-shallow'};const future=structuredClone(henc.encode(history,0,0));expect(future.kind).toBe('delta');expect(hdec.adopt(future).status).toBe('resync');expect(first.world.tiles[i]!.terrain).toBe('marsh');
 expect(serializeWorld(deserializeWorld(JSON.stringify(w)))).toBe(serializeWorld(w));
});

test('unchanged shallow tile still rejects a newly unsupported building or plant owner; malformed floor/snow and deep-water bridge are refused',()=>{
 const w=bridgeWorkshopV387(32).world,i=16*w.width+16;w.tiles[i]={terrain:'water-shallow'};const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();expect(decoder.adopt(structuredClone(encoder.encode(w,0,0))).status).toBe('applied');
 w.structures.push({id:w.nextId++,kind:'power-conduit',x:16,z:16,orientation:0,footprint:'standard',material:'steel'});expect(decoder.adopt(structuredClone(encoder.encode(w,0,0))).status).toBe('resync');
 for(const tile of [{terrain:'water-shallow',floor:'wood-planks'},{terrain:'water-shallow',snowDepth:.1},{terrain:'water',bridge:true}] as const){const bad=bridgeWorkshopV387(32).world;bad.tiles[i]={...tile};expect(new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(bad,0,0))).status).toBe('resync');}
 const plant=bridgeWorkshopV387(32).world;plant.tiles[i]={terrain:'water-shallow'};plant.resources.push({id:plant.nextId++,kind:'tree',x:16,z:16,amount:10});expect(new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(plant,0,0))).status).toBe('resync');
});
