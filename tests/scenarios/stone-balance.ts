import { isBlockMaterial } from '../../src/sim/building-materials.ts';
import { requiredMaterial } from '../../src/sim/construction-materials.ts';
import { isStoneKind, STONE_KINDS, type StoneKind } from '../../src/sim/geology.ts';
import type { World } from '../../src/sim/types.ts';

export type StoneAmounts = Record<StoneKind,number>;
export const emptyStoneAmounts=():StoneAmounts=>({granite:0,limestone:0,marble:0,sandstone:0,slate:0});

/** One chunk is worth 20 blocks. Include physical cargo and delivered job piles
 * once, completed/packed constructions, and the actual deconstruction losses.
 * This pilot does not order stone floors or sculptures. */
export function stoneMatter(world:World):StoneAmounts {
  const amount=emptyStoneAmounts();
  for(const pile of world.piles) {
    if(pile.kind==='chunk') {
      const stone=pile.item.slice(0,-'-chunk'.length);
      if(isStoneKind(stone))amount[stone]+=20*pile.quantity;
    } else if(pile.kind==='blocks'&&isBlockMaterial(pile.item))amount[pile.item.slice(0,-'-blocks'.length) as StoneKind]+=pile.quantity;
  }
  for(const stone of STONE_KINDS) {
    const item=`${stone}-blocks` as const;
    for(const structure of world.structures)amount[stone]+=requiredMaterial(structure,item);
    for(const pack of world.packed)amount[stone]+=requiredMaterial(pack.building,item);
    amount[stone]+=world.deconstructed.lostBlocks?.[item]??0;
  }
  return amount;
}

export interface StoneOpening {index:number;stone:StoneKind}
/** Keep only real, currently designated natural-rock cells before a step. */
export function pendingStoneOpenings(world:World):StoneOpening[] {
  const pending:StoneOpening[]=[];
  for(const job of world.jobs)if(job.kind==='mine') {
    const index=job.z*world.width+job.x,tile=world.tiles[index];
    if(tile?.terrain==='rock'&&!tile.ore&&isStoneKind(tile.stone))pending.push({index,stone:tile.stone});
  }
  return pending;
}

/** A new rough floor proves that a real excavation completed this step. */
export function completedStoneOpenings(world:World,pending:readonly StoneOpening[]):StoneKind[] {
  return pending.filter(({index})=>world.tiles[index]?.terrain==='rough-stone').map(({stone})=>stone);
}
