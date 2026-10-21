import {isSchema272OrLater} from './schema-compatibility-257.ts';
import {SPEAR_ITEMS_272} from './spear-content-272.ts';
import {SPEAR_TOOL_IDS_272} from './spear-combat-272.ts';

/** Prospective family fence visits actual owners/catalogues, never terrain. */
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const TOKENS=new Set<string>([...SPEAR_ITEMS_272,...SPEAR_TOOL_IDS_272,'make-spear','unfinished-spear']);
const DOMAINS=['piles','pawns','structures','jobs','packed','stockpiles','research','spoiled','destroyed','deconstructed',
 'apparelPolicies','group','groupLosses','worldGroups','worldPawns','commercialTrip','civilianPost','visitors','raids',
 'trade','orbital','prisonDepartures','arrivals','startingArrival','podRescues','scout','quests','wildlife','fires','bombWaves','campaignMap'] as const;
function historical(v:unknown):boolean {
 if(Array.isArray(v))return v.every(historical);
 if(!record(v))return true;
 for(const key of Object.keys(v)){
  if(TOKENS.has(key))return false;
  if(key==='tiles'||key==='planet'||key==='resources')continue;
  const child=v[key];
  if(['kind','item','food','recipe','tool','project'].includes(key)&&typeof child==='string'&&TOKENS.has(child))return false;
  if(['allowed','allowedItems','inputs'].includes(key)&&Array.isArray(child)&&child.some(x=>typeof x==='string'&&TOKENS.has(x)))return false;
  if(!historical(child))return false;
 }
 return true;
}
export function validSpearCatalogueDomains272(value:unknown,version:number):boolean {
 try{
  if(isSchema272OrLater(version))return true;
  if(!Number.isSafeInteger(version)||version<1||version>274)return false;
  return !record(value)||DOMAINS.every(k=>historical(value[k]));
 }catch{return false;}
}
/** File, full/checkpoint and delta boundaries include retained/off-map owners. */
export function validSpearHistoricalTransport272(value:unknown,version:number):boolean {
 try{
  if(isSchema272OrLater(version))return true;
  if(!Number.isSafeInteger(version)||version<1||version>274)return false;
  if(!record(value))return true;
  const w=record(value.world)?value.world:value;
  if(!validSpearCatalogueDomains272(w,version))return false;
  if(record(w.secondarySite)&&!validSpearCatalogueDomains272(w.secondarySite.map,version))return false;
  if(record(w.worldMaps)&&Array.isArray(w.worldMaps.sites)&&!w.worldMaps.sites.every(site=>!record(site)||validSpearCatalogueDomains272(site.map,version)))return false;
  return w===value||historical(value.piles)&&historical(value.structures)&&historical(value.pawns)&&historical(value.jobs);
 }catch{return false;}
}
