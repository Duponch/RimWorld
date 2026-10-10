import {groundOccupancyAllows} from './occupancy.ts';
import type {Cell,World} from './types.ts';

/** Read-only geometry during one validation of a reconstructed transport World.
 * Never retain the reader across writes, validation calls or snapshot adoption. */
export interface StagingGeometryReader {
  hasResource(cell:Cell):boolean;
  groundAllows(cell:Cell):boolean;
  storageAllows?(cell:Cell):boolean;
  hydroOverlapCount?(linkedCells:ReadonlyMap<number,unknown>):number;
}

type Cells=Map<number,Set<number>>;
const MAX_DENSE_CELLS=1048576;
const denseCell=(x:number,z:number,width:number,height:number):boolean=>
  Number.isInteger(x)&&Number.isInteger(z)&&x>=0&&z>=0&&x<width&&z<height;
const add=(cells:Cells,{x,z}:Cell):void=>{
  // Map uses SameValueZero; historical coordinate tests use === instead.
  if(x!==x||z!==z)return;
  let row=cells.get(z);if(!row)cells.set(z,row=new Set());row.add(x);
};
const has=(cells:Cells,{x,z}:Cell):boolean=>x===x&&z===z&&cells.get(z)?.has(x)===true;

/** The constructor reads nothing. Each index is captured at its first historical
 * query, after the recipe/reach/terrain guards. Raw file callers do not use it. */
export function createStagingValidation(world:World):StagingGeometryReader {
  let resources:{dense:Uint8Array|undefined,cells:Cells|undefined,width:number,height:number}|undefined,resourceFallback=false;
  let occupancy:Map<number,Map<number,boolean>>|undefined;
  return {
    hasResource(cell){
      if(!resources&&!resourceFallback){
        const width=world.width,height=world.height;
        const dense=Number.isInteger(width)&&Number.isInteger(height)&&width>0&&height>0&&width*height<=MAX_DENSE_CELLS
          ?new Uint8Array(width*height):undefined;
        let cells:Cells|undefined;
        // forEach skips array holes exactly like the original some query.
        world.resources.forEach(resource=>{
          if(resource===null||resource===undefined){resourceFallback=true;return;}
          const {x,z}=resource;
          if(dense&&denseCell(x,z,width,height))dense[z*width+x]=1;
          // Preserve strict equality for raw coordinates outside the dense domain.
          // This also avoids rereading coordinates when an atypical value appears.
          else add(cells??=new Map(),{x,z});
        });
        if(!resourceFallback)resources={dense,cells,width,height};
      }
      if(!resources)return world.resources.some(r=>r.x===cell.x&&r.z===cell.z);
      const {x,z}=cell,{dense,cells,width,height}=resources;
      if(dense&&denseCell(x,z,width,height))return dense[z*width+x]===1;
      return cells?has(cells,{x,z}):false;
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
