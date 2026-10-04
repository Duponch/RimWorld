import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { foodPolicyLayout } from '../src/ui/food-policy-controls';
import { scheduleLayout } from '../src/ui/schedule-controls';
import { wildlifePanelScaffold } from '../src/ui/wildlife-panel';
import { researchLinks,researchProjects } from '../src/ui/research-panel';

const styles=readFileSync(new URL('../src/ui/management-panels.css',import.meta.url),'utf8');
const worldStyles=readFileSync(new URL('../src/ui/world-panels.css',import.meta.url),'utf8');

describe('stable management panel layouts',()=>{
  test('keeps schedule copying and assignment actions in dedicated groups',()=>{
    expect(scheduleLayout()).toContain('<th scope="col">Copie</th>');
    const assignment=foodPolicyLayout();
    expect(assignment).toContain('class="work-table-wrap assignment-table-wrap"');
    expect(assignment).toContain('class="assignment-table"');
    expect(assignment).toContain('class="assignment-actions"');
  });

  test('keeps wildlife designations in a stable table and drafted combat commands outside it',()=>{
    const scaffold=wildlifePanelScaffold();
    expect(scaffold).toContain('class="fauna-list fauna-table-wrap" data-fauna-list');
    expect(scaffold).toContain('class="fauna-combat"');
    expect(scaffold).not.toContain('class="fauna-intro"');
    expect(worldStyles).toContain('#wildlife-panel .fauna-table');
    expect(worldStyles).toContain('table-layout:fixed');
    expect(worldStyles).toContain('#wildlife-panel .fauna-table .fauna-position');
  });

  test('research graph contains only playable projects and physical prerequisite links',()=>{
    const ids=researchProjects.map(project=>project.id);
    expect(ids).toHaveLength(17);
    expect(ids).toContain('autodoors');
    expect(ids).toContain('recon-armor');
    expect(new Set(ids).size).toBe(ids.length);
    expect(researchLinks).toEqual([
      ['smithing','machining'],['machining','gunsmithing'],
      ['smithing','plate-armor'],['complex-clothing','plate-armor'],
      ['machining','flak-armor'],['plate-armor','flak-armor'],
      ['microelectronics','multi-analyzer'],['machining','multi-analyzer'],['multi-analyzer','fabrication'],
      ['fabrication','advanced-fabrication'],['fabrication','recon-armor'],
      ['complex-clothing','recon-armor'], // Existing physical prerequisite shown since V199.
    ]);
    for(const [from,to] of researchLinks){expect(ids).toContain(from);expect(ids).toContain(to);}
    expect(worldStyles).toContain('#research-panel .research-graph');
    expect(worldStyles).toContain('#research-panel .research-detail');
  });

  test('fits work priorities into the widened panel instead of scrolling horizontally',()=>{
    expect(styles).toContain('#work-panel .work-table-wrap');
    expect(styles).toContain('width: min(1480px, calc(100vw - 282px))');
    expect(styles).toContain('table-layout: fixed');
    expect(styles).toContain('overflow-x: hidden');
    expect(styles).toContain('max-width: 42px');
  });
});
