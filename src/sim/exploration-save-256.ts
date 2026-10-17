/** Strict independent guards; ROOT owns RAW/Decoder insertion and ordering.
 * Header O(1), per-tile O(1); full wrapper is for full RAW/checkpoints only. */
const record=(value:unknown):value is object=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
function data(value:object,key:string):{present:boolean;valid:boolean;value:unknown} {
 const d=Object.getOwnPropertyDescriptor(value,key);return d?{present:true,valid:Object.hasOwn(d,'value')&&d.enumerable===true,value:Object.hasOwn(d,'value')?d.value:undefined}:{present:key in value,valid:!(key in value),value:undefined};
}
export function validExplorationHeader256(raw:unknown,version:number):boolean {
 if(!record(raw))return false;const marker=data(raw,'exploration');if(!marker.valid)return false;
 const site=data(raw,'site');if(!site.valid)return false;let site3=false;
 if(site.present&&record(site.value)){const revision=data(site.value,'revision');if(!revision.valid)return false;site3=revision.value===3;}
 if(version<=255||!site3)return !marker.present;
 if(version!==256||!marker.present||!record(marker.value))return false;
 const revision=data(marker.value,'revision');return revision.valid&&revision.present&&revision.value===1&&Reflect.ownKeys(marker.value).length===1;
}
/** enabled must come from the already-validated actual map header. False and
 * undefined are not alternate serialized spellings of zero: absence alone. */
export function validExplorationTile256(tile:unknown,version:number,enabled:boolean):boolean {
 if(!record(tile))return false;const fog=data(tile,'fogged');return fog.valid&&(!fog.present||version===256&&enabled&&fog.value===true);
}
export function validateExploration256(raw:unknown,version:number):string[] {
 if(!validExplorationHeader256(raw,version))return ['Invalid local exploration marker/version.'];
 if(!record(raw))return ['Invalid exploration map.'];const tiles=data(raw,'tiles');if(!tiles.valid||!Array.isArray(tiles.value))return ['Invalid exploration tiles.'];
 const enabled=data(raw,'exploration').present;
 for(let i=0;i<tiles.value.length;i++){const item=data(tiles.value,String(i));if(!item.present||!item.valid||!validExplorationTile256(item.value,version,enabled))return ['Invalid prospective fog cell.'];}return [];
}
