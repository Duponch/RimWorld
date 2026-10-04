import { ORE_DEFINITIONS } from './ore.ts';
import type { Tile, MaterialPile } from './types.ts';
import type { StoneKind } from './geology.ts';
import type { ItemId } from './items.ts';

/** Core natural walls. Skill, light and capacities modulate the captured stroke. */
export const ROCK_HP: Readonly<Record<StoneKind, number>> = Object.freeze({granite:900,limestone:700,marble:450,sandstone:400,slate:500});
export const PICK_TICKS = 10;
/** Core divides floats, then Math.Round uses nearest-even at an exact midpoint. */
export function pickDuration(rate:number):number {
  const ticks=Math.fround(PICK_TICKS*10/Math.fround(rate)),lower=Math.floor(ticks);
  return ticks-lower===.5 ? lower+(lower%2) : Math.round(ticks);
}
export const PICK_DAMAGE = 80;
export const CHUNK_CHANCE = .25;
export const rockMaxHP = (tile: Tile): number => tile.ore ? ORE_DEFINITIONS[tile.ore]?.hp ?? 500 : tile.stone ? ROCK_HP[tile.stone] : 500;
export const chunkItem = (tile: Tile): ItemId => tile.stone ? `${tile.stone}-chunk` : 'legacy-chunk';
export const automaticallyHaulable = (pile: MaterialPile): boolean => !pile.weapon?.forbidden && !pile.apparel?.forbidden && (pile.kind !== 'chunk' || pile.haulRequested === true);
type MiningTileInput={terrain:unknown;stone?:unknown;miningDamage?:unknown;miningYield?:unknown;ore?:unknown};
export function validMiningDamage(tile:MiningTileInput,version:number):boolean {
  const d=tile.miningDamage;
  return (d===undefined || version>=28 && tile.terrain==='rock' && typeof d==='number' && Number.isSafeInteger(d) && d>0 && d<rockMaxHP(tile as Tile) && d%PICK_DAMAGE===0)&&validMiningYield(tile,version);
}
/** Contribution is a fraction of the ore's full HP, never a product inventory.
 * Historical absence keeps the already damaged fraction at neutral yield. */
export function validMiningYield(tile:MiningTileInput,version:number):boolean {
  if(!Object.hasOwn(tile,'miningYield'))return true;
  const y=tile.miningYield,d=tile.miningDamage;
  return version>=186&&tile.terrain==='rock'&&typeof tile.ore==='string'&&Object.hasOwn(ORE_DEFINITIONS,tile.ore)
    &&typeof d==='number'&&Number.isSafeInteger(d)&&d>0&&d<rockMaxHP(tile as Tile)&&d%PICK_DAMAGE===0
    &&typeof y==='number'&&Number.isFinite(y)&&y>=0&&y<=1.25&&y<=1.25*d/rockMaxHP(tile as Tile)+1e-12;
}
