import type {ConfigurableWorldFaction} from './world-generation-settings.ts';
export type WorldFactionDef256=ConfigurableWorldFaction|'PlayerColony'|'PlayerTribe';
export interface WorldFactionDefinition256 {
 player:boolean;hidden:boolean;humanlike:boolean;naturalEnemy:boolean;permanentEnemy:boolean;enemyExceptPlayer:boolean;
 enemyExceptions:readonly string[];fixedName:boolean;leaderKinds:readonly string[];
}
/** Resolved behavioural flags and DefIDs only. Original names/colours below;
 * no translated label, proprietary grammar, texture or biography is embedded. */
export const WORLD_FACTION_DEFINITIONS_256:Readonly<Record<WorldFactionDef256,WorldFactionDefinition256>>=Object.freeze({
  "PlayerColony":{"player":true,"hidden":false,"humanlike":true,"naturalEnemy":false,"permanentEnemy":false,"enemyExceptPlayer":false,"enemyExceptions":[],"fixedName":false,"leaderKinds":[]},
  "PlayerTribe":{"player":true,"hidden":false,"humanlike":true,"naturalEnemy":false,"permanentEnemy":false,"enemyExceptPlayer":false,"enemyExceptions":[],"fixedName":false,"leaderKinds":[]},
  "OutlanderCivil":{"player":false,"hidden":false,"humanlike":true,"naturalEnemy":false,"permanentEnemy":false,"enemyExceptPlayer":false,"enemyExceptions":[],"fixedName":false,"leaderKinds":["Town_Councilman"]},
  "OutlanderRough":{"player":false,"hidden":false,"humanlike":true,"naturalEnemy":true,"permanentEnemy":false,"enemyExceptPlayer":false,"enemyExceptions":[],"fixedName":false,"leaderKinds":["Town_Councilman"]},
  "TribeCivil":{"player":false,"hidden":false,"humanlike":true,"naturalEnemy":false,"permanentEnemy":false,"enemyExceptPlayer":false,"enemyExceptions":[],"fixedName":false,"leaderKinds":["Tribal_ChiefRanged","Tribal_ChiefMelee","Tribal_ChiefRanged","Tribal_ChiefMelee","Tribal_ChiefRanged","Tribal_ChiefMelee"]},
  "TribeRough":{"player":false,"hidden":false,"humanlike":true,"naturalEnemy":true,"permanentEnemy":false,"enemyExceptPlayer":false,"enemyExceptions":[],"fixedName":false,"leaderKinds":["Tribal_ChiefRanged","Tribal_ChiefMelee","Tribal_ChiefRanged","Tribal_ChiefMelee","Tribal_ChiefRanged","Tribal_ChiefMelee"]},
  "TribeSavage":{"player":false,"hidden":false,"humanlike":true,"naturalEnemy":false,"permanentEnemy":true,"enemyExceptPlayer":false,"enemyExceptions":[],"fixedName":false,"leaderKinds":["Tribal_ChiefRanged","Tribal_ChiefMelee","Tribal_ChiefRanged","Tribal_ChiefMelee","Tribal_ChiefRanged","Tribal_ChiefMelee"]},
  "Pirate":{"player":false,"hidden":false,"humanlike":true,"naturalEnemy":false,"permanentEnemy":true,"enemyExceptPlayer":false,"enemyExceptions":[],"fixedName":false,"leaderKinds":["PirateBoss","PirateBoss","PirateBoss","PirateBoss"]},
  "Mechanoid":{"player":false,"hidden":true,"humanlike":false,"naturalEnemy":false,"permanentEnemy":true,"enemyExceptPlayer":false,"enemyExceptions":[],"fixedName":false,"leaderKinds":[]},
  "Insect":{"player":false,"hidden":true,"humanlike":false,"naturalEnemy":false,"permanentEnemy":false,"enemyExceptPlayer":false,"enemyExceptions":[],"fixedName":true,"leaderKinds":[]},
  "Ancients":{"player":false,"hidden":true,"humanlike":true,"naturalEnemy":false,"permanentEnemy":false,"enemyExceptPlayer":false,"enemyExceptions":[],"fixedName":true,"leaderKinds":[]},
  "AncientsHostile":{"player":false,"hidden":true,"humanlike":true,"naturalEnemy":false,"permanentEnemy":true,"enemyExceptPlayer":false,"enemyExceptions":[],"fixedName":true,"leaderKinds":[]},
});
export const isWorldFactionDef256=(v:unknown):v is WorldFactionDef256=>typeof v==='string'&&Object.hasOwn(WORLD_FACTION_DEFINITIONS_256,v);
export type WorldFactionRelationKind256='hostile'|'neutral'|'ally';
export function initialWorldGoodwill256(a:WorldFactionDef256,b:WorldFactionDef256):number {
 const directed=(self:WorldFactionDef256,other:WorldFactionDef256)=>{const d=WORLD_FACTION_DEFINITIONS_256[self],o=WORLD_FACTION_DEFINITIONS_256[other];
  return d.permanentEnemy||d.enemyExceptPlayer&&!o.player||(self==='Insect'||d.enemyExceptions.length>0)&&!d.enemyExceptions.includes(other)?-100:d.naturalEnemy?-80:0;};
 return Math.min(directed(a,b),directed(b,a));
}
export const worldRelationKind256=(goodwill:number):WorldFactionRelationKind256=>goodwill<=-10?'hostile':goodwill>=75?'ally':'neutral';
/** Independently authored pigments. Spectrum coordinate is retained as data. */
const PIGMENTS=[0x8c9f9a,0xbd9379,0x97a77b,0xb2a176,0xb18b84,0x9a929f,0x8997a8,0xa4a16c,0x9d9a89,0x8f858d] as const;
export function worldFactionPigment256(def:WorldFactionDef256,spectrum:number):number {
 const i=Object.keys(WORLD_FACTION_DEFINITIONS_256).indexOf(def),base=PIGMENTS[Math.max(0,i-2)%PIGMENTS.length]!,t=Math.max(0,Math.min(1,spectrum));
 const channel=(shift:number)=>Math.round(((base>>>shift)&255)*(.84+.16*t));return channel(16)<<16|channel(8)<<8|channel(0);
}
