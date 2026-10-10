import type {ValidationIdentityMembership} from './validation-identities.ts';
import type {Cell,Resource,World} from './types.ts';

const MAX_DENSE_CELLS=1048576,MAX_ANCHOR=Number.MAX_SAFE_INTEGER-3,ID_CAPACITY=65536;
const integerAnchor=(value:unknown):value is number=>Number.isSafeInteger(value)&&Math.abs(Number(value))<=MAX_ANCHOR;
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const hydroCrop=(kind:string):boolean=>kind==='rice'||kind==='potato'||kind==='cotton'||kind==='healroot';
type Presence=Map<number,Set<number>>;
type ResourceIndex={width:number;height:number;presence?:Uint8Array;outside:Presence;hydro?:Uint32Array;hydroOutside:Map<number,number>;ids:ValidationIdentityMembership;candidates:number[]};

/** Facts from stable ordinary resources during ONE closed MAIN adoption.
 * Undefined facts request the historical traversal. This reader is not an
 * ownership capability: raw Worlds, getters, Proxy and writers stay raw. */
export interface OwnedValidationResourceReader {
  records(world:World):boolean|undefined;
  ids(world:World):ValidationIdentityMembership|undefined;
  /** invalidPlant must be the existing healroot/light/blight aggregate in that
   * order. This is not a general Array.some replacement for arbitrary callbacks. */
  hasInvalid(world:World,foreignIds:ReadonlySet<number>,invalidPlant:(resource:Resource)=>boolean):boolean|undefined;
  hasResource(cell:Cell):boolean;
  hydroOverlapCount(linkedCells:ReadonlyMap<number,unknown>):number;
}

/** Construction reads nothing. Shape, identities, ordered plant candidates
 * and spatial projections share the first paid resource traversal. There is
 * no retained state across adoptions and no early plant predicate evaluation. */
export function createOwnedValidationResources(world:World):OwnedValidationResourceReader {
  let resources:ResourceIndex|undefined,captured=false;
  const capture=():ResourceIndex|undefined=>{
    if(captured)return resources;
    captured=true;
    const width=world.width,height=world.height,source=world.resources;
    if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<=0||height<=0||!Array.isArray(source))return;
    const size=width*height,dense=Number.isSafeInteger(size)&&size<=MAX_DENSE_CELLS;
    const denseIds=new Uint8Array(ID_CAPACITY),sparseIds=new Set<number>();
    const ids:ValidationIdentityMembership={has:id=>Number.isInteger(id)&&id>=0&&id<ID_CAPACITY?denseIds[id]===1:sparseIds.has(id)};
    const candidate:ResourceIndex={width,height,presence:dense?new Uint8Array(size):undefined,outside:new Map(),hydro:dense?new Uint32Array(size):undefined,hydroOutside:new Map(),ids,candidates:[]};
    for(let ordinal=0;ordinal<source.length;ordinal++){
      // Own slots are required by hydro records; presence/global some retain
      // their historical hole behavior on the fallback path.
      if(!Object.hasOwn(source,ordinal))return;
      const resource=source[ordinal];if(!record(resource))return;
      const {x,z,kind,id}=resource;
      if(!integerAnchor(x)||!integerAnchor(z)||typeof kind!=='string'||typeof id!=='number')return;
      if(Number.isInteger(id)&&id>=0&&id<ID_CAPACITY)denseIds[id]=1;else sparseIds.add(id);
      if(kind==='healroot'||resource.growthLight!==undefined||resource.blight!==undefined||Object.hasOwn(resource,'blight'))candidate.candidates.push(ordinal);
      if(candidate.presence&&x>=0&&z>=0&&x<width&&z<height)candidate.presence[z*width+x]=1;
      else {
        let row=candidate.outside.get(z);if(!row)candidate.outside.set(z,row=new Set());row.add(x);
      }
      if(!hydroCrop(kind)){
        // Hydro has historical linear aliases; presence uses strict x/z.
        const cell=z*width+x;
        if(candidate.hydro&&Number.isInteger(cell)&&cell>=0&&cell<size)candidate.hydro[cell]!++;
        else candidate.hydroOutside.set(cell,(candidate.hydroOutside.get(cell)??0)+1);
      }
    }
    return resources=candidate;
  };
  return {
    records(target){return target===world&&capture()?true:undefined;},
    ids(target){return target===world?capture()?.ids:undefined;},
    hasInvalid(target,foreignIds,invalidPlant){
      if(target!==world)return;
      const index=capture();if(!index)return;
      // On a collision, preserve the entire source order: a preceding plant
      // predicate can fail or throw before that later collision is reached.
      for(const id of foreignIds)if(index.ids.has(id))return world.resources.some(resource=>foreignIds.has(resource.id)||invalidPlant(resource));
      for(const ordinal of index.candidates)if(invalidPlant(world.resources[ordinal]!))return true;
      return false;
    },
    hasResource(cell){
      const index=capture();if(!index)return world.resources.some(resource=>resource.x===cell.x&&resource.z===cell.z);
      const {x,z}=cell;
      if(index.presence&&Number.isInteger(x)&&Number.isInteger(z)&&x>=0&&z>=0&&x<index.width&&z<index.height)return index.presence[z*index.width+x]===1;
      return x===x&&z===z&&index.outside.get(z)?.has(x)===true;
    },
    hydroOverlapCount(linkedCells){
      const index=capture();let count=0;
      if(!index){for(const resource of world.resources)if(linkedCells.has(resource.z*world.width+resource.x)&&!hydroCrop(resource.kind))count++;return count;}
      for(const cell of linkedCells.keys())count+=index.hydro&&Number.isInteger(cell)&&cell>=0&&cell<index.hydro.length?index.hydro[cell]!:index.hydroOutside.get(cell)??0;
      return count;
    },
  };
}
