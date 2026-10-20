import {SMITHING_PRODUCTS_267,SMITHING_MATERIALS_267} from './smithing-content-267.ts';

/** Prospective catalogue boundary. Visit owning records only; never walk the
 * geographic grids. Run before changing an old version number. */
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const TOKENS=new Set<string>([...SMITHING_PRODUCTS_267,'unfinished-plate-armor','unfinished-simple-helmet','make-plate-armor','make-simple-helmet','smelt-apparel','fueled-smithy','electric-smithy']);
const DOMAINS=['piles','pawns','structures','jobs','packed','stockpiles','research','spoiled','destroyed','deconstructed','apparelPolicies','group','groupLosses','worldGroups','worldPawns','commercialTrip','civilianPost','visitors','raids','trade','orbital','prisonDepartures','arrivals','startingArrival','podRescues','scout','quests','wildlife','campaignMap'] as const;
function historical(v:unknown):boolean {
 if(Array.isArray(v))return v.every(historical);
 if(!record(v))return true;
 for(const key of Object.keys(v)){
  if(key==='smithingWork'||TOKENS.has(key))return false;
  if(key==='tiles'||key==='planet'||key==='resources')continue;
  const child=v[key];
  if(['kind','item','food','recipe'].includes(key)&&typeof child==='string'&&TOKENS.has(child))return false;
  if(['allowed','allowedItems','inputs'].includes(key)&&Array.isArray(child)&&child.some(x=>typeof x==='string'&&TOKENS.has(x)))return false;
  if(key==='allowedMaterials'&&Array.isArray(child)&&child.some(x=>(SMITHING_MATERIALS_267 as readonly unknown[]).includes(x)))return false;
  if(!historical(child))return false;
 }
 return true;
}
export function validSmithingCatalogueDomains267(value:unknown,version:number):boolean {
 try{return version>=267||!record(value)||DOMAINS.every(k=>historical(value[k]));}catch{return false;}
}
export function validSmithingHistoricalTransport267(value:unknown,version:number):boolean {
 try{
  if(version>=267||!record(value))return true;
  const w=record(value.world)?value.world:value;
  if(!validSmithingCatalogueDomains267(w,version))return false;
  if(record(w.secondarySite)&&!validSmithingCatalogueDomains267(w.secondarySite.map,version))return false;
  if(record(w.worldMaps)&&Array.isArray(w.worldMaps.sites)&&!w.worldMaps.sites.every(m=>!record(m)||validSmithingCatalogueDomains267(m.map,version)))return false;
  return w===value||historical(value.piles)&&historical(value.structures)&&historical(value.pawns)&&historical(value.jobs);
 }catch{return false;}
}
