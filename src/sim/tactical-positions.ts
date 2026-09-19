import { distanceSquared } from './affiliation.ts';
import { candidateAccess } from './candidate-access.ts';
import { captureStandability } from './furniture-travel.ts';
import { findShotLine,type ShotGrid } from './combat-space.ts';
import { shotCover } from './combat-report.ts';
import { routeToCell } from './pathfinding.ts';
import { reservedServiceCells } from './service-reservations.ts';
import type { Cell,Pawn,World } from './types.ts';

/** Destination claims differ from passage permissions. Capture once per decision. */
export function tacticalClaims(world:World,pawn:Pawn):Set<number> {
  const claimed=reservedServiceCells(world,pawn.id);
  for(const other of world.pawns)if(other!==pawn&&other.state!=='dead') {
    claimed.add(other.z*world.width+other.x);
    if(other.motion&&other.motion.end>world.tick)claimed.add(other.motion.from.z*world.width+other.motion.from.x);
    const post=other.tactics?.post??other.draft?.target??(other.melee?.order?other.path.at(-1):undefined);
    if(post)claimed.add(post.z*world.width+post.x);
  }
  return claimed;
}
export function firingPositionScore(from:Cell,target:Cell,cell:Cell,range:number,cover:number):number {
  const distance=distanceSquared(cell,target),optimal=(range*.8)**2;
  return (.3+(range>5?cover*.55:0))*Math.pow(.967,Math.sqrt(distanceSquared(from,cell)))
    *(1-.3*Math.abs(distance-optimal)/optimal)*(distance<25?.5:1);
}
/** Ranked candidates, then visibility/connectivity, then ONE weighted route.
 * No route search for every cover cell; no snapshot survives this decision. */
export function firingPosition(world:World,pawn:Pawn,target:Pawn,range:number,grid:ShotGrid,blocked:Uint8Array):{post:Cell;path:Cell[]}|undefined {
  const stands=captureStandability(world),claims=tacticalClaims(world,pawn),reach=candidateAccess(world,pawn,blocked,new Set());
  const available=(c:Cell)=>stands(c)&&!blocked[c.z*world.width+c.x]&&!claims.has(c.z*world.width+c.x)&&distanceSquared(c,target)>1.421**2;
  const hits=(c:Cell)=>findShotLine(grid,c,{cell:target,leans:!['sleeping','resting'].includes(target.state)},range).ok;
  if(available(pawn)&&hits(pawn)&&(distanceSquared(pawn,target)<25||shotCover(grid,target,pawn).blockChance>.01))return {post:{x:pawn.x,z:pawn.z},path:[]};
  const candidates:{post:Cell;score:number;near:boolean;distance:number}[]=[];
  const radius=Math.ceil(range),dx=pawn.x-target.x,dz=pawn.z-target.z;
  for(let z=Math.max(0,target.z-radius);z<=Math.min(world.height-1,target.z+radius);z++)for(let x=Math.max(0,target.x-radius);x<=Math.min(world.width-1,target.x+radius);x++) {
    const post={x,z};if(distanceSquared(post,target)>range*range||!available(post))continue;
    candidates.push({post,score:firingPositionScore(pawn,target,post,range,shotCover(grid,target,post).blockChance),near:(x-target.x)*dx+(z-target.z)*dz>=0,distance:distanceSquared(pawn,post)});
  }
  candidates.sort((a,b)=>b.score-a.score||a.distance-b.distance||a.post.z-b.post.z||a.post.x-b.post.x);
  const valid=(c:typeof candidates[number])=>hits(c.post)&&reach.has(c.post.z*world.width+c.post.x);
  const near=candidates.find(c=>c.near&&valid(c));
  const winner=near&&near.score>.33?near:candidates.find(valid);
  if(!winner)return;
  const path=routeToCell(world,winner.post,reach);return path?{post:winner.post,path}:undefined;
}
