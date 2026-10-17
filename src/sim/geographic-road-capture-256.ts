import {isSchema256Or257} from './schema-compatibility-257.ts';
/** Actual FRESH generation map at GenStep390, before ruins, plants, animals,
 * scenario and initial snow. This never answers a live map path request.
 * The first ConnectivitySource.ComputeAll is neighbour/border connectivity,
 * independently of terrain walkability; the path/region gates remain real. */
import type {World} from './types.ts';
import {naturalTerrainCosts256,naturalTerrainWalkable256} from './natural-terrain-movement-256.ts';
import {rockMaxHP} from './mining-rules.ts';
import {captureGeographicGenerationReachability256} from './geographic-generation-reachability-256.ts';
import {localRoadUsedRectCosts256,type LocalRoadPathMap256} from './local-road-path-256.ts';
import type {LocalRoadCurveReaders256} from './local-road-curves-256.ts';
const OFFSETS=[[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,-1],[-1,1]] as const;
export interface GenerationUsedRect256 {minX:number;minZ:number;maxX:number;maxZ:number}
export function captureFreshGeographicRoadMap256(world:World,usedRects:readonly GenerationUsedRect256[]) {
 const {width,height}=world,n=width*height;
 if(!isSchema256Or257(world.schemaVersion)||world.site?.revision!==3||world.planet?.revision!==3||world.tiles.length!==n)throw Error('Road generation needs its actual fresh geographic map');
 // These absences are enforced on the real owner at this exact phase, not
 // stand-ins for unknown grids or permissions. Later phases must not call it.
 if(world.pawns.length||world.structures.length||world.resources.length||world.jobs.length||world.piles.length||world.packed.length||world.stockpiles.length||world.growingZones.length||world.wildlife||world.fires||world.snow||world.geysers||world.exploration)throw Error('Road capture requested outside its empty-Thing generation frontier');
 const reachability=captureGeographicGenerationReachability256(world);
 const direct=new Int32Array(n),building=new Uint8Array(n),destroyableBuilding=new Uint8Array(n),hitPoints=new Uint16Array(n),fence=new Uint8Array(n),water=new Uint8Array(n),perceptualUndrafted=new Uint16Array(n),factionCost=new Uint16Array(n),persistentDanger=new Uint8Array(n),connectivity=new Uint8Array(n),doors=new Uint8Array(n),doorHitPoints=new Int32Array(n);
 for(let i=0;i<n;i++){
  const tile=world.tiles[i]!,owner=tile.mineable;
  if(tile.floor||tile.bridge||tile.collapsedRock||tile.miningDamage||tile.miningYield||tile.snowDepth)throw Error('Changed surface at fresh road frontier');
  if((tile.terrain==='rock')!==!!owner)throw Error('Road encountered a Mineable without its original identity');
  const terrain=owner?.terrain??tile.terrain,facts=naturalTerrainCosts256(terrain);
  if(!facts)throw Error('Unresolved actual road substrate');
  water[i]=Number(facts.water);perceptualUndrafted[i]=facts.perceivedCivilCore;
  direct[i]=owner||!naturalTerrainWalkable256(terrain)?10000:facts.pathCostCore;
  if(owner){building[i]=destroyableBuilding[i]=1;hitPoints[i]=rockMaxHP(tile);}
  const x=i%width,z=Math.floor(i/width);let bits=0;
  for(let k=0;k<OFFSETS.length;k++){const [dx,dz]=OFFSETS[k]!,nx=x+dx,nz=z+dz;if(nx>=0&&nz>=0&&nx<width&&nz<height)bits|=1<<k;}connectivity[i]=bits;
 }
 const map:LocalRoadPathMap256={width,height,direct,building,destroyableBuilding,hitPoints,fence,water,perceptualUndrafted,factionCost,persistentDanger,connectivity,doors,doorHitPoints,usedRectCosts:localRoadUsedRectCosts256(width,height,usedRects),canReach:reachability.canReach};
 const curve:LocalRoadCurveReaders256={
  // IntVec3.Impassable includes top terrain as well as Things. This name is
  // retained by the road kernel but must not hide deep water from that test.
  impassableThing:i=>direct[i]!>=10000,anyDestroyableThing:i=>building[i]===1,
  dangerousTerrain:()=>false,water:i=>water[i]===1,
 };
 // No Core(noDLC) natural terrain in this admitted set has dangerous=true;
 // terrain dictionaries and the precondition close this explicit domain.
 return Object.freeze({map,curve,reachability,central:{standable:reachability.physical.standable,district:reachability.physical.district}});
}
