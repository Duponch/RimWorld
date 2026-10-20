/** Only knife manufacture is prospective268. The finished plasteel-knife
 * predates this schema and must remain legal in every historical owner. */
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const TOKENS=new Set(['make-plasteel-knife','unfinished-knife']);
const DOMAINS=['piles','pawns','structures','jobs','packed','stockpiles','research','spoiled','destroyed','deconstructed',
 'apparelPolicies','group','groupLosses','worldGroups','worldPawns','commercialTrip','civilianPost','visitors','raids',
 'trade','orbital','prisonDepartures','arrivals','startingArrival','podRescues','scout','quests','wildlife','campaignMap'] as const;

function historical(v:unknown):boolean {
 if(Array.isArray(v))return v.every(historical);
 if(!record(v))return true;
 for(const key of Object.keys(v)){
  if(TOKENS.has(key))return false;
  if(key==='tiles'||key==='planet'||key==='resources')continue;
  const child=v[key];
  if(['kind','item','food','recipe'].includes(key)&&typeof child==='string'&&TOKENS.has(child))return false;
  if(['allowed','allowedItems','inputs'].includes(key)&&Array.isArray(child)&&child.some(x=>typeof x==='string'&&TOKENS.has(x)))return false;
  if(!historical(child))return false;
 }
 return true;
}

/** Sparse catalogue check before old validation/migration. Current268 has no
 * new scan. Geographic arrays and flavour text never become recipe authority. */
export function validKnifeCatalogueDomains268(value:unknown,version:number):boolean {
 try{
  if(version===268)return true;
  if(!Number.isSafeInteger(version)||version<1||version>268)return false;
  return !record(value)||DOMAINS.every(k=>historical(value[k]));
 }catch{return false;}
}

/** RAW campaigns and public checkpoint/delta packets share the same future
 * token boundary, including inactive maps, queues and terminal possessions. */
export function validKnifeHistoricalTransport268(value:unknown,version:number):boolean {
 try{
  if(version===268)return true;
  if(!Number.isSafeInteger(version)||version<1||version>268)return false;
  if(!record(value))return true;
  const w=record(value.world)?value.world:value;
  if(!validKnifeCatalogueDomains268(w,version))return false;
  if(record(w.secondarySite)&&!validKnifeCatalogueDomains268(w.secondarySite.map,version))return false;
  if(record(w.worldMaps)&&Array.isArray(w.worldMaps.sites)&&!w.worldMaps.sites.every(site=>!record(site)||validKnifeCatalogueDomains268(site.map,version)))return false;
  return w===value||historical(value.piles)&&historical(value.structures)&&historical(value.pawns)&&historical(value.jobs);
 }catch{return false;}
}
