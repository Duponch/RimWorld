import { expect, test } from 'vitest';
import { applyCommand, deserializeWorld, serializeWorld, stepWorld, validateWorld } from '../src/sim/index';
import { constructionRecipe } from '../src/sim/construction-materials';
import { addGroundMaterial } from '../src/sim/materials';
import { MACHINING_RESEARCH_COST, GUNSMITHING_RESEARCH_COST } from '../src/sim/research';
import { createMachiningFixture, requireCommand, advanceUntil, prepareGunsmithingBoundary, prepareCompletedResearch } from './scenarios/machining-v101';
import type { World } from '../src/sim/types';
import { placementMaterial } from '../src/ui/construction-controls';

const quantity=(world:World,item:string)=>world.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
const table=(world:World)=>world.structures.find(s=>s.kind==='machining-table');
test('Architect material and four rotations are accepted; the real table switch survives reload',()=>{
  for(const orientation of [0,1,2,3] as const){
    const {world}=createMachiningFixture();prepareCompletedResearch(world);
    requireCommand(world,{type:'designate',kind:'machining-table',material:placementMaterial('machining-table','wood'),x:20,z:20,orientation});
    expect(world.jobs[0]).toMatchObject({orientation,material:'steel'});expect(validateWorld(world)).toEqual([]);
  }
  const {world,pawn}=createMachiningFixture();prepareCompletedResearch(world);buildTable(world);
  const station=table(world)!;requireCommand(world,{type:'power-flick',structureId:station.id,on:false});
  const job=world.jobs.find(j=>j.flick?.structureId===station.id)!;
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  requireCommand(world,{type:'order-job',pawnId:pawn.id,jobId:job.id,queue:false});
  advanceUntil(world,()=>station.power?.switchOn===false,200);expect(station.power?.on).toBe(false);
  expect(validateWorld(world)).toEqual([]);
});
function buildTable(world:World):void {
  requireCommand(world,{type:'designate',kind:'machining-table',material:'steel',x:15,z:8,orientation:0});
  advanceUntil(world,()=>!!table(world),2500,step=>{if(step%50===0)expect(validateWorld(world),`build tick ${world.tick}`).toEqual([]);});
  expect(validateWorld(world)).toEqual([]);
}

test('Forge prerequisite, physical final research points, then Gunsmithing prerequisite and completion',()=>{
  const {world}=createMachiningFixture();
  const noForge=structuredClone(world);delete noForge.research!.smithing;
  expect(applyCommand(noForge,{type:'research-project',project:'machining'})).toMatchObject({ok:false});
  expect(applyCommand(world,{type:'research-project',project:'gunsmithing'})).toMatchObject({ok:false});
  expect(applyCommand(world,{type:'designate',kind:'machining-table',material:'steel',x:15,z:8})).toMatchObject({ok:false});
  requireCommand(world,{type:'research-project',project:'machining'});
  advanceUntil(world,()=>world.research?.machining?.completedAt!==undefined,200);
  expect(world.research!.machining!.points).toBe(MACHINING_RESEARCH_COST);
  expect(world.research!.machining!.completedAt).toBeGreaterThan(2000);
  expect(applyCommand(world,{type:'research-project',project:'gunsmithing'})).toMatchObject({ok:true});
  prepareGunsmithingBoundary(world);
  advanceUntil(world,()=>world.research?.gunsmithing?.completedAt!==undefined,200);
  expect(world.research!.gunsmithing!.points).toBe(GUNSMITHING_RESEARCH_COST);
  expect(validateWorld(world)).toEqual([]);
});

test('real construction, powered two-material gun work, physical off/on interruption, exact save continuation and weapon equipment',()=>{
  const {world,pawn,generator}=createMachiningFixture();prepareCompletedResearch(world);
  expect(constructionRecipe({kind:'machining-table',material:'steel'}).ingredients).toEqual([{item:'steel',quantity:150},{item:'component',quantity:5}]);
  buildTable(world);
  const station=table(world)!;
  expect(quantity(world,'steel')).toBe(90);expect(quantity(world,'component')).toBe(5);
  advanceUntil(world,()=>station.power?.on===true,100);
  requireCommand(world,{type:'bill-add',structureId:station.id,recipe:'make-revolver'});
  requireCommand(world,{type:'bill-add',structureId:station.id,recipe:'make-bolt-action-rifle'});
  const bills=station.bills!;for(const bill of bills)requireCommand(world,{type:'bill-update',structureId:station.id,billId:bill.id,settings:{...bill,destination:'drop'}});
  advanceUntil(world,()=>world.piles.some(p=>p.gunWork?.progress&&p.gunWork.progress>50_000),1000);
  const unfinished=world.piles.find(p=>p.gunWork)!,id=unfinished.id;
  expect(unfinished.gunWork!.parts.reduce((n,p)=>n+p.quantity,0)).toBe(32);
  requireCommand(world,{type:'power-flick',structureId:generator.id,on:false});
  const off=world.jobs.find(j=>j.flick?.structureId===generator.id)!;
  requireCommand(world,{type:'order-job',pawnId:pawn.id,jobId:off.id,queue:false});
  advanceUntil(world,()=>generator.power?.switchOn===false,200);
  const progress=world.piles.find(p=>p.id===id)!.gunWork!.progress;
  stepWorld(world,40);
  expect(world.piles.find(p=>p.id===id)?.gunWork?.progress).toBe(progress);
  expect(quantity(world,'steel')+unfinished.gunWork!.parts.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0)).toBe(90);
  const restored=deserializeWorld(serializeWorld(world));
  expect(restored).toEqual(world);
  stepWorld(world,20);stepWorld(restored,20);expect(serializeWorld(restored)).toBe(serializeWorld(world));
  requireCommand(world,{type:'power-flick',structureId:generator.id,on:true});
  const on=world.jobs.find(j=>j.flick?.structureId===generator.id)!;
  requireCommand(world,{type:'order-job',pawnId:pawn.id,jobId:on.id,queue:false});
  advanceUntil(world,()=>generator.power?.switchOn!==false&&station.power?.on===true,200);
  advanceUntil(world,()=>world.piles.some(p=>p.item==='revolver'&&p.owner.type==='ground'),2000,step=>{if(step%100===0)expect(validateWorld(world)).toEqual([]);});
  advanceUntil(world,()=>world.piles.some(p=>p.item==='bolt-action-rifle'&&p.owner.type==='ground'),3500,step=>{if(step%100===0)expect(validateWorld(world)).toEqual([]);});
  expect(quantity(world,'steel')).toBe(0);expect(quantity(world,'component')).toBe(0);
  expect(world.piles.some(p=>p.item==='unfinished-gun')).toBe(false);
  const guns=world.piles.filter(p=>p.item==='revolver'||p.item==='bolt-action-rifle');
  expect(guns).toHaveLength(2);expect(new Set(guns.map(p=>p.id)).size).toBe(2);
  for(const gun of guns){expect(gun.weapon?.hitPoints).toBeGreaterThan(0);expect(gun.weapon?.quality).toBeDefined();}
  const rifle=guns.find(p=>p.item==='bolt-action-rifle')!;
  requireCommand(world,{type:'order-equipment',pawnId:pawn.id,itemId:rifle.id,action:'equip',queue:false});
  advanceUntil(world,()=>rifle.owner.type==='equipment',200);
  expect(rifle.weapon?.hitPoints).toBeGreaterThan(0);
  expect(validateWorld(world)).toEqual([]);
});

test('extra steel cannot replace a missing component; Crafting 4 cannot start the rifle',()=>{
  const {world,pawn}=createMachiningFixture();prepareCompletedResearch(world);
  const component=world.piles.find(p=>p.item==='component')!;component.quantity=7;
  addGroundMaterial(world,'steel',20,{x:9,z:13},'steel');
  buildTable(world);
  const station=table(world)!;
  expect(quantity(world,'component')).toBe(2);expect(quantity(world,'steel')).toBe(110);
  requireCommand(world,{type:'bill-add',structureId:station.id,recipe:'make-bolt-action-rifle'});
  advanceUntil(world,()=>station.power?.on===true,100);
  const stock={steel:quantity(world,'steel'),component:quantity(world,'component')};
  stepWorld(world,100);
  expect(pawn.cooking).toBeNull();expect(world.piles.some(p=>p.gunWork)).toBe(false);
  expect({steel:quantity(world,'steel'),component:quantity(world,'component')}).toEqual(stock);
  component.quantity++;
  pawn.skills.crafting!.level=4;
  expect(applyCommand(world,{type:'order-cook',pawnId:pawn.id,structureId:station.id,queue:false})).toMatchObject({ok:false});
  stepWorld(world,100);
  expect(world.piles.some(p=>p.gunWork)).toBe(false);
  pawn.skills.crafting!.level=5;
  requireCommand(world,{type:'order-cook',pawnId:pawn.id,structureId:station.id,queue:false});
  advanceUntil(world,()=>world.piles.some(p=>p.gunWork),1000);
  expect(validateWorld(world)).toEqual([]);
});
