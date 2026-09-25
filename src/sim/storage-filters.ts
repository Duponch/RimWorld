import { ITEM_DEFINITIONS, type ItemId } from './items.ts';
import type { StockpileCell } from './types.ts';

export function validStorageItems(items:unknown):boolean {
  return items===undefined||!!items&&typeof items==='object'&&!Array.isArray(items)&&Object.entries(items).every(([key,value])=>Object.hasOwn(ITEM_DEFINITIONS,key)&&typeof value==='boolean');
}

/** A missing item list is the historical category-only rule. Once present,
 * the list is explicit: an omitted item is refused even when its category is on. */
export function storageAccepts(zone: Pick<StockpileCell, 'filters'> & { items?: Partial<Record<ItemId, boolean>> }, item: ItemId): boolean {
  return zone.filters[ITEM_DEFINITIONS[item].kind] === true && (zone.items === undefined || zone.items[item] === true);
}
