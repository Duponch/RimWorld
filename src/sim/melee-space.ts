import { blockedCells,inBounds,reachableCells,routeToCell,routeCost } from './pathfinding.ts';
import { isRoomDoor } from './door-rules.ts';
import { captureStandability } from './furniture-travel.ts';
import { reservedServiceCells } from './service-reservations.ts';
import { footprintCells } from './definitions.ts';
import type { Cell,Pawn,Structure,World } from './types.ts';

/** Contact differs from walking: one free flank permits a diagonal strike;
 * diagonal travel still needs BOTH flanks. A door never permits corner reach. */
export function meleeContact(world:World,a:Cell,b:Cell,blocked=blockedCells(world,true)):boolean {
  const dx=Math.abs(a.x-b.x),dz=Math.abs(a.z-b.z);if(dx>1||dz>1)return false;
  if(!dx||!dz)return true;
  const free=(x:number,z:number)=>!blocked[z*world.width+x]&&!world.structures.some(s=>isRoomDoor(s.kind)&&s.x===x&&s.z===z);
  return free(a.x,b.z)||free(b.x,a.z);
}
export function structureMeleeCell(world:World,from:Cell,target:Structure,blocked=blockedCells(world,true)):Cell|undefined {
  return footprintCells(target).find(cell=>meleeContact(world,from,cell,blocked));
}
export const meleeTargetContact=(world:World,from:Cell,target:Cell|Structure,blocked=blockedCells(world,true)):boolean=>
  'kind' in target?!!structureMeleeCell(world,from,target,blocked):meleeContact(world,from,target,blocked);

export function meleePlaces(world:World,pawn:Cell&{id:number},target:Cell|Structure,claimed:ReadonlySet<number>=new Set()):Cell[] {
  return captureMeleePlaces(world,pawn,claimed)(target);
}
/** One synchronous decision only: invalid after any world/actor mutation. */
export function captureMeleePlaces(world:World,pawn:Cell&{id:number},claimed:ReadonlySet<number>=new Set()):(target:Cell|Structure)=>Cell[] {
  const stands=captureStandability(world),reserved=reservedServiceCells(world,pawn.id),physical=blockedCells(world,true);
  const occupied=new Set<number>();
  for(const p of world.pawns)if(p!==pawn&&p.state!=='dead'&&p.state!=='downed'){
    occupied.add(p.z*world.width+p.x);if(p.motion&&p.motion.end>world.tick)occupied.add(p.motion.from.z*world.width+p.motion.from.x);
    if(p.tactics?.post)occupied.add(p.tactics.post.z*world.width+p.tactics.post.x);
    if(p.melee?.order&&p.path.length){const c=p.path.at(-1)!;occupied.add(c.z*world.width+c.x);}
  }
  for(const m of world.mechanoids??[])if(m!==pawn&&m.state!=='dead'&&m.state!=='downed'){
    occupied.add(m.z*world.width+m.x);if(m.motion&&m.motion.end>world.tick)occupied.add(m.motion.from.z*world.width+m.motion.from.x);
    const end=m.melee?.order&&m.path.at(-1);if(end)occupied.add(end.z*world.width+end.x);
  }
  return target=>{const cells:Cell[]=[],seen=new Set<number>(),footprint='kind' in target?footprintCells(target):[target];
  const inside=new Set(footprint.map(c=>c.z*world.width+c.x));
  for(const face of footprint)for(let z=face.z-1;z<=face.z+1;z++)for(let x=face.x-1;x<=face.x+1;x++) {
    const c={x,z},i=z*world.width+x;
    if(!seen.has(i)&&!inside.has(i)&&inBounds(world,x,z)&&stands(c)&&!occupied.has(i)&&!reserved.has(i)&&!claimed.has(i)&&meleeContact(world,c,face,physical)){seen.add(i);cells.push(c);}
  }
  return cells;};
}
export function meleeRoute(world:World,pawn:Cell&{id:number},places:Cell[],blocked:Uint8Array):Cell[]|null {
  if(!places.length)return null;
  const goals=new Set(places.map(c=>c.z*world.width+c.x));
  const reach=reachableCells(world,pawn,blocked,new Set(),goals);
  let best:Cell[]|null=null,cost=Infinity;
  for(const cell of places){const path=routeToCell(world,cell,reach);if(path){const d=routeCost(world,path,reach);if(d<cost){cost=d;best=path;}}}
  return best;
}
