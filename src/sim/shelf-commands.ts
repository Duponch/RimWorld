import { validStorageSettings } from './designation.ts';
import { patchStockpilePolicy } from './stockpile-zones.ts';
import { ITEM_DEFINITIONS } from './items.ts';
import type { StorageSettings, World } from './types.ts';

export type ShelfPolicyResult = { ok: true } | { ok: false; reason: string };
/** Policy only. The command dispatcher owns cargo release, planner wake-up
 * and refresh after its common drop preflight; this never moves a pile. */
export function patchShelfPolicy(world: World, structureId: number, settings: StorageSettings): ShelfPolicyResult {
  const structure = world.structures.find(s => s.id === structureId && (s.kind === 'shelf' || s.kind === 'small-shelf'));
  if (!structure?.shelf) return { ok: false, reason: 'Étagère installée absente.' };
  const keys = new Set(['filters', 'items', 'priority', 'capacity', 'quality', 'hitPoints', 'allowFresh', 'allowRotten']);
  const filterKeys = new Set<string>(['furniture',...Object.values(ITEM_DEFINITIONS).map(item=>item.kind)]);
  if (!settings || typeof settings !== 'object' || Array.isArray(settings) || Reflect.ownKeys(settings).some(key => typeof key!=='string'||!keys.has(key))
    || settings.filters && (typeof settings.filters!=='object'||Array.isArray(settings.filters) || Reflect.ownKeys(settings.filters).some(key=>typeof key!=='string'||!filterKeys.has(key)||typeof settings.filters![key as keyof typeof settings.filters]!=='boolean'))
    || !validStorageSettings(settings, world.schemaVersion)) return { ok: false, reason: 'Politique de stockage invalide.' };
  // Reuse the ordinary patch semantics, including explicit undefined clears;
  // build privately before adopting so neither caller nor prior policy aliases.
  const next = { ...structure.shelf.settings, filters: { ...structure.shelf.settings.filters },
    ...structure.shelf.settings.items ? { items: { ...structure.shelf.settings.items } } : {},
    ...structure.shelf.settings.quality ? { quality: { ...structure.shelf.settings.quality } } : {},
    ...structure.shelf.settings.hitPoints ? { hitPoints: { ...structure.shelf.settings.hitPoints } } : {},
    id: structure.id, x: structure.x, z: structure.z };
  patchStockpilePolicy(next, settings);
  // This legacy policy field is meaningful only on ground zones. Shelves
  // have three real stacks per cell, each limited by its own ItemDef.
  next.capacity = 500;
  const { id: _id, x: _x, z: _z, ...policy } = next;
  structure.shelf.settings = policy;
  return { ok: true };
}
