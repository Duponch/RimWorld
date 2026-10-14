/** Pile-aware versioned mass projection preserving historical item contracts. */
import type {MaterialPile} from './types.ts';
import {commercialItemMassGrams} from './commercial-mass.ts';
import type {MinifiedTreePile} from './tree-transfer-state.ts';
import {isMinifiedTree} from './tree-transfer-state.ts';
import {treePileMassGrams} from './tree-transfer-rules.ts';
import {hasTreePayload} from './tree-transfer-save.ts';
export function physicalTravelUnitMass(pile:MaterialPile|MinifiedTreePile,version:number):number|undefined {
  if(version<235)return hasTreePayload(pile)?undefined:commercialItemMassGrams(pile.item as MaterialPile['item'],version);
  if(isMinifiedTree(pile))return treePileMassGrams(pile);
  if(hasTreePayload(pile))return;
  if(pile.item==='wood')return 400; // Core WoodLog0.4kg inside actual container.
  return commercialItemMassGrams(pile.item,version);
}