import {footprintContains} from './definitions.ts';
import {groundOccupancyAllows,storageOccupancyAllows,OCCUPANCY,occupancyOf} from './occupancy.ts';
import type {StagingGeometryReader} from './staging-validation.ts';
import {createOwnedValidationResources,type OwnedValidationResourceReader} from './owned-validation-resources.ts';
import type {Cell,Structure,World} from './types.ts';

const MAX_ANCHOR=Number.MAX_SAFE_INTEGER-3;
const integerAnchor=(value:unknown):value is number=>Number.isSafeInteger(value)&&Math.abs(Number(value))<=MAX_ANCHOR;
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
type Occurrence={ordinal:number;structure:Structure};
type Anchors=Map<number,Map<number,Occurrence[]>>;
export interface OwnedValidationGeometryReader extends StagingGeometryReader {readonly resourceFacts:OwnedValidationResourceReader}

/** Ordinary intrinsics and stable ordinary resource/structure collections for ONE adoption.
 * This helper grants no authority to its caller: only the closed MAIN owner
 * supplies this scope in the product. Public/raw Worlds with writers, getters,
 * Proxy or reentrance keep their historical reader; no descriptor census or
 * immutability assertion is performed here. Plain atypical shapes fall back.
 * Terrain, version, jobs and all quantities/reservations remain live queries. */
export function createOwnedValidationGeometry(world:World,resourceFacts:OwnedValidationResourceReader=createOwnedValidationResources(world)):OwnedValidationGeometryReader {
  let anchors:Anchors|undefined,structuresCaptured=false;
  const overlaps=new Map<number,Map<number,Structure[]>>();

  const captureStructures=():Anchors|undefined=>{
    if(structuresCaptured)return anchors;
    structuresCaptured=true;
    if(!Array.isArray(world.structures))return;
    const candidate:Anchors=new Map();
    for(let ordinal=0;ordinal<world.structures.length;ordinal++){
      const structure=world.structures[ordinal];
      if(!record(structure))return;
      const {x,z,kind,orientation,footprint}=structure;
      if(!integerAnchor(x)||!integerAnchor(z)||typeof kind!=='string'||!Object.hasOwn(OCCUPANCY,kind)
        ||orientation!==undefined&&(!Number.isInteger(orientation)||Number(orientation)<0||Number(orientation)>3)
        ||footprint!==undefined&&footprint!=='standard'&&footprint!=='legacy-single'
        ||structure.furniture!==undefined||structure.deconstruction!==undefined||structure.flick!==undefined||structure.fixBreakdown!==undefined)return;
      // Every current footprint is inside the anchor-relative +/-3 envelope.
      // Buckets only select occurrences; footprintContains remains the oracle.
      const bx=Math.floor(x/4),bz=Math.floor(z/4);
      let row=candidate.get(bz);if(!row)candidate.set(bz,row=new Map());
      let entries=row.get(bx);if(!entries)row.set(bx,entries=[]);
      entries.push({ordinal,structure});
    }
    return anchors=candidate;
  };

  const occupyingStructures=(cell:Cell):Structure[]|undefined=>{
    if(!integerAnchor(cell.x)||!integerAnchor(cell.z))return;
    const index=captureStructures();if(!index)return;
    const cached=overlaps.get(cell.z)?.get(cell.x);if(cached)return cached;
    const candidates:Occurrence[]=[];
    for(let bz=Math.floor((cell.z-3)/4);bz<=Math.floor((cell.z+3)/4);bz++){
      const row=index.get(bz);if(!row)continue;
      for(let bx=Math.floor((cell.x-3)/4);bx<=Math.floor((cell.x+3)/4);bx++)for(const occurrence of row.get(bx)??[])candidates.push(occurrence);
    }
    // Duplicate objects/IDs are still separate ordered occurrences.
    candidates.sort((a,b)=>a.ordinal-b.ordinal);
    const occupied:Structure[]=[];
    for(const {structure} of candidates)if(footprintContains(structure,cell))occupied.push(structure);
    let row=overlaps.get(cell.z);if(!row)overlaps.set(cell.z,row=new Map());row.set(cell.x,occupied);
    return occupied;
  };

  return {
    resourceFacts,
    hasResource:resourceFacts.hasResource,
    hydroOverlapCount:resourceFacts.hydroOverlapCount,
    groundAllows(cell){
      if(!Number.isInteger(cell.x)||!Number.isInteger(cell.z)||cell.x<0||cell.z<0||cell.x>=world.width||cell.z>=world.height||['water','rock'].includes(world.tiles[cell.z*world.width+cell.x]!.terrain))return false;
      const structures=occupyingStructures(cell);if(!structures)return groundOccupancyAllows(world,cell);
      for(const structure of structures)if(world.schemaVersion<21?structure.kind==='wall':!OCCUPANCY[structure.kind].items)return false;
      if(world.schemaVersion<16)for(const job of world.jobs)if(job.kind==='wall'&&footprintContains(job,cell))return false;
      return true;
    },
    storageAllows(cell){
      const structures=occupyingStructures(cell);if(!structures)return storageOccupancyAllows(world,cell);
      for(const structure of structures)if(!OCCUPANCY[structure.kind].store)return false;
      for(const job of world.jobs)if(footprintContains(job,cell)&&occupancyOf(job.furniture?.kind??job.kind)?.store===false)return false;
      return true;
    },
  };
}
