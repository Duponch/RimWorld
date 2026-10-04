import { expect,test } from 'vitest';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { addGroundMaterial } from '../src/sim/materials';
import { constructionMaterials,constructionRecipe,deliveredMaterial } from '../src/sim/construction-materials';
import { finishDeconstruction } from '../src/sim/deconstruction';
import { deconstructionCamp,fixtureBuilding } from './scenarios/deconstruction';
import type { World,Structure } from '../src/sim/types';

function until(w:World,predicate:()=>boolean,limit=1500){for(let i=0;i<limit&&!predicate();i++)stepWorld(w);expect(predicate()).toBe(true);expect(validateWorld(w)).toEqual([]);}
const textiles=(w:World,item='cloth')=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
function replay(w:World,ticks:number){const copy=deserializeWorld(serializeWorld(w));stepWorld(w,ticks);stepWorld(copy,ticks);expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(validateWorld(w)).toEqual([]);}

test('five real cloth, no substitute or threshold, supplied frame and physical completion survive checkpoints',()=>{
  const w=deconstructionCamp(),p=w.pawns[0]!;p.priorities.build=0;p.priorities.haul=1;
  expect(constructionMaterials('sandbags')).toEqual(['cloth']);
  expect(constructionRecipe({kind:'sandbags',material:'cloth'})).toEqual({ingredients:[{item:'cloth',quantity:5}],work:18,coreWork:180});
  addGroundMaterial(w,'textile',4,{x:11,z:16},'cloth');addGroundMaterial(w,'textile',5,{x:10,z:16},'light-leather');
  expect(applyCommand(w,{type:'designate',kind:'sandbags',x:18,z:16}).ok).toBe(true);
  const j=w.jobs[0]!;expect(j.material).toBe('cloth');
  until(w,()=>deliveredMaterial(w,j,'cloth')===4);expect(j.progress).toBe(0);expect(w.structures).toEqual([]);expect(textiles(w,'light-leather')).toBe(5);
  replay(w,25);expect(w.structures).toEqual([]);
  addGroundMaterial(w,'textile',1,{x:12,z:16},'cloth');until(w,()=>deliveredMaterial(w,j,'cloth')===5);
  p.skills.construction.level=0;p.priorities.build=1;p.priorities.haul=0;p.planCooldown=0;
  until(w,()=>j.progress>0);expect(textiles(w)).toBe(5);replay(w,1);until(w,()=>w.structures.length===1);
  expect(w.structures[0]).toMatchObject({kind:'sandbags',material:'cloth',orientation:0,footprint:'standard'});expect(w.structures[0]!.quality).toBeUndefined();
  expect(textiles(w)).toBe(0);expect(textiles(w,'light-leather')).toBe(5);expect(w.deconstructed.lostTextiles).toBeUndefined();replay(w,20);
});

test('cancel during real delivery returns identical cloth and refuses material, rotation and minification atomically',()=>{
  const w=deconstructionCamp(),p=w.pawns[0]!;addGroundMaterial(w,'textile',5,{x:10,z:16},'cloth');
  for(const command of [{type:'designate',kind:'sandbags',material:'light-leather',x:20,z:16},{type:'designate',kind:'sandbags',material:'wood',x:20,z:16},{type:'designate',kind:'sandbags',material:'cloth',orientation:1,x:20,z:16}] as const){const before=serializeWorld(w);expect(applyCommand(w,command).ok).toBe(false);expect(serializeWorld(w)).toBe(before);}
  expect(applyCommand(w,{type:'designate',kind:'sandbags',x:22,z:16}).ok).toBe(true);
  until(w,()=>p.haul?.phase==='deliver');replay(w,1);
  expect(applyCommand(w,{type:'cancel',x:22,z:16}).ok).toBe(true);expect(w.jobs).toEqual([]);expect(w.structures).toEqual([]);expect(textiles(w)).toBe(5);replay(w,20);
  const s:Structure=fixtureBuilding(w,'sandbags',20,16);s.material='cloth';const before=serializeWorld(w);
  expect(applyCommand(w,{type:'designate',kind:'uninstall',x:s.x,z:s.z}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
});

test('deconstruction halves the actual textile recipe, records only prospective losses and refuses failed preflights',()=>{
  const w=deconstructionCamp(),p=w.pawns[0]!,s:Structure=fixtureBuilding(w,'sandbags',17,16);s.material='cloth';
  expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:s.x,z:s.z}).ok).toBe(true);const j=w.jobs[0]!;
  const next=w.nextId;w.nextId=Number.MAX_SAFE_INTEGER;const refused=serializeWorld(w);
  expect(finishDeconstruction(w,p,j)).toBe(false);expect(serializeWorld(w)).toBe(refused);w.nextId=next;
  until(w,()=>j.progress>0);replay(w,1);until(w,()=>!w.structures.length);
  expect([2,3]).toContain(textiles(w));expect(textiles(w)+(w.deconstructed.lostTextiles?.cloth??0)).toBe(5);expect(w.deconstructed.count).toBe(1);
  replay(w,20);
  const raw=JSON.parse(serializeWorld(w));raw.schemaVersion=188;expect(()=>deserializeWorld(JSON.stringify(raw))).toThrow();
  delete raw.deconstructed.lostTextiles;const old=deserializeWorld(JSON.stringify(raw));expect(old.deconstructed.lostTextiles).toBeUndefined();
  for(const lostTextiles of [{cloth:0},{cloth:-1},{cloth:.5},{wood:2},{}]){const bad=JSON.parse(serializeWorld(w));bad.deconstructed.lostTextiles=lostTextiles;expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
});
