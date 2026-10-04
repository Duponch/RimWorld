import { expect,test } from 'vitest';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { addGroundMaterial } from '../src/sim/materials.ts';
import { constructionRecipe,constructionSupplied } from '../src/sim/construction-materials.ts';
import { damageStructure } from '../src/sim/thing-damage.ts';
import { structureMaxHp } from '../src/sim/thing-damage-rules.ts';
import { powerDemand } from '../src/sim/power-rules.ts';
import type { World } from '../src/sim/types.ts';
import { prepareTelevisionWorld } from './scenarios/television-v208.ts';

function until(w:World,done:()=>boolean,limit=4000):void {
  for(let i=0;i<limit&&!done();i++)stepWorld(w);
  expect(done(),`TV physical boundary missing at tick ${w.tick}`).toBe(true);expect(validateWorld(w)).toEqual([]);
}
const units=(w:World,item:'steel'|'component')=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
function replay(w:World,ticks:number):void {const copy=deserializeWorld(serializeWorld(w));stepWorld(w,ticks);stepWorld(copy,ticks);expect(copy).toEqual(w);}

test('CRT requires all 80 steel and four components physically delivered and Construction7, then finishes without quality',()=>{
  const w=prepareTelevisionWorld(1,0,false),p=w.pawns[0]!;w.structures=[];
  p.priorities.build=1;p.priorities.haul=2;p.skills.construction.level=6;
  expect(constructionRecipe({kind:'tube-television',material:'steel'})).toEqual({ingredients:[{item:'steel',quantity:80},{item:'component',quantity:4}],work:1000,coreWork:10000});
  addGroundMaterial(w,'steel',80,{x:8,z:7},'steel');addGroundMaterial(w,'component',3,{x:9,z:7},'component');
  expect(applyCommand(w,{type:'designate',kind:'tube-television',x:21,z:16,orientation:1}).ok).toBe(true);
  const job=w.jobs[0]!;stepWorld(w,250);expect(job.progress).toBe(0);expect(w.structures).toEqual([]);
  addGroundMaterial(w,'component',1,{x:10,z:7},'component');until(w,()=>constructionSupplied(w,job));
  stepWorld(w,25);expect(job.progress).toBe(0);expect(w.structures).toEqual([]);
  p.skills.construction.level=7;p.planCooldown=0;until(w,()=>job.progress>10);replay(w,5);
  until(w,()=>w.structures.some(s=>s.kind==='tube-television'));
  const tv=w.structures[0]!;expect(tv).toMatchObject({kind:'tube-television',material:'steel',orientation:1,footprint:'standard'});
  expect(tv.quality).toBeUndefined();expect(tv.breakdown).toBeUndefined();expect(structureMaxHp(tv)).toBe(100);expect(powerDemand(tv)).toBe(200);
  expect(units(w,'steel')).toBe(0);expect(units(w,'component')).toBe(0);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('real CRT damage is repaired at contact without materials, power or Construction7 and deconstruction balances 40steel+2components',()=>{
  const w=prepareTelevisionWorld(1,0,false),p=w.pawns[0]!,tv=w.structures[0]!;
  p.priorities.build=1;p.skills.construction.level=0;
  expect(damageStructure(w,tv,4)).toBe(true);
  expect(applyCommand(w,{type:'area',action:'home',from:tv,to:tv}).ok).toBe(true);
  until(w,()=>p.state==='working'&&w.jobs.some(j=>j.kind==='repair'));replay(w,1);
  until(w,()=>tv.damage===undefined);expect(w.piles).toEqual([]);expect(tv.power!.on).toBe(false);expect(tv.quality).toBeUndefined();
  expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:tv.x,z:tv.z}).ok).toBe(true);
  until(w,()=>!w.structures.length);
  expect(units(w,'steel')).toBe(40);expect(units(w,'component')).toBe(2);
  expect(w.deconstructed.lostSteel).toBe(40);expect(w.deconstructed.lostComponents).toBe(2);replay(w,5);
});

test('ordinary fatal CRT damage returns 20steel+1component without rerolling quality or inventing a component breakdown',()=>{
  const w=prepareTelevisionWorld(1,0,false),tv=w.structures[0]!;
  expect(damageStructure(w,tv,100)).toBe(true);expect(w.structures).toEqual([]);
  expect(units(w,'steel')).toBe(20);expect(units(w,'component')).toBe(1);
  expect(w.destroyed!.lost.steel).toBe(60);expect(w.destroyed!.lost.component).toBe(3);
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('uninstall, physical package carrying and rotated reinstallation retain identity and damage, with no fresh recipe charge',()=>{
  const w=prepareTelevisionWorld(1,0,true),p=w.pawns[0]!,tv=w.structures.find(s=>s.kind==='tube-television')!;
  p.priorities.build=1;p.priorities.haul=2;expect(damageStructure(w,tv,7)).toBe(true);
  expect(applyCommand(w,{type:'designate',kind:'uninstall',x:tv.x,z:tv.z}).ok).toBe(true);
  until(w,()=>w.packed.length===1);
  expect(w.packed[0]!.building).toBe(tv);expect(tv.power).toMatchObject({on:false,parentId:null});expect(tv.damage).toBe(7);replay(w,2);
  expect(applyCommand(w,{type:'install',structureId:tv.id,x:22,z:18,orientation:3}).ok).toBe(true);
  until(w,()=>w.packed[0]?.owner.type==='pawn');replay(w,2);until(w,()=>w.packed.length===0&&w.jobs.length===0);
  expect(w.structures.find(s=>s.id===tv.id)).toBe(tv);expect(tv).toMatchObject({x:22,z:18,orientation:3,damage:7});
  expect(tv.quality).toBeUndefined();expect(units(w,'steel')).toBe(0);expect(units(w,'component')).toBe(0);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});
