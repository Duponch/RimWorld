import {isSchema256Or257} from './schema-compatibility-257.ts';
import type {AncientShrineWarnings256} from './ancient-shrine-warning-state-256.ts';
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
function own(v:object,k:string){const d=Object.getOwnPropertyDescriptor(v,k);return d?{ok:'value'in d&&d.enumerable===true,present:true,value:'value'in d?d.value:undefined}:{ok:!(k in v),present:k in v,value:undefined};}
const fields=(v:unknown,required:readonly string[],optional:readonly string[]=[]):v is Record<string,unknown>=>plain(v)&&Reflect.ownKeys(v).length>=required.length&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&[...required,...optional].includes(k)&&own(v,k).ok)&&required.every(k=>own(v,k).present);
const int=(v:unknown,a:number,b:number):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=a&&v<=b;
export function validAncientShrineWarnings256(v:unknown,width:number,height:number,tick:number,nextId:number):v is AncientShrineWarnings256 {
 if(!int(width,1,400)||!int(height,1,400)||!int(tick,0,Math.floor(Number.MAX_SAFE_INTEGER/10))||!int(nextId,1,Number.MAX_SAFE_INTEGER)||!fields(v,['revision','pairs'])||v.revision!==1||!Array.isArray(v.pairs)||Reflect.ownKeys(v.pairs).length!==v.pairs.length+1||v.pairs.length>width*height)return false;
 const all=new Set<number>();for(let i=0;i<v.pairs.length;i++){const slot=own(v.pairs,String(i)),p=slot.value;if(!slot.ok||!slot.present||!fields(p,['triggerId','actionId','rect','center','triggerAlive','actionAlive'],['letter'])||!int(p.triggerId,1,nextId-1)||!int(p.actionId,1,nextId-1)||p.triggerId===p.actionId||all.has(p.triggerId)||all.has(p.actionId)||typeof p.triggerAlive!=='boolean'||typeof p.actionAlive!=='boolean')return false;
  all.add(p.triggerId);all.add(p.actionId);if(!fields(p.rect,['minX','minZ','maxX','maxZ'])||!int(p.rect.minX,0,width-1)||!int(p.rect.maxX,p.rect.minX,width-1)||!int(p.rect.minZ,0,height-1)||!int(p.rect.maxZ,p.rect.minZ,height-1)||!fields(p.center,['x','z'])||!int(p.center.x,p.rect.minX,p.rect.maxX)||!int(p.center.z,p.rect.minZ,p.rect.maxZ))return false;
  const letter=own(p,'letter');if(letter.present){if(!fields(letter.value,['tick','pawnId'])||!int(letter.value.tick,1,tick)||!int(letter.value.pawnId,1,nextId-1)||p.triggerAlive||p.actionAlive)return false;}
  else if(!p.actionAlive||!letter.ok)return false;
 }return true;
}
export function validAncientShrineWarningEnvelope256(raw:unknown,version:number,tick:number,nextId:number):boolean {
 if(!plain(raw))return false;const d=own(raw,'ancientShrineWarnings');if(!d.ok)return false;if(!d.present)return true;
 const site=own(raw,'site'),width=own(raw,'width'),height=own(raw,'height');return isSchema256Or257(version)&&site.ok&&plain(site.value)&&own(site.value,'revision').ok&&own(site.value,'revision').value===3&&width.ok&&height.ok&&validAncientShrineWarnings256(d.value,Number(width.value),Number(height.value),tick,nextId);
}
/** Before RAW projections, inspect all original local descriptor namespaces. */
export function validAncientShrineWarningCampaignRaw256(raw:unknown,version:number):boolean {
 if(!plain(raw))return false;const tick=own(raw,'tick'),nextId=own(raw,'nextId');if(!tick.ok||!nextId.ok)return false;
 const check=(map:unknown)=>validAncientShrineWarningEnvelope256(map,version,Number(tick.value),Number(nextId.value));if(!check(raw))return false;
 const maps=own(raw,'worldMaps');if(!maps.ok)return false;if(maps.present){if(!plain(maps.value))return false;const sites=own(maps.value,'sites');if(!sites.ok||!Array.isArray(sites.value))return false;for(let i=0;i<sites.value.length;i++){const row=own(sites.value,String(i));if(!row.ok||!row.present||!plain(row.value))return false;const map=own(row.value,'map');if(!map.ok||map.present&&!check(map.value))return false;}}
 const secondary=own(raw,'secondarySite');if(!secondary.ok)return false;if(secondary.present){if(!plain(secondary.value))return false;const map=own(secondary.value,'map');if(!map.ok||!map.present||!check(map.value))return false;}return true;
}
/** Active trigger/action Things only. Notification provenance is a reference. */
export function registerAncientShrineWarningIds256(s:AncientShrineWarnings256,ids:{has(id:number):boolean;add(id:number):unknown}):boolean {
 const staged:number[]=[];for(const p of s.pairs)for(const id of [...(p.triggerAlive?[p.triggerId]:[]),...(p.actionAlive?[p.actionId]:[])]){if(ids.has(id)||staged.includes(id))return false;staged.push(id);}for(const id of staged)ids.add(id);return true;
}
