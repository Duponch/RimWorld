/** Prospective brewing catalogue guard. This reads only owning domains, never
 * terrain/planet grids, and runs before a historical version is migrated. */
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const TOKENS=new Set(['hops','wort','beer','brew-wort','brewery','fermenting-barrel','brewing']);
const FIELDS=new Set(['fermentation','brewing','lostWort','lostBeer']);
const DOMAINS=['piles','pawns','resources','structures','jobs','packed','stockpiles','growingZones',
 'research','spoiled','destroyed','deconstructed','foodPolicies','group','groupLosses','worldGroups','worldPawns',
 'commercialTrip','civilianPost','visitors','raids','trade','orbital','prisonDepartures','arrivals',
 'startingArrival','podRescues','scout','quests','wildlife','campaignMap'] as const;
function oldDomain(v:unknown,resourceRoot=false):boolean {
 if(Array.isArray(v))return v.every(p=>oldDomain(p,resourceRoot));
 if(!record(v))return true;
 for(const key of Object.keys(v)){
  if(FIELDS.has(key)||key==='hops'||key==='wort'||key==='beer')return false;
  if(key==='tiles'||key==='planet'||key==='resources'&&!resourceRoot)continue;
  const child=v[key];
  if(['kind','item','food','recipe','project','plant'].includes(key)&&typeof child==='string'&&TOKENS.has(child))return false;
  if(['allowed','allowedItems','inputs'].includes(key)&&Array.isArray(child)&&child.some(x=>typeof x==='string'&&TOKENS.has(x)))return false;
  if(!oldDomain(child))return false;
 }
 return true;
}
export function validBrewingCatalogueDomains265(value:unknown,version:number):boolean {
 try{return version>=265||!record(value)||DOMAINS.every(k=>oldDomain(value[k],k==='resources'));}catch{return false;}
}
export function validBrewingHistoricalTransport265(value:unknown,version:number):boolean {
 try{
  if(version>=265||!record(value))return true;
  const w=record(value.world)?value.world:value;
  if(!validBrewingCatalogueDomains265(w,version))return false;
  if(record(w.secondarySite)&&!validBrewingCatalogueDomains265(w.secondarySite.map,version))return false;
  if(record(w.worldMaps)&&Array.isArray(w.worldMaps.maps)&&!w.worldMaps.maps.every(m=>!record(m)||validBrewingCatalogueDomains265(m.map,version)))return false;
  return w===value||oldDomain(value.piles)&&oldDomain(value.resources,true)&&oldDomain(value.structures)&&oldDomain(value.pawns)&&oldDomain(value.jobs);
 }catch{return false;}
}
