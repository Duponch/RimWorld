import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/index.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {initializeSnowSurface} from '../src/sim/snow-surface.ts';
function prepared(){
 const w=deconstructionCamp(),cell=5*w.width+5,id=w.nextId++;initializeSnowSurface(w);
 w.tiles[cell]={terrain:'rock',bridge:true,snowDepth:.2,collapsedRock:{id,terrain:'marsh'}};
 w.roofing={constructed:[],build:[],remove:[],cursor:0,natural:{thin:[],thick:[cell]}};
 return {w,cell,id};
}
test('RAW and the real decoder retain roof rock identity and the exact covered bridge substrate',()=>{
 const {w,cell}=prepared();expect(validateWorld(w)).toEqual([]);
 const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 const first=decoder.adopt(structuredClone(encoder.encode(w,0,0)));expect(first.status,JSON.stringify(first)).toBe('applied');
 w.tiles[cell]!.collapsedRock!.id=w.nextId++;
 const delta=structuredClone(encoder.encode(w,0,0));expect(delta.kind).toBe('delta');
 const second=decoder.adopt(delta);expect(second.status,JSON.stringify(second)).toBe('applied');
 if(second.status!=='applied')throw Error('Expected actual retained rock');
 expect(second.world.tiles[cell]).toEqual(w.tiles[cell]);
 w.tiles[cell]={terrain:'marsh',bridge:true,snowDepth:.2};
 const removed=decoder.adopt(structuredClone(encoder.encode(w,0,0)));expect(removed.status,JSON.stringify(removed)).toBe('applied');
 if(removed.status==='applied')expect(Object.hasOwn(removed.world.tiles[cell]!,'collapsedRock')).toBe(false);
});
test('prospective marker, collision, accessor and empty tenth tuple refuse without adopting a partial World',()=>{
 const {w,cell}=prepared(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 const accepted=decoder.adopt(structuredClone(encoder.encode(w,0,0)));expect(accepted.status,JSON.stringify(accepted)).toBe('applied');
 if(accepted.status!=='applied')throw Error('Missing confirmed baseline');const prior=JSON.stringify(accepted.world);
 w.tiles[cell]!.collapsedRock!.id=w.nextId++;
 const source=structuredClone(encoder.encode(w,0,0));if(source.kind!=='delta'||!source.tiles?.length)throw Error('Missing real tile delta');
 const empty=structuredClone(source);empty.tiles![0]![9]=undefined;expect(decoder.adopt(empty).status).toBe('resync');
 const accessor=structuredClone(source);let reads=0;Object.defineProperty(accessor.tiles![0],9,{get(){reads++;return source.tiles![0]![9];},enumerable:true});
 expect(decoder.adopt(accessor).status).toBe('resync');expect(reads).toBe(0);
 const collision=structuredClone(source);collision.tiles![0]![9]!.id=w.pawns[0]!.id;expect(decoder.adopt(collision).status).toBe('resync');
 expect(JSON.stringify(accepted.world)).toBe(prior);expect(decoder.adopt(source).status).toBe('applied');
 const old=JSON.parse(serializeWorld(w));old.schemaVersion=255;expect(()=>deserializeWorld(JSON.stringify(old))).toThrow();
 old.tiles[cell]={terrain:'grass',collapsedRock:undefined};expect(validateWorld(old).length).toBeGreaterThan(0);
});
