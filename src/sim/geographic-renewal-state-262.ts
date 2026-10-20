import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import type {World} from './types.ts';
/** Prospective map birth only. An absent marker never acquires a runtime. */
export interface GeographicRenewal262 {revision:1;adoptedAt:number;lastTick:number}
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
function own(v:object,key:string){const d=Object.getOwnPropertyDescriptor(v,key);return d?{ok:'value'in d&&d.enumerable===true,present:true,value:'value'in d?d.value:undefined}:{ok:!(key in v),present:key in v,value:undefined};}
/** Resting RAW/full/delta contract: no tick-minus-one save allowance. */
export function validGeographicRenewal262(w:{tick:number;site?:{revision:number};wildlife?:unknown},version:number):boolean {
 if(w.wildlife===undefined)return true;if(!plain(w.wildlife))return false;
 const field=own(w.wildlife,'geographicRenewal262');if(!field.ok)return false;if(!field.present)return true;
 const profile=own(w.wildlife,'profile'),v=field.value;if(version!==262&&!isSchema263OrLater(version)||w.site?.revision!==3||!profile.ok||profile.value!=='geographic-fauna-v3'||!plain(v)||Reflect.ownKeys(v).length!==3)return false;
 const r=own(v,'revision'),a=own(v,'adoptedAt'),last=own(v,'lastTick');
 return r.ok&&a.ok&&last.ok&&r.present&&a.present&&last.present&&r.value===1&&Number.isSafeInteger(w.tick)&&w.tick>=0&&Number.isSafeInteger(a.value)&&Number(a.value)>=0&&Number(a.value)<=w.tick&&last.value===w.tick;
}
/** Before hydration/migration, inspect each ORIGINAL local namespace. Mapless
 * roots have no local body; their existing true maps are still checked. */
export function validGeographicRenewalCampaignRaw262(raw:unknown,version:number):boolean {
 if(!plain(raw))return false;const tick=own(raw,'tick');if(!tick.ok||!tick.present||!Number.isSafeInteger(tick.value))return false;
 const local=(value:unknown)=>{if(!plain(value))return false;const s=own(value,'site'),wild=own(value,'wildlife');if(!s.ok||!wild.ok)return false;let site:{revision:number}|undefined;
  if(s.present){if(!plain(s.value))return false;const r=own(s.value,'revision');if(!r.ok||!Number.isSafeInteger(r.value))return false;site={revision:Number(r.value)};}
  return validGeographicRenewal262({tick:Number(tick.value),site,wildlife:wild.value},version);
 };
 if(!local(raw))return false;const maps=own(raw,'worldMaps');if(!maps.ok)return false;
 if(maps.present){if(!plain(maps.value))return false;const sites=own(maps.value,'sites');if(!sites.ok||!Array.isArray(sites.value))return false;
  for(let i=0;i<sites.value.length;i++){const row=own(sites.value,String(i));if(!row.ok||!plain(row.value))return false;const map=own(row.value,'map');if(!map.ok||map.present&&!local(map.value))return false;}
 }
 const secondary=own(raw,'secondarySite');if(!secondary.ok)return false;if(secondary.present){if(!plain(secondary.value))return false;const map=own(secondary.value,'map');if(!map.ok||!map.present||!local(map.value))return false;}return true;
}
/** Called only by the two actual unpublished map constructors, after1200. */
export function initializeGeographicRenewal262(w:World):void {
 if(Number(w.schemaVersion)<262)return;
 const s=w.wildlife;if((Number(w.schemaVersion)!==262&&!isSchema263OrLater(Number(w.schemaVersion)))||w.site?.revision!==3||w.climate?.revision!==4||w.climate.tileId!==w.site.tileId||!s||s.profile!=='geographic-fauna-v3'||Object.hasOwn(s,'geographicRenewal262')||!Number.isSafeInteger(w.tick)||w.tick<0)throw Error('Renewal requires its actual new geographic map after initial fauna');
 s.geographicRenewal262={revision:1,adoptedAt:w.tick,lastTick:w.tick};
}
