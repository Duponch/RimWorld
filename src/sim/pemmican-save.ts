import {PEMMICAN_SCHEMA_VERSION} from './pemmican-content.ts';

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
/** Only domains that own food, permissions, recipes or historical food facts.
 * Terrain, resources, topology and the planet never enter this traversal. */
const DOMAINS=['piles','pawns','structures','jobs','packed','stockpiles','foodPolicies','research','stock','spoiled',
  'group','groupLosses','commercialTrip','civilianPost','visitors','raids','trade','orbital','prisonDepartures',
  'arrivals','startingArrival','podRescues','scout','quests','destroyed','deconstructed','fires','wildlife'] as const;
const TOKENS=new Set(['pemmican','make-pemmican']);
function domainAllowed(value:unknown):boolean {
  if(Array.isArray(value))return value.every(domainAllowed);
  if(!record(value))return true;
  for(const key of Object.keys(value)){
    if(key==='pemmican')return false;
    // Skip before reading: malformed ignored grids can have throwing getters.
    if(['tiles','resources','planet'].includes(key))continue;
    const child=value[key];
    if(['item','food','recipe','project'].includes(key)&&typeof child==='string'&&TOKENS.has(child))return false;
    if(['allowed','allowedItems','inputs'].includes(key)&&Array.isArray(child)&&child.some(v=>typeof v==='string'&&TOKENS.has(v)))return false;
    // Archives can contain captured map records; their large immutable grids
    // are unrelated to this catalogue and have their own historical guards.
    if(!domainAllowed(child))return false;
  }
  return true;
}
export function validPemmicanCatalogueDomains(value:unknown,version:number):boolean {
  try{
    if(version>=PEMMICAN_SCHEMA_VERSION||!record(value))return true;
    return DOMAINS.every(key=>domainAllowed(value[key]));
  }catch{return false;}
}
/** Original files and incoming checkpoint/delta envelopes are inspected before
 * migration or adoption. Secondary maps retain the original campaign version. */
export function validPemmicanHistoricalTransport(value:unknown,version:number):boolean {
  try{
    if(version>=PEMMICAN_SCHEMA_VERSION||!record(value))return true;
    const world=record(value.world)?value.world:value;
    if(!validPemmicanCatalogueDomains(world,version))return false;
    if(record(world.secondarySite)&&!validPemmicanCatalogueDomains(world.secondarySite.map,version))return false;
    return world===value||domainAllowed(value.piles);
  }catch{return false;}
}
