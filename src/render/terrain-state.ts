import type { World, Tile } from '../sim/types';
import {readSnapshotChanges} from '../bridge/snapshot-changes';

const rocky=(t:Tile)=>t.terrain==='rock'||t.terrain==='rough-stone';
const NO_CHANGES:readonly number[]=[];
/** A delta keeps all unchanged Tile objects by identity. Collect its changed
 * slots once so terrain paint and the rock surface do not each scan the map. */
export function terrainTileChanges(a:World|null|undefined,b:World,immutableSnapshots=false):readonly number[]|null {
  if(!a||a.seed!==b.seed||a.width!==b.width||a.height!==b.height||a.site?.biome!==b.site?.biome||!!a.flora!==!!b.flora)return null;
  if(a.tiles===b.tiles)return NO_CHANGES;
  const confirmed=immutableSnapshots?readSnapshotChanges(a,b):undefined;
  if(confirmed)return confirmed.tileIndices;
  let changed:number[]|undefined;
  for(let i=0;i<b.tiles.length;i++)if(a.tiles[i]!==b.tiles[i])(changed??=[]).push(i);
  return changed??NO_CHANGES;
}
/** null means the map/palette context changed and needs a complete bake. */
export function terrainSurfaceChanges(a:World|null|undefined,b:World,tiles=terrainTileChanges(a,b)):readonly number[]|null {
  if(!a||tiles===null)return null;
  let changed:number[]|undefined;
  for(const i of tiles){
    const old=a.tiles[i]!,next=b.tiles[i]!;
    if(rocky(old)&&rocky(next)){if(old.stone!==next.stone)(changed??=[]).push(i);}
    else if(old.terrain!==next.terrain)(changed??=[]).push(i);
  }
  return changed??NO_CHANGES;
}
/** Damage and excavation leave the underlying surface unchanged. Compare
 * without allocating a whole-map string/array for every mining snapshot. */
export function sameTerrainSurface(a:World|null|undefined,b:World):boolean {
  return terrainSurfaceChanges(a,b)?.length===0;
}
