import {isSchema256Or257} from './schema-compatibility-257.ts';
/** Map-local, creation-time WaterInfo values. The existing save envelope owns
 * compression; this reuses geographic IEEE754 bit columns and preserves -0.
 * No seed, reconstruction noise, river mask or renderer belongs to this owner. */
export interface StoredRiverWater256 {
 readonly revision:1;
 readonly floatEncoding:'ieee754-bits';
 /** Interleaved x,z movements, index=(cellX*mapHeight+cellZ)*2. */
 readonly values:readonly number[];
}
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
function field(v:object,k:string){const d=Object.getOwnPropertyDescriptor(v,k);return d?{present:true,ok:'value'in d&&d.enumerable===true,value:'value'in d?d.value:undefined}:{present:k in v,ok:!(k in v),value:undefined};}
function size(width:number,height:number):number|undefined {return Number.isSafeInteger(width)&&Number.isSafeInteger(height)&&width>=8&&height>=8&&width<=400&&height<=400?2*width*height:undefined;}
/** Cold admission only. Check size before walking or allocating the column. */
export function validStoredRiverWater256(value:unknown,width:number,height:number):value is StoredRiverWater256 {
 const count=size(width,height);if(count===undefined||!plain(value)||Reflect.ownKeys(value).length!==3)return false;
 const revision=field(value,'revision'),encoding=field(value,'floatEncoding'),words=field(value,'values');
 if(!revision.ok||revision.value!==1||!encoding.ok||encoding.value!=='ieee754-bits'||!words.ok||!words.present||!Array.isArray(words.value)||Object.getPrototypeOf(words.value)!==Array.prototype||words.value.length!==count||Reflect.ownKeys(words.value).length!==count+1)return false;
 for(let i=0;i<count;i++){const w=field(words.value,String(i)),bits=w.value;if(!w.ok||!w.present||typeof bits!=='number'||!Number.isSafeInteger(bits)||bits<0||bits>0xffffffff||(bits&0x7f800000)===0x7f800000)return false;}
 return true;
}
/** The actual generated Float32Array is read exactly once and never retained
 * by reference: subsequent producer mutation cannot rewrite a saved owner. */
export function packRiverWater256(values:Float32Array,width:number,height:number):StoredRiverWater256 {
 const count=size(width,height);if(count===undefined||Object.getPrototypeOf(values)!==Float32Array.prototype||!(values.buffer instanceof ArrayBuffer)||values.length!==count)throw Error('Invalid actual WaterInfo float32 dimensions');
 for(const v of values)if(!Number.isFinite(v))throw Error('Actual WaterInfo contains a non-finite float32');
 const words=Array.from(new Uint32Array(values.buffer,values.byteOffset,values.length));
 return Object.freeze({revision:1 as const,floatEncoding:'ieee754-bits' as const,values:Object.freeze(words)});
}
/** No hot accessor silently unpacks. The caller owns the returned independent
 * buffer for this exact immutable map owner, normally once at a cold boundary. */
export function unpackRiverWater256(value:unknown,width:number,height:number):Float32Array {
 if(!validStoredRiverWater256(value,width,height))throw Error('Invalid stored WaterInfo column');
 return new Float32Array(Uint32Array.from(value.values).buffer);
}
/** Only after cold admission. Freezing is not a certificate and never permits
 * skipping RAW/full validation or accepting an equivalent new object. */
export function freezeAdmittedRiverWater256(value:StoredRiverWater256):void {Object.freeze(value.values);Object.freeze(value);}
export function validRiverWaterEnvelope256(raw:unknown,version:number,campaignPlanet?:unknown):boolean {
 if(!plain(raw))return false;const water=field(raw,'riverWater');if(!water.ok)return false;
 if(!water.present)return true;
 if(!isSchema256Or257(version))return false;
 const site=field(raw,'site'),planet=field(raw,'planet');if(!site.ok||!planet.ok||!plain(site.value)||!plain(planet.present?planet.value:campaignPlanet))return false;
 const siteRevision=field(site.value,'revision'),planetRevision=field((planet.present?planet.value:campaignPlanet) as object,'revision');if(!siteRevision.ok||siteRevision.value!==3||!planetRevision.ok||planetRevision.value!==3)return false;
 const w=field(raw,'width'),h=field(raw,'height');return w.ok&&h.ok&&typeof w.value==='number'&&typeof h.value==='number'&&validStoredRiverWater256(water.value,w.value,h.value);
}
/** Validate original owners before migration/shared-header projection. This
 * never constructs a live map/cache or treats an arbitrary .world as authority. */
export function validRiverWaterCampaignRaw256(raw:unknown,version:number):boolean {
 if(!validRiverWaterEnvelope256(raw,version)||!plain(raw))return false;
 const maps=field(raw,'worldMaps'),planet=field(raw,'planet');if(!maps.ok||!planet.ok)return false;
 if(maps.present){if(!plain(maps.value))return false;const sites=field(maps.value,'sites');if(!sites.ok||!Array.isArray(sites.value))return false;for(let i=0;i<sites.value.length;i++){const row=field(sites.value,String(i));if(!row.ok||!row.present||!plain(row.value))return false;const map=field(row.value,'map');if(!map.ok||map.present&&!validRiverWaterEnvelope256(map.value,version,planet.value))return false;}}
 const secondary=field(raw,'secondarySite');if(!secondary.ok)return false;if(secondary.present){if(!plain(secondary.value))return false;const map=field(secondary.value,'map');if(!map.ok||!map.present||!validRiverWaterEnvelope256(map.value,version,planet.value))return false;}
 return true;
}
/** Successful load boundary only, after the complete campaign guard. Original
 * local records retain the SAME owner; no context is constructed or grid read. */
export function freezeAdmittedRiverWaterCampaign256(raw:unknown):void {
 if(!plain(raw))return;const freeze=(map:Record<string,unknown>)=>{const v=field(map,'riverWater');if(v.present)freezeAdmittedRiverWater256(v.value as StoredRiverWater256);};freeze(raw);
 const maps=field(raw,'worldMaps');if(plain(maps.value)){const sites=field(maps.value,'sites');if(Array.isArray(sites.value))for(const row of sites.value)if(plain(row)){const map=field(row,'map');if(plain(map.value))freeze(map.value);}}
 const secondary=field(raw,'secondarySite');if(plain(secondary.value)){const map=field(secondary.value,'map');if(plain(map.value))freeze(map.value);}
}
