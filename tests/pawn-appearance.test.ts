import { describe, expect, it, vi } from 'vitest';
import { apparelAppearance } from '../src/render/character-apparel';
import {
  BEARD_STYLES, BODY_TYPES, HAIR_COLORS, HAIR_STYLES, HEAD_TYPES, SKIN_COLORS,
  appearanceOf, createPawnAppearance, fallbackPawnAppearance, validatePawnAppearance,
} from '../src/sim/pawn-appearance';
import { portraitCacheSize, portraitDataUrl } from '../src/ui/pawn-portrait';

describe('identité visuelle V109', () => {
  it('expose les corps et têtes Core, les 26 coiffures Urban et les palettes vérifiées', () => {
    expect(BODY_TYPES.map(body => body.id)).toEqual(['Male', 'Female', 'Thin', 'Hulk', 'Fat']);
    expect(HEAD_TYPES).toHaveLength(12);
    expect(HEAD_TYPES.filter(head => head.sex === 'male')).toHaveLength(6);
    expect(HEAD_TYPES.filter(head => head.sex === 'female')).toHaveLength(6);
    expect(new Set(HAIR_STYLES.map(hair => hair.id)).size).toBe(26);
    expect(HAIR_STYLES.some(hair => hair.id === 'Shaved')).toBe(true);
    expect(BEARD_STYLES.some(beard => beard.id === 'Full')).toBe(true);
    expect(SKIN_COLORS.map(skin => skin.cumulative)).toEqual([.1,.25,.45,.58,.63,.75,.83,.9,1]);
    expect(HAIR_COLORS).toHaveLength(18);
  });

  it('produit les mêmes profils sans avancer Math.random ni le PRNG métier', () => {
    const random = vi.spyOn(Math, 'random');
    try {
      const a = createPawnAppearance(412, 7, 'Ada');
      expect(createPawnAppearance(412, 7, 'Ada')).toEqual(a);
      expect(createPawnAppearance(413, 7, 'Ada')).not.toEqual(a);
      expect(createPawnAppearance(412, 8, 'Ada')).not.toEqual(a);
      expect(random).not.toHaveBeenCalled();
    } finally { random.mockRestore(); }
  });

  it('génère des profils valides, la branche sans biographie Thin/sexuée et aucune barbe d’âge fictif', () => {
    const bodies = new Set<string>(), heads = new Set<string>(), hairs = new Set<string>(), skins = new Set<number>();
    let thin = 0;
    for (let id = 1; id <= 2000; id++) {
      const a = createPawnAppearance(106817, id, `Colon ${id}`);
      expect(validatePawnAppearance(a)).toEqual([]);
      expect(a.beard).toBe('NoBeard');
      bodies.add(a.bodyType); heads.add(a.headType); hairs.add(a.hair); skins.add(a.skinColor);
      if (a.bodyType === 'Thin') thin++;
      else expect(a.bodyType).toBe(a.sex === 'male' ? 'Male' : 'Female');
    }
    expect([...bodies].sort()).toEqual(['Female', 'Male', 'Thin']);
    expect(heads.size).toBe(12);
    expect(hairs.size).toBe(26);
    expect(skins.size).toBe(9);
    expect(thin).toBeGreaterThan(900);
    expect(thin).toBeLessThan(1100);
    expect([...Array(300)].some((_, index) => !HAIR_COLORS.some(gene =>
      gene.color === createPawnAppearance(106817, index + 1, `Colon ${index + 1}`).hairColor))).toBe(true);
  });

  it('rejette les clés, versions, classes, couleurs et combinaisons tête/corps/barbe incohérentes', () => {
    const good = createPawnAppearance(12, 1, 'Colon');
    expect(validatePawnAppearance(null)).not.toEqual([]);
    expect(validatePawnAppearance({ ...good, extra: true })).toContain('appearance.extra: unexpected');
    expect(validatePawnAppearance({ ...good, version: 2 })).toContain('appearance.version: expected 1');
    expect(validatePawnAppearance({ ...good, hair: 'HairInvented' })).toContain('appearance.hair: invalid');
    expect(validatePawnAppearance({ ...good, skinColor: -1 })).toContain('appearance.skinColor: invalid');
    expect(validatePawnAppearance({ ...good, hairColor: 0x1000000 })).toContain('appearance.hairColor: invalid');
    const oppositeHead = good.sex === 'male' ? 'Female_AverageNormal' : 'Male_AverageNormal';
    const oppositeBody = good.sex === 'male' ? 'Female' : 'Male';
    expect(validatePawnAppearance({ ...good, headType: oppositeHead })).toContain('appearance.headType: sex mismatch');
    expect(validatePawnAppearance({ ...good, bodyType: oppositeBody })).toContain('appearance.bodyType: sex mismatch');
    expect(validatePawnAppearance({ ...good, sex: 'female', bodyType: 'Female', headType: 'Female_AverageNormal', beard: 'Full' }))
      .toContain('appearance.beard: sex mismatch');
    expect(validatePawnAppearance({ ...good, hairColor: Number.NaN })).toContain('appearance.hairColor: invalid');
  });

  it('projette les anciens noms familiers sans muter la sauvegarde et génère un portrait assorti aux vêtements', () => {
    const legacy = { id: 1, name: 'Noé' };
    const appearance = appearanceOf(legacy, 91);
    expect(appearance).toEqual(fallbackPawnAppearance(91, 1, 'Noé'));
    expect(appearance.beard).toBe('Full');
    expect('appearance' in legacy).toBe(false);
    const bare = apparelAppearance();
    const first = portraitDataUrl(appearance, bare);
    expect(first).toBe(portraitDataUrl(appearance, bare));
    const svg = decodeURIComponent(first.split(',')[1]!);
    expect(svg).toContain(`data-head="${appearance.headType}"`);
    expect(svg).toContain(`data-hair="${appearance.hair}"`);
    expect(svg).toContain(`data-beard="${appearance.beard}"`);
    expect(svg).toContain('#e49e5a');
    expect(svg).toContain('#333333');
    expect(portraitDataUrl(appearance, { ...bare, signature: 'flak-vest', vest: true, color: 0x112233 })).not.toBe(first);
    expect(portraitCacheSize()).toBeGreaterThanOrEqual(2);
  });
});
