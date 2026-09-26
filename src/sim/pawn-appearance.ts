import type { Pawn } from './types';

/** Persisted visual identity. Sex is a drawing choice, not a biological or gameplay field. */
export interface PawnAppearance {
  version: 1;
  sex: 'male' | 'female';
  bodyType: BodyTypeId;
  headType: HeadTypeId;
  hair: HairId;
  beard: BeardId;
  skinColor: number;
  hairColor: number;
}

export const BODY_TYPES = [
  { id: 'Male', width: 1, height: .9 },
  { id: 'Female', width: 1, height: 1 },
  { id: 'Thin', width: .6, height: 1 },
  { id: 'Hulk', width: 1, height: 1.25 },
  { id: 'Fat', width: 1.5, height: 1 },
] as const;
export type BodyTypeId = typeof BODY_TYPES[number]['id'];

export const HEAD_TYPES = [
  { id: 'Male_AverageNormal', sex: 'male', width: 'average', jaw: 'normal' },
  { id: 'Male_AveragePointy', sex: 'male', width: 'average', jaw: 'pointy' },
  { id: 'Male_AverageWide', sex: 'male', width: 'average', jaw: 'wide' },
  { id: 'Male_NarrowNormal', sex: 'male', width: 'narrow', jaw: 'normal' },
  { id: 'Male_NarrowPointy', sex: 'male', width: 'narrow', jaw: 'pointy' },
  { id: 'Male_NarrowWide', sex: 'male', width: 'narrow', jaw: 'wide' },
  { id: 'Female_AverageNormal', sex: 'female', width: 'average', jaw: 'normal' },
  { id: 'Female_AveragePointy', sex: 'female', width: 'average', jaw: 'pointy' },
  { id: 'Female_AverageWide', sex: 'female', width: 'average', jaw: 'wide' },
  { id: 'Female_NarrowNormal', sex: 'female', width: 'narrow', jaw: 'normal' },
  { id: 'Female_NarrowPointy', sex: 'female', width: 'narrow', jaw: 'pointy' },
  { id: 'Female_NarrowWide', sex: 'female', width: 'narrow', jaw: 'wide' },
] as const;
export type HeadTypeId = typeof HEAD_TYPES[number]['id'];

/** The 26 Core Urban hair defs available to a non-Ideology PlayerColony. Shapes are local interpretations. */
export const HAIR_STYLES = [
  { id: 'Lackland', shape: 'short' }, { id: 'Revolt', shape: 'swept' },
  { id: 'Pigtails', shape: 'tails' }, { id: 'Afro', shape: 'afro' },
  { id: 'Burgundy', shape: 'swept' }, { id: 'Troubadour', shape: 'long' },
  { id: 'GreasySwoop', shape: 'swept' }, { id: 'Cute', shape: 'long' },
  { id: 'Decent', shape: 'long' }, { id: 'FancyBun', shape: 'bun' },
  { id: 'Senorita', shape: 'bun' }, { id: 'Flowy', shape: 'long' },
  { id: 'Long', shape: 'long' }, { id: 'Mop', shape: 'messy' },
  { id: 'Wavy', shape: 'wavy' }, { id: 'Messy', shape: 'messy' },
  { id: 'Curly', shape: 'curly' }, { id: 'Fringe', shape: 'fringe' },
  { id: 'Frozen', shape: 'long' }, { id: 'Ponytails', shape: 'tails' },
  { id: 'Bowlcut', shape: 'bowl' }, { id: 'Bravo', shape: 'short' },
  { id: 'Rockstar', shape: 'long' }, { id: 'Snazzy', shape: 'swept' },
  { id: 'Shaved', shape: 'shaved' }, { id: 'Mohawk', shape: 'mohawk' },
] as const;
export type HairId = typeof HAIR_STYLES[number]['id'];
export type HairShape = typeof HAIR_STYLES[number]['shape'];

/** Core beard defs with Urban or Rural tags, plus NoBeard. */
export const BEARD_STYLES = [
  { id: 'NoBeard', shape: 'none', weight: 10 },
  { id: 'Boxed', shape: 'full', weight: .3 },
  { id: 'Circle', shape: 'goatee', weight: .3 },
  { id: 'Curtain', shape: 'full', weight: .3 },
  { id: 'BushyStyled', shape: 'full', weight: .3 },
  { id: 'Ducktail', shape: 'long', weight: .3 },
  { id: 'French', shape: 'goatee', weight: .2 },
  { id: 'Full', shape: 'full', weight: .2 },
  { id: 'Goatee', shape: 'goatee', weight: .2 },
  { id: 'Classy', shape: 'moustache', weight: .2 },
  { id: 'Lincoln', shape: 'full', weight: .1 },
  { id: 'LongDutch', shape: 'long', weight: .1 },
  { id: 'Moustache', shape: 'moustache', weight: .2 },
  { id: 'MuttonChops', shape: 'chops', weight: .1 },
  { id: 'OldDutch', shape: 'long', weight: .1 },
  { id: 'SideWhiskers', shape: 'chops', weight: .1 },
  { id: 'Stubble', shape: 'stubble', weight: .3 },
  { id: 'VanDyke', shape: 'goatee', weight: .2 },
  { id: 'Wizard', shape: 'long', weight: .1 },
] as const;
export type BeardId = typeof BEARD_STYLES[number]['id'];
export type BeardShape = typeof BEARD_STYLES[number]['shape'];

/** Core melanin bins for a faction with the default 0–1 melanin range. */
export const SKIN_COLORS = [
  { color: 0xf2ede0, cumulative: .10 }, { color: 0xffefd5, cumulative: .25 },
  { color: 0xffefc9, cumulative: .45 }, { color: 0xffefbd, cumulative: .58 },
  { color: 0xf9dba5, cumulative: .63 }, { color: 0xf2c78c, cumulative: .75 },
  { color: 0xe49e5a, cumulative: .83 }, { color: 0x825b30, cumulative: .90 },
  { color: 0x634624, cumulative: 1 },
] as const;

/** Core gene base colors and weights; most receive an independent brightness draw below. */
export const HAIR_COLORS = [
  { id: 'Hair_SnowWhite', color: 0xfafafa, weight: .05 },
  { id: 'Hair_InkBlack', color: 0x191919, weight: .05 },
  { id: 'Hair_Gray', color: 0xa6a6a6, weight: .02 },
  { id: 'Hair_DarkBlack', color: 0x333333, weight: 1.5 },
  { id: 'Hair_MidBlack', color: 0x4f4742, weight: 1.5 },
  { id: 'Hair_DarkReddish', color: 0x403326, weight: 1.5 },
  { id: 'Hair_DarkSaturatedReddish', color: 0x382412, weight: 1.5 },
  { id: 'Hair_DarkBrown', color: 0x5a3a20, weight: 1 },
  { id: 'Hair_ReddishBrown', color: 0x84532f, weight: 1 },
  { id: 'Hair_SandyBlonde', color: 0xc19255, weight: 1, darkSkinFactor: 0 },
  { id: 'Hair_Blonde', color: 0xedca9c, weight: 1, darkSkinFactor: 0 },
  { id: 'Hair_Pink', color: 0xbf5695, weight: .05 },
  { id: 'Hair_LightPurple', color: 0xe373ff, weight: .05 },
  { id: 'Hair_LightBlue', color: 0x223fe3, weight: .05 },
  { id: 'Hair_LightTeal', color: 0x34bfb6, weight: .05 },
  { id: 'Hair_LightGreen', color: 0x48c928, weight: .05 },
  { id: 'Hair_LightOrange', color: 0xbd8531, weight: .05 },
  { id: 'Hair_BrightRed', color: 0xbf5656, weight: .05 },
] as const;

function hash(seed: number, id: number, name: string, salt: number): number {
  let x = (seed | 0) ^ Math.imul(id | 0, 0x9e3779b1) ^ salt;
  for (let i = 0; i < name.length; i++) x = Math.imul(x ^ name.charCodeAt(i), 0x01000193);
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b); x ^= x >>> 16;
  return (x >>> 0) / 0x100000000;
}

function weighted<T extends {weight:number}>(values: readonly T[], fraction: number): T {
  const total = values.reduce((sum, value) => sum + value.weight, 0);
  let remaining = fraction * total;
  for (const value of values) { remaining -= value.weight; if (remaining < 0) return value; }
  return values[values.length - 1]!;
}

function varyHairColor(color: number, factor: number): number {
  // Core multiplies the float RGB color, then clamps HSV value to [.1, .98].
  // Our persisted RGB8 necessarily rounds the final float color to 8-bit channels.
  const channels = [(color >>> 16) & 255, (color >>> 8) & 255, color & 255].map(channel => channel / 255 * factor);
  const value = Math.max(...channels);
  const clamped = Math.max(.1, Math.min(.98, value));
  const scaled = channels.map(channel => Math.max(0, Math.min(255, Math.round(channel * clamped / value * 255))));
  return (scaled[0]! << 16) | (scaled[1]! << 8) | scaled[2]!;
}

function generate(seed: number, id: number, name: string, varyBrightness: boolean): PawnAppearance {
  const draw = (salt: number) => hash(seed, id, name, salt);
  const sex = draw(1) < .5 ? 'male' : 'female';
  const heads = HEAD_TYPES.filter(head => head.sex === sex);
  const headType = heads[Math.floor(draw(2) * heads.length)]!.id;
  // No local adult backstory exists: Core's backstory-free branch chooses Thin or the sexed body.
  const bodyType = draw(3) < .5 ? 'Thin' : sex === 'male' ? 'Male' : 'Female';
  const hair = HAIR_STYLES[Math.floor(draw(4) * HAIR_STYLES.length)]!.id;
  const melanin = draw(5);
  const skinColor = SKIN_COLORS.find(entry => melanin < entry.cumulative)!.color;
  // Core IsDarkSkin begins at the fourth melanin swatch; no age-dependent grey rule.
  const darkSkin = SKIN_COLORS.findIndex(entry => entry.color === skinColor) >= 3;
  const hairPool = darkSkin ? HAIR_COLORS.filter(entry => !('darkSkinFactor' in entry)) : HAIR_COLORS;
  const hairGene = weighted(hairPool, draw(6));
  const fixedBrightness = hairGene.id === 'Hair_SnowWhite' || hairGene.id === 'Hair_InkBlack';
  const hairColor = varyBrightness
    ? varyHairColor(hairGene.color, fixedBrightness ? 1 : 1 + (draw(7) * 2 - 1) * .12)
    : hairGene.color;
  // Lisière has no biological age, so assigning adult beard probability would invent one.
  const beard = 'NoBeard';
  return { version: 1, sex, bodyType, headType, hair, beard, skinColor, hairColor };
}

export function createPawnAppearance(seed: number, id: number, name: string): PawnAppearance {
  return generate(seed, id, name, true);
}

/** Legacy visual projection only; historical Pawn records are not rewritten. */
export function fallbackPawnAppearance(seed: number, id: number, name: string): PawnAppearance {
  const base = generate(seed, id, name, false);
  if (name === 'Ada') return { ...base, sex: 'female', bodyType: 'Female', headType: 'Female_AverageNormal', hair: 'Ponytails', beard: 'NoBeard', skinColor: 0xf2c78c, hairColor: 0x5a3a20 };
  if (name === 'Noé') return { ...base, sex: 'male', bodyType: 'Male', headType: 'Male_AverageWide', hair: 'Mop', beard: 'Full', skinColor: 0xe49e5a, hairColor: 0x333333 };
  if (name === 'Mina') return { ...base, sex: 'female', bodyType: 'Female', headType: 'Female_NarrowNormal', hair: 'FancyBun', beard: 'NoBeard', skinColor: 0xffefc9, hairColor: 0x84532f };
  return base;
}

const fallbackCache=new Map<string,PawnAppearance>();

export function appearanceOf(pawn: Pick<Pawn, 'appearance' | 'id' | 'name'>, seed: number): PawnAppearance {
  if(pawn.appearance)return pawn.appearance;
  const key=JSON.stringify([seed,pawn.id,pawn.name]);
  const existing=fallbackCache.get(key);if(existing)return existing;
  const profile=Object.freeze(fallbackPawnAppearance(seed,pawn.id,pawn.name));
  if(fallbackCache.size>=1024)fallbackCache.delete(fallbackCache.keys().next().value!);
  fallbackCache.set(key,profile);return profile;
}

const KEYS = ['version', 'sex', 'bodyType', 'headType', 'hair', 'beard', 'skinColor', 'hairColor'];
const validColor = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xffffff;

/** Empty array means the persisted profile is structurally valid. */
export function validatePawnAppearance(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['appearance: object expected'];
  const a = value as Record<string, unknown>;
  const errors: string[] = [];
  for (const key of Object.keys(a)) if (!KEYS.includes(key)) errors.push(`appearance.${key}: unexpected`);
  for (const key of KEYS) if (!(key in a)) errors.push(`appearance.${key}: missing`);
  if (a.version !== 1) errors.push('appearance.version: expected 1');
  if (a.sex !== 'male' && a.sex !== 'female') errors.push('appearance.sex: invalid');
  if (!BODY_TYPES.some(body => body.id === a.bodyType)) errors.push('appearance.bodyType: invalid');
  if (!HEAD_TYPES.some(head => head.id === a.headType)) errors.push('appearance.headType: invalid');
  if (!HAIR_STYLES.some(hair => hair.id === a.hair)) errors.push('appearance.hair: invalid');
  if (!BEARD_STYLES.some(beard => beard.id === a.beard)) errors.push('appearance.beard: invalid');
  if (!validColor(a.skinColor)) errors.push('appearance.skinColor: invalid');
  if (!validColor(a.hairColor)) errors.push('appearance.hairColor: invalid');
  const head = HEAD_TYPES.find(h => h.id === a.headType);
  if (head && head.sex !== a.sex) errors.push('appearance.headType: sex mismatch');
  if (a.sex === 'male' && a.bodyType === 'Female' || a.sex === 'female' && a.bodyType === 'Male') errors.push('appearance.bodyType: sex mismatch');
  if (a.sex === 'female' && a.beard !== 'NoBeard') errors.push('appearance.beard: sex mismatch');
  return errors;
}
