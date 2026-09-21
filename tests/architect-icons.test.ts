import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { toolDefinitions } from '../src/ui/layout';
import {
  ARCHITECT_ICON_ATLASES,
  ARCHITECT_ICON_MAPPING,
  ARCHITECT_ICON_ORDER,
  installArchitectIcons,
} from '../src/ui/architect-icons';

function pngHeader(asset: string) {
  const bytes = readFileSync(new URL(`../public${asset}`, import.meta.url));
  return {
    signature: bytes.subarray(0, 8).toString('hex'),
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    colorType: bytes[25],
  };
}

describe('Architect generated icon atlases', () => {
  it('maps every rendered tool once into two exact 6 by 5 sheets', () => {
    const rendered = toolDefinitions.map(tool => tool.id);
    expect(rendered).toHaveLength(60);
    expect(new Set(rendered).size).toBe(60);
    expect(ARCHITECT_ICON_ORDER).toEqual(rendered);
    expect(Object.keys(ARCHITECT_ICON_MAPPING)).toEqual(rendered);
    expect(new Set(Object.values(ARCHITECT_ICON_MAPPING).map(cell => `${cell.atlas}:${cell.column}:${cell.row}`)).size).toBe(60);
  });

  it('ships equal RGBA cells with genuine alpha-capable PNG storage', () => {
    for (const asset of ARCHITECT_ICON_ATLASES) {
      const header = pngHeader(asset);
      expect(header.signature).toBe('89504e470d0a1a0a');
      expect(header.width).toBe(1374);
      expect(header.height).toBe(1145);
      expect(header.width / 6).toBe(header.height / 5);
      expect(header.colorType).toBe(6);
    }
  });

  it('replaces the glyph and reports the installed atlas cell', () => {
    const classes: string[] = [];
    const attributes = new Map<string, string>();
    const style: Record<string, string> = {};
    const icon = {
      classList: { add: (name: string) => classes.push(name) },
      style,
      textContent: '⚒',
      setAttribute: (name: string, value: string) => attributes.set(name, value),
    };
    const button = { dataset: { tool: 'mine' }, querySelector: () => icon };
    const root = { querySelectorAll: () => [button] } as unknown as HTMLElement;

    expect(installArchitectIcons(root)).toEqual({ installed: ['mine'], missing: [], absent: ARCHITECT_ICON_ORDER.filter(id => id !== 'mine') });
    expect(icon.textContent).toBe('');
    expect(classes).toContain('ui-icon');
    expect(attributes.get('aria-hidden')).toBe('true');
    expect(style.backgroundImage).toContain('architect-1.png');
    expect(style.backgroundSize).toBe('600% 500%');
  });
});
