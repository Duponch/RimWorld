/** Catalogue V378 is prospective: no identifier or permission can be smuggled
 * into an older envelope, including visitors, trade history and off-map items. */
const FUTURE_ITEMS=new Set(['uranium','recon-armor','unfinished-recon-armor']);
export function validReconCatalogueTransport(value:unknown,version:number):boolean {
  if(version>=241)return true;
  const visit=(v:unknown):boolean=>{
    if(Array.isArray(v))return v.every(visit);
    if(!v||typeof v!=='object')return true;
    for(const [key,child] of Object.entries(v)){
      if(['item','kind','ore'].includes(key)&&typeof child==='string'&&FUTURE_ITEMS.has(child))return false;
      if(key==='recipe'&&child==='make-recon-armor')return false;
      if(key==='allowedItems'&&Array.isArray(child)&&child.some(i=>FUTURE_ITEMS.has(String(i))))return false;
      if(['items','filters','bought','sold'].includes(key)&&child&&typeof child==='object'&&Object.keys(child).some(i=>FUTURE_ITEMS.has(i)))return false;
      if(!visit(child))return false;
    }
    return true;
  };
  return visit(value);
}
