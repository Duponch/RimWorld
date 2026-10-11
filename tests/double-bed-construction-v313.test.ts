import {expect,test} from 'vitest';
import {applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld,addGroundMaterial} from '../src/sim/index.ts';
import {COMPLEX_FURNITURE_RESEARCH_COST} from '../src/sim/research.ts';
import {constructionRecipe,requiredMaterial} from '../src/sim/construction-materials.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {bedSlotCell,bedSlotBodyCenter} from '../src/sim/bed-slots.ts';
import {constructionPreviewParts} from '../src/render/construction-preview-parts.ts';
import {doubleBedPartsForStructure} from '../src/render/double-bed-parts.ts';
import {finishDeconstruction} from '../src/sim/deconstruction.ts';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';
import type {World} from '../src/sim/types.ts';

function until(w:World,done:()=>boolean,limit=1800){
  for(let n=0;n<limit&&!done();n++){stepWorld(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}
  expect(done(),JSON.stringify({tick:w.tick,jobs:w.jobs,packed:w.packed})).toBe(true);
}
function unlock(w:World){w.research={project:null,points:0,complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:w.tick}};}
const account=(w:World,item:'wood'|'steel')=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0)
  +w.structures.reduce((n,s)=>n+requiredMaterial(s,item),0)+w.packed.reduce((n,p)=>n+requiredMaterial(p.building,item),0)
  +(item==='wood'?w.deconstructed.lostWood:w.deconstructed.lostSteel??0);

test.each(['wood','steel'] as const)('a researched %s double bed consumes 85 real material units and resumes unfinished work exactly',material=>{
  const w=deconstructionCamp(2);const before=serializeWorld(w);
  expect(applyCommand(w,{type:'designate',kind:'double-bed',material,x:17,z:18}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  unlock(w);addGroundMaterial(w,material,84,{x:12,z:16},material);
  expect(applyCommand(w,{type:'designate',kind:'double-bed',material,x:17,z:18}).ok).toBe(true);
  const job=w.jobs[0]!;expect(constructionRecipe(job).ingredients).toEqual([{item:material,quantity:85}]);
  stepWorld(w,70);expect(job.progress).toBe(0);expect(w.structures).toHaveLength(0);
  addGroundMaterial(w,material,1,{x:12,z:17},material);
  until(w,()=>job.progress>0);const copy=deserializeWorld(serializeWorld(w));
  until(w,()=>w.structures.length===1);stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);
  const bed=w.structures[0]!;expect(bed).toMatchObject({kind:'double-bed',material,footprint:'standard'});expect(bed.quality).toBeDefined();
  expect(account(w,material)).toBe(85);expect(w.piles.filter(p=>p.item===material)).toHaveLength(0);
});

test('two assignments remain attached to their places during physical packing, carried replay and rotated installation',()=>{
  const w=deconstructionCamp(2);unlock(w);const bed=fixtureBuilding(w,'double-bed',15,17),a=w.pawns[0]!,b=w.pawns[1]!;Object.assign(bed,{material:'wood'});
  expect(applyCommand(w,{type:'assign-bed',bedId:bed.id,pawnId:a.id,slot:0}).ok).toBe(true);
  expect(applyCommand(w,{type:'assign-bed',bedId:bed.id,pawnId:b.id,slot:1}).ok).toBe(true);b.priorities.build=0;
  expect(applyCommand(w,{type:'install',structureId:bed.id,x:23,z:21,orientation:3}).ok).toBe(true);
  until(w,()=>w.packed[0]?.owner.type==='pawn');expect(w.structures).toHaveLength(0);
  expect([a.bedId,b.bedId]).toEqual([bed.id,bed.id]);expect([a.bedSlot,b.bedSlot]).toEqual([0,1]);
  const copy=deserializeWorld(serializeWorld(w));until(w,()=>!w.jobs.length);stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);
  expect(w.structures[0]).toBe(bed);expect(bed).toMatchObject({x:23,z:21,orientation:3});
  expect([a.bedSlot,b.bedSlot]).toEqual([0,1]);expect(bedSlotCell(bed,0)).toEqual({x:23,z:21});expect(bedSlotCell(bed,1)).toEqual({x:23,z:22});
  expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:22,z:22}).ok).toBe(true);
  expect(finishDeconstruction(w,a,w.jobs[0]!)).toBe(true);expect([a.bedId,b.bedId]).toEqual([null,null]);
  expect(Object.hasOwn(a,'bedSlot')||Object.hasOwn(b,'bedSlot')).toBe(false);expect(validateWorld(w)).toEqual([]);
});

test.each([0,1,2,3] as const)('finished model and ghost share two pillows at the actual sleeping heads, orientation %i',orientation=>{
  const w=deconstructionCamp(2),bed=fixtureBuilding(w,'double-bed',16,16,orientation);Object.assign(bed,{material:'wood'});const finished=doubleBedPartsForStructure(bed);
  const ghost=constructionPreviewParts(w,[{kind:'double-bed',x:bed.x,z:bed.z,orientation,furniture:bed}]);
  expect(finished).toHaveLength(6);expect([...ghost.boxes,...ghost.rotatedBoxes].map(p=>({x:p.x,z:p.z,y:p.y,sx:p.sx,sy:p.sy,sz:p.sz,color:p.color,ry:p.ry??0})))
    .toEqual(finished.map(p=>({x:p.x,z:p.z,y:p.y,sx:p.sx,sy:p.sy,sz:p.sz,color:p.color,ry:p.ry??0})));
  const cells=footprintCells(bed);for(const slot of [0,1] as const){expect(cells).toContainEqual(bedSlotCell(bed,slot));const center=bedSlotBodyCenter(bed,slot)!;
    expect(center.x).toBeGreaterThanOrEqual(Math.min(...cells.map(c=>c.x)));expect(center.z).toBeGreaterThanOrEqual(Math.min(...cells.map(c=>c.z)));
  }
});
