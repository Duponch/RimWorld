import {expect,test} from 'vitest';
import {TileSnapshotCache} from '../src/bridge/tile-snapshot-cache.ts';
import type {Tile} from '../src/sim/types.ts';
test('collapsed rock sparse delta captures primitive marker at the SAME tick and never stores its mutable reference',()=>{
 const tiles:Tile[]=[{terrain:'rock',collapsedRock:{id:2,terrain:'marsh'}} as Tile],cache=new TileSnapshotCache();cache.reset(tiles);
 expect(cache.diff(tiles)).toEqual([]);
 const tile=tiles[0]! as Tile&{collapsedRock:{id:number;terrain:'marsh'}};tile.collapsedRock.id=3;
 const first=cache.diff(tiles);expect(first).toHaveLength(1);expect(first[0]![9]).toEqual({id:3,terrain:'marsh'});
 tile.collapsedRock.id=4;expect(first[0]![9]).toEqual({id:3,terrain:'marsh'});expect(cache.diff(tiles)[0]![9]).toEqual({id:4,terrain:'marsh'});
 tiles[0]={terrain:'marsh'};expect(cache.diff(tiles)).toEqual([[0,'marsh']]);expect(cache.diff(tiles)).toEqual([]);
});
