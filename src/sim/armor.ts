import { BODY_PARTS, HUMAN_BODY, bodyPartExists, type BodyGroup, type BodyPartId } from './body-definition.ts';

/** Pure impact boundary; inventory and transactions belong to its World adapter.
 * Compile profiles once; pass actual instances in their stable wearing order.
 * Provenance and integration requirements: development/armor.md. */
export const APPAREL_LAYERS = ['skin', 'middle', 'shell', 'belt', 'headgear', 'eyes'] as const;
export type ApparelLayer = typeof APPAREL_LAYERS[number];
export type ArmorCategory = 'sharp' | 'blunt' | 'heat';
export type ArmorRatings = Readonly<Record<ArmorCategory, number>>;
export interface ApparelCoverage {
  readonly layers: readonly ApparelLayer[];
  readonly parts: readonly BodyPartId[];
  readonly outerLayer: number;
}
export interface ArmorPiece {
  readonly id: number;
  readonly coverage: ApparelCoverage;
  /** Already resolved material/quality stats, captured before wear damage. */
  readonly ratings: ArmorRatings;
  readonly hitPoints: number;
}
export interface ArmorHit {
  readonly amount: number;
  readonly penetration: number;
  readonly category: ArmorCategory | null;
  readonly part: BodyPartId;
}
export interface ArmorWear {
  readonly id: number;
  readonly damage: number;
  readonly remaining: number;
}
export interface ArmorResult {
  readonly amount: number;
  /** Injury category after mitigation, not the stat used by subsequent layers. */
  readonly category: ArmorCategory | null;
  readonly wear: readonly ArmorWear[];
}
const groups = new Set(HUMAN_BODY.flatMap(p => p.groups));
const categories: readonly ArmorCategory[] = ['sharp', 'blunt', 'heat'];
const finite = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1_000_000;

/** Groups can overlap without having the same name (upper-head/full-head).
 * Coverage does not descend through the tree: a torso garment excludes hands,
 * but covers internal organs explicitly belonging to the torso group. */
export function apparelCoverage(layers: readonly ApparelLayer[], coveredGroups: readonly BodyGroup[]): ApparelCoverage {
  if (!layers.length || !coveredGroups.length || new Set(layers).size !== layers.length || new Set(coveredGroups).size !== coveredGroups.length
    || layers.some(l => !APPAREL_LAYERS.includes(l)) || coveredGroups.some(g => !groups.has(g))) throw new RangeError('Invalid apparel coverage');
  return Object.freeze({
    layers: Object.freeze([...layers]),
    parts: Object.freeze(HUMAN_BODY.filter(p => p.groups.some(g => coveredGroups.includes(g))).map(p => p.id)),
    outerLayer: Math.max(...layers.map(l => APPAREL_LAYERS.indexOf(l))),
  });
}
/** Compatibility uses the natural body, not currently missing limbs. */
export function apparelCompatible(a: ApparelCoverage, b: ApparelCoverage): boolean {
  return !a.layers.some(l => b.layers.includes(l)) || !a.parts.some(p => b.parts.includes(p));
}
function validateRatings(r: ArmorRatings): void {
  if (!r || categories.some(c => !finite(r[c]))) throw new RangeError('Invalid armor ratings');
}
function validateCoverage(c: ApparelCoverage): void {
  if (!c || !Array.isArray(c.layers) || !c.layers.length || c.layers.some(l => !APPAREL_LAYERS.includes(l))
    || new Set(c.layers).size !== c.layers.length || !Array.isArray(c.parts) || !c.parts.length || c.parts.some(p => !bodyPartExists(p))
    || new Set(c.parts).size !== c.parts.length || c.outerLayer !== Math.max(...c.layers.map(l => APPAREL_LAYERS.indexOf(l)))) throw new RangeError('Invalid compiled coverage');
}

/** Returns a transaction: input instances are never mutated or removed. Even a
 * piece destroyed by wear protects this impact using its captured rating. Apply
 * wear and anatomy together with the caller's local PRNG only after success.
 * Body armor is last. A zero rating still consumes its reference armor draw.
 * The World adapter captures worn instances and commits the resulting wear. */
export function resolveArmor(hit: ArmorHit, pieces: readonly ArmorPiece[], bodyArmor: ArmorRatings, random: () => number): ArmorResult {
  if (!hit || !finite(hit.amount) || !finite(hit.penetration) || !bodyPartExists(hit.part) || BODY_PARTS[hit.part].conceptual
    || hit.category !== null && !categories.includes(hit.category)) throw new RangeError('Invalid armor hit');
  validateRatings(bodyArmor);
  const ids = new Set<number>();
  for (const p of pieces) {
    if (!Number.isSafeInteger(p.id) || p.id <= 0 || ids.has(p.id) || !Number.isSafeInteger(p.hitPoints) || p.hitPoints <= 0 || p.hitPoints > 1_000_000) throw new RangeError('Invalid armor instance');
    ids.add(p.id); validateRatings(p.ratings); validateCoverage(p.coverage);
  }
  let amount = hit.amount, category = hit.category;
  const wear: ArmorWear[] = [];
  if (!amount || category === null) return { amount, category, wear };
  const armorStat = category; // Remains sharp after an earlier sharp -> blunt conversion.
  const draw = () => { const value = random(); if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('Invalid armor random'); return value; };
  // Intentionally draw even for an integer, matching the reference round rule.
  const round = (n: number) => Math.floor(n) + (draw() < n % 1 ? 1 : 0);
  const mitigate = (rating: number) => {
    const effective = Math.max(0, rating - hit.penetration), roll = draw();
    if (roll < effective / 2) amount = 0;
    else if (roll < effective) { amount = round(amount / 2); if (category === 'sharp') category = 'blunt'; }
  };
  // Stable sort then reverse reproduces outermost first, with a deterministic
  // tie order; do not duplicate a garment occupying several layers.
  const ordered = [...pieces].sort((a, b) => a.coverage.outerLayer - b.coverage.outerLayer);
  for (let i = ordered.length - 1; i >= 0; i--) {
    const p = ordered[i]!;
    if (!p.coverage.parts.includes(hit.part)) continue;
    const damage = round(amount / 4);
    wear.push({ id: p.id, damage, remaining: Math.max(0, p.hitPoints - damage) });
    mitigate(p.ratings[armorStat]);
    if (amount < .001) return { amount: 0, category, wear };
  }
  mitigate(bodyArmor[armorStat]);
  return { amount: amount < .001 ? 0 : amount, category, wear };
}
