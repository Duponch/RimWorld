import { climateOriginAtAdoption,type ClimateProfile } from './site-climate.ts';
import type { World } from './types.ts';

export function validSiteClimate(value:unknown,version:number,world:Pick<World,'tick'|'gameProfile'|'site'>):boolean {
  if(value===undefined)return true;
  if(version<87||typeof value!=='object'||value===null||Array.isArray(value))return false;
  const v=value as Record<string,unknown>;
  const expected:ClimateProfile=version>=91&&world.site?.revision===2?
    world.site.biome==='boreal-forest'?'boreal-reference':world.site.biome==='arid-shrubland'?'arid-reference':'temperate-reference':'temperate-reference';
  return Object.keys(v).length===4&&Object.keys(v).every(k=>['revision','profile','adoptedAt','calendarOrigin'].includes(k))&&
    v.revision===1&&v.profile===expected&&typeof v.adoptedAt==='number'&&Number.isSafeInteger(v.adoptedAt)&&v.adoptedAt>=0&&v.adoptedAt<=world.tick&&
    v.calendarOrigin===climateOriginAtAdoption(world,v.adoptedAt,expected);
}
