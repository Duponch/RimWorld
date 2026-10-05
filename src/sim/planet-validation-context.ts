/** Owned primitive witnesses for operation-local planet validation.
 * No World/packet references, seed replay, rendering or adoption. */
import type { PlanetState,PlanetTile } from './planet-state.ts';
import type { World } from './types.ts';
import { PLANET_TILE_COUNT,validatePlanet } from './planet-save.ts';

type CopiedTile=Readonly<Omit<PlanetTile,'center'|'neighbours'>> & {
  readonly center:readonly [number,number,number];readonly neighbours:readonly number[];
};
type CopiedPlanet=Readonly<Omit<PlanetState,'tiles'|'nextGroupId'>> & {readonly tiles:readonly CopiedTile[]};
declare const contextBrand:unique symbol;
/** Opaque capability; never stored in World, a packet or a save. */
export interface PlanetValidationContext {readonly [contextBrand]:true}
interface Proof {readonly geography:CopiedPlanet|undefined;readonly version:number;readonly tick:number;readonly nextGroupId:number|undefined}
// Keys are minted capabilities, not mutable Worlds/PlanetStates/arrays. Every
// use compares raw values against the owned primitive witness again.
const proofs=new WeakMap<object,Proof>();
const PLANET_KEYS=['revision','adoptedAt','generationSeed','tiles','homeTile','civilianTile','nextGroupId'] as const;
const TILE_KEYS=['id','center','neighbours','biome','hilliness','meanTemperature','rainfall'] as const;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const exact=(v:Record<string,unknown>,keys:readonly string[]):boolean=>{
  const actual=Reflect.ownKeys(v);return actual.length===keys.length&&actual.every(k=>typeof k==='string'&&keys.includes(k));
};
function dense(v:unknown,length:number):v is unknown[]{
  if(!Array.isArray(v)||v.length!==length)return false;
  const keys=Reflect.ownKeys(v);
  return keys.length===length+1&&keys.every(k=>k==='length'||typeof k==='string'&&int(Number(k),0,length-1)&&String(Number(k))===k);
}
function copy(p:PlanetState):CopiedPlanet{
  // Array prototypes are not part of the historical raw shape restrictions.
  // Their map/slice methods may return the borrowed original. Copy indexed
  // primitives into ordinary arrays without invoking methods supplied by raw.
  const tiles:CopiedTile[]=[];
  for(let i=0;i<PLANET_TILE_COUNT;i++){
    const t=p.tiles[i]!,neighbours:number[]=[];
    for(let j=0;j<t.neighbours.length;j++)neighbours.push(t.neighbours[j]!);
    tiles.push({id:t.id,biome:t.biome,hilliness:t.hilliness,meanTemperature:t.meanTemperature,rainfall:t.rainfall,
      center:[t.center[0],t.center[1],t.center[2]],neighbours});
  }
  return {revision:p.revision,adoptedAt:p.adoptedAt,generationSeed:p.generationSeed,homeTile:p.homeTile,civilianTile:p.civilianTile,
    tiles};
}
/** Equality to a valid owned copy implies the same scalar bounds, graph,
 * embedding and land connectivity. Exact keys and dense arrays remain
 * necessary even when every indexed value appears unchanged. */
function matches(v:unknown,p:CopiedPlanet):v is PlanetState{
  if(!object(v)||!exact(v,PLANET_KEYS)||v.revision!==p.revision||v.adoptedAt!==p.adoptedAt||v.generationSeed!==p.generationSeed
    ||v.homeTile!==p.homeTile||v.civilianTile!==p.civilianTile||!int(v.nextGroupId,1)||!dense(v.tiles,PLANET_TILE_COUNT))return false;
  for(let i=0;i<PLANET_TILE_COUNT;i++){
    const t=v.tiles[i],c=p.tiles[i]!;
    if(!object(t)||!exact(t,TILE_KEYS)||t.id!==c.id||t.biome!==c.biome||t.hilliness!==c.hilliness
      ||t.meanTemperature!==c.meanTemperature||t.rainfall!==c.rainfall||!dense(t.center,3)||!dense(t.neighbours,c.neighbours.length))return false;
    for(let j=0;j<3;j++)if(t.center[j]!==c.center[j])return false;
    for(let j=0;j<c.neighbours.length;j++)if(t.neighbours[j]!==c.neighbours[j])return false;
  }
  return true;
}
function currentMetadata(v:PlanetState,w:World,version:number):boolean{
  return int(version,196)&&int(w.tick)&&int(v.adoptedAt,0,w.tick)&&int(v.generationSeed,0,0xffffffff)&&int(v.nextGroupId,1);
}
function lookup(context:unknown):Proof|undefined{
  return object(context)?proofs.get(context):undefined;
}
export type PlanetContextResult={readonly ok:false;readonly errors:readonly string[]}|{
  readonly ok:true;readonly context:PlanetValidationContext;readonly present:boolean;readonly nextGroupId:number|undefined;
};
/** Previous proof is a hint, never permission to skip comparisons. A decoder
 * must omit it on a new epoch. No input object is retained or mutated. */
export function validatePlanetContext(w:World,version:number,previous?:PlanetValidationContext):PlanetContextResult{
  if(!int(version,1))return {ok:false,errors:['Invalid planet validation version.']};
  if(version<=195&&['planet','group','groupLosses'].some(k=>Object.hasOwn(w,k)))return {ok:false,errors:['Future planet or group state in historical schema.']};
  const before=lookup(previous),raw=w.planet;
  let geography:CopiedPlanet|undefined;
  if(before?.version===version&&before.geography&&matches(raw,before.geography)&&currentMetadata(raw,w,version))geography=before.geography;
  else{
    const errors=validatePlanet(raw,w,version);if(errors.length)return {ok:false,errors};
    geography=raw===undefined?undefined:copy(raw);
  }
  const context=Object.freeze({}) as PlanetValidationContext;
  const nextGroupId=raw?.nextGroupId;
  proofs.set(context,{geography,version,tick:w.tick,nextGroupId});
  return {ok:true,context,present:geography!==undefined,nextGroupId};
}
/** Returns the actual planet only after another complete primitive/shape
 * comparison. Forged contexts, stale metadata and mutated originals fail;
 * another original with equal values is legal. */
export function validatedPlanetFor(context:unknown,w:World,version:number):PlanetState|undefined{
  const p=lookup(context);
  if(!p?.geography||p.version!==version||p.tick!==w.tick||!matches(w.planet,p.geography)
    ||!currentMetadata(w.planet,w,version)||w.planet.nextGroupId!==p.nextGroupId)return undefined;
  return w.planet;
}
/** Compares copied values for the decoder's same-epoch immutability rule.
 * Raw packet validation still happens separately for every publication. */
export function sameValidatedPlanetGeography(a:unknown,b:unknown):boolean{
  const x=lookup(a),y=lookup(b);if(!x||!y)return false;
  const p=x.geography,q=y.geography;if(!p||!q)return p===undefined&&q===undefined;
  // Only privately owned, never-mutated copies share this identity. Raw
  // Worlds/packets still undergo the complete matches scan on every use.
  if(p===q)return true;
  if(p.revision!==q.revision||p.adoptedAt!==q.adoptedAt||p.generationSeed!==q.generationSeed||p.homeTile!==q.homeTile||p.civilianTile!==q.civilianTile)return false;
  for(let i=0;i<PLANET_TILE_COUNT;i++){
    const t=p.tiles[i]!,u=q.tiles[i]!;
    if(t.id!==u.id||t.biome!==u.biome||t.hilliness!==u.hilliness||t.meanTemperature!==u.meanTemperature||t.rainfall!==u.rainfall
      ||t.neighbours.length!==u.neighbours.length)return false;
    for(let j=0;j<3;j++)if(t.center[j]!==u.center[j])return false;
    for(let j=0;j<t.neighbours.length;j++)if(t.neighbours[j]!==u.neighbours[j])return false;
  }
  return true;
}
