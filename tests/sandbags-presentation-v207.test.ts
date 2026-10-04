import { expect,test } from 'vitest';
import { sandbagParts,SANDBAG_HEIGHT } from '../src/render/sandbag-parts';
import { createWorld } from '../src/sim';
import { constructionRecipe } from '../src/sim/construction-materials';
import { structureRoomMarketValue,structureRoomStandable } from '../src/sim/room-market-value';
import { placementMaterial } from '../src/ui/construction-controls';
import { buildingLabels } from '../src/ui/building-labels';
import { toolDefinitions } from '../src/ui/layout';
import { ARCHITECT_ICON_ORDER,ARCHITECT_ICON_MAPPING } from '../src/ui/architect-icons';

test('fixed low-cover model stays within one cell, reads only confirmed structures and preserves World',()=>{
  const w=createWorld(207,32,32);
  w.structures=[{id:100,kind:'sandbags',x:12,z:12,orientation:0,footprint:'standard',material:'cloth'}];
  const before=JSON.stringify(w),parts=sandbagParts(w);
  expect(structureRoomMarketValue(w.structures[0]!)).toBeCloseTo(8.148);
  expect(structureRoomStandable('sandbags')).toBe(false);
  expect(JSON.stringify(w)).toBe(before);expect(parts.length).toBeGreaterThan(6);
  for(const p of parts){
    expect(p.key).toBe(100);expect(p.ry??0).toBe(0);
    expect(p.x-p.sx!/2).toBeGreaterThanOrEqual(11.5);expect(p.x+p.sx!/2).toBeLessThanOrEqual(12.5);
    expect(p.z-p.sz!/2).toBeGreaterThanOrEqual(11.5);expect(p.z+p.sz!/2).toBeLessThanOrEqual(12.5);
    expect(p.y-p.sy!/2).toBeGreaterThanOrEqual(0);expect(p.y+p.sy!/2).toBeLessThanOrEqual(SANDBAG_HEIGHT+.00001);
  }
  w.structures=[];expect(sandbagParts(w)).toEqual([]);
});

test('Architecte exposes the playable cloth recipe with its own icon and real protection limits',()=>{
  const tool=toolDefinitions.find(t=>t.id==='sandbags')!;
  expect(tool.category).toBe('structure');expect(tool.title).toBe(buildingLabels.sandbags);
  expect(tool.hint).toContain('55 %');expect(tool.hint).toContain('300 PV');expect(tool.hint).toContain('sans arrêt');
  for(const selected of ['wood','steel','light-leather'] as const)expect(placementMaterial('sandbags',selected)).toBe('cloth');
  expect(constructionRecipe({kind:'sandbags',material:placementMaterial('sandbags','wood')})).toMatchObject({ingredients:[{item:'cloth',quantity:5}],work:18});
  expect(ARCHITECT_ICON_ORDER.filter(id=>id==='sandbags')).toHaveLength(1);expect(ARCHITECT_ICON_MAPPING.sandbags).toBeDefined();
});
