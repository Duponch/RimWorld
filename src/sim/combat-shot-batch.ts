import { captureWorldShotGrid } from './combat-world.ts';
import { itemShotFill } from './combat-content.ts';
import type { World } from './types.ts';

/** Owned ONLY by one synchronous advanceWorldCombat transaction. Medical
 * impacts can move/drop piles; barrier destruction replaces structures and
 * invalidates the fixed layer. Terrain, plants and frames cannot change here.
 * A weapon drop has no cover; a dropped/carried chunk must refresh the grid. */
export function combatShotBatch(world:World) {
  let grid:ReturnType<typeof captureWorldShotGrid>|undefined;
  let signature:number[]=[];let structures=world.structures;
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
      if(structures!==world.structures){grid=undefined;structures=world.structures;}
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
