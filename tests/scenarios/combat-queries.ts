import type { ShotCover,ShotGrid } from '../../src/sim/combat-space.ts';

/** Synthetic logical cover. These values are not a World content catalogue. */
export function combatQueryField(width=32,height=32) {
  const walls=new Uint8Array(width*height),covers=new Map<number,ShotCover>();
  let reads=0;
  const grid:ShotGrid={width,height,blocksSight(x,z){reads++;return walls[z*width+x]!==0;},coverAt(x,z){reads++;return covers.get(z*width+x);}};
  return {grid,walls,covers,reads:()=>reads,resetReads:()=>{reads=0;},
    set(x:number,z:number,cover:ShotCover,solid=false){covers.set(z*width+x,cover);walls[z*width+x]=+solid;},
    remove(x:number,z:number){covers.delete(z*width+x);walls[z*width+x]=0;}};
}
