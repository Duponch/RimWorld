// Pure relationship graph: no imports from World, social, health or presentation.
export const RELATIONSHIP_VERSION = 195;
export const MAX_RELATIONSHIP_LINKS = 32768; // Local safety cap, not a Core population rule.
export const RELATIONSHIP_KINDS = ['parent', 'sibling', 'lover', 'spouse', 'ex-lover', 'ex-spouse'] as const;
export type RelationshipKind = typeof RELATIONSHIP_KINDS[number];
export type RelationshipViewKind = RelationshipKind | 'child';
export interface RelationshipLink {
  kind: RelationshipKind;
  aId: number; // Parent: child. Symmetric kinds: smaller ID.
  bId: number; // Parent: parent. Symmetric kinds: larger ID.
  recordedAt: number; // Registration, never an invented birth/wedding date.
}
export interface RelationshipState { links: RelationshipLink[] }
export interface OfferedRelationship {
  kind: 'parent' | 'child' | 'sibling'; // Seen from the person announced by the offer.
  otherId: number;
}
export interface RelationshipPerson {
  id: number;
  name: string;
  status: 'present' | 'away' | 'departed' | 'dead';
  deathAt?: number; // Ephemeral projection of an actual clinical death, never a departure-as-death.
}
export type RelationshipPeople = ReadonlyMap<number, RelationshipPerson>;
export const RELATIONSHIP_IMPORTANCE: Readonly<Record<RelationshipViewKind, number>> = {
  parent: 195, child: 190, sibling: 185, lover: 200, spouse: 210, 'ex-lover': 125, 'ex-spouse': 130,
};
export const RELATIONSHIP_OPINION: Readonly<Record<RelationshipViewKind, number>> = {
  parent: 30, child: 30, sibling: 20, lover: 35, spouse: 30, 'ex-lover': -15, 'ex-spouse': -15,
};
export const FAMILY_DEATH_MOOD = { parent: -8, child: -20, sibling: -14, lover: -16, spouse: -20 } as const;
export type FamilyDeathRelation = keyof typeof FAMILY_DEATH_MOOD;

export interface RelationshipIndex {
  readonly links: readonly Readonly<RelationshipLink>[];
  component(id: number): number;
  parents(id: number): readonly number[];
  children(id: number): readonly number[];
  kinds(observerId: number, otherId: number): readonly RelationshipViewKind[];
  knownBloodRelated(aId: number, bId: number): boolean;
}

export function relationshipLinkCompare(a: RelationshipLink, b: RelationshipLink): number {
  return RELATIONSHIP_KINDS.indexOf(a.kind) - RELATIONSHIP_KINDS.indexOf(b.kind)
    || a.aId - b.aId || a.bId - b.bId;
}

/** An explicit local Sibling assertion denotes a full sibling component.
 * Known parents are shared within it; no missing world person is generated.
 * Two components with the same two known parents also read as Sibling. */
export function captureRelationshipIndex(state?: RelationshipState): RelationshipIndex {
  const links = (state?.links ?? []).map(link => Object.freeze({ ...link }));
  const roots = new Map<number, number>();
  const find = (id: number): number => {
    let root = roots.get(id) ?? id;
    while ((roots.get(root) ?? root) !== root) root = roots.get(root)!;
    let cursor = id;
    while (roots.has(cursor) && roots.get(cursor) !== root) {
      const next = roots.get(cursor)!;
      roots.set(cursor, root);
      cursor = next;
    }
    return root;
  };
  for (const link of links) {
    roots.set(link.aId, roots.get(link.aId) ?? link.aId);
    roots.set(link.bId, roots.get(link.bId) ?? link.bId);
    if (link.kind !== 'sibling') continue;
    const a = find(link.aId), b = find(link.bId);
    if (a !== b) roots.set(Math.max(a, b), Math.min(a, b));
  }
  const members = new Map<number, number[]>();
  for (const id of roots.keys()) {
    const component = find(id);
    const group = members.get(component) ?? [];
    group.push(id);
    members.set(component, group);
  }
  for (const group of members.values()) group.sort((a, b) => a - b);
  const parentSets = new Map<number, Set<number>>();
  const pairKinds = new Map<string, RelationshipViewKind[]>();
  const pairKey = (a: number, b: number): string => `${Math.min(a, b)}:${Math.max(a, b)}`;
  for (const link of links) {
    if (link.kind === 'parent') {
      const child = find(link.aId), parents = parentSets.get(child) ?? new Set<number>();
      parents.add(link.bId);
      parentSets.set(child, parents);
    } else if (link.kind !== 'sibling') {
      const key = pairKey(link.aId, link.bId), kinds = pairKinds.get(key) ?? [];
      kinds.push(link.kind);
      pairKinds.set(key, kinds);
    }
  }
  const parentLists = new Map<number, readonly number[]>();
  const childSets = new Map<number, Set<number>>();
  for (const [component, parents] of parentSets) {
    parentLists.set(component, Object.freeze([...parents].sort((a, b) => a - b)));
    for (const parent of parents) {
      const children = childSets.get(parent) ?? new Set<number>();
      for (const child of members.get(component) ?? []) children.add(child);
      childSets.set(parent, children);
    }
  }
  const childLists = new Map<number, readonly number[]>();
  for (const [parent, children] of childSets) childLists.set(parent, Object.freeze([...children].sort((a, b) => a - b)));
  const none = Object.freeze([]) as readonly number[];
  const parents = (id: number): readonly number[] => parentLists.get(find(id)) ?? none;
  const children = (id: number): readonly number[] => childLists.get(id) ?? none;
  const kinds = (observerId: number, otherId: number): readonly RelationshipViewKind[] => {
    if (observerId === otherId) return [];
    const result = [...(pairKinds.get(pairKey(observerId, otherId)) ?? [])];
    if (parents(observerId).includes(otherId)) result.push('parent');
    if (parents(otherId).includes(observerId)) result.push('child');
    const aParents = parents(observerId), bParents = parents(otherId);
    if (find(observerId) === find(otherId) || (aParents.length === 2 && bParents.length === 2
      && aParents[0] === bParents[0] && aParents[1] === bParents[1])) result.push('sibling');
    return result.sort((a, b) => RELATIONSHIP_IMPORTANCE[b] - RELATIONSHIP_IMPORTANCE[a]);
  };
  // Sparse oriented ancestry, including self/component. Each owner is visited
  // once; no unbounded recursion, matrix or undirected traversal via children.
  const ancestors = (id: number): Set<number> => {
    const start = find(id), visited = new Set([start]), queue = [start];
    for (let cursor = 0; cursor < queue.length; cursor++) for (const parent of parents(queue[cursor])) {
      const component = find(parent);
      if (!visited.has(component)) { visited.add(component); queue.push(component); }
    }
    return visited;
  };
  const knownBloodRelated = (aId: number, bId: number): boolean => {
    if (aId === bId) return false;
    const a = ancestors(aId), b = ancestors(bId);
    for (const ancestor of a) if (b.has(ancestor)) return true;
    return false;
  };
  return Object.freeze({ links: Object.freeze(links), component: find, parents, children, kinds, knownBloodRelated });
}

export function relationshipKinds(index: RelationshipIndex, observerId: number, otherId: number): readonly RelationshipViewKind[] {
  return index.kinds(observerId, otherId);
}
export function relationshipOpinionOffset(index: RelationshipIndex, observerId: number, otherId: number): number {
  return index.kinds(observerId, otherId).reduce((sum, kind) => sum + RELATIONSHIP_OPINION[kind], 0);
}
export function areCloseKin(index: RelationshipIndex, aId: number, bId: number): boolean {
  return index.kinds(aId, bId).some(kind => kind === 'parent' || kind === 'child' || kind === 'sibling');
}
export function hasKnownBloodRelation(index: RelationshipIndex, aId: number, bId: number): boolean {
  return index.knownBloodRelated(aId, bId);
}

/** Local subset of Core SecondaryRomance factors. Very close kin are
 * explicitly refused locally. Other recognized implied factors multiply;
 * remaining known blood is compressed to one Kin .5 factor. No UI relation,
 * opinion or grief is created from this admission-only view. */
export function knownRomanceChanceFactor(index: RelationshipIndex, observerId: number, otherId: number): number {
  if (observerId === otherId || areCloseKin(index, observerId, otherId)) return 0;
  const sameKnownParent = (a: number, b: number): boolean => a !== b
    && (index.component(a) === index.component(b) || index.parents(a).some(parent => index.parents(b).includes(parent)));
  const grandparent = (me: number, other: number): boolean => me !== other
    && index.parents(me).some(parent => index.parents(parent).includes(other));
  const uncle = (me: number, other: number): boolean => me !== other && !index.parents(me).includes(other)
    && index.parents(me).some(parent => sameKnownParent(parent, other));
  const cousin = (me: number, other: number): boolean => me !== other
    && index.parents(other).some(parent => uncle(me, parent));
  let factor = 1, recognized = false;
  // HalfSibling's worker excludes full Sibling, already refused above.
  if (sameKnownParent(observerId, otherId)) { factor *= .03; recognized = true; }
  for (const match of [grandparent(observerId, otherId), grandparent(otherId, observerId),
    uncle(observerId, otherId), uncle(otherId, observerId), cousin(observerId, otherId)]) {
    if (match) { factor *= .25; recognized = true; }
  }
  return recognized ? factor : index.knownBloodRelated(observerId, otherId) ? .5 : 1;
}
export function closestFamilyRelation(index: RelationshipIndex, observerId: number, deceasedId: number): FamilyDeathRelation | undefined {
  const kind = index.kinds(observerId, deceasedId)[0];
  return kind && Object.hasOwn(FAMILY_DEATH_MOOD, kind) ? kind as FamilyDeathRelation : undefined;
}
export function isLivingRelationshipPerson(person?: RelationshipPerson): boolean {
  return person?.status === 'present' || person?.status === 'away';
}
/** A removed/dead historical partner is retained in the graph but does not forbid a new living couple. */
export function livingPartnerId(index: RelationshipIndex, people: RelationshipPeople, personId: number): number | undefined {
  if (!isLivingRelationshipPerson(people.get(personId))) return undefined;
  for (const link of index.links) {
    if (link.kind !== 'lover' && link.kind !== 'spouse') continue;
    const other = link.aId === personId ? link.bId : link.bId === personId ? link.aId : undefined;
    if (other !== undefined && isLivingRelationshipPerson(people.get(other))) return other;
  }
  return undefined;
}

export interface RelationshipAge { biologicalYears: number; chronologicalYears: number }
function intervalFactor(min: number, mid: number, max: number, x: number): number {
  if (x <= min || x >= max) return 0;
  if (x === mid) return 1;
  return Math.pow(x < mid ? (x - min) / (mid - min) : (max - x) / (max - mid), 1.6);
}
/** GenMath/ChildRelationUtility numeric rule, with the accepted local minimum of the two parent curves. */
export function parentAgeFactor(parent: RelationshipAge, child: RelationshipAge): number {
  const values = [parent.biologicalYears, parent.chronologicalYears, child.biologicalYears, child.chronologicalYears];
  if (values.some(value => !Number.isFinite(value) || value < 0)
    || parent.chronologicalYears < parent.biologicalYears || child.chronologicalYears < child.biologicalYears) return 0;
  const lower = Math.max(parent.biologicalYears - child.chronologicalYears, 0);
  const upper = Math.min(parent.biologicalYears, parent.chronologicalYears - child.chronologicalYears);
  if (lower > upper) return 0;
  const factor = (min: number, mid: number, max: number): number => lower <= mid && upper >= mid ? 1
    : Math.max(intervalFactor(min, mid, max, lower), intervalFactor(min, mid, max, upper));
  return Math.min(factor(16, 27, 45), factor(14, 30, 50));
}

/** Accepted local minimum of Core's two gender-specific age curves. Beauty=1
 * until a real beauty profile exists; this helper does not infer gender. */
export function romanceAgeFactor(aBiologicalYears: number, bBiologicalYears: number): number {
  if (![aBiologicalYears, bBiologicalYears].every(value => Number.isFinite(value) && value >= 18)) return 0;
  const gap = Math.abs(aBiologicalYears - bBiologicalYears);
  return gap <= 3 ? 1 : gap >= 10 ? .2 : 1 - .8 * (gap - 3) / 7;
}
