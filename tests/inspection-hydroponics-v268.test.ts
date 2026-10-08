import { expect,test } from 'vitest';
import { growingCultureChoices } from '../src/ui/growing-controls';
import { hydroponicsPowerInspection } from '../src/ui/power-inspection';
import { placementMaterial } from '../src/ui/construction-controls';
import { buildingLabels } from '../src/ui/building-labels';
import { toolDefinitions } from '../src/ui/layout';
import { ARCHITECT_ICON_MAPPING,ARCHITECT_ICON_ORDER } from '../src/ui/architect-icons';
import { researchProjects } from '../src/ui/research-panel';
import type { Structure } from '../src/sim/types';

const basin=(power:Structure['power']={on:true,parentId:5}):Structure=>({id:10,kind:'hydroponics-basin',x:4,z:4,orientation:0,footprint:'standard',material:'steel',power});

test('hydroponic choices exclude corn while ground cultures retain it, including a zero basin ID',()=>{
  expect(growingCultureChoices({})).toContain('corn');
  expect(growingCultureChoices({basinId:0})).toEqual(['rice','potato','cotton','healroot']);
});

test('the inspection keeps fertility when power fails and describes progressive irreversible damage',()=>{
  const s=basin({on:false,parentId:5}),before=JSON.stringify(s),text=hydroponicsPowerInspection(s);
  expect(text).toContain('Fertilité 280 %');
  expect(text).toContain('nouveaux semis suspendus');
  expect(text).toContain('sans mort instantanée');
  expect(text).toContain('ne répare pas les dégâts');
  expect(JSON.stringify(s)).toBe(before);
});

test('a pending power flag cannot override physical switch or mechanical failure',()=>{
  expect(hydroponicsPowerInspection(basin())).toContain('Pompe alimentée');
  expect(hydroponicsPowerInspection(basin({on:true,parentId:5,switchOn:false}))).toContain('Pompe arrêtée manuellement');
  const s=basin();s.breakdown={brokenAt:1};
  expect(hydroponicsPowerInspection(s)).toContain('Pompe en panne');
  expect(hydroponicsPowerInspection(s)).toContain('nouveaux semis suspendus');
  expect(hydroponicsPowerInspection({...basin(),kind:'sun-lamp'})).toBe('');
});

test('the existing architect and research metadata expose the basin with a fixed steel recipe',()=>{
  const tool=toolDefinitions.find(t=>t.id==='hydroponics-basin')!;
  expect(tool.category).toBe('production');expect(tool.hint).toContain('1 × 4');expect(tool.hint).toContain('70 W');
  expect(buildingLabels['hydroponics-basin']).toBe('Bac hydroponique');
  expect(placementMaterial('hydroponics-basin','wood')).toBe('steel');
  expect(ARCHITECT_ICON_ORDER).toContain('hydroponics-basin');expect(ARCHITECT_ICON_MAPPING['hydroponics-basin']).toBeDefined();
  const research=researchProjects.find(p=>p.id==='hydroponics')!;
  expect(research.cost).toBe(700);expect(research.detail).toContain('Maïs exclu');
});
