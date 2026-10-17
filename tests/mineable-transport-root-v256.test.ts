import {expect,test} from 'vitest';
import {TileSnapshotCache} from '../src/bridge/tile-snapshot-cache.ts';
import {validMineableTile256,validMineableCampaignRaw256} from '../src/sim/local-mineable-save-256.ts';
import type {Tile} from '../src/sim/types.ts';
/** Isolated original tile/codec records, no complete World or played mining. */
const tile=():Tile=>({terrain:'rock',stone:'granite',mineable:{id:17,def:'Granite',terrain:'rough-stone'}});
test('copied sparse owner primitives detect in-place same-tick edits and absence, without fog or undefined own fields',()=>{
 const t=tile(),tiles=[t],cache=new TileSnapshotCache();cache.reset(tiles);expect(cache.diff(tiles)).toEqual([]);
 t.mineable!.id=18;const a=cache.diff(tiles);expect(a[0]).toHaveLength(12);expect(a[0]![10]).toBeUndefined();expect(a[0]![11]).toEqual({id:18,def:'Granite',terrain:'rough-stone'});
 t.mineable!.terrain='gravel';const b=cache.diff(tiles);expect(b[0]![11]?.terrain).toBe('gravel');expect(a[0]![11]?.terrain).toBe('rough-stone');
 delete t.mineable;t.terrain='rough-stone';expect(cache.diff(tiles)).toEqual([[0,'rough-stone','granite']]);expect(cache.diff(tiles)).toEqual([]);
});
test('original inactive-map tile namespaces reject future/hidden/getter owners before a copied map header can erase them',()=>{
 const root={tick:0,nextId:50,site:{revision:3},tiles:[tile()],worldMaps:{sites:[{id:0},{id:1,map:{site:{revision:3},tiles:[tile()]}}]}};
 expect(validMineableCampaignRaw256(root,256)).toBe(true);expect(validMineableCampaignRaw256(root,255)).toBe(false);
 const hidden=structuredClone(root);Object.defineProperty(hidden.worldMaps.sites[1]!.map!.tiles[0]!,'mineable',{value:undefined,enumerable:false});expect(validMineableCampaignRaw256(hidden,256)).toBe(false);
 let reads=0;const getter=tile();Object.defineProperty(getter,'mineable',{enumerable:true,get(){reads++;return tile().mineable;}});expect(validMineableTile256(getter,256,true,50)).toBe(false);const cache=new TileSnapshotCache();expect(()=>cache.reset([getter])).toThrow();expect(reads).toBe(0);
 expect(validMineableTile256({...tile(),mineable:undefined},255,false,50)).toBe(false);expect(validMineableTile256(tile(),256,false,50)).toBe(false);expect(validMineableTile256({terrain:'rock',stone:'granite'},256,true,50)).toBe(false);
});
