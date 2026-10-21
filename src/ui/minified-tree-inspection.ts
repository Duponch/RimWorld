import {floraDefinition} from '../sim/biome-flora';
import type {MinifiedTreePile} from '../sim/tree-transfer-state';
import {treePackExpiry271} from '../sim/tree-transfer-rules';

/** Pure text for one inspected object; no world scan or life-clock mutation. */
export function minifiedTreeDescription(pile:MinifiedTreePile,tick:number):string {
 const label=floraDefinition(pile.innerResource)?.label??'Arbre',pending=pile.plantPack.pendingExpiry;
 return pending?`${label} · Arbre mort · Bois à déposer : ${pending.quantity} · Dépôt complet des restes en attente · 150 kg`:
  `${label} · Croissance : ${Math.round((pile.innerResource.growth??1)*100)} % · À replanter sous ${Math.max(0,Math.ceil((treePackExpiry271(pile)-tick)/6000))} jour(s) · 150 kg`;
}
