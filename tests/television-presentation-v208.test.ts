import { expect,test } from 'vitest';
import { televisionParts } from '../src/render/recreation-parts';
import { createWorld } from '../src/sim';
import { constructionRecipe } from '../src/sim/construction-materials';
import { placementMaterial } from '../src/ui/construction-controls';
import { buildingLabels } from '../src/ui/building-labels';
import { toolDefinitions } from '../src/ui/layout';
import { ARCHITECT_ICON_ORDER,ARCHITECT_ICON_MAPPING } from '../src/ui/architect-icons';
import { researchProjects,researchLinks } from '../src/ui/research-panel';
import { televisionInspection } from '../src/ui/television-inspection';

test('resident CRT model faces all four directions and changes only its fixed screen colour with confirmed supply',()=>{
  const w=createWorld(208,32,32),partsByOrientation=[];
  for(const orientation of [0,1,2,3] as const){
    w.structures=[{id:100,kind:'tube-television',x:12,z:12,orientation,footprint:'standard',material:'steel',power:{on:true,parentId:101}}];
    const before=JSON.stringify(w),parts=televisionParts(w);expect(JSON.stringify(w)).toBe(before);
    expect(parts).toHaveLength(8);expect(parts.every(p=>p.key===100)).toBe(true);
    const screen=parts[3]!,direction=[[0,1],[1,0],[0,-1],[-1,0]][orientation]!;
    expect((screen.x-12)*direction[0]!+(screen.z-12)*direction[1]!).toBeCloseTo(.354);
    expect(screen.ry).toBeCloseTo(orientation*Math.PI/2);
    w.structures[0]!.power!.on=false;const dark=televisionParts(w);
    expect(dark[3]!.color).not.toBe(screen.color);
    expect(dark.map(({color,...p})=>p)).toEqual(parts.map(({color,...p})=>p));
    w.structures[0]!.power!.on=true;w.structures[0]!.breakdown={brokenAt:w.tick};expect(televisionParts(w)[3]!.color).toBe(dark[3]!.color);
    partsByOrientation.push(parts);
  }
  expect(partsByOrientation).toHaveLength(4);w.structures=[];expect(televisionParts(w)).toEqual([]);
});

test('Architecte and research describe the real recipe and independent television family',()=>{
  const tool=toolDefinitions.find(t=>t.id==='tube-television')!;
  expect(tool.category).toBe('recreation');expect(tool.title).toBe(buildingLabels['tube-television']);
  expect(tool.hint).toContain('Construction 7');expect(tool.hint).toContain('200 W');expect(tool.hint).toContain('siège réel requis');
  expect(placementMaterial('tube-television','wood')).toBe('steel');
  expect(constructionRecipe({kind:'tube-television',material:'steel'})).toMatchObject({ingredients:[{item:'steel',quantity:80},{item:'component',quantity:4}],work:1000});
  expect(ARCHITECT_ICON_ORDER.filter(id=>id==='tube-television')).toHaveLength(1);expect(ARCHITECT_ICON_MAPPING['tube-television']).toBeDefined();
  expect(researchProjects.find(p=>p.id==='tube-television')).toMatchObject({title:'Télévision cathodique',cost:1000});
  expect(researchLinks).toContainEqual(['complex-furniture','tube-television']);
  const w=createWorld(208,32,32),tv={id:100,kind:'tube-television' as const,x:12,z:12,orientation:0 as const,footprint:'standard' as const,material:'steel' as const,power:{on:false,parentId:null}};
  const before=JSON.stringify(w);expect(televisionInspection(w,tv)).toContain('Écran éteint : aucun plaisir');
  expect(televisionInspection(w,tv)).toContain('siège réel libre');expect(JSON.stringify(w)).toBe(before);
});
