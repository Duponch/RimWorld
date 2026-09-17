import { weaponLabel } from '../sim/equipment-rules';
import type { Pawn,World,MaterialPile } from '../sim/types';

/** Snapshot projection shared by GPU attachment and portrait/inspection labels.
 * Inventory and working cargo remain separate owners. */
export function equipmentProjection(world:World):ReadonlyMap<number,MaterialPile>{
  const result=new Map<number,MaterialPile>();
  for(const pile of world.piles)if(pile.owner.type==='equipment')result.set(pile.owner.pawnId,pile);
  return result;
}
export function equipmentDescription(pile:MaterialPile|undefined,pawn?:Pawn):string {
  return pile?`${weaponLabel(pile)} · ${pile.weapon!.hitPoints}/100 PV${pawn?.equipmentDropPending?' · dépôt en attente':''}`:'Aucune arme équipée';
}
