import {footprintContains} from './definitions.ts';
import {groundOccupancyAllows,storageOccupancyAllows,OCCUPANCY,occupancyOf} from './occupancy.ts';
import type {StagingGeometryReader} from './staging-validation.ts';
import {createOwnedValidationResources,type OwnedValidationResourceReader} from './owned-validation-resources.ts';
import {isShelfKind,shelfAt,storageAt,shelfStorageCells} from './shelf-storage.ts';
import type {Cell,Structure,World} from './types.ts';

const MAX_ANCHOR=Number.MAX_SAFE_INTEGER-3;
const integerAnchor=(value:unknown):value is number=>Number.isSafeInteger(value)&&Math.abs(Number(value))<=MAX_ANCHOR;
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
type Anchors=ReadonlyMap<number,ReadonlyMap<number,readonly number[]>>;
type GeometryIndex={readonly anchors:Anchors;readonly hasShelfKinds:boolean;readonly length:number};
type ConfirmedGeometry={world:World;index:GeometryIndex};
export interface OwnedValidationGeometryReader extends StagingGeometryReader {readonly resourceFacts:OwnedValidationResourceReader}

/** Only the closed Decoder's exact sparse reconstruction produces this fact.
 * Ordinals/order/membership, exhaustive changes and the confirmed adjacent
 * epoch/revision are producer preconditions, not inferred from this shape. */
export interface OwnedGeometryReuseWitness {
  readonly kind:'sparse';
  readonly previous:World;
  readonly updatedOrdinals:readonly number[];
}

export interface OwnedValidationGeometryOwner {
  prepare(world:World,witness?:OwnedGeometryReuseWitness,resourceFacts?:OwnedValidationResourceReader):OwnedValidationGeometryReader;
  commit(world:World):void;
  discard():void;
}

/** Ordinary intrinsics and stable ordinary resource/structure collections for ONE adoption.
 * This helper grants no authority to its caller: only the closed MAIN owner
 * supplies this scope in the product. Public/raw Worlds with writers, getters,
 * Proxy or reentrance keep their historical reader; no descriptor census or
 * immutability assertion is performed here. Plain atypical shapes fall back.
 * Terrain, version, jobs and all quantities/reservations remain live queries. */
export function createOwnedValidationGeometry(world:World,resourceFacts:OwnedValidationResourceReader=createOwnedValidationResources(world)):OwnedValidationGeometryReader {
  return createReader(world,resourceFacts).reader;
}

/** Capture stays lazy. A shared confirmed anchor index is never modified;
 * every reader has its own overlap lists and reads its own target records. */
function createReader(world:World,resourceFacts:OwnedValidationResourceReader,reuse?:()=>GeometryIndex|undefined):{reader:OwnedValidationGeometryReader;peek:()=>GeometryIndex|undefined} {
  let geometry:GeometryIndex|undefined,structuresCaptured=false;
  const overlaps=new Map<number,Map<number,number[]>>();

  const captureStructures=():GeometryIndex|undefined=>{
    if(structuresCaptured)return geometry;
    structuresCaptured=true;
    const reused=reuse?.();if(reused)return geometry=reused;
    if(!Array.isArray(world.structures))return;
    const candidate=new Map<number,Map<number,number[]>>();
    let candidateHasShelfKinds=false;
    for(let ordinal=0;ordinal<world.structures.length;ordinal++){
      const structure=world.structures[ordinal];
      if(!record(structure))return;
      const {x,z,kind,orientation,footprint}=structure;
      if(!integerAnchor(x)||!integerAnchor(z)||typeof kind!=='string'||!Object.hasOwn(OCCUPANCY,kind)
        ||orientation!==undefined&&(!Number.isInteger(orientation)||Number(orientation)<0||Number(orientation)>3)
        ||footprint!==undefined&&footprint!=='standard'&&footprint!=='legacy-single'
        ||structure.furniture!==undefined||structure.deconstruction!==undefined||structure.flick!==undefined||structure.fixBreakdown!==undefined)return;
      candidateHasShelfKinds ||= isShelfKind(kind);
      // Every current footprint is inside the anchor-relative +/-3 envelope.
      // Buckets only select occurrences; footprintContains remains the oracle.
      const bx=Math.floor(x/4),bz=Math.floor(z/4);
      let row=candidate.get(bz);if(!row)candidate.set(bz,row=new Map());
      let entries=row.get(bx);if(!entries)row.set(bx,entries=[]);
      entries.push(ordinal);
    }
    return geometry={anchors:candidate,hasShelfKinds:candidateHasShelfKinds,length:world.structures.length};
  };

  const occupyingStructures=(cell:Cell):number[]|undefined=>{
    if(!integerAnchor(cell.x)||!integerAnchor(cell.z))return;
    const index=captureStructures();if(!index)return;
    const cached=overlaps.get(cell.z)?.get(cell.x);if(cached)return cached;
    const candidates:number[]=[];
    for(let bz=Math.floor((cell.z-3)/4);bz<=Math.floor((cell.z+3)/4);bz++){
      const row=index.anchors.get(bz);if(!row)continue;
      for(let bx=Math.floor((cell.x-3)/4);bx<=Math.floor((cell.x+3)/4);bx++)for(const occurrence of row.get(bx)??[])candidates.push(occurrence);
    }
    // Duplicate objects/IDs are still separate ordered occurrences.
    candidates.sort((a,b)=>a-b);
    const occupied:number[]=[];
    for(const ordinal of candidates)if(footprintContains(world.structures[ordinal]!,cell))occupied.push(ordinal);
    let row=overlaps.get(cell.z);if(!row)overlaps.set(cell.z,row=new Map());row.set(cell.x,occupied);
    return occupied;
  };

  // Reuse the same ordered occurrences during this one native adoption. Shelf
  // state, durable cell IDs and policy stay live; unsupported captures retain
  // the literal query rather than treating an unknown result as an empty cell.
  const canReadShelf=(cell:Cell):boolean=>integerAnchor(cell.x)
    &&integerAnchor(cell.z)&&captureStructures()!==undefined;
  const indexedShelfAt=(cell:Cell):Structure|undefined=>{
    if(!geometry!.hasShelfKinds)return;
    for(const ordinal of occupyingStructures(cell)!){
      const structure=world.structures[ordinal]!;
      if(isShelfKind(structure.kind)&&structure.shelf)return structure;
    }
  };

  const reader:OwnedValidationGeometryReader={
    resourceFacts,
    hasResource:resourceFacts.hasResource,
    hydroOverlapCount:resourceFacts.hydroOverlapCount,
    shelfAt(cell){
      return canReadShelf(cell)?indexedShelfAt(cell):shelfAt(world,cell);
    },
    storageAt(cell){
      if(!canReadShelf(cell))return storageAt(world,cell);
      const shelf=indexedShelfAt(cell);
      return shelf?shelfStorageCells(shelf).find(c=>c.x===cell.x&&c.z===cell.z)
        :world.stockpiles.find(z=>z.x===cell.x&&z.z===cell.z);
    },
    groundAllows(cell){
      if(!Number.isInteger(cell.x)||!Number.isInteger(cell.z)||cell.x<0||cell.z<0||cell.x>=world.width||cell.z>=world.height||['water','rock'].includes(world.tiles[cell.z*world.width+cell.x]!.terrain))return false;
      const structures=occupyingStructures(cell);if(!structures)return groundOccupancyAllows(world,cell);
      for(const ordinal of structures){const structure=world.structures[ordinal]!;if(world.schemaVersion<21?structure.kind==='wall':!OCCUPANCY[structure.kind].items)return false;}
      if(world.schemaVersion<16)for(const job of world.jobs)if(job.kind==='wall'&&footprintContains(job,cell))return false;
      return true;
    },
    storageAllows(cell){
      const structures=occupyingStructures(cell);if(!structures)return storageOccupancyAllows(world,cell);
      for(const ordinal of structures)if(!OCCUPANCY[world.structures[ordinal]!.kind].store)return false;
      for(const job of world.jobs)if(footprintContains(job,cell)&&occupancyOf(job.furniture?.kind??job.kind)?.store===false)return false;
      return true;
    },
  };
  return {reader,peek:()=>geometry};
}

/** Persistent projection for the audited closed MAIN only. The exported
 * helper grants no authority to mutable public Worlds or arbitrary callbacks.
 * Failed/unused readers publish nothing; RAW captures remain per adoption. */
export function createOwnedValidationGeometryOwner():OwnedValidationGeometryOwner {
  let confirmed:ConfirmedGeometry|undefined;
  let pending:{world:World;capture:ReturnType<typeof createReader>}|undefined;
  const reusable=(base:ConfirmedGeometry|undefined,world:World,witness:OwnedGeometryReuseWitness):GeometryIndex|undefined=>{
    if(!base||base.world!==witness.previous||witness.kind!=='sparse')return;
    const previous=witness.previous,before=previous.structures,after=world.structures,index=base.index;
    if(world.width!==previous.width||world.height!==previous.height
      ||!Array.isArray(before)||!Array.isArray(after)||before.length!==index.length||after.length!==index.length)return;
    for(const ordinal of witness.updatedOrdinals){
      if(!Number.isSafeInteger(ordinal)||ordinal<0||ordinal>=after.length||!Object.hasOwn(before,ordinal)||!Object.hasOwn(after,ordinal))return;
      const old=before[ordinal],next=after[ordinal];if(!record(old)||!record(next))return;
      // A changed admissibility or geometry tuple takes the complete original
      // capture. All other fields remain current-world decisions, not facts.
      if(!Object.is(old.id,next.id)||!Object.is(old.x,next.x)||!Object.is(old.z,next.z)
        ||!Object.is(old.kind,next.kind)||!Object.is(old.orientation,next.orientation)||!Object.is(old.footprint,next.footprint)
        ||!Object.is(old.furniture,next.furniture)||!Object.is(old.deconstruction,next.deconstruction)
        ||!Object.is(old.flick,next.flick)||!Object.is(old.fixBreakdown,next.fixBreakdown))return;
    }
    return index;
  };
  return {
    prepare(world,witness,resourceFacts=createOwnedValidationResources(world)){
      pending=undefined;
      const base=confirmed;
      const capture=createReader(world,resourceFacts,witness?()=>reusable(base,world,witness):undefined);
      pending={world,capture};return capture.reader;
    },
    commit(world){
      const index=pending?.world===world?pending.capture.peek():undefined;
      confirmed=index?{world,index}:undefined;pending=undefined;
    },
    discard(){pending=undefined;},
  };
}
