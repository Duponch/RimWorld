import { blockedCells } from './pathfinding.ts';
import { captureStandability } from './furniture-travel.ts';
import { isColonist } from './affiliation.ts';
import type { Cell,World } from './types.ts';

/** Multi-source cardinal connectivity, not an approximation of route cost.
 * The shared eight-neighbour graph forbids solid corners: each legal diagonal
 * has a cardinal detour. One capture per incident decision, never per frame. */
export function arrivalEntry(world:World,salt:number):Cell|null {
  const blocked=blockedCells(world),width=world.width,height=world.height;
  const occupied=new Set<number>();
  for(const p of world.pawns) {
    occupied.add(p.z*width+p.x);
    if(p.motion&&p.motion.end>world.tick){occupied.add(p.motion.from.z*width+p.motion.from.x);occupied.add(p.motion.to.z*width+p.motion.to.x);}
    if(!isColonist(p)&&!['dead','downed'].includes(p.state)) {
      blocked[p.z*width+p.x]=1;
      if(p.motion&&p.motion.end>world.tick)blocked[p.motion.from.z*width+p.motion.from.x]=1;
    }
  }
  const seen=new Uint8Array(blocked.length),queue=new Int32Array(blocked.length);let head=0,tail=0;
  const visit=(i:number)=>{if(!blocked[i]&&!seen[i]){seen[i]=1;queue[tail++]=i;}};
  for(const p of world.pawns)if(isColonist(p)&&p.state!=='dead')visit(p.z*width+p.x);
  if(!tail)return null;
  const stands=captureStandability(world),edges:Cell[]=[];
  while(head<tail) {
    const i=queue[head++]!,x=i%width,z=Math.floor(i/width);
    if((x===0||z===0||x===width-1||z===height-1)&&!occupied.has(i)&&stands({x,z}))edges.push({x,z});
    if(i>=width)visit(i-width);if(x+1<width)visit(i+1);if(i+width<blocked.length)visit(i+width);if(x)visit(i-1);
  }
  return edges.length?edges[(salt>>>0)%edges.length]!:null;
}
