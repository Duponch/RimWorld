import { readFileSync } from 'node:fs';
import { expect, test, vi } from 'vitest';
import { applyUiFont, DEFAULT_UI_FONT, loadUiFont, readUiFont, saveUiFont, UI_FONT_CHOICES, UI_FONT_STORAGE_KEY } from '../src/ui/ui-fonts';

test('font preference defaults safely, survives storage and rejects obsolete values', () => {
  const entries = new Map<string, string>();
  const storage = { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); } };
  expect(readUiFont(storage)).toBe(DEFAULT_UI_FONT);
  for (const choice of UI_FONT_CHOICES) {
    saveUiFont(choice.id, storage);
    expect(entries.get(UI_FONT_STORAGE_KEY)).toBe(choice.id);
    expect(readUiFont(storage)).toBe(choice.id);
  }
  entries.set(UI_FONT_STORAGE_KEY, 'removed-family');
  expect(readUiFont(storage)).toBe('comfortaa');
  expect(readUiFont({ getItem() { throw new Error('denied'); } })).toBe('comfortaa');
  expect(() => saveUiFont('patrick-hand', { setItem() { throw new Error('denied'); } })).not.toThrow();
});

test('selection changes body and heading families together without changing sizes', () => {
  const values = new Map<string, string>(), dataset: Record<string, string> = {};
  const root = { dataset, style: { setProperty: (key: string, value: string) => values.set(key, value) } } as unknown as HTMLElement;
  for (const choice of UI_FONT_CHOICES) {
    applyUiFont(choice.id, root);
    expect(dataset.uiFont).toBe(choice.id);
    expect(values.get('--ui-font')).toContain(`"${choice.family}"`);
    expect(values.get('--font-body')).toBe(values.get('--ui-font'));
    expect(values.get('--font-pop')).toBe(values.get('--ui-font'));
  }
  expect([...values.keys()]).toEqual(['--ui-font', '--font-body', '--font-pop']);
});

test('readiness loads only the chosen family and includes French text', async () => {
  const load = vi.fn(async () => [] as FontFace[]);
  await loadUiFont('baloo-2', { load });
  expect(load.mock.calls).toEqual([
    ['400 16px "Baloo 2"', 'Éléonore, cœur, œuf, ça, où, Noël.'],
    ['700 16px "Baloo 2"', 'Éléonore, cœur, œuf, ça, où, Noël.'],
  ]);
});

/** Read the real TTF cmap; metadata alone would not prove the French glyphs exist. */
function glyph(font: Buffer, code: number): number {
  const tables = font.readUInt16BE(4);
  let cmap = -1;
  for (let i = 0; i < tables; i++) if (font.toString('ascii', 12 + i * 16, 16 + i * 16) === 'cmap') cmap = font.readUInt32BE(20 + i * 16);
  if (cmap < 0) throw new Error('Missing cmap');
  for (let i = 0; i < font.readUInt16BE(cmap + 2); i++) {
    const entry = cmap + 4 + i * 8, platform = font.readUInt16BE(entry), encoding = font.readUInt16BE(entry + 2);
    if (platform !== 0 && !(platform === 3 && (encoding === 1 || encoding === 10))) continue;
    const start = cmap + font.readUInt32BE(entry + 4), format = font.readUInt16BE(start);
    if (format === 12) {
      for (let n = 0; n < font.readUInt32BE(start + 12); n++) {
        const group = start + 16 + n * 12, first = font.readUInt32BE(group), last = font.readUInt32BE(group + 4);
        if (code >= first && code <= last) return font.readUInt32BE(group + 8) + code - first;
      }
    } else if (format === 4) {
      const count = font.readUInt16BE(start + 6) / 2, ends = start + 14, starts = ends + count * 2 + 2, deltas = starts + count * 2, ranges = deltas + count * 2;
      for (let n = 0; n < count; n++) if (code >= font.readUInt16BE(starts + n * 2) && code <= font.readUInt16BE(ends + n * 2)) {
        const delta = font.readInt16BE(deltas + n * 2), range = font.readUInt16BE(ranges + n * 2);
        if (!range) return (code + delta) & 0xffff;
        const index = font.readUInt16BE(ranges + n * 2 + range + (code - font.readUInt16BE(starts + n * 2)) * 2);
        return index ? (index + delta) & 0xffff : 0;
      }
    }
  }
  return 0;
}

test('all six local originals cover French and retain the OFL and offline CSS contract', () => {
  const css = readFileSync(new URL('../src/ui/ui-fonts.css', import.meta.url), 'utf8');
  expect(UI_FONT_CHOICES.map(font => font.label)).toEqual(['Comfortaa', 'Baloo 2', 'Bree Serif', 'Grandstander', 'Patrick Hand', 'Quicksand']);
  for (const choice of UI_FONT_CHOICES) {
    const font = readFileSync(new URL(`../public${choice.asset}`, import.meta.url));
    for (const character of 'ÀÂÆÇÉÈÊËÎÏÔŒÙÛÜŸàâæçéèêëîïôœùûüÿ’«»') expect(glyph(font, character.codePointAt(0)!)).toBeGreaterThan(0);
    expect(readFileSync(new URL(`../public/assets/fonts/v306/${choice.id}-OFL.txt`, import.meta.url), 'utf8')).toContain('SIL OPEN FONT LICENSE');
    expect(css).toContain(`url('${choice.asset}')`);
  }
  expect(css).not.toMatch(/https?:|@import|font-size:|line-height:/);
  expect(css).toContain('font-family:var(--ui-font)!important');
  expect(css).toContain('dialog');
});
