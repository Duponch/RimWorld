import { hostileTo,isColonist } from './affiliation.ts';
import { isRoomDoor } from './door-rules.ts';
import { prisonDoorPassable } from './prison-space.ts';
import type { Cell,Pawn,World } from './types.ts';
import type { Mechanoid } from './mechanoid-state.ts';
import { isMechanoidTarget } from './combat-target.ts';

const actor=(world:World,origin:Cell):Pawn|Mechanoid|undefined=>'id' in origin?world.pawns.find(p=>p.id===origin.id)??world.mechanoids?.find(m=>m.id===origin.id):undefined;
/** Capture only within one synchronous decision. Both endpoints protect 3D travel. */
export function hostileCells(world:World,pawn:Pawn|Mechanoid):Set<number> {
  const cells=new Set<number>();
  for(const p of world.pawns)if(p!==pawn&&(isMechanoidTarget(pawn)?!p.prisoner:hostileTo(pawn,p)||!!pawn.melee?.order&&!!p.melee?.order)&&p.state!=='dead'&&p.state!=='downed') {
    cells.add(p.z*world.width+p.x);
    if(p.motion&&p.motion.end>world.tick)cells.add(p.motion.from.z*world.width+p.motion.from.x);
  }
  for(const m of world.mechanoids??[])if(m!==pawn&&m.state!=='dead'&&m.state!=='downed'){
    cells.add(m.z*world.width+m.x);if(m.motion&&m.motion.end>world.tick)cells.add(m.motion.from.z*world.width+m.motion.from.x);
  }
  return cells;
}
/** Apply to the query's private grid, never to the caller's shared terrain mask. */
export function addActorObstacles(world:World,origin:Cell,grid:Uint8Array):void {
  const pawn=actor(world,origin);if(!pawn)return;
  if(isMechanoidTarget(pawn)||!isColonist(pawn)&&!pawn.visitor)for(const s of world.structures)if(isRoomDoor(s.kind))grid[s.z*world.width+s.x]=(!isMechanoidTarget(pawn)&&pawn.prisoner?prisonDoorPassable(world,s):s.door?.open)?0:1;
  for(const i of hostileCells(world,pawn))grid[i]=1;
}
export function actorStepAllowed(world:World,origin:Cell,next:Cell):boolean {
  const pawn=actor(world,origin);if(!pawn)return true;
  const occupied=hostileCells(world,pawn),dx=next.x-origin.x,dz=next.z-origin.z;
  const free=(c:Cell)=>!occupied.has(c.z*world.width+c.x)&&(isMechanoidTarget(pawn)||!isColonist(pawn)&&!pawn.visitor?!world.structures.some(s=>isRoomDoor(s.kind)&&s.x===c.x&&s.z===c.z&&!(!isMechanoidTarget(pawn)&&pawn.prisoner?prisonDoorPassable(world,s):s.door?.open)):true);
  return free(next)&&(!dx||!dz||free({x:next.x,z:origin.z})&&free({x:origin.x,z:next.z}));
}

export function openHostileDoor(world:World,origin:Cell,x:number,z:number):boolean {
  const p=actor(world,origin);return !!p&&(isMechanoidTarget(p)||!isColonist(p)&&!p.visitor)&&world.structures.some(s=>isRoomDoor(s.kind)&&s.x===x&&s.z===z&&(!isMechanoidTarget(p)&&p.prisoner?prisonDoorPassable(world,s):s.door?.open));
}
