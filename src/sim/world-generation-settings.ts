import {validateWorldClimateSettings,type WorldClimateSettings} from './world-climate-settings.ts';
export const CONFIGURABLE_WORLD_FACTIONS=['OutlanderCivil','OutlanderRough','TribeCivil','TribeRough','TribeSavage','Pirate','Mechanoid','Insect','Ancients','AncientsHostile'] as const;
export type ConfigurableWorldFaction=typeof CONFIGURABLE_WORLD_FACTIONS[number];
/** Kept in the actual ordered generation list, but neither shown nor removable in Core's faction selector. */
export const INTRINSIC_WORLD_FACTIONS=['Ancients','AncientsHostile'] as const;
export const isIntrinsicWorldFaction=(def:ConfigurableWorldFaction):boolean=>def==='Ancients'||def==='AncientsHostile';
export interface WorldGenerationSettings extends WorldClimateSettings {factions:ConfigurableWorldFaction[]}
export function defaultWorldGenerationSettings():WorldGenerationSettings {
 return {coverage:.3,rainfall:3,temperature:3,population:3,factions:[...CONFIGURABLE_WORLD_FACTIONS]};
}
function dataRecord(value:unknown,keys:readonly string[]):value is Record<string,unknown> {
 if(value===null||typeof value!=='object'||Array.isArray(value))return false;
 const prototype=Object.getPrototypeOf(value);if(prototype!==Object.prototype&&prototype!==null)return false;
 const own=Reflect.ownKeys(value);if(own.length!==keys.length)return false;
 return own.every(key=>typeof key==='string'&&keys.includes(key)&&Object.hasOwn(Object.getOwnPropertyDescriptor(value,key)!,'value'));
}
export function validWorldFactionSelection(value:unknown):value is ConfigurableWorldFaction[] {
 if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>16||Reflect.ownKeys(value).length!==value.length+1)return false;
 let humans=0;const hidden=new Set<string>();
 for(let i=0;i<value.length;i++){
  const descriptor=Object.getOwnPropertyDescriptor(value,String(i));if(!descriptor||!Object.hasOwn(descriptor,'value'))return false;
  const faction=descriptor.value;if(typeof faction!=='string'||!(CONFIGURABLE_WORLD_FACTIONS as readonly string[]).includes(faction))return false;
  if(faction==='Mechanoid'||faction==='Insect'||faction==='Ancients'||faction==='AncientsHostile'){if(hidden.has(faction))return false;hidden.add(faction);}else humans++;
 }
 return humans<=12&&INTRINSIC_WORLD_FACTIONS.every(def=>hidden.has(def));
}
export function validWorldGenerationSettings(value:unknown):value is WorldGenerationSettings {
 if(!dataRecord(value,['coverage','rainfall','temperature','population','factions']))return false;
 return validateWorldClimateSettings({coverage:value.coverage,rainfall:value.rainfall,temperature:value.temperature,population:value.population})&&validWorldFactionSelection(value.factions);
}
export function worldClimateSettings(settings:WorldGenerationSettings):WorldClimateSettings {
 return {coverage:settings.coverage,rainfall:settings.rainfall,temperature:settings.temperature,population:settings.population};
}
/** Full ordered inputs, not just the stable numeric seed. No sort, trim or
 * normalization: instance order is significant to generation. */
export function worldGenerationKey(seedText:string,settings:WorldGenerationSettings):string {
 if(typeof seedText!=='string'||!validWorldGenerationSettings(settings))throw Error('Invalid world draft settings');
 return JSON.stringify([3,seedText,settings.coverage,settings.rainfall,settings.temperature,settings.population,settings.factions]);
}
