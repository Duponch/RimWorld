import {isStoneKind,type StoneKind} from './geology.ts';
import type {NaturalTerrainDefinition256} from './local-terrain-definitions-256.ts';
import type {Tile} from './types.ts';

/** A transformed real substrate, not a paid/stackable constructed floor. */
export const SMOOTHED_STONE_TERRAIN_281='smoothed-stone' as const;
export const SMOOTHED_STONE_FACTS_281=Object.freeze({
  fertility:0,pathCostCore:0,perceivedCivilCore:0,perceivedDraftedCore:0,
  affordances:Object.freeze(['Walkable','Light','Medium','Heavy'] as const),
  water:false,river:false,ice:false,extinguishesFire:false,holdsSnow:true,
  acceptsUnnaturalFilth:true,extraDeterioration:0,stone:true,supportsRock:true,
  beauty:2,marketValue:5,cleanliness:0,cleaningTime:1,flammability:0,
  layerable:false,removable:false,tags:Object.freeze(['Floor'] as const),
}) satisfies NaturalTerrainDefinition256;
export const isSmoothedStone281=(terrain:unknown):terrain is typeof SMOOTHED_STONE_TERRAIN_281=>terrain===SMOOTHED_STONE_TERRAIN_281;
/** Roof collapse occupies the existing rock lane without replacing its saved
 * substrate. Readers keep that terrain's value beneath the fallen edifice. */
export const hasSmoothedStoneSubstrate281=(tile:{readonly terrain:unknown;readonly collapsedRock?:{readonly terrain:unknown}}):boolean=>isSmoothedStone281(tile.terrain)||isSmoothedStone281(tile.collapsedRock?.terrain);
const labels:Readonly<Record<StoneKind,string>>=Object.freeze({granite:'Granite lissé',limestone:'Calcaire lissé',marble:'Marbre lissé',sandstone:'Grès lissé',slate:'Ardoise lissée'});
const coreDefs:Readonly<Record<StoneKind,string>>=Object.freeze({granite:'Granite_Smooth',limestone:'Limestone_Smooth',marble:'Marble_Smooth',sandstone:'Sandstone_Smooth',slate:'Slate_Smooth'});
export const smoothedStoneLabel281=(stone:unknown):string=>isStoneKind(stone)?labels[stone]:'Sol rocheux lissé';
export const smoothedStoneCoreDef281=(stone:unknown):string|undefined=>isStoneKind(stone)?coreDefs[stone]:undefined;

/** Live source identity only. Admission owns version, fog, edge, edifices and
 * reservations; no history of mining or geological identity is manufactured. */
export function smoothFloorSourceStone281(tile:Pick<Tile,'terrain'|'stone'>&Partial<Tile>):StoneKind|undefined {
  return tile.terrain==='rough-stone'&&isStoneKind(tile.stone)&&!tile.floor&&!tile.bridge&&!tile.collapsedRock
    &&tile.mineable===undefined&&tile.ore===undefined&&tile.miningDamage===undefined&&tile.miningYield===undefined?tile.stone:undefined;
}
