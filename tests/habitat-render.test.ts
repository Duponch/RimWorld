import { expect, test } from 'vitest';
import { habitatParts } from '../src/render/habitat-parts';
import { createWorld } from '../src/sim';
import { footprintCells } from '../src/sim/definitions';
import { sowDaylily } from '../src/sim/flower-pot';
import { apparelAppearance,APPAREL_CARGO,foldedApparel } from '../src/render/character-apparel';
import { newApparelState,type ApparelItem } from '../src/sim/apparel-rules';
import type { MaterialPile } from '../src/sim/types';

test('habitat furniture produces distinct, oriented, material-coloured placements without a DOM', () => {
  const world = createWorld(42, 20, 20);
  world.structures = [
    fixture(101, 'dining-chair', 4, 5, 0, 'wood'),
    fixture(102, 'dining-chair', 8, 5, 1, 'steel'),
    fixture(103, 'armchair', 4, 9, 2, 'wood'),
    fixture(104, 'end-table', 7, 9, 3, 'wood'),
    fixture(105, 'dresser', 11, 4, 0, 'steel'),
    fixture(106, 'table-square', 11, 9, 1, 'wood'),
    fixture(107, 'table-long', 15, 9, 0, 'steel'),
    fixture(108, 'flower-pot', 15, 4, 0, 'wood'),
  ] as typeof world.structures;

  const parts = habitatParts(world);
  const grouped = (id: number) => parts.filter(part => part.key === id);
  expect(grouped(101)).toHaveLength(6);
  expect(grouped(102)).toHaveLength(6);
  expect(grouped(103)).toHaveLength(8);
  expect(grouped(104)).toHaveLength(6);
  expect(grouped(105)).toHaveLength(11);
  expect(grouped(106)).toHaveLength(5);
  expect(grouped(107)).toHaveLength(5);
  expect(grouped(108)).toHaveLength(2);

  const woodSeat = grouped(101).find(part => part.sy === 0.10 && part.sx === 0.62)!;
  const steelSeat = grouped(102).find(part => part.sy === 0.10 && part.sx === 0.62)!;
  expect(woodSeat).toMatchObject({ x: 4, z: 5, color: 0xa38559, ry: 0 });
  expect(steelSeat).toMatchObject({ x: 8, z: 5, color: 0x89999e, ry: Math.PI / 2 });

  const forwardBack = grouped(101).find(part => part.sy === 0.42)!;
  const rotatedBack = grouped(102).find(part => part.sy === 0.42)!;
  expect(forwardBack).toMatchObject({ x: 4, z: 5.25 });
  expect(rotatedBack).toMatchObject({ x: 8.25, z: 5 });
  expect(grouped(108).map(part => part.color)).toEqual([0xa38559, 0x3b3023]);
  const pot=world.structures.find(s=>s.id===108)!;
  pot.flower={allowSow:true,plant:sowDaylily(world.tick)};
  expect(habitatParts(world).filter(p=>p.key===108&&p.color===0x54733d)).toHaveLength(4);
  pot.flower={...pot.flower,plant:{...pot.flower.plant!,hitPoints:0}};
  expect(habitatParts(world).filter(p=>p.key===108&&p.color===0x796641)).toHaveLength(4);
});

test('long tables and dressers stay inside their physical footprint in all four orientations',()=>{
  const world=createWorld(42,20,20);
  for(const kind of ['table-long','dresser'] as const)for(const orientation of [0,1,2,3] as const){
    const structure={...fixture(101,kind,8,8,orientation,'wood'),kind,footprint:'standard' as const};
    world.structures=[structure];
    const cells=footprintCells(structure),xs=cells.map(c=>c.x),zs=cells.map(c=>c.z);
    for(const part of habitatParts(world)){
      const hx=(Math.abs(Math.cos(part.ry!))*part.sx!+Math.abs(Math.sin(part.ry!))*part.sz!)/2;
      const hz=(Math.abs(Math.sin(part.ry!))*part.sx!+Math.abs(Math.cos(part.ry!))*part.sz!)/2;
      expect(part.x-hx).toBeGreaterThanOrEqual(Math.min(...xs)-.5);
      expect(part.x+hx).toBeLessThanOrEqual(Math.max(...xs)+.5);
      expect(part.z-hz).toBeGreaterThanOrEqual(Math.min(...zs)-.5);
      expect(part.z+hz).toBeLessThanOrEqual(Math.max(...zs)+.5);
    }
  }
});

function fixture(id: number, kind: string, x: number, z: number, orientation: 0 | 1 | 2 | 3, material: 'wood' | 'steel') {
  return { id, kind, x, z, orientation, footprint: 'standard', material };
}

test('worn, portrait and carried presentation distinguish all textile families and both materials',()=>{
  const piece=(item:ApparelItem):MaterialPile=>({id:1,kind:'apparel',item,quantity:1,owner:{type:'apparel',pawnId:1},apparel:newApparelState(item)});
  expect(apparelAppearance([piece('light-leather-shirt'),piece('cloth-pants')])).toMatchObject({shirt:true,silhouette:1,color:0xad8a61,pants:1});
  expect(apparelAppearance([piece('light-leather-tribalwear')])).toMatchObject({tribal:true,silhouette:2,color:0xad8a61});
  expect(apparelAppearance([piece('cloth-shirt'),piece('light-leather-duster'),piece('flak-vest')])).toMatchObject({silhouette:3,color:0xad8a61,vest:false});
  expect(apparelAppearance([piece('cloth-parka')])).toMatchObject({silhouette:4,color:0xd8c8a2});
  expect(new Set(Object.values(APPAREL_CARGO)).size).toBe(11);
  expect(foldedApparel('light-leather-parka')[0]?.color).toBe(0xad8a61);
});
