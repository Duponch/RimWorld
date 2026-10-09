import {groundOccupancyAllows} from './occupancy.ts';
import type {Cell,World} from './types.ts';

/** Read-only geometry during one validation of a reconstructed transport World.
 * Never retain the reader across writes, validation calls or snapshot adoption. */
export interface StagingGeometryReader {
  hasResource(cell:Cell):boolean;
  groundAllows(cell:Cell):boolean;
}

type Cells=Map<number,Set<number>>;
const add=(cells:Cells,{x,z}:Cell):void=>{
  // Map uses SameValueZero; historical coordinate tests use === instead.
  if(x!==x||z!==z)return;
  let row=cells.get(z);if(!row)cells.set(z,row=new Set());row.add(x);
};
const has=(cells:Cells,{x,z}:Cell):boolean=>x===x&&z===z&&cells.get(z)?.has(x)===true;

/** The constructor reads nothing. Each index is captured at its first historical
 * query, after the recipe/reach/terrain guards. Raw file callers do not use it. */
export function createStagingValidation(world:World):StagingGeometryReader {
  let resources:Cells|undefined,resourceFallback=false;
  let occupancy:Map<number,Map<number,boolean>>|undefined;
  return {
    hasResource(cell){
      if(!resources&&!resourceFallback){
        const cells:Cells=new Map();
        // forEach skips array holes exactly like the original some query.
        world.resources.forEach(resource=>{
          if(resource===null||resource===undefined){resourceFallback=true;return;}
          add(cells,resource);
        });
        if(!resourceFallback)resources=cells;
      }
      return resources?has(resources,cell):world.resources.some(r=>r.x===cell.x&&r.z===cell.z);
    },
    groundAllows(cell){
      let row=occupancy?.get(cell.z);const cached=row?.get(cell.x);
      if(cached!==undefined)return cached;
      // Keep the historical point query, order, short-circuit and exceptions;
      // footprintContains must not be approximated by footprintCells here.
      const allows=groundOccupancyAllows(world,cell);
      occupancy??=new Map();if(!row)occupancy.set(cell.z,row=new Map());
      row.set(cell.x,allows);return allows;
    },
  };
}
