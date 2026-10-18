import {planetTileCount} from './planet-geography-256.ts';
import type {LostCampaignMemory} from './world-map-lost.ts';
import type {World} from './types.ts';
import type {CampaignMapPresentation,CampaignSummary} from './world-map-state.ts';
import type {WorldPawnOriginMap256} from './world-pawn-origin-projection-256.ts';

/** Values from one committed Give act, retained with the existing memory.
 * The victim/date/origin are already otherId/at/mapId. This receipt is neither
 * a current WorldPawn FK nor an archive, owner, RNG stream or GC keep root. */
export interface CaravanCession261 {groupId:number;tile:number;captorFactionId:number}
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const loss=(kind:unknown)=>typeof kind==='string'&&['colonist-lost','friend-lost','rival-lost','parent-lost','child-lost','sibling-lost','lover-lost','spouse-lost'].includes(kind);
export function validCaravanCessionShape261(value:unknown,version:number):value is CaravanCession261 {
 if((version!==261&&(Number(version)!==262&&Number(version)!==263))||!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)return false;
 const keys=Reflect.ownKeys(value),names=['groupId','tile','captorFactionId'];
 if(keys.length!==names.length||!keys.every(k=>typeof k==='string'&&names.includes(k)&&Object.getOwnPropertyDescriptor(value,k)?.enumerable===true&&Object.hasOwn(Object.getOwnPropertyDescriptor(value,k)!,'value')))return false;
 const v=value as CaravanCession261;return int(v.groupId,1)&&int(v.tile)&&int(v.captorFactionId,1);
}
type Root261=Readonly<Pick<World,'schemaVersion'|'tick'|'nextId'|'planet'|'worldFactions'|'worldMaps'>>;
type Projection261=Pick<CampaignMapPresentation|CampaignSummary,'maps'|'worldPawnOrigins'|'lostMemories'>;
/** A past source group may have reformed/disappeared and the same captive may
 * have returned. Only real allocated bounds and the durable source-map witness
 * are required; current WP membership/situation is deliberately not a FK. */
export function validCaravanCessionMemory261(m:LostCampaignMemory,root:Root261,projection?:Projection261):boolean {
 const d=Object.getOwnPropertyDescriptor(m,'caravanCession261');
 if(!d||!d.enumerable||!Object.hasOwn(d,'value')||!validCaravanCessionShape261(d.value,root.schemaVersion)||!loss(m.kind)||!int(m.otherId,1,root.nextId-1)||m.otherId===m.receiverId||!int(m.receiverId,1,root.nextId-1)||!int(m.at,0,root.tick)||!int(m.mapId))return false;
 const witness=d.value,planet=root.planet,factions=root.worldFactions;
 if(planet?.revision!==3||!int(witness.groupId,1,planet.nextGroupId-1)||!int(witness.tile,0,planetTileCount(planet)-1)||!factions||witness.captorFactionId===factions.playerFactionId||!factions.factions.some(f=>f.id===witness.captorFactionId))return false;
 if(root.worldMaps){const source=[...root.worldMaps.sites,...root.worldMaps.retired].find(s=>s.id===m.mapId);return !!source&&source.tile!==null&&source.createdAt<=m.at;}
 const live=projection?.maps.find(s=>s.id===m.mapId),retired=projection?.worldPawnOrigins?.find(s=>s.mapId===m.mapId);
 return live?live.tile!==null&&live.createdAt<=m.at:!!retired;
}
/** The SAME scalar retired-map evidence may be needed after the captive no
 * longer belongs to WorldPawns. No unrelated unused origin is admitted. */
export function caravanCessionUsesRetiredOrigin261(projection:Projection261|undefined,origin:WorldPawnOriginMap256,root:Root261):boolean {
 return !!projection?.lostMemories.some(m=>m.mapId===origin.mapId&&validCaravanCessionMemory261(m,root,projection));
}
