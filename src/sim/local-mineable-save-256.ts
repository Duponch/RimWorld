/** Strict descriptor-only future field guard; never enrich an old Tile. */
import {NATURAL_TERRAIN_DEFINITIONS_256} from './local-terrain-definitions-256.ts';
import {actualMineableDef256,type LocalMineableOwner256} from './local-mineable-owner-256.ts';
import {isStoneKind} from './geology.ts';
const plain=(v:unknown):v is object=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const own=(v:object,k:string)=>{const d=Object.getOwnPropertyDescriptor(v,k);return d?{present:true,valid:Object.hasOwn(d,'value')&&d.enumerable===true,value:Object.hasOwn(d,'value')?d.value:undefined}:{present:k in v,valid:!(k in v),value:undefined};};
const id=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0;
export function validMineableOwner256(value:unknown,nextId:number):value is LocalMineableOwner256 {
 if(!plain(value)||Reflect.ownKeys(value).length!==3||!['id','def','terrain'].every(k=>own(value,k).present&&own(value,k).valid))return false;
 const identity=own(value,'id').value,def=own(value,'def').value,terrain=own(value,'terrain').value;
 return id(identity)&&Number.isSafeInteger(nextId)&&identity<nextId&&typeof def==='string'&&['Granite','Limestone','Marble','Sandstone','Slate','MineableSteel','MineableSilver','MineableGold','MineableUranium','MineablePlasteel','MineableJade','MineableComponentsIndustrial'].includes(def)&&typeof terrain==='string'&&Object.hasOwn(NATURAL_TERRAIN_DEFINITIONS_256,terrain);
}
/** Call on full Tile RAW BEFORE any migration, and on reconstructed full/delta
 * snapshot candidates. Existing general Tile guards still validate all fields. */
export function validMineableTile256(tile:unknown,version:number,site3:boolean,nextId:number):boolean {
 if(!plain(tile))return false;const field=own(tile,'mineable');if(!field.valid)return false;
 if(version<=255||!site3)return !field.present;
 if(version!==256)return false;
 const terrain=own(tile,'terrain'),collapsed=own(tile,'collapsedRock'),ore=own(tile,'ore'),stone=own(tile,'stone');
 if(!terrain.valid||!terrain.present||!collapsed.valid||!ore.valid||!stone.valid)return false;
 if(terrain.value!=='rock'||collapsed.present)return !field.present;
 if(!field.present||!validMineableOwner256(field.value,nextId)||!isStoneKind(stone.value))return false;
 if(ore.present&&(typeof ore.value!=='string'||!['steel','silver','gold','uranium','plasteel','jade','machinery'].includes(ore.value)))return false;
 // Definitions are facts of the actual existing stone/ore fields. Index only
 // after their runtime guards, with no getter invocation or trimming DefIDs.
 const actual=actualMineableDef256({stone:stone.value,...ore.present?{ore:ore.value as import('./local-ore-scattering-256.ts').LocalOre256}:{}});
 return field.value.def===actual;
}
export function registerMineableIdentities256(owners:Iterable<LocalMineableOwner256>,ids:{has(id:number):boolean;add(id:number):unknown}):boolean {
 const incoming=new Set<number>();for(const owner of owners){if(ids.has(owner.id)||incoming.has(owner.id))return false;incoming.add(owner.id);}for(const identity of incoming)ids.add(identity);return true;
}

export function validMineableCampaignRaw256(raw:unknown,version:number):boolean {
 if(!plain(raw))return false;const next=own(raw,'nextId');if(!next.valid)return false;
 const check=(map:unknown)=>{if(!plain(map))return false;const site=own(map,'site'),tiles=own(map,'tiles');if(!site.valid||!tiles.valid)return false;
  let site3=false;if(site.present){if(!plain(site.value))return false;const r=own(site.value,'revision');if(!r.valid)return false;site3=r.value===3;}
  if(!tiles.present)return !site3;if(!Array.isArray(tiles.value))return false;
  for(let i=0;i<tiles.value.length;i++){const t=own(tiles.value,String(i));if(!t.valid||!t.present||!validMineableTile256(t.value,version,site3,Number(next.value)))return false;}return true;};
 if(!check(raw))return false;const maps=own(raw,'worldMaps');if(!maps.valid)return false;
 if(maps.present){if(!plain(maps.value))return false;const sites=own(maps.value,'sites');if(!sites.valid||!Array.isArray(sites.value))return false;for(let i=0;i<sites.value.length;i++){const row=own(sites.value,String(i));if(!row.valid||!row.present||!plain(row.value))return false;const map=own(row.value,'map');if(!map.valid||map.present&&!check(map.value))return false;}}
 const second=own(raw,'secondarySite');if(!second.valid)return false;if(second.present){if(!plain(second.value))return false;const map=own(second.value,'map');if(!map.valid||!map.present||!check(map.value))return false;}return true;
}
