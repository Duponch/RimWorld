/** Original serialized map namespaces, before validation projections can copy
 * descriptors. This is a RAW boundary only, never an ordinary delta walk. */
import {validateExploration256,validExplorationHeader256} from './exploration-save-256.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
function value(v:object,k:string):{ok:boolean;present:boolean;value:unknown}{
 const d=Object.getOwnPropertyDescriptor(v,k);
 return d?{ok:Object.hasOwn(d,'value')&&d.enumerable===true,present:true,value:Object.hasOwn(d,'value')?d.value:undefined}:{ok:!(k in v),present:k in v,value:undefined};
}
export function validExplorationCampaignRaw256(raw:unknown,version:number):boolean {
 if(!object(raw))return false;
 const check=(map:unknown):boolean=>{
  if(!object(map)||Object.hasOwn(map,'explorationApproachers'))return false;
  const tiles=value(map,'tiles');if(!tiles.ok)return false;
  return tiles.present?validateExploration256(map,version).length===0:validExplorationHeader256(map,version)&&!Object.hasOwn(map,'exploration');
 };
 if(!check(raw))return false;
 const maps=value(raw,'worldMaps');if(!maps.ok)return false;
 if(maps.present){
  if(!object(maps.value))return false;const sites=value(maps.value,'sites');if(!sites.ok||!Array.isArray(sites.value))return false;
  for(let i=0;i<sites.value.length;i++){
   const slot=value(sites.value,String(i));if(!slot.ok||!slot.present||!object(slot.value))return false;
   const map=value(slot.value,'map');if(!map.ok||map.present&&!check(map.value))return false;
  }
 }
 const secondary=value(raw,'secondarySite');if(!secondary.ok)return false;
 if(secondary.present){
  if(!object(secondary.value))return false;const map=value(secondary.value,'map');
  if(!map.ok||!map.present||!check(map.value))return false;
 }
 return true;
}
