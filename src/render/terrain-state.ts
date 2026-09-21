import type { World, Tile } from '../sim/types';

const rocky=(t:Tile)=>t.terrain==='rock'||t.terrain==='rough-stone';
/** Damage and excavation leave the underlying surface unchanged. Compare
 * without allocating a whole-map string/array for every mining snapshot. */
export function sameTerrainSurface(a:World|null|undefined,b:World):boolean {
  if(!a||a.seed!==b.seed||a.width!==b.width||a.height!==b.height||a.site?.biome!==b.site?.biome||!!a.flora!==!!b.flora)return false;
  if(a.tiles===b.tiles)return true;
  for(let i=0;i<b.tiles.length;i++) {
    const old=a.tiles[i]!,next=b.tiles[i]!;
    if(old===next)continue;
    if(rocky(old)&&rocky(next)){if(old.stone!==next.stone)return false;}
    else if(old.terrain!==next.terrain)return false;
  }
  return true;
}
