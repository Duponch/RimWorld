import { clearShotSegment,type ShotGrid } from './combat-space.ts';
import { STRUCTURE_SHOT_FILL } from './combat-content.ts';
import { footprintCells } from './definitions.ts';
import { isRoomDoor } from './door-rules.ts';
import type { Cell,Structure,World } from './types.ts';

const center=(cells:readonly Cell[]):Cell=>({x:cells.reduce((n,c)=>n+c.x,0)/cells.length,z:cells.reduce((n,c)=>n+c.z,0)/cells.length});
export function researchFacilityDistance(station:Structure,facility:Structure):number {
  const a=center(footprintCells(station)),b=center(footprintCells(facility));return Math.hypot(a.x-b.x,a.z-b.z);
}
/** Core limits one analyzer definition per desk, while one installation can
 * link to several desks. Range is eight units between occupied true centers;
 * an unobstructed ray between either footprint is also required. */
export function researchFacilityLinked(world:World,station:Structure,facility:Structure):boolean {
  if(station.kind!=='hi-tech-research-bench'||facility.kind!=='multi-analyzer'||researchFacilityDistance(station,facility)>8)return false;
  const desk=footprintCells(station),analyzer=footprintCells(facility),excluded=new Set([...desk,...analyzer].map(c=>c.z*world.width+c.x));
  const opaque=new Set<number>();
  for(const s of world.structures)if(STRUCTURE_SHOT_FILL[s.kind]>.99&&!(isRoomDoor(s.kind)&&s.door?.open))
    for(const c of footprintCells(s))opaque.add(c.z*world.width+c.x);
  const grid:ShotGrid={width:world.width,height:world.height,coverAt:()=>undefined,
    blocksSight:(x,z)=>!excluded.has(z*world.width+x)&&(world.tiles[z*world.width+x]?.terrain==='rock'||opaque.has(z*world.width+x))};
  return desk.some(a=>analyzer.some(b=>clearShotSegment(grid,a,b)));
}
