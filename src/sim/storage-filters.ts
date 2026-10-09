import { ITEM_DEFINITIONS, type ItemId } from './items.ts';
import { storageConditionAccepts,type StorageConditions } from './storage-condition.ts';
import { SCHEMA_VERSION,type MaterialPile,type StockpileCell } from './types.ts';

export function validStorageItems(items:unknown,version:number=SCHEMA_VERSION):boolean {
  return items===undefined||!!items&&typeof items==='object'&&!Array.isArray(items)&&Object.entries(items).every(([key,value])=>Object.hasOwn(ITEM_DEFINITIONS,key)&&(version>=206||key!=='neutroamine')&&(version>=217||key!=='nutrient-paste-meal')&&typeof value==='boolean');
}

/** A missing item list is the historical category-only rule. Once present,
 * the list is explicit: an omitted item is refused even when its category is on. */
export function storageAccepts(zone: Pick<StockpileCell, 'filters'> & StorageConditions & { items?: Partial<Record<ItemId, boolean>> }, subject: ItemId|MaterialPile): boolean {
  const item=typeof subject==='string'?subject:subject.item;
  return zone.filters[ITEM_DEFINITIONS[item].kind] === true && (zone.items === undefined || zone.items[item] === true)
    &&(typeof subject==='string'||storageConditionAccepts(zone,subject));
}
