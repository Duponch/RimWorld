import type {MaterialPile} from './types.ts';
export const GROUP_FORAGED_ITEMS_256=['berries','agave-fruit'] as const;
export type GroupForagedItem256=typeof GROUP_FORAGED_ITEMS_256[number];
export type GroupForageUnits256=Record<GroupForagedItem256,number>;
export interface GroupForageRevision256 {
 revision:1;progress:number;opening:GroupForageUnits256;gathered:GroupForageUnits256;consumed:GroupForageUnits256;spoiled:GroupForageUnits256;
}
export const emptyGroupForageUnits256=():GroupForageUnits256=>({berries:0,'agave-fruit':0});
const safe=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value')&&Object.getOwnPropertyDescriptor(v,k)!.enumerable);
export function validGroupForageUnits256(v:unknown):v is GroupForageUnits256{return plain(v)&&Reflect.ownKeys(v).length===2&&GROUP_FORAGED_ITEMS_256.every(k=>Object.hasOwn(v,k)&&safe(v[k]));}
export function validGroupForageRevision256(v:unknown):v is GroupForageRevision256 {
 return plain(v)&&Reflect.ownKeys(v).length===6&&['revision','progress','opening','gathered','consumed','spoiled'].every(k=>Object.hasOwn(v,k))&&v.revision===1&&typeof v.progress==='number'&&Number.isFinite(v.progress)&&v.progress>=0&&v.progress<1&&Math.fround(v.progress)===v.progress&&['opening','gathered','consumed','spoiled'].every(k=>validGroupForageUnits256(v[k]));
}
export function groupForageInventoryUnits256(items:readonly MaterialPile[]):GroupForageUnits256 {
 const out=emptyGroupForageUnits256();for(const pile of items)if(pile.owner.type==='inventory'&&GROUP_FORAGED_ITEMS_256.includes(pile.item as GroupForagedItem256)){
  const item=pile.item as GroupForagedItem256;if(!safe(pile.quantity)||pile.quantity===0||!Number.isSafeInteger(out[item]+pile.quantity))throw Error('Invalid foraged fruit ownership');out[item]+=pile.quantity;
 }return out;
}
/** Actual birth inventory, not retrospective gathering or copied parent progress. */
export function newGroupForageRevision256(items:readonly MaterialPile[]):GroupForageRevision256 {
 return {revision:1,progress:0,opening:groupForageInventoryUnits256(items),gathered:emptyGroupForageUnits256(),consumed:emptyGroupForageUnits256(),spoiled:emptyGroupForageUnits256()};
}
export function groupForageNetEffects256(v:GroupForageRevision256):GroupForageUnits256 {
 const out=emptyGroupForageUnits256();for(const k of GROUP_FORAGED_ITEMS_256){const n=BigInt(v.gathered[k])-BigInt(v.consumed[k])-BigInt(v.spoiled[k]);if(n>BigInt(Number.MAX_SAFE_INTEGER)||n< -BigInt(Number.MAX_SAFE_INTEGER))throw Error('Forage effect overflow');out[k]=Number(n);}return out;
}
