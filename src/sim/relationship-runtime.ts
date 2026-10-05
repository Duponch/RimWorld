import type { World } from './types.ts';
import { captureRelationshipIndex, relationshipLinkCompare,
  type RelationshipIndex, type RelationshipLink } from './relationship-state.ts';
import { captureRelationshipPeople } from './relationship-namespace.ts';
import { validateRelationships } from './relationship-save.ts';

// All producers replace the links array. No tick/health-dependent person cache.
const indexes = new WeakMap<RelationshipLink[], RelationshipIndex>();
const empty = captureRelationshipIndex();
export function relationshipIndex(world: Pick<World, 'relationships'>): RelationshipIndex {
  const links = world.relationships?.links;
  if (!links) return empty;
  let index = indexes.get(links);
  if (!index) { index = captureRelationshipIndex({ links }); indexes.set(links, index); }
  return index;
}

/** Validate a whole proposed graph before changing the owner. RNG and admissions
 * remain the caller's transaction; a refused graph leaves this world untouched. */
export function replaceRelationshipLinks(world: World, links: readonly RelationshipLink[]): boolean {
  const state = { links: links.map(link => ({ ...link })).sort(relationshipLinkCompare) };
  try {
    if (!validateRelationships(state, { tick: world.tick, nextId: world.nextId,
      people: captureRelationshipPeople(world) }, world.schemaVersion)) return false;
  } catch { return false; }
  world.relationships = state;
  return true;
}
export function tryAddRelationship(world: World, link: RelationshipLink): boolean {
  return replaceRelationshipLinks(world, [...(world.relationships?.links ?? []), link]);
}
