import { MAX_RELATIONSHIP_LINKS, RELATIONSHIP_KINDS, RELATIONSHIP_VERSION, captureRelationshipIndex,
  isLivingRelationshipPerson, relationshipLinkCompare, type OfferedRelationship,
  type RelationshipPeople, type RelationshipState } from './relationship-state.ts';
import { validHumanAge } from './human-age.ts';
import { captureRelationshipPeople } from './relationship-namespace.ts';
import type { World } from './types.ts';

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
const id = (value: unknown): value is number => integer(value) && value > 0;
const exact = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

export function validRelationshipState(value: unknown, version: number, tick: number): value is RelationshipState | undefined {
  if (value === undefined) return true;
  if (version < RELATIONSHIP_VERSION || !object(value) || !exact(value, ['links'])
    || !Array.isArray(value.links) || value.links.length > MAX_RELATIONSHIP_LINKS) return false;
  for (let n = 0; n < value.links.length; n++) {
    const link = value.links[n];
    if (!object(link) || !exact(link, ['kind', 'aId', 'bId', 'recordedAt'])
      || !RELATIONSHIP_KINDS.includes(link.kind as never) || !id(link.aId) || !id(link.bId) || link.aId === link.bId
      || !integer(link.recordedAt) || link.recordedAt < 0 || link.recordedAt > tick
      || (link.kind !== 'parent' && link.aId >= link.bId)) return false;
    if (n > 0 && relationshipLinkCompare(value.links[n - 1], link as unknown as RelationshipState['links'][number]) >= 0) return false;
  }
  return true;
}

export function validOfferedRelationship(value: unknown, version: number): value is OfferedRelationship | undefined {
  return value === undefined || (version >= RELATIONSHIP_VERSION && object(value)
    && exact(value, ['kind', 'otherId']) && ['parent', 'child', 'sibling'].includes(value.kind as string) && id(value.otherId));
}

/** An announcement needs its captured age and an already owned human identity.
 * Later graph conflicts delay admission; they do not rewrite the announcement. */
export function validAnnouncedRelationshipShape(offer: unknown, world: Pick<World, 'nextId'>, version: number): boolean {
  if (!object(offer) || version < RELATIONSHIP_VERSION && Object.hasOwn(offer, 'relationship')
    || !validOfferedRelationship(offer.relationship, version)) return false;
  if (!offer.relationship) return true;
  if (offer.age === undefined || !validHumanAge(offer.age, version) || offer.relationship.otherId >= world.nextId) return false;
  return true;
}
export function validAnnouncedRelationship(offer: unknown, world: World, version: number, people?: RelationshipPeople): boolean {
  if (!validAnnouncedRelationshipShape(offer, world, version)) return false;
  const relationship = (offer as Record<string, unknown>).relationship as OfferedRelationship | undefined;
  if (!relationship) return true;
  try { return (people ?? captureRelationshipPeople(world)).has(relationship.otherId); } catch { return false; }
}

export interface RelationshipContext { tick: number; nextId: number; people: RelationshipPeople }
/** Context uses the complete *human* namespace, not the global Thing-ID set. */
export function validateRelationships(state: unknown, context: RelationshipContext, version: number, errors: string[] = []): boolean {
  if (!validRelationshipState(state, version, context.tick)) { errors.push('Invalid relationship state.'); return false; }
  if (!state) return true;
  const initialErrors = errors.length;
  // Reject endpoint and sibling-parent fan-out before building derived child
  // lists. A hostile save must not expand a large invalid component quadratically.
  const roots = new Map<number, number>();
  const root = (id: number): number => {
    let current = roots.get(id) ?? id;
    while ((roots.get(current) ?? current) !== current) current = roots.get(current)!;
    let cursor = id;
    while (roots.has(cursor) && roots.get(cursor) !== current) {
      const next = roots.get(cursor)!; roots.set(cursor, current); cursor = next;
    }
    return current;
  };
  for (const link of state.links) {
    if (link.aId >= context.nextId || link.bId >= context.nextId
      || !context.people.has(link.aId) || !context.people.has(link.bId)) {
      errors.push('Relationship endpoint is not a known human.'); return false;
    }
    if (link.kind === 'sibling') {
      const a = root(link.aId), b = root(link.bId);
      if (a !== b) roots.set(Math.max(a, b), Math.min(a, b));
    }
  }
  const preflightParents = new Map<number, Set<number>>();
  for (const link of state.links) if (link.kind === 'parent') {
    const child = root(link.aId), parents = preflightParents.get(child) ?? new Set<number>();
    parents.add(link.bId); preflightParents.set(child, parents);
    if (parents.size > 2) { errors.push('Sibling component has more than two known parents.'); return false; }
  }
  const index = captureRelationshipIndex(state);
  const pairLinks = new Map<string, Set<string>>(), livingPartners = new Map<number, number>();
  const components = new Set<number>();
  for (const link of state.links) {
    components.add(index.component(link.aId)); components.add(index.component(link.bId));
    const key = `${Math.min(link.aId, link.bId)}:${Math.max(link.aId, link.bId)}`;
    const kinds = pairLinks.get(key) ?? new Set<string>();
    kinds.add(link.kind); pairLinks.set(key, kinds);
    if ((link.kind === 'lover' || link.kind === 'spouse')
      && isLivingRelationshipPerson(context.people.get(link.aId)) && isLivingRelationshipPerson(context.people.get(link.bId))) {
      for (const [person, other] of [[link.aId, link.bId], [link.bId, link.aId]]) {
        if (livingPartners.has(person)) errors.push('Human has contradictory living partners.');
        livingPartners.set(person, other);
      }
    }
  }
  for (const [key, kinds] of pairLinks) {
    const [aId, bId] = key.split(':').map(Number);
    const kin = index.kinds(aId, bId).some(kind => kind === 'parent' || kind === 'child' || kind === 'sibling');
    if (kin && [...kinds].some(kind => kind !== 'parent' && kind !== 'sibling')) errors.push('Close family has a contradictory couple link.');
    if (kinds.has('lover') && (kinds.has('spouse') || kinds.has('ex-lover'))) errors.push('Contradictory couple history.');
    // ExSpouse+Lover and ExSpouse+ExLover are legitimate Core histories.
  }
  const indegree = new Map<number, number>(), children = new Map<number, Set<number>>();
  for (const component of components) indegree.set(component, 0);
  for (const child of components) {
    const parents = index.parents(child);
    if (parents.length > 2) errors.push('Sibling component has more than two known parents.');
    const parentComponents = new Set<number>();
    for (const parent of parents) parentComponents.add(index.component(parent));
    if (parentComponents.size !== parents.length) errors.push('Parents belong to the same sibling component.');
    for (const parent of parentComponents) {
      if (parent === child) { errors.push('Human is its own ancestor.'); continue; }
      const next = children.get(parent) ?? new Set<number>();
      if (!next.has(child)) indegree.set(child, indegree.get(child)! + 1);
      next.add(child); children.set(parent, next);
    }
  }
  const queue = [...indegree.keys()].filter(component => indegree.get(component) === 0);
  let visited = 0;
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const parent = queue[cursor]; visited++;
    for (const child of children.get(parent) ?? []) {
      const count = indegree.get(child)! - 1; indegree.set(child, count);
      if (count === 0) queue.push(child);
    }
  }
  if (visited !== components.size) errors.push('Relationship ancestry is cyclic.');
  return errors.length === initialErrors;
}
