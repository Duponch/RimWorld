import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { foodPolicyLayout } from '../src/ui/food-policy-controls';
import { scheduleLayout } from '../src/ui/schedule-controls';
import { wildlifePanelScaffold } from '../src/ui/wildlife-panel';

const styles=readFileSync(new URL('../src/ui/management-panels.css',import.meta.url),'utf8');

describe('stable management panel layouts',()=>{
  test('keeps schedule copying and assignment actions in dedicated groups',()=>{
    expect(scheduleLayout()).toContain('<th scope="col">Copie</th>');
    const assignment=foodPolicyLayout();
    expect(assignment).toContain('class="work-table-wrap assignment-table-wrap"');
    expect(assignment).toContain('class="assignment-table"');
    expect(assignment).toContain('class="assignment-actions"');
  });

  test('separates changing wildlife values from its fixed action columns',()=>{
    const scaffold=wildlifePanelScaffold();
    expect(scaffold).toContain('class="fauna-list" data-fauna-list');
    expect(scaffold).toContain('class="fauna-intro"');
    expect(styles).toContain('grid-template-columns: 90px minmax(150px, 1.1fr) 74px minmax(125px, .9fr) 74px 250px');
    expect(styles).toContain('#wildlife-panel .fauna-position');
    expect(styles).toContain('#wildlife-panel .fauna-actions');
    expect(styles).toContain('font-variant-numeric: tabular-nums');
  });

  test('fits work priorities into the widened panel instead of scrolling horizontally',()=>{
    expect(styles).toContain('#work-panel .work-table-wrap');
    expect(styles).toContain('width: min(1480px, calc(100vw - 282px))');
    expect(styles).toContain('table-layout: fixed');
    expect(styles).toContain('overflow-x: hidden');
    expect(styles).toContain('max-width: 42px');
  });
});
