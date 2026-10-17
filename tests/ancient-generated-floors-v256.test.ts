import {expect,test} from 'vitest';
import {registryCamp,legacy254} from './helpers/world-maps-v255.ts';
import {FLOOR_KINDS,FLOOR_DEFINITIONS,floorAvailable,isBuildableFloor,flooringRecipe,removeFloor} from '../src/sim/flooring.ts';
import {terrainSupportsAffordance256,terrainSupportsFloor256,terrainGroundFertility256} from '../src/sim/natural-terrain-runtime-256.ts';
import {floorRoomMarketValue} from '../src/sim/room-market-value.ts';
import {floorBeauty} from '../src/sim/room-beauty.ts';
import {terrainTravelDelay} from '../src/sim/furniture-travel.ts';
import {floorPartsForKind} from '../src/render/HygieneLayer.ts';
import {terrainSurfaceLabel} from '../src/ui/terrain-inspection.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {applyCommand} from '../src/sim/engine.ts';
import type {Tile,World} from '../src/sim/types.ts';

const kinds=['ancient-tile','ancient-concrete'] as const;
function fixture(){
 const w=registryCamp(),cell=w.tiles.findIndex((t,i)=>t.terrain==='grass'&&!t.floor&&!w.structures.some(s=>s.x===i%w.width&&s.z===Math.floor(i/w.width))&&!w.resources.some(r=>r.x===i%w.width&&r.z===Math.floor(i/w.width))&&!w.jobs.some(j=>j.x===i%w.width&&j.z===Math.floor(i/w.width)));
 if(cell<0)throw Error('Prepared real ground fixture lacks a free ordinary cell');
 return {w,cell,x:cell%w.width,z:Math.floor(cell/w.width)};
}
test('distinct generated floors retain their real stats and anatomy-free resident geometry, never Architecte recipes',()=>{
 for(const floor of kinds){
  expect(floorAvailable(floor,255)).toBe(false);expect(floorAvailable(floor,256)).toBe(true);expect(isBuildableFloor(floor)).toBe(false);expect((FLOOR_KINDS as readonly string[]).includes(floor)).toBe(false);
  const tile:Tile={terrain:'soil-natural',floor};expect(terrainGroundFertility256(tile)).toBe(0);expect(floorRoomMarketValue(tile)).toBe(0);
  expect(terrainSupportsFloor256(tile,{schemaVersion:256,site:{revision:3}})).toBe(true);
  for(const need of ['Walkable','Light','Medium','Heavy'] as const)expect(terrainSupportsAffordance256(tile,need,{schemaVersion:256,site:{revision:3}})).toBe(true);
  for(const need of ['GrowSoil','Diggable','Bridgeable'] as const)expect(terrainSupportsAffordance256(tile,need,{schemaVersion:256,site:{revision:3}})).toBe(false);
  expect(FLOOR_DEFINITIONS[floor]).toMatchObject({item:null,quantity:0,salvage:0,pathCost:0,flammability:0});expect(flooringRecipe(floor,true)).toEqual({ingredients:[],work:20,coreWork:200});
  const parts=floorPartsForKind(floor,4,5);expect(parts.length).toBe(floor==='ancient-tile'?4:1);expect(parts.reduce((n,p)=>n+(p.sx??0)*(p.sz??0),0)).toBe(1);expect(parts.every(p=>Number.isFinite(p.color)&&(p.sx??0)>0&&(p.sy??0)>0&&(p.sz??0)>0)).toBe(true);
 }
 expect(FLOOR_DEFINITIONS['ancient-tile']).toMatchObject({cleanliness:.2,cleaningTime:.6});expect(FLOOR_DEFINITIONS['ancient-concrete']).toMatchObject({cleanliness:0,cleaningTime:.8});
 expect(floorBeauty({terrain:'soil-natural',floor:'ancient-tile'})).toBe(0);expect(floorBeauty({terrain:'soil-natural',floor:'ancient-concrete'})).toBe(-1);
 const mineral:Tile={terrain:'rock',stone:'granite',mineable:{id:17,def:'Granite',terrain:'rough-stone'},floor:'ancient-tile'};
 expect(terrainSupportsFloor256(mineral,{schemaVersion:256,site:{revision:3}})).toBe(true);expect(terrainSupportsFloor256(mineral,{schemaVersion:255})).toBe(false);
});
test('RAW/checkpoint/same-tick delta and reload preserve both exact floor IDs; refused packet leaves the admitted view intact',()=>{
 const {w,cell}=fixture();w.tiles[cell]!.floor='ancient-tile';expect(validateWorld(w)).toEqual([]);
 const raw=serializeWorld(w),restored=deserializeWorld(raw);expect(restored.tiles[cell]!.floor).toBe('ancient-tile');expect(serializeWorld(restored)).toBe(raw);
 const enc=new SnapshotEncoder({structureDelta:true}),dec=new SnapshotDecoder(),full=structuredClone(enc.encode(w,0,0)),a=dec.adopt(full);expect(a.status,a.status==='resync'?a.reason:undefined).toBe('applied');if(a.status!=='applied')throw Error('Actual full floor snapshot refused');
 const before=structuredClone(a.world),tick=w.tick;w.tiles[cell]!.floor='ancient-concrete';const delta=structuredClone(enc.encode(w,0,0));expect(delta.kind).toBe('delta');if(delta.kind!=='delta')throw Error('Expected actual same-tick delta');expect(delta.tiles?.find(row=>row[0]===cell)?.[5]).toBe('ancient-concrete');
 const b=dec.adopt(delta);expect(b.status,b.status==='resync'?b.reason:undefined).toBe('applied');if(b.status!=='applied')throw Error('Actual floor delta refused');expect(b.world.tick).toBe(tick);expect(b.world.tiles[cell]!.floor).toBe('ancient-concrete');expect(a.world).toEqual(before);
 const valid=structuredClone(enc.encode(w,0,0,true)),bad=structuredClone(valid);if(bad.kind!=='checkpoint')throw Error('Expected checkpoint');bad.world.tiles[cell]!.floor='unmapped-ancient-floor' as Tile['floor'];const accepted=structuredClone(b.world);expect(dec.adopt(bad).status).toBe('resync');expect(b.world).toEqual(accepted);expect(dec.adopt(valid).status).toBe('applied');
 const old=legacy254(registryCamp());
 // Build only this historical fixture before its baseline: the current real
 // constructor now owns a256-only mind tracker; an original254 never did.
 for(const pawn of old.pawns as World['pawns'])if(pawn.mental)delete pawn.mental.wander;
 expect(()=>deserializeWorld(JSON.stringify(old))).not.toThrow();for(const floor of kinds){const forged=structuredClone(old);(forged.tiles as Tile[])[cell]!.floor=floor;expect(()=>deserializeWorld(JSON.stringify(forged))).toThrow();}
 expect(terrainSurfaceLabel(w.tiles[cell]!)).toBe('Béton ancien');expect(terrainTravelDelay(w,cell)).toBe(0);
});
test('real removal helper restores the same substrate and creates no salvage, ID or RNG draw',()=>{
 const {w,cell,x,z}=fixture();w.tiles[cell]!.floor='ancient-tile';const substrate=w.tiles[cell]!.terrain;
 expect(applyCommand(w,{type:'designate',kind:'remove-floor',x,z})).toEqual({ok:true});const job=w.jobs.find(j=>j.kind==='remove-floor'&&j.x===x&&j.z===z)!;expect(job.floor).toBe('ancient-tile');
 // Declared completion-helper preparation; no walking/work chronology is claimed.
 const rng=w.rng,next=w.nextId,piles=structuredClone(w.piles),count=w.deconstructed.count;
 expect(removeFloor(w,job)).toBe(true);expect(w.tiles[cell]!.terrain).toBe(substrate);expect(w.tiles[cell]!.floor).toBeUndefined();expect(w.rng).toBe(rng);expect(w.nextId).toBe(next);expect(w.piles).toEqual(piles);expect(w.deconstructed.count).toBe(count+1);expect(removeFloor(w,job)).toBe(false);
});
