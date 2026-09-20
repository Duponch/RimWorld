import { climateOriginAtAdoption } from './site-climate.ts';
import type { World } from './types.ts';

export function validSiteClimate(value:unknown,version:number,world:Pick<World,'tick'|'gameProfile'>):boolean {
  if(value===undefined)return true;
  if(version<87||typeof value!=='object'||value===null||Array.isArray(value))return false;
  const v=value as Record<string,unknown>;
  return Object.keys(v).length===4&&Object.keys(v).every(k=>['revision','profile','adoptedAt','calendarOrigin'].includes(k))&&
    v.revision===1&&v.profile==='temperate-reference'&&typeof v.adoptedAt==='number'&&Number.isSafeInteger(v.adoptedAt)&&v.adoptedAt>=0&&v.adoptedAt<=world.tick&&
    v.calendarOrigin===climateOriginAtAdoption(world,v.adoptedAt);
}
