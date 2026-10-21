import {MACE_ITEMS_269} from './mace-content-269.ts';
import {MACE_TOOL_IDS_269} from './mace-combat-269.ts';

/** Sparse prospective boundary: only real owning records and catalogues are
 * visited, never the terrain or geographic resource arrays. */
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const TOKENS=new Set<string>([...MACE_ITEMS_269,...MACE_TOOL_IDS_269,'make-mace','unfinished-mace']);
const DOMAINS=['piles','pawns','structures','jobs','packed','stockpiles','research','spoiled','destroyed','deconstructed',
 'apparelPolicies','group','groupLosses','worldGroups','worldPawns','commercialTrip','civilianPost','visitors','raids',
 'trade','orbital','prisonDepartures','arrivals','startingArrival','podRescues','scout','quests','wildlife','campaignMap'] as const;
function historical(v:unknown):boolean {
 if(Array.isArray(v))return v.every(historical);
 if(!record(v))return true;
 for(const key of Object.keys(v)){
  if(key==='forCrafting'||TOKENS.has(key))return false;
  if(key==='tiles'||key==='planet'||key==='resources')continue;
  const child=v[key];
  if(['kind','item','food','recipe','tool'].includes(key)&&typeof child==='string'&&TOKENS.has(child))return false;
  if(['allowed','allowedItems','inputs'].includes(key)&&Array.isArray(child)&&child.some(x=>typeof x==='string'&&TOKENS.has(x)))return false;
  if(!historical(child))return false;
 }
 return true;
}
export function validMaceCatalogueDomains269(value:unknown,version:number):boolean {
 try{
  if(version===269||version===270)return true;
  if(!Number.isSafeInteger(version)||version<1||version>270)return false;
  return !record(value)||DOMAINS.every(k=>historical(value[k]));
 }catch{return false;}
}
/** Files and public checkpoint/delta envelopes share the future boundary,
 * including inactive maps, retained people, recovery tools and item ledgers. */
export function validMaceHistoricalTransport269(value:unknown,version:number):boolean {
 try{
  if(version===269||version===270)return true;
  if(!Number.isSafeInteger(version)||version<1||version>270)return false;
  if(!record(value))return true;
  const w=record(value.world)?value.world:value;
  if(!validMaceCatalogueDomains269(w,version))return false;
  if(record(w.secondarySite)&&!validMaceCatalogueDomains269(w.secondarySite.map,version))return false;
  if(record(w.worldMaps)&&Array.isArray(w.worldMaps.sites)&&!w.worldMaps.sites.every(site=>!record(site)||validMaceCatalogueDomains269(site.map,version)))return false;
  return w===value||historical(value.piles)&&historical(value.structures)&&historical(value.pawns)&&historical(value.jobs);
 }catch{return false;}
}
