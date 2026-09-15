import { expect, test } from 'vitest';
import { applyCommand, stepWorld, serializeWorld, deserializeWorld, validateWorld, addGroundMaterial, refreshStock } from '../src/sim/index';
import { BLOCK_MATERIALS, type BlockMaterial } from '../src/sim/building-materials';
import { constructionRecipe, requiredMaterial, validConstructionMaterial } from '../src/sim/construction-materials';
import { deconstructionDuration } from '../src/sim/deconstruction-rules';
import { finishDeconstruction } from '../src/sim/deconstruction';
import { deconstructionCamp } from './scenarios/deconstruction';
import { BED_REST_PER_TICK } from '../src/sim/rest';
import type { World, StructureKind } from '../src/sim/types';

function until(w:World,done:()=>boolean,limit=2200) {
  for(let i=0;i<limit&&!done();i++){stepWorld(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}
  expect(done(),JSON.stringify({tick:w.tick,pawns:w.pawns,jobs:w.jobs})).toBe(true);
}
const account=(w:World,item:BlockMaterial)=>w.piles.reduce((n,p)=>n+(p.item===item?p.quantity:0),0)+w.structures.reduce((n,s)=>n+requiredMaterial(s,item),0)+w.packed.reduce((n,p)=>n+requiredMaterial(p.building,item),0)+(w.deconstructed.lostBlocks?.[item]??0);

test('five stones obey build factors plus offsets, exact deliveries and typed recovery without mixed-rock substitution',()=>{
  const kinds:StructureKind[]=['wall','bed','table','stool','horseshoes'];
  const quantities=[5,45,28,25,10],base=[135,800,750,450,100],factor=[6,6,5.5,5,6];
  for(const [i,material] of BLOCK_MATERIALS.entries()) {
    for(const [k,kind] of kinds.entries())expect(constructionRecipe({kind,material})).toEqual({ingredients:[{item:material,quantity:quantities[k]}],coreWork:Math.round(base[k]!*factor[i]!+140),work:Math.ceil(Math.round(base[k]!*factor[i]!+140)/10)});
    const w=deconstructionCamp(2),other=BLOCK_MATERIALS[(i+1)%5]!;
    addGroundMaterial(w,'blocks',4,{x:12,z:16},material);addGroundMaterial(w,'blocks',10,{x:12,z:17},other);
    expect(applyCommand(w,{type:'designate',kind:'wall',material,x:17,z:16}).ok).toBe(true);
    until(w,()=>w.piles.some(p=>p.owner.type==='job'&&p.quantity===4));stepWorld(w,15);expect(w.structures).toEqual([]);expect(w.jobs[0]!.progress).toBe(0);
    addGroundMaterial(w,'blocks',1,{x:12,z:16},material);
    until(w,()=>w.jobs[0]!.progress>10);
    const cancel=deserializeWorld(serializeWorld(w));expect(applyCommand(cancel,{type:'cancel',x:17,z:16}).ok).toBe(true);expect(account(cancel,material)).toBe(5);expect(account(cancel,other)).toBe(10);
    const copy=deserializeWorld(serializeWorld(w));until(w,()=>w.structures.length===1);stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);expect(account(w,material)).toBe(5);
    expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:17,z:16}).ok).toBe(true);
    expect(deconstructionDuration(w.jobs[0]!)).toBe(Math.ceil((135*factor[i]!+140)/17));
    until(w,()=>!w.structures.length);expect(account(w,material)).toBe(5);expect(account(w,other)).toBe(10);
    expect(w.deconstructed.lostSteel).toBeUndefined();expect(w.deconstructed.lostWood).toBe(0);
    expect([2,3]).toContain(w.piles.filter(p=>p.item===material).reduce((n,p)=>n+p.quantity,0));
    expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  }
});

test('a stone bed keeps its identity and reduced rest through use, packing and replay; saturated or overflowing refunds are atomic',()=>{
  const w=deconstructionCamp(),p=w.pawns[0]!;const material='marble-blocks';
  addGroundMaterial(w,'blocks',45,{x:12,z:16},material);applyCommand(w,{type:'designate',kind:'bed',material,x:17,z:16});
  until(w,()=>w.structures.length===1);const bed=w.structures[0]!;p.bedId=bed.id;p.rest=10;
  until(w,()=>p.state==='sleeping');const sleeping=serializeWorld(w),before=p.rest;stepWorld(w,10);expect(p.rest-before).toBeCloseTo(BED_REST_PER_TICK*.9*10,9);
  const normal=deserializeWorld(sleeping);normal.structures[0]!.material='wood';const start=normal.pawns[0]!.rest;stepWorld(normal,10);expect(normal.pawns[0]!.rest-start).toBeCloseTo(BED_REST_PER_TICK*10,9);
  const copy=deserializeWorld(sleeping);stepWorld(copy,10);expect(copy).toEqual(w);
  p.rest=100;stepWorld(w);expect(applyCommand(w,{type:'install',structureId:bed.id,x:20,z:20,orientation:1}).ok).toBe(true);
  until(w,()=>w.packed[0]?.owner.type==='pawn');const moving=deserializeWorld(serializeWorld(w));until(w,()=>!w.jobs.length);stepWorld(moving,w.tick-moving.tick);expect(moving).toEqual(w);expect(w.structures[0]).toBe(bed);expect(p.bedId).toBe(bed.id);expect(account(w,material)).toBe(45);
  applyCommand(w,{type:'designate',kind:'deconstruct',x:21,z:20});const job=w.jobs[0]!;expect(deconstructionDuration(job)).toBe(177);
  const next=w.nextId;w.nextId=Number.MAX_SAFE_INTEGER;const full=serializeWorld(w);expect(finishDeconstruction(w,p,job)).toBe(false);expect(serializeWorld(w)).toBe(full);w.nextId=next;
  w.deconstructed.lostBlocks={[material]:Number.MAX_SAFE_INTEGER};const overflow=serializeWorld(w);expect(finishDeconstruction(w,p,job)).toBe(false);expect(serializeWorld(w)).toBe(overflow);delete w.deconstructed.lostBlocks;
  expect(finishDeconstruction(w,p,job)).toBe(true);refreshStock(w);expect(account(w,material)).toBe(45);expect(p.bedId).toBeNull();expect(validateWorld(w)).toEqual([]);
});

test('V32 migration preserves in-flight wood work and blocks; stone buildings and loss ledgers cannot hide in old saves',()=>{
  for(const material of ['legacy','__proto__','marble','marble-chunk',null,7])expect(validConstructionMaterial('wall',material)).toBe(false);
  const w=deconstructionCamp();addGroundMaterial(w,'wood',45,{x:12,z:16},'wood');addGroundMaterial(w,'blocks',20,{x:12,z:17},'slate-blocks');
  applyCommand(w,{type:'designate',kind:'bed',material:'wood',x:17,z:16});until(w,()=>w.jobs[0]!.progress>0);
  const raw=JSON.parse(serializeWorld(w));raw.schemaVersion=32;const loaded=deserializeWorld(JSON.stringify(raw));expect(loaded).toEqual(w);
  for(const mutation of ['job','ledger'] as const){const bad=structuredClone(raw);if(mutation==='job')bad.jobs[0].material='slate-blocks';else bad.deconstructed.lostBlocks={};expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/version 32/);}
  const before=serializeWorld(w);for(const kind of ['stonecutter','campfire'] as const)expect(applyCommand(w,{type:'designate',kind,material:'slate-blocks',x:22,z:22}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  const placed=deconstructionCamp();placed.structures.push({id:placed.nextId++,kind:'stool',material:'slate-blocks',x:20,z:20,orientation:0,footprint:'standard'});
  for(const packed of [false,true]){const old=JSON.parse(serializeWorld(placed));old.schemaVersion=32;if(packed){old.packed=[{building:old.structures[0],owner:{type:'ground',x:20,z:20}}];old.structures=[];}expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/version 32/);}
  for(const losses of [{wood:3},{'slate-blocks':-1},{'slate-blocks':1.5},[]]){const bad=JSON.parse(before);bad.deconstructed.lostBlocks=losses;expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
});
