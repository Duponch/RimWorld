import { BIOME_FLORA,FLORA_DEFINITIONS,isBiomeId,isPlantSpecies,weightedSpecies,type BiomeId } from './biome-flora.ts';
import { createPlantLife } from './plant-life.ts';
import { footprintCells } from './definitions.ts';
import { isRoofed } from './roof-rules.ts';
import { soilFertility } from './soil.ts';
import type { BiomeSite } from './site.ts';
import type { Resource,World } from './types.ts';

export interface WildFloraState {
  revision:1;
  biome:BiomeId;
  rng:number;
  nextCheck:number;
  adoptedAt:number;
  capacity:number;
}

const CHECK_INTERVAL=60;
const record=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const uint=(value:unknown):value is number=>Number.isInteger(value)&&Number(value)>=0&&Number(value)<=0xffffffff;

export function initializeWildFlora(world:World,site:BiomeSite):void {
  if(world.flora)throw new Error('La flore sauvage est deja initialisee.');
  const capacity=world.resources.filter(resource=>resource.species!==undefined).length;
  const seed=(world.seed^0x7a4d3c19)>>>0;
  world.flora={revision:1,biome:site.biome,rng:seed||0x6d2b79f5,nextCheck:world.tick+CHECK_INTERVAL,adoptedAt:world.tick,capacity};
}

export function validateWildFlora(world:Pick<World,'flora'|'site'|'tick'|'width'|'height'|'resources'>,version:number):boolean {
  const state=world.flora;
  if(state===undefined)return world.site?.revision!==2&&world.resources.every(resource=>resource.species===undefined);
  if(version<91||world.site?.revision!==2||!record(state)||Object.keys(state).length!==6||
    !Object.keys(state).every(key=>['revision','biome','rng','nextCheck','adoptedAt','capacity'].includes(key)))return false;
  if(state.revision!==1||!isBiomeId(state.biome)||state.biome!==world.site.biome||!uint(state.rng)||state.rng===0||
    !Number.isSafeInteger(state.adoptedAt)||state.adoptedAt<0||state.adoptedAt>world.tick||
    !Number.isSafeInteger(state.nextCheck)||state.nextCheck<world.tick||state.nextCheck>world.tick+CHECK_INTERVAL||state.nextCheck%CHECK_INTERVAL!==state.adoptedAt%CHECK_INTERVAL||
    !Number.isSafeInteger(state.capacity)||state.capacity<0||state.capacity>world.width*world.height)return false;
  let present=0;
  for(const resource of world.resources)if(resource.species!==undefined) {
    if(!isPlantSpecies(resource.species))return false;
    const definition=FLORA_DEFINITIONS[resource.species];
    const growthTick=resource.growthTick;
    if(resource.kind!==definition.kind||resource.amount!==definition.yield||typeof resource.growth!=='number'||!Number.isFinite(resource.growth)||resource.growth<0||resource.growth>1||
      typeof growthTick!=='number'||!Number.isSafeInteger(growthTick)||growthTick<0||growthTick>world.tick||!resource.plantLife)return false;
    present++;
  }
  return present<=state.capacity;
}

function next(state:WildFloraState):number {
  let value=state.rng;value^=value<<13;value^=value>>>17;value^=value<<5;state.rng=value>>>0;
  return state.rng/0x100000000;
}
function freeCell(world:World,index:number):boolean {
  const tile=world.tiles[index];if(!tile||tile.floor||soilFertility(tile.terrain)<=0||tile.terrain==='water'||tile.terrain==='rock')return false;
  const x=index%world.width,z=Math.floor(index/world.width);
  if(isRoofed(world,index)||world.growingZones.some(zone=>zone.cells.includes(index)))return false;
  return !world.resources.some(resource=>resource.x===x&&resource.z===z)&&
    !world.structures.some(structure=>footprintCells(structure).some(cell=>cell.x===x&&cell.z===z))&&
    !world.jobs.some(job=>footprintCells(job).some(cell=>cell.x===x&&cell.z===z))&&
    !world.piles.some(pile=>pile.owner.type==='ground'&&pile.owner.x===x&&pile.owner.z===z)&&
    !world.packed.some(furniture=>furniture.owner.type==='ground'&&furniture.owner.x===x&&furniture.owner.z===z);
}
function spawn(world:World,index:number,species:ReturnType<typeof weightedSpecies>):void {
  const definition=FLORA_DEFINITIONS[species],x=index%world.width,z=Math.floor(index/world.width);
  const resource:Resource={id:world.nextId++,x,z,kind:definition.kind,amount:definition.yield,species,growth:.0001,growthTick:world.tick};
  resource.plantLife=createPlantLife(world,resource,true);world.resources=[...world.resources,resource];
}

/** One bounded prospective renewal. It approaches the generation capacity over
 * the biome's declared regrow interval and never restores a specific old plant. */
export function advanceWildFlora(world:World):void {
  const state=world.flora;if(!state||world.tick<state.nextCheck)return;
  while(state.nextCheck<=world.tick)state.nextCheck+=CHECK_INTERVAL;
  const present=world.resources.reduce((count,resource)=>count+(resource.species!==undefined?1:0),0),missing=Math.max(0,state.capacity-present);
  if(!missing||!Number.isSafeInteger(world.nextId+1))return;
  const checksPerDay=6000/CHECK_INTERVAL,expected=missing/(BIOME_FLORA[state.biome].regrowDays*checksPerDay);
  let attempts=Math.floor(expected);if(next(state)<expected-attempts)attempts++;
  for(let attempt=0;attempt<attempts;attempt++) {
    if(!Number.isSafeInteger(world.nextId+1))break;
    const index=Math.floor(next(state)*world.tiles.length);if(!freeCell(world,index))continue;
    const species=weightedSpecies(state.biome,next(state)),definition=FLORA_DEFINITIONS[species];
    if(soilFertility(world.tiles[index]!.terrain)<definition.minFertility)continue;
    spawn(world,index,species);
  }
}
