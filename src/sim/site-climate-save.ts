import {validIrregularClimateMarker262} from './geographic-irregular-temperature-262.ts';
import {planetTile} from './planet-geography-256.ts';
import { climateOriginAtAdoption,createGeographicSiteClimate256,validGeographicClimateDefinition256,geographicPlanetClimateDefinition256,planetTileClimateDefinition,sameDerivedClimateNumber,startingSiteClimateOrigin,validClimateDefinition,type ClimateProfile,type ClimateDefinition } from './site-climate.ts';
import type { World } from './types.ts';
import type { PlanetTile } from './planet-state.ts';
import { PREPARED_CRASHLANDED_REVISION,ARRIVING_CRASHLANDED_REVISION } from './scenario-definitions.ts';

const record=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const finite=(value:unknown,min:number,max:number):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;

export function validSiteClimate(value:unknown,version:number,world:Pick<World,'tick'|'gameProfile'|'site'>&Partial<Pick<World,'planet'|'scenario'|'expeditionSite'|'worldMaps'|'campaignMap'>>,capturedCalendarOrigin?:number):boolean {
  if(record(value)&&!validIrregularClimateMarker262(value,version))return false;
  if(version<239&&(world.site?.biome==='tundra'||record(value)&&value.profile==='tundra-preset'))return false;
  if(record(value)&&value.revision===4)return validGeographicSiteClimate256(value,version,world,capturedCalendarOrigin);
  const prepared=world.scenario?.revision===PREPARED_CRASHLANDED_REVISION||world.scenario?.revision===ARRIVING_CRASHLANDED_REVISION;
  if(prepared&&(!record(value)||value.revision!==2))return false;
  if(value===undefined)return true;
  if(version<87||typeof value!=='object'||value===null||Array.isArray(value))return false;
  const v=value as Record<string,unknown>;
  if(v.revision===3){
    const origin=world.expeditionSite,planet=world.planet,definition=v.definition;
    if(version<240||!origin||!planet||!validClimateDefinition(definition)||v.adoptedAt!==origin.createdAt
      ||Reflect.ownKeys(v).length!==4||!['revision','adoptedAt','calendarOrigin','definition'].every(k=>Object.hasOwn(v,k))
      ||!Number.isSafeInteger(v.calendarOrigin)||!Number.isSafeInteger(v.adoptedAt)||Number(v.adoptedAt)<0||Number(v.adoptedAt)>world.tick)return false;
    const tile=planetTile(planet,origin.tile);if(!tile||tile.biome!==world.site?.biome||tile.hilliness!==world.site.hilliness)return false;
    const expected=geographicPlanetClimateDefinition256(planet,origin.tile);
    return definition.meanTemperature===expected.meanTemperature&&definition.rainfall===expected.rainfall
      &&(['latitude','longitude','amplitude'] as const).every(k=>sameDerivedClimateNumber(definition[k],expected[k]));
  }
  if(v.revision===2) {
    const keys=Reflect.ownKeys(v),planet:unknown=world.planet;
    if(version<230||keys.length!==4||!keys.every(k=>typeof k==='string'&&['revision','adoptedAt','calendarOrigin','definition'].includes(k)&&
      Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'))||v.adoptedAt!==0||!Number.isSafeInteger(world.tick)||world.tick<0||
      !validClimateDefinition(v.definition)||!record(planet)||!(planet.revision===1||version>=239&&planet.revision===2)||planet.adoptedAt!==0||
      !Array.isArray(planet.tiles)||planet.tiles.length!==162||!finite(planet.homeTile,0,161)||!Number.isInteger(planet.homeTile)||
      world.site?.revision!==2||world.scenario?.id!=='crashlanded'||!prepared||world.scenario.revision===ARRIVING_CRASHLANDED_REVISION&&version<231)return false;
    const tile:unknown=planet.tiles[planet.homeTile];
    if(!record(tile)||tile.biome==='tundra'&&planet.revision!==2||tile.id!==planet.homeTile||tile.biome==='ocean'||tile.biome!==world.site.biome||tile.hilliness!==world.site.hilliness||
      !Array.isArray(tile.center)||tile.center.length!==3||!tile.center.every(n=>finite(n,-1,1))||
      !Number.isFinite(Math.hypot(...tile.center))||Math.abs(Math.hypot(...tile.center)-1)>1e-9||
      !finite(tile.meanTemperature,-100,100)||!finite(tile.rainfall,0,10000))return false;
    const expectedDefinition=planetTileClimateDefinition(tile as unknown as PlanetTile),definition=v.definition;
    return definition.meanTemperature===expectedDefinition.meanTemperature&&definition.rainfall===expectedDefinition.rainfall&&
      (['latitude','longitude','amplitude'] as const).every(k=>sameDerivedClimateNumber(definition[k],expectedDefinition[k]))&&
      v.calendarOrigin===startingSiteClimateOrigin(v.adoptedAt,definition);
  }
  const expected:ClimateProfile=version>=91&&world.site?.revision===2?
    world.site.biome==='tundra'?'tundra-preset':world.site.biome==='boreal-forest'?'boreal-reference':world.site.biome==='arid-shrubland'?'arid-reference':'temperate-reference':'temperate-reference';
  return !(version<239&&(v.profile==='tundra-preset'||world.site?.biome==='tundra'))&&Object.keys(v).length===4&&Object.keys(v).every(k=>['revision','profile','adoptedAt','calendarOrigin'].includes(k))&&
    v.revision===1&&v.profile===expected&&typeof v.adoptedAt==='number'&&Number.isSafeInteger(v.adoptedAt)&&v.adoptedAt>=0&&v.adoptedAt<=world.tick&&
    v.calendarOrigin===climateOriginAtAdoption(world,v.adoptedAt,expected);
}

/** Full RAW/map admission compares the actual immutable owner, never a
 * caller-selected biome/profile or a guessed geographic tile. */
export function validGeographicSiteClimate256(v:unknown,version:number,world:Pick<World,'tick'|'site'>&Partial<Pick<World,'planet'|'worldMaps'|'expeditionSite'|'campaignMap'>>,capturedCalendarOrigin?:number):boolean {
 if(version<256||!record(v)||!validIrregularClimateMarker262(v,version)||Reflect.ownKeys(v).length!==(Object.hasOwn(v,'irregular262')?6:5)||!['revision','adoptedAt','calendarOrigin','tileId','definition'].every(k=>Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)??{},'value'))||v.revision!==4||!Number.isSafeInteger(v.adoptedAt)||Number(v.adoptedAt)<0||Number(v.adoptedAt)>world.tick||!Number.isSafeInteger(v.calendarOrigin)||!Number.isSafeInteger(v.tileId)||Number(v.tileId)<0||!validGeographicClimateDefinition256(v.definition)||world.planet?.revision!==3)return false;
 const planet=world.planet,id=Number(v.tileId),tile=planetTile(planet,id);if(!tile||tile.biome==='ocean'||tile.biome==='lake'||tile.hilliness==='impassable'||tile.biome!==world.site?.biome||tile.hilliness!==world.site.hilliness||world.expeditionSite&&(world.expeditionSite.tile!==id||v.adoptedAt!==world.expeditionSite.createdAt))return false;
 const expected=geographicPlanetClimateDefinition256(planet,id),definition=v.definition;if(!Object.keys(expected).every(k=>definition[k as keyof ClimateDefinition]===expected[k as keyof ClimateDefinition]))return false;
 const registeredAnchor=world.worldMaps?.calendarOrigin??(world.campaignMap?.revision===2?world.campaignMap.calendarOrigin:undefined);
 if(capturedCalendarOrigin!==undefined&&(!Number.isSafeInteger(capturedCalendarOrigin)||registeredAnchor!==undefined&&capturedCalendarOrigin!==registeredAnchor))return false;
 // A fresh unpublished map has no registry yet. Its real generation caller
 // supplies the captured campaign clock, never the climate's own phase.
 // RAW/adoption callers omit this argument and still require their registry.
 const anchor=registeredAnchor??capturedCalendarOrigin;
 if(anchor!==undefined){return v.calendarOrigin===createGeographicSiteClimate256(planet,id,{tick:Number(v.adoptedAt),calendarOrigin:anchor}).calendarOrigin;}
 // Detached metadata must have a real campaign clock; definition equality
 // alone cannot admit a shifted phase.
 return false;
}
