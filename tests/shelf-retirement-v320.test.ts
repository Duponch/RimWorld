import {expect,test} from 'vitest';
import {addGroundMaterial} from '../src/sim/materials.ts';
import {newShelfStorage} from '../src/sim/shelf-storage.ts';
import {planShelfRemoval,commitShelfRemoval} from '../src/sim/shelf-retirement.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {finishDeconstruction} from '../src/sim/deconstruction.ts';
import {damageStructure} from '../src/sim/thing-damage.ts';
import {structureMaxHp} from '../src/sim/thing-damage-rules.ts';
import {furnitureSlot} from '../src/sim/furniture-haul-rules.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import type {Structure,World} from '../src/sim/types.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
function prepared(){
  const w=deconstructionCamp();w.stockpiles=[];w.growingZones=[];
  const s:Structure={id:w.nextId++,kind:'small-shelf',x:17,z:18,orientation:0,footprint:'standard',material:'wood',shelf:newShelfStorage([w.nextId++])};w.structures.push(s);
  for(const [kind,item] of [['wood','wood'],['steel','steel'],['component','component']] as const)addGroundMaterial(w,kind,item==='component'?50:75,s,item);
  return {w,s,ids:w.piles.map(p=>p.id)};
}
function exact(w:World){expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);}
test('preview is immutable and surplus placement commits the same original identities and quantities',()=>{
  const {w,s,ids}=prepared(),original=structuredClone(w),plan=planShelfRemoval(w,s);
  expect(plan).not.toBeNull();expect(w).toEqual(original);w.structures=[];commitShelfRemoval(w,plan!);
  expect(w.piles.map(p=>p.id)).toEqual(ids);expect(w.piles.map(p=>p.quantity)).toEqual([75,75,50]);
  expect(new Set(w.piles.map(p=>p.owner.type==='ground'?`${p.owner.x},${p.owner.z}`:'held')).size).toBe(3);exact(w);
});
test.each(['deconstruct','fatal-hit','uninstall'] as const)('%s refuses an unplaceable retirement without losing content, random state or work',action=>{
  const {w,s}=prepared();w.tiles=w.tiles.map((t,i)=>i===s.z*w.width+s.x?t:{terrain:'water'});
  if(action==='uninstall'){
    expect(applyCommand(w,{type:'designate',kind:'uninstall',targetId:s.id,x:s.x,z:s.z}).ok).toBe(true);
    const plan=planShelfRemoval(w,s),before=structuredClone(w);expect(plan).toBeNull();expect(w).toEqual(before);
  }else if(action==='fatal-hit'){
    const before=structuredClone(w);expect(damageStructure(w,s,structureMaxHp(s),'bullet')).toBe(false);expect(w).toEqual(before);
  }else{
    expect(applyCommand(w,{type:'designate',kind:'deconstruct',targetId:s.id,x:s.x,z:s.z}).ok).toBe(true);
    const before=structuredClone(w);expect(finishDeconstruction(w,w.pawns[0]!,w.jobs[0]!)).toBe(false);expect(w).toEqual(before);
  }
});
test('fatal shelf hit preserves all original items and only retires its own building materials',()=>{
  const {w,s,ids}=prepared();expect(damageStructure(w,s,structureMaxHp(s),'bullet')).toBe(true);
  expect(w.structures).toHaveLength(0);for(const id of ids)expect(w.piles.find(p=>p.id===id)).toMatchObject({quantity:id===ids[2]?50:75,owner:{type:'ground'}});exact(w);
});
test('real uninstall packs the same shelf and identities, leaves its three contents behind, and reloads',()=>{
  const {w,s,ids}=prepared();expect(applyCommand(w,{type:'designate',kind:'uninstall',targetId:s.id,x:s.x,z:s.z}).ok).toBe(true);
  for(let i=0;i<200&&!w.packed.some(p=>p.building.id===s.id);i++)stepWorld(w);
  expect(w.packed.find(p=>p.building.id===s.id)?.building.shelf).toEqual(s.shelf);expect(w.structures).toHaveLength(0);
  for(const id of ids)expect(w.piles.find(p=>p.id===id)).toMatchObject({quantity:id===ids[2]?50:75,owner:{type:'ground'}});exact(w);
});
test('even an empty shelf cannot accept a packed furniture object in its ground slot',()=>{
  const {w,s}=prepared();w.piles=[];expect(furnitureSlot(w,s)).toBe(false);
});

test('destroying an already packed shelf cannot redistribute unrelated items at its former installation site',()=>{
  const {w,s}=prepared();w.structures=[];w.piles=w.piles.slice(0,1);w.packed.push({building:s,owner:{type:'ground',x:19,z:19}});
  const before=structuredClone(w.piles[0]);expect(damageStructure(w,s,structureMaxHp(s),'bullet')).toBe(true);
  expect(w.piles.find(p=>p.id===before.id)).toEqual(before);expect(w.packed).toHaveLength(0);exact(w);
});
