import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect,test } from 'vitest';
import { prepareStorageConditionDemo,STORAGE_DEMO_HIGH,STORAGE_DEMO_LOW } from '../scripts/generate-storage-condition-demo-v188.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import type { World } from '../src/sim/types.ts';

const objects=(w:World)=>[
  ...w.piles.map(p=>({id:p.id,quality:p.apparel?.quality??p.weapon?.quality,owner:p.owner,state:{item:p.item,quantity:p.quantity,apparel:p.apparel,weapon:p.weapon}})),
  ...w.packed.map(p=>({id:p.building.id,quality:p.building.quality,owner:p.owner,state:p.building})),
];
const sorted=(w:World)=>objects(w).length===6&&objects(w).every(p=>p.owner.type==='ground'&&(p.quality==='poor'?STORAGE_DEMO_LOW:STORAGE_DEMO_HIGH).some(c=>p.owner.type==='ground'&&p.owner.x===c.x&&p.owner.z===c.z));

test('published storage scene matches the generator and checksum with six ground objects and no completed task',()=>{
  const raw=readFileSync('public/test-saves/v188/tri-reserves.json','utf8'),w=deserializeWorld(raw);
  expect(w).toEqual(prepareStorageConditionDemo());expect(validateWorld(w)).toEqual([]);
  const entry=JSON.parse(readFileSync('public/test-saves/manifest.json','utf8')).saves.find((s:{id:string})=>s.id==='tri-reserves-v188');
  expect(entry).toMatchObject({prepared:true,width:32,height:32,pawns:3,colonists:3,tick:0,release:'v188',label:'Tri des réserves · 3 colons'});
  expect(entry.sha256).toBe(createHash('sha256').update(raw).digest('hex'));
  expect(w.piles).toHaveLength(4);expect(w.packed).toHaveLength(2);expect(w.stockpiles).toHaveLength(6);
  expect(objects(w).every(p=>p.owner.type==='ground')).toBe(true);expect(sorted(w)).toBe(false);
  expect(w.jobs).toEqual([]);expect(w.structures).toEqual([]);
  expect(w.pawns.every(p=>!p.haul&&!p.cooking&&p.orders.active===null&&p.orders.queue.length===0&&p.path.length===0)).toBe(true);
});

test('the prepared six objects require physical hauling after range edits and resume exactly while carried',()=>{
  const w=prepareStorageConditionDemo(),initial=structuredClone(objects(w)),nextId=w.nextId;
  for(const c of STORAGE_DEMO_HIGH)expect(applyCommand(w,{type:'stockpile',enabled:true,...c,
    quality:{min:'normal',max:'legendary'},hitPoints:{min:70,max:100}})).toMatchObject({ok:true});
  expect(objects(w)).toEqual(initial);
  let steps=0;
  while(!objects(w).some(p=>p.owner.type==='pawn')&&steps++<600)stepWorld(w);
  expect(objects(w).some(p=>p.owner.type==='pawn')).toBe(true);expect(sorted(w)).toBe(false);expect(validateWorld(w)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(w));
  while(!sorted(w)&&steps++<1800){stepWorld(w);stepWorld(resumed);}
  expect(sorted(w)).toBe(true);expect(resumed).toEqual(w);expect(validateWorld(w)).toEqual([]);
  expect(w.nextId).toBe(nextId);expect(objects(w).map(p=>({id:p.id,state:p.state}))).toEqual(initial.map(p=>({id:p.id,state:p.state})));
  expect(w.piles.reduce((n,p)=>n+p.quantity,0)).toBe(4);expect(w.packed).toHaveLength(2);
  expect(new Set(objects(w).map(p=>p.owner.type==='ground'?`${p.owner.x},${p.owner.z}`:'carried')).size).toBe(6);
  expect(w.pawns.every(p=>!p.haul)).toBe(true);
});
