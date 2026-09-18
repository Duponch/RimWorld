import { hostileTo,isColonist } from './affiliation.ts';
import type { Cell,Pawn,World } from './types.ts';

const actor=(world:World,origin:Cell):Pawn|undefined=>'id' in origin?world.pawns.find(p=>p.id===origin.id):undefined;
/** Capture only within one synchronous decision. Both endpoints protect 3D travel. */
export function hostileCells(world:World,pawn:Pawn):Set<number> {
  const cells=new Set<number>();
  for(const p of world.pawns)if(p!==pawn&&(hostileTo(pawn,p)||!!pawn.melee?.order&&!!p.melee?.order)&&p.state!=='dead'&&p.state!=='downed') {
    cells.add(p.z*world.width+p.x);
    if(p.motion&&p.motion.end>world.tick)cells.add(p.motion.from.z*world.width+p.motion.from.x);
  }
  return cells;
}
/** Apply to the query's private grid, never to the caller's shared terrain mask. */
export function addActorObstacles(world:World,origin:Cell,grid:Uint8Array):void {
  const pawn=actor(world,origin);if(!pawn)return;
  if(!isColonist(pawn))for(const s of world.structures)if(s.kind==='door')grid[s.z*world.width+s.x]=s.door?.open?0:1;
  for(const i of hostileCells(world,pawn))grid[i]=1;
}
export function actorStepAllowed(world:World,origin:Cell,next:Cell):boolean {
  const pawn=actor(world,origin);if(!pawn)return true;
  const occupied=hostileCells(world,pawn),dx=next.x-origin.x,dz=next.z-origin.z;
  const free=(c:Cell)=>!occupied.has(c.z*world.width+c.x)&&(!isColonist(pawn)?!world.structures.some(s=>s.kind==='door'&&s.x===c.x&&s.z===c.z&&!s.door?.open):true);
  return free(next)&&(!dx||!dz||free({x:next.x,z:origin.z})&&free({x:origin.x,z:next.z}));
}

export function openHostileDoor(world:World,origin:Cell,x:number,z:number):boolean {
  const p=actor(world,origin);return !!p&&!isColonist(p)&&world.structures.some(s=>s.kind==='door'&&s.x===x&&s.z===z&&s.door?.open);
}
