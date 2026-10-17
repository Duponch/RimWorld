/** Independent placement arithmetic from private Core4871 behavioural facts.
 * Callers own faction initialization, settlement names and the local RNG stream.
 * No gameplay state, historical planet or global random source is touched. */
import {worldBiomeCanSettle,worldBiomeSettlementWeight} from './world-biome-properties.ts';
import {populationMultiplier,type ClimateSetting} from './world-climate-settings.ts';
import type {ConfigurableWorldFaction} from './world-generation-settings.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
import type {WorldSurfaceTile} from './world-surface-geography.ts';
export type SettlementRandom=Pick<WorldGenerationRandom,'integer'|'float'|'value'>;
export type SettlementTile=Pick<WorldSurfaceTile,'biome'|'hilliness'|'neighbours'>;
export type SettlementFactionDef=ConfigurableWorldFaction|'Ancients'|'AncientsHostile';
/** Ordered actual instances, not a count per Def. Flags are resolved runtime facts. */
export interface InitializedSettlementFaction {
 id:number;def:SettlementFactionDef;player:boolean;hidden:boolean;temporary:boolean;layerCompatible:boolean;
}
export interface SettlementAdmission {
 settlementTiles:ReadonlySet<number>;
 /** Map-parent blockers only: ordinary roads/features do not block settlement. */
 mapCreationBlockedTiles?:ReadonlySet<number>;
 peaceTalkTiles?:ReadonlySet<number>;
 campTiles?:ReadonlySet<number>;
 /** Optional selector-stage restriction, equivalent to a preexisting tile predicate. */
 candidateTiles?:ReadonlySet<number>;
 mustBeAutoChoosable?:boolean;
}
export interface SettlementTileChoice {tile:number;found:boolean;attempts:number}
const f=Math.fround;
const hiddenDefs=new Set<SettlementFactionDef>(['Mechanoid','Insect','Ancients','AncientsHostile']);
export function settlementFactionWeight(faction:InitializedSettlementFaction):number {
 return !faction.player&&!faction.hidden&&!faction.temporary&&faction.layerCompatible&&!hiddenDefs.has(faction.def)?1:0;
}
/** Public so the caller can apply the same admission to manual/new-world picks. */
export function canPlaceWorldSettlement(tiles:readonly SettlementTile[],tileId:number,admission:SettlementAdmission):boolean {
 const tile=tiles[tileId];if(!tile||!worldBiomeCanSettle(tile.biome)||tile.hilliness==='impassable')return false;
 if(admission.settlementTiles.has(tileId)||tile.neighbours.some(id=>admission.settlementTiles.has(id))||admission.peaceTalkTiles?.has(tileId))return false;
 return !!admission.campTiles?.has(tileId)||!admission.mapCreationBlockedTiles?.has(tileId);
}
function tileWeight(tile:SettlementTile,id:number,admission:SettlementAdmission):number {
 if(!worldBiomeCanSettle(tile.biome)||tile.hilliness==='impassable'||admission.mustBeAutoChoosable&&tile.biome==='sea-ice'||admission.candidateTiles&&!admission.candidateTiles.has(id))return 0;
 // The six Core human Defs have no min-temperature selection curve.
 return worldBiomeSettlementWeight(tile.biome);
}
/** Deferred stream: each ID is drawn immediately before its weight/selection
 * draw. Zero weights AFTER the first positive weight still consume float RNG.
 * Exhaustion preserves Core's tile0 fallback while explicitly marking failure. */
export function pickWorldSettlementTile(tiles:readonly SettlementTile[],random:SettlementRandom,admission:SettlementAdmission):SettlementTileChoice {
 if(!tiles.length)throw Error('Cannot choose a settlement on an empty surface');
 for(let attempt=1;attempt<=500;attempt++){
  let selected=-1,total=0;
  for(let draw=0;draw<100;draw++){
   const id=random.integer(0,tiles.length),weight=tileWeight(tiles[id]!,id,admission);
   if(total===0){if(weight>0){selected=id;total=weight;}continue;}
   const combined=f(total+weight);
   if(random.float(0,combined)>=total)selected=id;
   total=combined;
  }
  if(selected>=0&&canPlaceWorldSettlement(tiles,selected,admission))return {tile:selected,found:true,attempts:attempt};
 }
 return {tile:0,found:false,attempts:500};
}
/** Surface curve is constant1. Returns only the remaining quota; initial
 * settlements already exist, and are never removed when they exceed density.
 * Integer-valued RoundRandom still consumes the second random draw. */
export function worldSettlementQuota(tileCount:number,population:ClimateSetting,existingCount:number,eligibleFactionCount:number,random:SettlementRandom):number {
 if(!Number.isSafeInteger(tileCount)||tileCount<1||!Number.isSafeInteger(existingCount)||existingCount<0||!Number.isSafeInteger(eligibleFactionCount)||eligibleFactionCount<0)throw Error('Invalid settlement quota input');
 if(eligibleFactionCount===0)return 0;
 const density=random.float(75,85),scaled=f(f(f(f(tileCount)/f(100000))*density)*f(populationMultiplier(population)));
 const integral=Math.trunc(scaled),rounded=integral+(random.value()<f(scaled%1)?1:0);
 return Math.max(0,rounded-existingCount);
}
/** Faction choice uses cumulative weights, unlike the tile reservoir. Single
 * eligible instance consumes no RNG; ordered duplicate Def instances survive. */
export function chooseWorldSettlementFaction(factions:readonly InitializedSettlementFaction[],random:SettlementRandom):InitializedSettlementFaction|undefined {
 let total=0,count=0,only:InitializedSettlementFaction|undefined;
 for(const faction of factions){const weight=settlementFactionWeight(faction);total=f(total+weight);if(weight>0){count++;only=faction;}}
 if(count===0)return;if(count===1)return only;
 const threshold=f(random.value()*total);let cumulative=0;
 for(const faction of factions){const weight=settlementFactionWeight(faction);if(weight<=0)continue;cumulative=f(cumulative+weight);if(cumulative>=threshold)return faction;}
 return undefined;
}
export interface WorldSettlementChoice extends SettlementTileChoice {factionId:number;factionDef:SettlementFactionDef}
/** ONE settlement only. Commit its occupancy and perform actual naming before
 * calling again with the same RNG. Batching here would silently skip name RNG. */
export function nextWorldSettlement(tiles:readonly SettlementTile[],factions:readonly InitializedSettlementFaction[],random:SettlementRandom,admission:SettlementAdmission):WorldSettlementChoice|undefined {
 const faction=chooseWorldSettlementFaction(factions,random);if(!faction)return;
 return {...pickWorldSettlementTile(tiles,random,admission),factionId:faction.id,factionDef:faction.def};
}