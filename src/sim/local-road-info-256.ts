import {isSchema256Or257} from './schema-compatibility-257.ts';
/** Actual generated RoadInfo edge order; never inferred later from altered
 * terrain. Old worlds receive no generated entries on migration. */
export interface LocalRoadInfo256 {revision:1;edgeCells:number[]}
const plain=(v:unknown):v is object=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
function own(v:object,k:string){const d=Object.getOwnPropertyDescriptor(v,k);return d?{ok:'value'in d&&d.enumerable,present:true,value:'value'in d?d.value:undefined}:{ok:!(k in v),present:k in v,value:undefined};}
export function validLocalRoadInfoEnvelope256(raw:unknown,version:number):boolean {
 if(!plain(raw))return false;const road=own(raw,'roadInfo'),site=own(raw,'site');if(!road.ok||!site.ok)return false;
 let site3=false;if(site.present){if(!plain(site.value))return false;const r=own(site.value,'revision');if(!r.ok)return false;site3=r.value===3;}
 if(version<=255||!site3)return !road.present;
 const w=own(raw,'width'),h=own(raw,'height');if(!isSchema256Or257(version)||!w.ok||!h.ok||!Number.isSafeInteger(w.value)||!Number.isSafeInteger(h.value))return false;
 const width=Number(w.value),height=Number(h.value),v=road.value;
 if(width<2||height<2||width>400||height>400||!road.present||!plain(v)||Reflect.ownKeys(v).length!==2)return false;
 const revision=own(v,'revision'),edges=own(v,'edgeCells');if(!revision.ok||revision.value!==1||!edges.ok||!Array.isArray(edges.value)||Reflect.ownKeys(edges.value).length!==edges.value.length+1||edges.value.length>2*(width+height)-4)return false;
 const seen=new Set<number>();for(let i=0;i<edges.value.length;i++){const d=own(edges.value,String(i)),cell=d.value;if(!d.ok||!d.present||typeof cell!=='number'||!Number.isSafeInteger(cell)||cell<0||cell>=width*height||seen.has(cell))return false;const x=cell%width,z=Math.floor(cell/width);if(x!==0&&z!==0&&x!==width-1&&z!==height-1)return false;seen.add(cell);}return true;
}
/** Original namespaces, before projecting any shared campaign header. */
export function validLocalRoadInfoCampaignRaw256(raw:unknown,version:number):boolean {
 if(!validLocalRoadInfoEnvelope256(raw,version)||!plain(raw))return false;
 const maps=own(raw,'worldMaps');if(!maps.ok)return false;
 if(maps.present){if(!plain(maps.value))return false;const sites=own(maps.value,'sites');if(!sites.ok||!Array.isArray(sites.value))return false;for(let i=0;i<sites.value.length;i++){const row=own(sites.value,String(i));if(!row.ok||!row.present||!plain(row.value))return false;const map=own(row.value,'map');if(!map.ok||map.present&&!validLocalRoadInfoEnvelope256(map.value,version))return false;}}
 const secondary=own(raw,'secondarySite');if(!secondary.ok)return false;if(secondary.present){if(!plain(secondary.value))return false;const map=own(secondary.value,'map');if(!map.ok||!map.present||!validLocalRoadInfoEnvelope256(map.value,version))return false;}return true;
}
