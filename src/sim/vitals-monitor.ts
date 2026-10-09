import { clearShotSegment,type ShotGrid } from './combat-space.ts';
import { STRUCTURE_SHOT_FILL } from './combat-content.ts';
import { footprintCells } from './definitions.ts';
import { isRoomDoor } from './door-rules.ts';
import { isPowerActive } from './power-rules.ts';
import type { Cell,Structure,World } from './types.ts';

const center=(cells:readonly Cell[]):Cell=>({x:cells.reduce((sum,c)=>sum+c.x,0)/cells.length,z:cells.reduce((sum,c)=>sum+c.z,0)/cells.length});

/** Core chooses one physical facility before testing its power. A monitor can
 * serve several hospital beds; ordinary beds cannot link. Links are derived
 * from current footprints and sight, never persisted as clinical ownership. */
export function linkedVitalsMonitor(world:World,bed:Structure):Structure|undefined {
  if(world.schemaVersion<211||bed.kind!=='hospital-bed'||!world.structures.some(s=>s.id===bed.id&&s.kind==='hospital-bed'))return;
  const cells=footprintCells(bed),origin=center(cells);
  const candidates=world.structures.filter(s=>s.kind==='vitals-monitor'&&cells.some(c=>Math.abs(c.x-s.x)<=1&&Math.abs(c.z-s.z)<=1));
  if(!candidates.length)return;
  const opaque=new Set<number>();
  for(const structure of world.structures)if(STRUCTURE_SHOT_FILL[structure.kind]>.99&&!(isRoomDoor(structure.kind)&&structure.door?.open))
    for(const cell of footprintCells(structure))opaque.add(cell.z*world.width+cell.x);
  const bedCells=new Set(cells.map(c=>c.z*world.width+c.x));
  const grid:ShotGrid={width:world.width,height:world.height,coverAt:()=>undefined,
    blocksSight:(x,z)=>!bedCells.has(z*world.width+x)&&(world.tiles[z*world.width+x]?.terrain==='rock'||opaque.has(z*world.width+x))};
  return candidates.filter(s=>cells.some(cell=>clearShotSegment(grid,cell,s)))
    .sort((a,b)=>(a.x-origin.x)**2+(a.z-origin.z)**2-((b.x-origin.x)**2+(b.z-origin.z)**2)||a.x-b.x||a.z-b.z||a.id-b.id)[0];
}

export function activeVitalsMonitor(world:World,bed:Structure):Structure|undefined {
  const monitor=linkedVitalsMonitor(world,bed);
  return monitor&&isPowerActive(monitor)?monitor:undefined;
}
