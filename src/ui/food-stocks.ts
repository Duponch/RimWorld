import { colonyPile } from '../sim/materials';
import { ITEM_DEFINITIONS, type ItemId } from '../sim/items';
import { FOOD_ITEMS } from '../sim/food-policy';
import type { World } from '../sim/types';
import {modelIconUrl} from './pictograms';

const firstItems=['berries','rice','potato','corn','hare-meat','simple-meal','nutrient-paste-meal','fine-meal','vegetarian-fine-meal','carnivore-fine-meal','lavish-meal','vegetarian-lavish-meal','carnivore-lavish-meal','survival-meal','legacy-portion'] as const;
const foodStockItems=[...firstItems,...FOOD_ITEMS.filter(id=>!firstItems.some(first=>first===id))];

/** Update in place: adding an item count never rebuilds the whole HUD. */
export function updateFoodStocks(container: HTMLElement, world: World): void {
  const counts = new Map<ItemId, number>();
  for (const pile of world.piles) if (pile.kind === 'food' && colonyPile(world,pile)) counts.set(pile.item, (counts.get(pile.item) ?? 0) + pile.quantity);
  for (const id of foodStockItems) {
    let row = container.querySelector<HTMLElement>(`[data-item="${id}"]`);
    if (!row) {
      row = document.createElement('div'); row.className = 'resource'; row.dataset.item = id;
      const icon=document.createElement('span');icon.className='resource-symbol ui-icon';icon.setAttribute('aria-hidden','true');icon.style.backgroundImage=`url('${modelIconUrl(`item-${id}`)}')`;icon.style.backgroundSize='contain';icon.style.backgroundPosition='center';
      const label = document.createElement('span'); label.textContent = ITEM_DEFINITIONS[id].label;
      const count = document.createElement('strong'); row.append(icon,label, count); container.append(row);
    }
    row.hidden = !counts.has(id); row.querySelector('strong')!.textContent = String(counts.get(id) ?? 0);
    row.title = `${ITEM_DEFINITIONS[id].nutrition / 100} nutrition par unité`;
  }
}
