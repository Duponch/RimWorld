import { expect,test } from 'vitest';
import { prepareTelevisionDemo,TELEVISION_CELLS,televisionDemoEntry } from '../scripts/create-television-v208-test-save';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization';
import { televisionWatchCells } from '../src/sim/television-recreation';

test('V208 scene leaves research, material delivery and television watching prospective',()=>{
  const w=prepareTelevisionDemo();expect(validateWorld(w)).toEqual([]);expect(w.schemaVersion).toBe(190);
  expect(w.pawns).toHaveLength(3);expect(w.jobs).toEqual([]);expect(w.structures.some(s=>s.kind==='tube-television')).toBe(false);
  expect(w.research?.project).toBe(null);expect(w.research?.tubeTelevision).toEqual({points:998_000_000});
  expect(w.piles.filter(p=>p.item==='steel').reduce((sum,p)=>sum+p.quantity,0)).toBe(80);
  expect(w.piles.filter(p=>p.item==='component').reduce((sum,p)=>sum+p.quantity,0)).toBe(4);
  expect(w.piles.filter(p=>p.item==='steel'||p.item==='component').every(p=>p.owner.type==='ground')).toBe(true);
  for(const p of w.pawns){expect(p.recreation.task).toBe(null);expect(p.recreation.tolerance.television).toBe(0);expect(p.recreation.bored.television).toBe(false);}
  const cells=televisionWatchCells({...TELEVISION_CELLS.television,orientation:0});
  for(const seat of TELEVISION_CELLS.seats){expect(cells).toContainEqual(seat);expect(w.structures.some(s=>s.kind==='stool'&&s.x===seat.x&&s.z===seat.z)).toBe(true);}
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  expect(televisionDemoEntry(w,'pending')).toMatchObject({prepared:true,release:'v208',colonists:3});
});
