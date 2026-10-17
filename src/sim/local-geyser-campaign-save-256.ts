/** Inspect the ORIGINAL local namespaces before any shared-header projection.
 * Only actual scalar campaign clocks are passed to inactive map bodies. */
import {validLocalGeyserHeader256} from './local-geyser-save-256.ts';
const object=(v:unknown):v is object=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const own=(v:object,k:string)=>{const d=Object.getOwnPropertyDescriptor(v,k);return d?{ok:Object.hasOwn(d,'value')&&d.enumerable===true,present:true,value:Object.hasOwn(d,'value')?d.value:undefined}:{ok:!(k in v),present:k in v,value:undefined};};
export function validLocalGeyserEnvelope256(raw:unknown,version:number,tick:number,nextId:number):boolean {
 if(!object(raw))return false;const site=own(raw,'site'),width=own(raw,'width'),height=own(raw,'height');if(!site.ok||!width.ok||!height.ok)return false;
 let site3=false;if(site.present){if(!object(site.value))return false;const revision=own(site.value,'revision');if(!revision.ok)return false;site3=revision.value===3;}
 return validLocalGeyserHeader256(raw,version,Number(width.value),Number(height.value),tick,nextId,site3);
}
export function validLocalGeyserCampaignRaw256(raw:unknown,version:number):boolean {
 if(!object(raw))return false;const tick=own(raw,'tick'),nextId=own(raw,'nextId');if(!tick.ok||!nextId.ok)return false;
 const check=(map:unknown)=>validLocalGeyserEnvelope256(map,version,Number(tick.value),Number(nextId.value));if(!check(raw))return false;
 const maps=own(raw,'worldMaps');if(!maps.ok)return false;
 if(maps.present){if(!object(maps.value))return false;const sites=own(maps.value,'sites');if(!sites.ok||!Array.isArray(sites.value))return false;
  for(let i=0;i<sites.value.length;i++){const row=own(sites.value,String(i));if(!row.ok||!row.present||!object(row.value))return false;const map=own(row.value,'map');if(!map.ok||map.present&&!check(map.value))return false;}}
 const secondary=own(raw,'secondarySite');if(!secondary.ok)return false;if(secondary.present){if(!object(secondary.value))return false;const map=own(secondary.value,'map');if(!map.ok||!map.present||!check(map.value))return false;}
 return true;
}
