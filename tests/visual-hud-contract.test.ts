import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const css=readFileSync(new URL('../src/ui/visual-identity.css',import.meta.url),'utf8');
const cursorSource=readFileSync(new URL('../src/ui/tool-cursors.ts',import.meta.url),'utf8');

test('the resource ledger keeps its complete layout while other panels overlap it',()=>{
  expect(css).toContain('.resource-list{left:16px;top:16px;width:216px');
  expect(css).not.toMatch(/:has\([^}]+\) \.resource-list/);
  expect(css).not.toMatch(/@media\([^}]+\.resource-list\{(?:display:none|width:(?!216px))/);
});

test('all pawn portraits retain readable names and an independent hover state',()=>{
  expect(css).toContain('#colonists .colonist:hover:not(:disabled)');
  expect(css).toContain('#colonists .colonist.selected');
  expect(css).toContain('.colonist strong{position:relative;z-index:4;color:inherit');
});

test('tool cursors use their illustrated arrow apex without a separately drawn target dot',()=>{
  expect(cursorSource).toContain('const hotspotX = CURSOR_MARGIN');
  expect(cursorSource).not.toContain('drawTarget');
  expect(cursorSource).not.toContain('.arc(');
});
