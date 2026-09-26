import { factionOf } from './affiliation.ts';
import { floorRoomMarketValue, structureRoomMarketValue } from './room-market-value.ts';
import { pileMarketValue } from './trade-prices.ts';
import { tradeCatalogueEntry } from './trade-catalogue.ts';
import type { ItemId } from './items.ts';
import type { MaterialPile, Pawn, World } from './types.ts';

/** Values unavailable from the saved model are reported, never silently
 * replaced by a generic price. Known totals are lower bounds in that case. */
export interface ColonyWealth {
  readonly items: number;
  readonly structures: number;
  readonly floors: number;
  readonly pawnsKnown: number;
  readonly knownTotal: number;
  readonly knownStorytellerWealth: number;
  readonly unpricedPileIds: readonly number[];
  readonly unpricedPackedIds: readonly number[];
  readonly unpricedStructureIds: readonly number[];
  readonly unpricedPawnIds: readonly number[];
  readonly complete: boolean;
}

const colonyPawn = (p: Pawn | undefined): boolean => !!p && factionOf(p) === 'colony' && p.state !== 'dead' && !p.prisoner && !p.visitor;

/** The map's ground haulables count irrespective of their previous faction.
 * Contents held by a neutral trader or raider do not count. Construction
 * deliveries and grave contents remain physical piles and are counted once. */
function pileOnPlayerMap(pile: MaterialPile, pawns: ReadonlyMap<number, Pawn>): boolean {
  const owner = pile.owner;
  if (owner.type === 'ground' || owner.type === 'job' || owner.type === 'grave') return true;
  return colonyPawn(pawns.get(owner.pawnId));
}

const MATERIAL_VALUE: Readonly<Partial<Record<ItemId, number>>> = Object.freeze({
  wood: 1.2, steel: 1.9, component: 32, cloth: 1.5, 'light-leather': 1.9,
  'granite-blocks': .9, 'limestone-blocks': .9, 'marble-blocks': .9,
  'sandstone-blocks': .9, 'slate-blocks': .9,
});

/** Incorporated ingredients do not remain as separate piles. Their known
 * physical input value follows the unfinished workpiece across interruptions.
 * No value is assigned to progress or an unknown ingredient. */
function unfinishedIngredientValue(pile: MaterialPile): number | undefined {
  if (pile.artWork) {
    const unit = MATERIAL_VALUE[pile.artWork.material];
    return unit === undefined ? undefined : unit * pile.artWork.parts.reduce((a,b) => a+b,0);
  }
  if (pile.gunWork) {
    let sum = 0;
    for (const part of pile.gunWork.parts) {
      const unit = MATERIAL_VALUE[part.item];
      if (unit === undefined) return undefined;
      sum += unit * part.quantity;
    }
    return sum;
  }
  if (pile.unfinished) {
    const material = pile.unfinished.material ?? 'cloth';
    const unit = MATERIAL_VALUE[material];
    return unit === undefined ? undefined : unit * pile.unfinished.parts.reduce((a,b) => a+b,0);
  }
  return undefined;
}

function knownPileValue(pile: MaterialPile): number | undefined {
  if (pile.kind === 'chunk') return 0; // Core ChunkRockBase has no cost, work or MarketValue.
  if (pile.kind === 'unfinished') return unfinishedIngredientValue(pile);
  // A known market value is independent of whether the visitor trades it.
  if (!tradeCatalogueEntry(pile.item)) return undefined;
  const unit = pileMarketValue(pile);
  return unit === undefined ? undefined : unit * pile.quantity;
}

export function colonyWealth(world: World): ColonyWealth {
  const pawns = new Map(world.pawns.map(p => [p.id,p]));
  const unpricedPileIds: number[] = [], unpricedPackedIds: number[] = [], unpricedStructureIds: number[] = [], unpricedPawnIds: number[] = [];
  let items = 0, structures = 0, floors = 0;
  for (const pile of world.piles) {
    if (!pileOnPlayerMap(pile,pawns)) continue;
    const value = knownPileValue(pile);
    if (value === undefined) unpricedPileIds.push(pile.id);
    else items += value;
  }
  // Packed furniture is a physical item, not a second installed building.
  for (const pack of world.packed) {
    const owner = pack.owner;
    if (owner.type !== 'ground' && !colonyPawn(pawns.get(owner.pawnId))) continue;
    try { items += structureRoomMarketValue(pack.building); }
    catch (error) { if (!(error instanceof RangeError)) throw error; unpricedPackedIds.push(pack.building.id); }
  }
  for (const building of world.structures) {
    try {
      // WealthWatcher uses MarketValueIgnoreHp for artificial player buildings.
      structures += structureRoomMarketValue({...building,damage:0});
    } catch (error) { if (!(error instanceof RangeError)) throw error; unpricedStructureIds.push(building.id); }
  }
  for (const tile of world.tiles) floors += floorRoomMarketValue(tile);
  // Pawn MarketValue needs age/life stage, all Core capacities, full skill set,
  // beauty and hediff price offsets. Those facts are absent from this save.
  for (const pawn of world.pawns) if (colonyPawn(pawn)) unpricedPawnIds.push(pawn.id);
  for(const animal of world.wildlife?.animals??[])if(animal.domestic&&animal.state!=='dead')unpricedPawnIds.push(animal.id);
  const pawnsKnown = 0, knownTotal = items + structures + floors + pawnsKnown;
  return {
    items,structures,floors,pawnsKnown,knownTotal,
    knownStorytellerWealth:items+pawnsKnown+(structures+floors)*.5,
    unpricedPileIds,unpricedPackedIds,unpricedStructureIds,unpricedPawnIds,
    complete:unpricedPileIds.length===0&&unpricedPackedIds.length===0&&unpricedStructureIds.length===0&&unpricedPawnIds.length===0,
  };
}
