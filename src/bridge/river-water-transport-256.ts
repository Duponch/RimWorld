/** Narrow delta omission adapter. No cache, index or public certificate. */
import {validRiverWaterEnvelope256,type StoredRiverWater256} from '../sim/river-water-owner-256.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
function read(v:object,k:string){const d=Object.getOwnPropertyDescriptor(v,k);return d?{ok:'value'in d&&d.enumerable===true,present:true,value:'value'in d?d.value:undefined}:{ok:!(k in v),present:k in v,value:undefined};}
const invalid=Symbol('invalid river map header');
function siteHeader(raw:Record<string,unknown>):string|typeof invalid {
 const site=read(raw,'site');if(!site.ok)return invalid;if(!site.present)return '';
 if(!object(site.value))return invalid;const s=site.value,keys=Reflect.ownKeys(s);
 const fields=['revision','tileId','mapSeed','biome','hilliness','river','stones','coastAngle','mutatorCode'];
 if(keys.some(k=>typeof k!=='string'||!fields.includes(k)))return invalid;
 const values:unknown[]=[];for(const key of fields){const d=read(s,key);if(!d.ok)return invalid;if(key==='stones'&&d.present){if(!Array.isArray(d.value)||d.value.length>3||Reflect.ownKeys(d.value).length!==d.value.length+1)return invalid;const stones:string[]=[];for(let i=0;i<d.value.length;i++){const p=read(d.value,String(i));if(!p.ok||!p.present||typeof p.value!=='string')return invalid;stones.push(p.value);}values.push(stones);}else {if(d.present&&!(key==='coastAngle'&&d.value===null)&&typeof d.value!=='string'&&(typeof d.value!=='number'||!Number.isFinite(d.value)))return invalid;values.push([d.present,d.value]);}}
 return JSON.stringify(values);
}
function activeMap(raw:Record<string,unknown>):string|typeof invalid {
 const d=read(raw,'campaignMap');if(!d.ok)return invalid;if(!d.present)return '';
 if(!object(d.value))return invalid;const r=read(d.value,'revision'),id=read(d.value,'activeMapId'),legacy=read(d.value,'active');if(!r.ok||!id.ok||!legacy.ok)return invalid;
 if(r.value===2)return typeof id.value==='number'&&Number.isSafeInteger(id.value)?`map:${id.value}`:invalid;
 return !r.present&&(legacy.value==='home'||legacy.value==='secondary')?`legacy:${legacy.value}`:invalid;
}
function sameHeader(a:Record<string,unknown>,b:Record<string,unknown>):boolean {
 for(const k of ['schemaVersion','width','height','seed']){const x=read(a,k),y=read(b,k);if(!x.ok||!y.ok||!x.present||!y.present||!Object.is(x.value,y.value))return false;}
 const as=siteHeader(a),bs=siteHeader(b),am=activeMap(a),bm=activeMap(b);return as!==invalid&&am!==invalid&&as===bs&&am===bm;
}
export interface RiverWaterDeltaContext256 {kind:'checkpoint'|'delta';epoch:number;revision:number;baseRevision?:number;previousEpoch:number;previousRevision:number}
export type PreparedRiverWater256={ok:false}|{ok:true;inherited:boolean;owner?:StoredRiverWater256};
/** previous is ONLY SnapshotDecoder.current after successful admission. A full
 * packet, RAW input, own undefined and explicit equivalent copy never inherit. */
export function prepareRiverWaterSnapshot256(raw:unknown,version:number,previous:unknown,meta:RiverWaterDeltaContext256):PreparedRiverWater256 {
 if(!object(raw))return {ok:false};const water=read(raw,'riverWater');if(!water.ok)return {ok:false};
 if(meta.kind==='delta'&&!water.present&&object(previous)){
  const old=read(previous,'riverWater');if(!old.ok)return {ok:false};
  if(old.present){
   const planet=read(raw,'planet'),planetRevision=object(planet.value)?read(planet.value,'revision'):undefined;
   if(version!==256||!planet.ok||!planetRevision?.ok||planetRevision.value!==3||!object(old.value)||!Object.isFrozen(old.value)||!meta.baseRevision||meta.epoch!==meta.previousEpoch||meta.baseRevision!==meta.previousRevision||meta.revision!==meta.baseRevision+1||!sameHeader(raw,previous))return {ok:false};
   // Only the exact deeply frozen confirmed owner may bypass the cold walk.
   // No Object.isFrozen() walk: the decoder froze it at its successful commit.
   return {ok:true,inherited:true,owner:old.value as unknown as StoredRiverWater256};
  }
 }
 if(!validRiverWaterEnvelope256(raw,version))return {ok:false};
 return water.present?{ok:true,inherited:false,owner:water.value as StoredRiverWater256}:{ok:true,inherited:false};
}
