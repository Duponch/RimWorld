/** Tuques are prospective in V384: old saves cannot hide a new item, recipe,
 * permission or ledger in either map, an archive or a transfer container. */
const TUQUE_ITEMS=new Set(['cloth-tuque','muffalo-wool-tuque','unfinished-tuque']);
export function validTuqueCatalogueTransport(value:unknown,version:number):boolean {
  if(version>=245)return true;
  const visit=(v:unknown):boolean=>{
    if(Array.isArray(v))return v.every(visit);
    if(!v||typeof v!=='object')return true;
    for(const [key,child] of Object.entries(v)){
      if(key==='item'&&typeof child==='string'&&TUQUE_ITEMS.has(child))return false;
      if(key==='recipe'&&child==='tuque')return false;
      if(key==='allowedItems'&&Array.isArray(child)&&child.some(i=>TUQUE_ITEMS.has(String(i))))return false;
      if(['items','filters','bought','sold'].includes(key)&&child&&typeof child==='object'&&Object.keys(child).some(i=>TUQUE_ITEMS.has(i)))return false;
      if(!visit(child))return false;
    }
    return true;
  };
  return visit(value);
}

/** Existing validation passes revisit only domains that can own items,
 * reservations, recipes or permissions. No terrain/resource/grid traversal;
 * validateCampaignSchema forwards the same check to the secondary local map. */
const TUQUE_DOMAINS=['piles','pawns','structures','jobs','packed','stockpiles','apparelPolicies',
  'group','groupLosses','commercialTrip','civilianPost','visitors','raids','trade','orbital',
  'prisonDepartures','arrivals','startingArrival','podRescues','scout','quests','destroyed','deconstructed'] as const;
export function validTuqueCatalogueDomains(value:unknown,version:number):boolean {
  if(version>=245||!value||typeof value!=='object'||Array.isArray(value))return true;
  const world=value as Record<string,unknown>;
  return TUQUE_DOMAINS.every(key=>validTuqueCatalogueTransport(world[key],version));
}
