import type {WorldGenerationRandom} from './world-generation-random.ts';
import type {WorldFactionDef256} from './world-faction-catalog.ts';
import type {WorldFactionInstance256,WorldFactionRegistry256} from './world-faction-state.ts';
/** Core4871 loaded Def IDs/order only, observation cb2290c0. No labels/grammar,
 * ideology gameplay or synthetic draws. These are initialization owners. */
export const CORE_CULTURES_256=Object.freeze(["Astropolitan", "Corunan", "Rustican", "Kriminul"] as const);
export const CORE_CLASSIC_PRECEPTS_256=Object.freeze(["NutrientPasteEating_Disgusting", "Cannibalism_Classic", "Corpses_Ugly", "InsectMeatEating_Despised_Classic", "Lovin_Free", "MarriageName_UsuallyMans", "OrganUse_Classic", "Execution_Classic", "Slavery_Classic", "SpouseCount_Male_MaxOne", "SpouseCount_Female_MaxOne"] as const);
export type CoreCultureDef256=typeof CORE_CULTURES_256[number];
export type CoreClassicPreceptDef256=typeof CORE_CLASSIC_PRECEPTS_256[number];
export interface CoreNoExpansionIdeoIds256 {revision:1;nextIdeoId:number;nextPreceptId:number}
export interface CoreNoExpansionIdeo256 {id:number;cultureDef:CoreCultureDef256;precepts:{id:number;def:CoreClassicPreceptDef256;randomSeed:number}[]}
const HUMAN_FACTIONS=new Set<string>(["PlayerColony", "PlayerTribe", "OutlanderCivil", "OutlanderRough", "TribeCivil", "TribeRough", "TribeSavage", "Pirate", "Ancients", "AncientsHostile"]);
const isFactionDef=(v:unknown):v is WorldFactionDef256=>typeof v==='string'&&(HUMAN_FACTIONS.has(v)||v==='Mechanoid'||v==='Insect');
const FIRST_CULTURE:Partial<Record<WorldFactionDef256,CoreCultureDef256>>=Object.freeze({"PlayerColony": "Astropolitan", "PlayerTribe": "Corunan", "OutlanderCivil": "Rustican", "OutlanderRough": "Rustican", "TribeCivil": "Corunan", "TribeRough": "Corunan", "TribeSavage": "Corunan", "Pirate": "Kriminul"});
const integer=(v:unknown,min=0,max=2147483646):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.getOwnPropertyDescriptor(v,k)?.enumerable===true&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
const exact=(v:Record<string,unknown>,keys:readonly string[])=>Reflect.ownKeys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const dense=(v:unknown):v is unknown[]=>Array.isArray(v)&&Object.getPrototypeOf(v)===Array.prototype&&Reflect.ownKeys(v).length===v.length+1&&Array.from({length:v.length},(_,i)=>Object.getOwnPropertyDescriptor(v,String(i))).every(d=>!!d&&d.enumerable===true&&Object.hasOwn(d,'value'));
export function validCoreNoExpansionIdeoIds256(v:unknown):v is CoreNoExpansionIdeoIds256 {return object(v)&&exact(v,['revision','nextIdeoId','nextPreceptId'])&&v.revision===1&&integer(v.nextIdeoId)&&integer(v.nextPreceptId);}
/** Only the actual NEW faction-registry constructor calls this. Never load. */
export function constructCoreNoExpansionIdeoIds256():CoreNoExpansionIdeoIds256{return {revision:1,nextIdeoId:0,nextPreceptId:0};}
/** Called after faction color and before names/relations/settlement/leader.
 * Passed counters belong to this unpublished draft. Nonhumans draw nothing. */
export function constructFactionNoExpansionIdeo256(def:WorldFactionDef256,ids:CoreNoExpansionIdeoIds256,random:WorldGenerationRandom):CoreNoExpansionIdeo256|undefined {
 if(!isFactionDef(def))throw Error('Unknown Core faction initialization');
 if(!HUMAN_FACTIONS.has(def))return;
 if(!validCoreNoExpansionIdeoIds256(ids)||Object.getOwnPropertyDescriptor(ids,'nextIdeoId')?.writable!==true||Object.getOwnPropertyDescriptor(ids,'nextPreceptId')?.writable!==true||ids.nextIdeoId>=2147483646||ids.nextPreceptId>2147483646-CORE_CLASSIC_PRECEPTS_256.length)throw Error('Actual new no-expansion initialization IDs are unavailable');
 const cultureDef=FIRST_CULTURE[def]??CORE_CULTURES_256[random.integer(0,CORE_CULTURES_256.length)]!;
 const id=ids.nextIdeoId++,precepts=CORE_CLASSIC_PRECEPTS_256.map(def=>({id:ids.nextPreceptId++,def,randomSeed:random.integerValue()}));
 return {id,cultureDef,precepts};
}
/** Descriptor-first, no load writer or RNG. Missing old authority stays unknown.
 * This Core-only family owns exactly the initial faction Ideos/precepts. */
export function validFactionNoExpansionIdeos256(registry:unknown,version:number):boolean {
 if(!object(registry)||!dense(registry.factions))return false;
 const present=Object.hasOwn(registry,'noExpansionIdeoIds');
 if(!present)return !('noExpansionIdeoIds'in registry)&&registry.factions.every(a=>object(a)&&!('noExpansionIdeo'in a));
 if(version!==256||!validCoreNoExpansionIdeoIds256(registry.noExpansionIdeoIds))return false;
 const ids=registry.noExpansionIdeoIds;let nextIdeoId=0,nextPreceptId=0;
 for(const a of registry.factions){
  if(!object(a)||!isFactionDef(a.def))return false;
  if(!HUMAN_FACTIONS.has(a.def)){if('noExpansionIdeo'in a)return false;continue;}
  const v=a.noExpansionIdeo;if(!object(v)||!exact(v,['id','cultureDef','precepts'])||v.id!==nextIdeoId++||!CORE_CULTURES_256.some(c=>c===v.cultureDef)||!dense(v.precepts)||v.precepts.length!==CORE_CLASSIC_PRECEPTS_256.length)return false;
  const fixed=FIRST_CULTURE[a.def];if(fixed!==undefined&&v.cultureDef!==fixed)return false;
  for(let i=0;i<CORE_CLASSIC_PRECEPTS_256.length;i++){const p=v.precepts[i];if(!object(p)||!exact(p,['id','def','randomSeed'])||p.id!==nextPreceptId++||p.def!==CORE_CLASSIC_PRECEPTS_256[i]||!integer(p.randomSeed,-2147483648,2147483647))return false;}
 }
 return ids.nextIdeoId===nextIdeoId&&ids.nextPreceptId===nextPreceptId;
}
export type FactionPrimaryCultureBinding256={kind:'human-standard'}|{kind:'rule-pack';defId:string}|{kind:'unresolved'};
/** O(1) read of the actual, already admitted faction instance. No Pawn choice. */
export function factionPrimaryCultureBinding256(faction:WorldFactionInstance256):FactionPrimaryCultureBinding256 {
 switch(faction.noExpansionIdeo?.cultureDef){case 'Corunan':return {kind:'rule-pack',defId:'NamerPersonCorunan'};case 'Astropolitan':case 'Rustican':case 'Kriminul':return {kind:'human-standard'};default:return {kind:'unresolved'};}
}
export interface ConfirmedFactionInitializations256 {ids:CoreNoExpansionIdeoIds256;factions:{factionId:number;def:WorldFactionDef256;ideo:CoreNoExpansionIdeo256}[]}
/** Independent values only, not a cached validation or a wire identity witness. */
export function captureFactionInitializations256(registry:WorldFactionRegistry256|undefined):ConfirmedFactionInitializations256|undefined {
 if(!registry?.noExpansionIdeoIds)return;
 return {ids:{...registry.noExpansionIdeoIds},factions:registry.factions.flatMap(a=>a.noExpansionIdeo?[{factionId:a.id,def:a.def,ideo:{id:a.noExpansionIdeo.id,cultureDef:a.noExpansionIdeo.cultureDef,precepts:a.noExpansionIdeo.precepts.map(p=>({...p}))}}]:[])};
}
/** All inputs were shape-admitted separately. Same-epoch initialization cannot
 * appear/disappear or change; a real replacement may admit different values. */
export function sameFactionInitializations256(previous:ConfirmedFactionInitializations256|undefined,registry:WorldFactionRegistry256|undefined):boolean {
 const ids=registry?.noExpansionIdeoIds;if(!previous)return ids===undefined;if(!ids||ids.revision!==previous.ids.revision||ids.nextIdeoId!==previous.ids.nextIdeoId||ids.nextPreceptId!==previous.ids.nextPreceptId)return false;
 const rows=registry!.factions.filter(a=>a.noExpansionIdeo);if(rows.length!==previous.factions.length)return false;
 return rows.every((a,i)=>{const p=previous.factions[i]!,n=a.noExpansionIdeo!;return a.id===p.factionId&&a.def===p.def&&n.id===p.ideo.id&&n.cultureDef===p.ideo.cultureDef&&n.precepts.length===p.ideo.precepts.length&&n.precepts.every((n,j)=>{const q=p.ideo.precepts[j]!;return n.id===q.id&&n.def===q.def&&n.randomSeed===q.randomSeed;});});
}
