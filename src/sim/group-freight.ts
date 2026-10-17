import {commercialItemMassGrams} from './commercial-mass.ts';
import {SCHEMA_VERSION} from './types.ts';
import type {GroupState,GroupFreight} from './group-state.ts';
import type {ItemId} from './items.ts';

export const GROUP_FREIGHT_SCHEMA=253;
export const newGroupFreight=():GroupFreight=>({revision:1,woodLoaded:0,steelLoaded:0});
export function validGroupFreight(value:unknown):value is GroupFreight {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const keys=Reflect.ownKeys(value);
  if(keys.length!==3||!['revision','woodLoaded','steelLoaded'].every(k=>keys.includes(k)))return false;
  const fields=['revision','woodLoaded','steelLoaded'].map(k=>Object.getOwnPropertyDescriptor(value,k));
  return fields.every(d=>!!d&&Object.hasOwn(d,'value')&&d.enumerable)&&fields[0]!.value===1
    &&fields.slice(1).every(d=>Number.isSafeInteger(d!.value)&&d!.value>=0);
}
export const freightGroup=(g:Pick<GroupState,'freight'>&{reorganization?:{revision:1}}):boolean=>validGroupFreight(g.freight)||g.reorganization?.revision===1;
/** Steel mass is admitted only by the new collective contract. Individual
 * travel and every commercial offer keep their existing catalogues. */
export function groupItemMassGrams(item:ItemId,freight=false,version:number=SCHEMA_VERSION):number|undefined {
  return item==='steel'&&freight===true&&version>=GROUP_FREIGHT_SCHEMA?500:commercialItemMassGrams(item,version);
}
