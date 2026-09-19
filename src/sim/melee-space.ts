import { blockedCells,inBounds,reachableCells,routeToCell,routeCost } from './pathfinding.ts';
import { captureStandability } from './furniture-travel.ts';
import { reservedServiceCells } from './service-reservations.ts';
import type { Cell,Pawn,World } from './types.ts';

/** Contact differs from walking: one free flank permits a diagonal strike;
 * diagonal travel still needs BOTH flanks. A door never permits corner reach. */
export function meleeContact(world:World,a:Cell,b:Cell,blocked=blockedCells(world,true)):boolean {
  const dx=Math.abs(a.x-b.x),dz=Math.abs(a.z-b.z);if(dx>1||dz>1)return false;
  if(!dx||!dz)return true;
  const free=(x:number,z:number)=>!blocked[z*world.width+x]&&!world.structures.some(s=>s.kind==='door'&&s.x===x&&s.z===z);
  return free(a.x,b.z)||free(b.x,a.z);
}
export function meleePlaces(world:World,pawn:Pawn,target:Cell,claimed:ReadonlySet<number>=new Set()):Cell[] {
  const stands=captureStandability(world),reserved=reservedServiceCells(world,pawn.id),physical=blockedCells(world,true),cells:Cell[]=[];
  const occupied=new Set<number>();
  for(const p of world.pawns)if(p!==pawn&&p.state!=='dead'&&p.state!=='downed'){
    occupied.add(p.z*world.width+p.x);if(p.motion&&p.motion.end>world.tick)occupied.add(p.motion.from.z*world.width+p.motion.from.x);
    if(p.tactics?.post)occupied.add(p.tactics.post.z*world.width+p.tactics.post.x);
    if(p.melee?.order&&p.path.length){const c=p.path.at(-1)!;occupied.add(c.z*world.width+c.x);}
  }
  for(let z=target.z-1;z<=target.z+1;z++)for(let x=target.x-1;x<=target.x+1;x++) {
    const c={x,z},i=z*world.width+x;
    if((x!==target.x||z!==target.z)&&inBounds(world,x,z)&&stands(c)&&!occupied.has(i)&&!reserved.has(i)&&!claimed.has(i)&&meleeContact(world,c,target,physical))cells.push(c);
  }
  return cells;
}
export function meleeRoute(world:World,pawn:Pawn,places:Cell[],blocked:Uint8Array):Cell[]|null {
  if(!places.length)return null;
  const goals=new Set(places.map(c=>c.z*world.width+c.x));
  const reach=reachableCells(world,pawn,blocked,new Set(),goals);
  let best:Cell[]|null=null,cost=Infinity;
  for(const cell of places){const path=routeToCell(world,cell,reach);if(path){const d=routeCost(world,path,reach);if(d<cost){cost=d;best=path;}}}
  return best;
}
