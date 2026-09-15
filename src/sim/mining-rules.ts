import { STEEL_ORE } from './ore.ts';
import type { Tile, MaterialPile } from './types.ts';
import type { StoneKind } from './geology.ts';
import type { ItemId } from './items.ts';

/** Core natural walls. Light modulates speed; skills/capacities remain absent. */
export const ROCK_HP: Readonly<Record<StoneKind, number>> = Object.freeze({granite:900,limestone:700,marble:450,sandstone:400,slate:500});
export const PICK_TICKS = 10;
/** Core divides floats, then Math.Round uses nearest-even at an exact midpoint. */
export function pickDuration(rate:number):number {
  const ticks=Math.fround(PICK_TICKS*10/Math.fround(rate)),lower=Math.floor(ticks);
  return ticks-lower===.5 ? lower+(lower%2) : Math.round(ticks);
}
export const PICK_DAMAGE = 80;
export const CHUNK_CHANCE = .25;
export const rockMaxHP = (tile: Tile): number => tile.ore ? STEEL_ORE.hp : tile.stone ? ROCK_HP[tile.stone] : 500;
export const chunkItem = (tile: Tile): ItemId => tile.stone ? `${tile.stone}-chunk` : 'legacy-chunk';
export const automaticallyHaulable = (pile: MaterialPile): boolean => pile.kind !== 'chunk' || pile.haulRequested === true;
export function validMiningDamage(tile: {terrain:unknown;stone?:unknown;miningDamage?:unknown;ore?:unknown}, version:number): boolean {
  const d=tile.miningDamage;
  return d===undefined || version>=28 && tile.terrain==='rock' && typeof d==='number' && Number.isSafeInteger(d) && d>0 && d<rockMaxHP(tile as Tile) && d%PICK_DAMAGE===0;
}
