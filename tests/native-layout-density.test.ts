import { describe, expect, it, vi } from 'vitest';
import { createWorld } from '../src/sim/index';
import type { NativePage, NativeUiActions, NativeUiState } from '../src/ui3d/native-contract';
import { buildNativeInspector, setNativeInspectorTab } from '../src/ui3d/native-inspector';
import { layoutNativePage, wrapNativeText, type TextMeasure } from '../src/ui3d/native-layout';

// Portrait pixels are a separate renderer service; these tests exercise the real
// confirmed inspector model and its pixel layout without building a 3D portrait.
vi.mock('../src/ui/pawn-portrait', () => ({
  portraitDataUrl: () => 'data:image/svg+xml,%3Csvg/%3E',
  portraitExpressionOf: () => 'awake',
}));

const measure: TextMeasure = (text, size) => Array.from(text).reduce((width, letter) => width + (letter === ' ' ? .3 : /[ilI.,:;!]/.test(letter) ? .3 : .54) * size, 0);
const viewports = [{ width: 1440, height: 1000 }, { width: 2557, height: 1440 }] as const;
let seed = 476500;
function inspector(tab: 'bio' | 'needs') {
  const world = createWorld(++seed, 16, 16), pawn = world.pawns[0]!;
  // A short ordinary dossier must expose all twelve skills without scrolling.
  delete pawn.background; pawn.traits = [];
  const state: NativeUiState = { world, epoch: seed, panel: null, category: 'structure', tool: 'select', orientation: 0,
    selectedPawnIds: [pawn.id], selectedObjects: [], constructionMaterial: 'wood', creationStorage: { priority: 3, filters: { wood: true, food: true } },
    speed: 0, hasGame: true, busy: false, saves: [] };
  const noop = () => {};
  const actions: NativeUiActions = { command: async () => ({ ok: true }), panel: noop, category: noop, tool: noop, selectPawn: noop,
    speed: noop, rotate: noop, material: noop, creationStorage: noop, front: noop, save: noop, exportSave: noop, showPage: noop, refresh: noop, readState: () => state };
  setNativeInspectorTab(tab);
  return { page: buildNativeInspector(state, actions)!, world, pawn };
}

describe('native interface keeps the former compact dossier density', () => {
  it('keeps Bio at 514 × 489 maximum and all twelve skill meters visible in its second column', () => {
    const { page } = inspector('bio');
    expect([page.width, page.height]).toEqual([514, 489]);
    const boxes = viewports.map(viewport => layoutNativePage(page, viewport, false, measure));
    expect(boxes.map(box => [box.width, box.height])).toEqual([[514, 489], [514, 489]]);
    for (const box of boxes) {
      const skills = box.rows.filter(entry => entry.row.id.startsWith('skill-'));
      expect(skills.map(entry => entry.row.id)).toEqual([
        'skill-shooting', 'skill-melee', 'skill-construction', 'skill-mining', 'skill-cooking', 'skill-plants',
        'skill-animals', 'skill-crafting', 'skill-artistic', 'skill-medicine', 'skill-social', 'skill-intellectual',
      ]);
      expect(skills.every(entry => entry.row.column === 1)).toBe(true);
      expect(box.rows.some(entry => entry.row.column === 0)).toBe(true);
      const left = box.rows.find(entry => entry.row.column === 0)!;
      for (const skill of skills) {
        expect(skill.x).toBeGreaterThan(left.x + left.width);
        expect(skill.top).toBeGreaterThanOrEqual(0);
        expect(skill.top + skill.height).toBeLessThanOrEqual(box.body.height);
        expect(skill.row.meter?.max).toBe(20);
        expect(skill.row.meter?.secondary).toBeDefined();
        expect(skill.row.hint).toContain('Expérience du niveau');
      }
    }
  });

  it('keeps Needs within 580 × 520 and does not enlarge it on a wider screen', () => {
    const { page } = inspector('needs');
    expect([page.width, page.height]).toEqual([580, 520]);
    const [ordinary, wide] = viewports.map(viewport => layoutNativePage(page, viewport, false, measure));
    expect(ordinary!.width).toBe(580); expect(ordinary!.height).toBeLessThanOrEqual(520);
    expect([wide!.width, wide!.height, wide!.contentHeight]).toEqual([ordinary!.width, ordinary!.height, ordinary!.contentHeight]);
    expect(page.rows.find(row => row.id === 'need-hunger')?.column).toBe(0);
    expect(page.rows.find(row => row.id === 'need-mood')?.column).toBe(1);
    expect(page.rows.filter(row => row.id.startsWith('need-') || row.id === 'recreation-level').every(row => row.meter)).toBe(true);
    expect(ordinary!.rows.map(entry => entry.row)).toEqual(page.rows);
  });

  it('retains every long content row and its full extent across partial scroll positions', () => {
    const rows = Array.from({ length: 60 }, (_, index) => ({ id: `fact-${index}`, label: `Fait confirmé ${index}`,
      detail: `Description complète ${index}. Un contenu long reste entièrement disponible au défilement et ne disparaît pas lorsqu’une ligne traverse le bord du panneau.` }));
    const page: NativePage = { id: 'inspect-long-record', title: 'Dossier complet', layout: 'inspector', width: 514, height: 489, rows };
    const box = layoutNativePage(page, viewports[0], false, measure);
    expect(box.rows.map(entry => entry.row)).toEqual(rows);
    expect(box.contentHeight).toBeGreaterThan(box.body.height);
    expect(box.rows.at(-1)!.top + box.rows.at(-1)!.height).toBe(box.contentHeight);
    for (const entry of box.rows) {
      expect(entry.detailLines.join(' ')).toBe(entry.row.detail);
      expect(entry.top + entry.height).toBeLessThanOrEqual(box.contentHeight);
    }
    const partialScroll = box.rows[0]!.height / 2;
    const visible = box.rows.filter(entry => entry.top + entry.height > partialScroll && entry.top < partialScroll + box.body.height);
    expect(visible[0]!.row.id).toBe('fact-0');
    expect(visible[0]!.top).toBeLessThan(partialScroll);
    expect(visible.at(-1)!.top + visible.at(-1)!.height).toBeGreaterThan(partialScroll + box.body.height);
    const maxScroll = box.contentHeight - box.body.height, last = box.rows.at(-1)!;
    expect(last.top + last.height - maxScroll).toBeCloseTo(box.body.height);
    expect(last.top - maxScroll).toBeLessThan(box.body.height);
    expect(box.rows).toHaveLength(60);
  });

  it('preserves explicit paragraph breaks and every word when wrapping long text', () => {
    const text = 'Première information confirmée avec plusieurs mots.\nDeuxième information conservée dans son paragraphe.';
    const lines = wrapNativeText(text, 105, measure);
    expect(lines.length).toBeGreaterThan(2);
    expect(lines.join(' ').split(/\s+/)).toEqual(text.split(/\s+/));
    expect(lines.some(line => line.startsWith('Deuxième'))).toBe(true);
    expect(lines.every(line => measure(line, 13) <= 105 || !line.includes(' '))).toBe(true);
  });
});
