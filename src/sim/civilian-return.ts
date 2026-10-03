import { isColonist } from './affiliation.ts';
import { candidateAccess } from './candidate-access.ts';
import { captureStandability } from './furniture-travel.ts';
import { blockedCells } from './pathfinding.ts';
import type { Cell,World } from './types.ts';

/** Capture map occupancy/connectivity only when a real entry is attempted.
 * Each caller supplies its own cargo constraints, never a fictitious deposit. */
export function findCivilianReturnEntry(w:World,preferred:Cell,accepts:(cell:Cell)=>boolean=()=>true):Cell|null {
  if(w.pawns.length+1>w.width*w.height)return null;
  const residents=w.pawns.filter(p=>isColonist(p)&&!p.prisoner&&p.state!=='dead'&&p.state!=='downed');
  const blocked=blockedCells(w),stand=captureStandability(w),occupied=new Set<number>();
  for(const p of w.pawns){occupied.add(p.z*w.width+p.x);if(p.motion&&p.motion.end>w.tick){occupied.add(p.motion.from.z*w.width+p.motion.from.x);occupied.add(p.motion.to.z*w.width+p.motion.to.x);}}
  const access=new Map<number,ReturnType<typeof candidateAccess>>();
  const empty:ReadonlySet<number>=new Set();
  const reachable=(i:number):boolean=>{
    if(!residents.length)return true;
    for(const p of residents){
      let query=access.get(p.id);
      if(!query){query=candidateAccess(w,p,blocked,empty,true);access.set(p.id,query);}
      if(query.has(i))return true;
    }
    return false;
  };
  const same=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;
  const edges:Cell[]=[];
  for(let x=0;x<w.width;x++){edges.push({x,z:0});if(w.height>1)edges.push({x,z:w.height-1});}
  for(let z=1;z<w.height-1;z++){edges.push({x:0,z});if(w.width>1)edges.push({x:w.width-1,z});}
  edges.sort((a,b)=>(same(a,preferred)?-1:same(b,preferred)?1:0)||((a.x-preferred.x)**2+(a.z-preferred.z)**2)-((b.x-preferred.x)**2+(b.z-preferred.z)**2)||a.z-b.z||a.x-b.x);
  return edges.find(c=>{const i=c.z*w.width+c.x;
    return !blocked[i]&&!occupied.has(i)&&stand(c)&&reachable(i)&&accepts(c);
  })??null;
}
