import { BOMB_RADIUS } from './bomb-state.ts';
import { captureWorldShotGrid } from './combat-world.ts';
import { clearShotSegment } from './combat-space.ts';
import { footprintContains } from './definitions.ts';
import { FURNITURE_TRAVEL } from './furniture-travel.ts';
import { isRoomDoor } from './door-rules.ts';
import type { Cell,World } from './types.ts';

/** One immutable radial LOS capture after source retirement. The canonical
 * date/index tie order adapts Core's registration order, without widening LOS
 * when this wave later destroys a wall. */
export function captureBombCells(w:World,center:Cell,radius=BOMB_RADIUS,includeCenter=false):number[] {
  const reach=Math.ceil(radius),grid=captureWorldShotGrid(w,{minX:center.x-reach,minZ:center.z-reach,maxX:center.x+reach,maxZ:center.z+reach});
  const inside=(x:number,z:number)=>x>=0&&z>=0&&x<w.width&&z<w.height&&(x-center.x)**2+(z-center.z)**2<=radius**2;
  const cells=new Set<number>(),open:Cell[]=[];
  // A conduit may be under an edifice. Its origin cell remains affected even
  // when no outward open cell can lend it an adjacent-wall registration.
  if(includeCenter&&inside(center.x,center.z))cells.add(center.z*w.width+center.x);
  for(let z=Math.max(0,center.z-reach);z<=Math.min(w.height-1,center.z+reach);z++)for(let x=Math.max(0,center.x-reach);x<=Math.min(w.width-1,center.x+reach);x++){
    if(!inside(x,z)||grid.blocksSight(x,z)||!clearShotSegment(grid,center,{x,z}))continue;
    open.push({x,z});cells.add(z*w.width+x);
  }
  for(const c of open)for(const [dx,dz] of [[0,-1],[1,0],[0,1],[-1,0]] as const){
    const x=c.x+dx,z=c.z+dz;if(!inside(x,z))continue;
    if(w.structures.some(s=>(isRoomDoor(s.kind)||!FURNITURE_TRAVEL[s.kind].stand)&&footprintContains(s,{x,z})))cells.add(z*w.width+x);
  }
  const date=(i:number)=>Math.floor(Math.hypot(i%w.width-center.x,Math.floor(i/w.width)-center.z)*1.5);
  return [...cells].sort((a,b)=>date(a)-date(b)||a-b);
}
