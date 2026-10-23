import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import type {Structure} from '../src/sim/types.ts';
import {newShelfStorage} from '../src/sim/shelf-storage.ts';
import {applyCommand} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';

/** Actual command boundary on a declared small colony/furniture fixture.
 * Construction, research and packing are not played by this preparation. */
function prepared(){
 const w=deconstructionCamp(1);w.stockpiles=[];w.growingZones=[];
 const add=(x:number)=>{const s:Structure={id:w.nextId++,kind:'small-shelf',x,z:12,orientation:0,footprint:'standard',material:'wood',shelf:newShelfStorage([w.nextId++])};w.structures.push(s);return s;};
 const a=add(10),b=add(15),c=add(20);a.shelf!.settings.priority=5;b.shelf!.settings.priority=1;
 return {w,a,b,c};
}
test('actual commands create one group, update both installed and same packed original, and reload the whole result',()=>{
 const {w,a,b,c}=prepared(),clock=[w.tick,w.rng,w.nextId];
 expect(applyCommand(w,{type:'shelf-link',structureIds:[a.id,b.id,c.id]}).ok).toBe(true);
 w.structures=w.structures.filter(s=>s!==c);w.packed.push({building:c,owner:{type:'ground',x:22,z:20}});
 expect(applyCommand(w,{type:'shelf-policy',structureId:b.id,settings:{priority:2,items:{wood:true},hitPoints:{min:50,max:100}}}).ok).toBe(true);
 expect([a,b,c].map(s=>s.shelf!.settings.priority)).toEqual([2,2,2]);
 expect([a,b,c].every(s=>s.shelf!.settings.items?.wood===true)).toBe(true);
 expect(w.packed[0]!.building).toBe(c);expect([w.tick,w.rng,w.nextId]).toEqual(clock);
 expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});
test('group command noops leave the entire world literal, without unrelated reconciliation or a random draw',()=>{
 const {w,a,b,c}=prepared();expect(applyCommand(w,{type:'shelf-link',structureIds:[a.id,b.id]}).ok).toBe(true);
 const before=JSON.stringify(w);
 for(const command of [{type:'shelf-link',structureIds:[b.id,a.id]},
  {type:'shelf-policy',structureId:b.id,settings:{priority:5}},
  {type:'shelf-group-rename',structureId:a.id,name:w.linkedStorage286!.groups[0]!.name},
  {type:'shelf-unlink',structureId:c.id}] as const){
  expect(applyCommand(w,command.type==='shelf-link'?{...command,structureIds:[...command.structureIds]}:command)).toEqual({ok:true,affected:0});
  expect(JSON.stringify(w)).toBe(before);
 }
});
test('an immutable final member refuses the real policy command before changing its group, stock or earlier members',()=>{
 const {w,a,b,c}=prepared();expect(applyCommand(w,{type:'shelf-link',structureIds:[a.id,b.id,c.id]}).ok).toBe(true);
 Object.freeze(c.shelf!);const before=JSON.stringify(w);
 const result=applyCommand(w,{type:'shelf-policy',structureId:a.id,settings:{priority:1}});
 expect(result.ok).toBe(false);expect(JSON.stringify(w)).toBe(before);
});
