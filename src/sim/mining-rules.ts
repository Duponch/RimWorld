import type { Tile, MaterialPile } from './types.ts';
import type { StoneKind } from './geology.ts';
import type { ItemId } from './items.ts';

/** Core natural walls. Neutral 100% speed until skills/capacities exist. */
export const ROCK_HP: Readonly<Record<StoneKind, number>> = Object.freeze({granite:900,limestone:700,marble:450,sandstone:400,slate:500});
export const PICK_TICKS = 10;
export const PICK_DAMAGE = 80;
export const CHUNK_CHANCE = .25;
export const rockMaxHP = (tile: Tile): number => tile.stone ? ROCK_HP[tile.stone] : 500;
export const chunkItem = (tile: Tile): ItemId => tile.stone ? `${tile.stone}-chunk` : 'legacy-chunk';
export const automaticallyHaulable = (pile: MaterialPile): boolean => pile.kind !== 'chunk' || pile.haulRequested === true;
export function validMiningDamage(tile: {terrain:unknown;stone?:unknown;miningDamage?:unknown}, version:number): boolean {
  const d=tile.miningDamage;
  return d===undefined || version>=28 && tile.terrain==='rock' && typeof d==='number' && Number.isSafeInteger(d) && d>0 && d<rockMaxHP(tile as Tile) && d%PICK_DAMAGE===0;
}
