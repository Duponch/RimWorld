import { colonyPile } from '../sim/materials';
import { ITEM_DEFINITIONS, type ItemId } from '../sim/items';
import type { World } from '../sim/types';

/** Update in place: adding an item count never rebuilds the whole HUD. */
export function updateFoodStocks(container: HTMLElement, world: World): void {
  const counts = new Map<ItemId, number>();
  for (const pile of world.piles) if (pile.kind === 'food' && colonyPile(world,pile)) counts.set(pile.item, (counts.get(pile.item) ?? 0) + pile.quantity);
  for (const id of ['berries', 'rice', 'potato', 'corn', 'hare-meat', 'simple-meal', 'survival-meal', 'legacy-portion'] as const) {
    let row = container.querySelector<HTMLElement>(`[data-item="${id}"]`);
    if (!row) {
      row = document.createElement('div'); row.className = 'resource'; row.dataset.item = id;
      const label = document.createElement('span'); label.textContent = ITEM_DEFINITIONS[id].label;
      const count = document.createElement('strong'); row.append(label, count); container.append(row);
    }
    row.hidden = !counts.has(id); row.querySelector('strong')!.textContent = String(counts.get(id) ?? 0);
    row.title = `${ITEM_DEFINITIONS[id].nutrition / 100} nutrition par unité`;
  }
}
