/** A prospective field fence for the lightweight resident reader. Authority
 * still validates receipts and owners before publication. Inspect only actual
 * post slots, never map terrain, entities or arbitrary nested objects. */
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const historicalPost=(v:unknown)=>!record(v)||!Object.hasOwn(v,'gifts274');
export function validGiftHistoricalTransport274(value:unknown,version:number):boolean {
 try{
  if(version===274)return true;
  if(!Number.isSafeInteger(version)||version<1||version>273)return false;
  if(!record(value))return true;
  const w=record(value.world)?value.world:value;
  if(!historicalPost(w.civilianPost))return false;
  if(record(w.worldGroups)&&Array.isArray(w.worldGroups.posts)&&!w.worldGroups.posts.every(p=>!record(p)||historicalPost(p.state)))return false;
  const projection=record(w.campaignMap)?w.campaignMap:w;
  return !Array.isArray(projection.groups)||projection.groups.every(g=>!record(g)||historicalPost(g.post));
 }catch{return false;}
}
