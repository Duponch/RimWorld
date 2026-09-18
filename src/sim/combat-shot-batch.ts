import { captureWorldShotGrid } from './combat-world.ts';
import { itemShotFill } from './combat-content.ts';
import type { World } from './types.ts';

/** Owned ONLY by one synchronous advanceWorldCombat transaction. Its medical
 * impacts can move/drop piles, but cannot mutate terrain, plants, frames or
 * buildings. New object damage must invalidate those fixed layers too.
 * A weapon drop has no cover; a dropped/carried chunk must refresh the grid. */
export function combatShotBatch(world:World) {
  let grid:ReturnType<typeof captureWorldShotGrid>|undefined;
  let signature:number[]=[];
  const groundCover=()=>{
    const values:number[]=[];
    for(const p of world.piles)if(p.owner.type==='ground') {
      const fill=itemShotFill(p.item);
      if(fill>0)values.push(p.id,p.owner.x,p.owner.z,fill);
    }
    return values;
  };
  return {
    read:()=>{
      if(!grid){grid=captureWorldShotGrid(world);signature=groundCover();}
      return grid;
    },
    afterImpact:()=>{
      if(!grid)return;
      const next=groundCover();
      if(next.length!==signature.length||next.some((n,i)=>n!==signature[i]))grid=undefined;
    },
  };
}
