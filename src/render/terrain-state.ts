import type { World, Tile } from '../sim/types';

const rocky=(t:Tile)=>t.terrain==='rock'||t.terrain==='rough-stone';
const NO_CHANGES:readonly number[]=[];
/** null means the map/palette context changed and needs a complete bake. */
export function terrainSurfaceChanges(a:World|null|undefined,b:World):readonly number[]|null {
  if(!a||a.seed!==b.seed||a.width!==b.width||a.height!==b.height||a.site?.biome!==b.site?.biome||!!a.flora!==!!b.flora)return null;
  if(a.tiles===b.tiles)return NO_CHANGES;
  let changed:number[]|undefined;
  for(let i=0;i<b.tiles.length;i++){
    const old=a.tiles[i]!,next=b.tiles[i]!;
    if(old===next)continue;
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
