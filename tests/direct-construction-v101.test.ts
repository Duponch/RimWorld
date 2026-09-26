import { expect, test } from 'vitest';
import { addGroundMaterial, applyCommand, createWorld, deserializeWorld, refreshStock, serializeWorld, stepWorld, validateWorld } from '../src/sim/index';
import { constructionRecipe } from '../src/sim/construction-materials';
import type { World } from '../src/sim/types';

function obstructedBed(extraWood: number): World {
  const world=createWorld(42,32,32);
  world.tick=2000;
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  world.resources=[];world.jobs=[];world.structures=[];world.piles=[];world.stockpiles=[];
  world.pawns=world.pawns.slice(0,1);
  const pawn=world.pawns[0]!;
  Object.assign(pawn,{x:8,z:10,hunger:100,rest:100});
  pawn.schedule.fill('anything');
  pawn.priorities={handle:0,clean:0,firefight:0,warden:0,basic:3,hunt:0,research:0,patient:0,bedrest:0,doctor:0,art:0,craft:0,mine:0,build:1,haul:0,grow:0,gather:0,cook:0};
  world.resources.push({id:world.nextId++,kind:'tree',x:15,z:8,amount:12});
  if(extraWood)addGroundMaterial(world,'wood',extraWood,{x:8,z:8},'wood');
  refreshStock(world);
  expect(applyCommand(world,{type:'designate',kind:'bed',x:14,z:8,orientation:1})).toMatchObject({ok:true});
  expect(applyCommand(world,{type:'order-job',pawnId:pawn.id,jobId:world.jobs[0]!.id,queue:false})).toMatchObject({ok:true});
  expect(applyCommand(world,{type:'priority',pawnId:pawn.id,work:'build',value:0})).toMatchObject({ok:true});
  return world;
}

test('the V94 tree-only bed pauses at twelve delivered wood because its current recipe needs forty-five',()=>{
  const world=obstructedBed(0),pawn=world.pawns[0]!,job=world.jobs[0]!;
  const cost=constructionRecipe(job).ingredients.find(i=>i.item==='wood')!.quantity;
  expect(cost).toBe(45);
  for(let i=0;i<1000&&pawn.priorityWork;i++){
    stepWorld(world);
    expect(validateWorld(world),`tick ${world.tick}`).toEqual([]);
  }
  expect(pawn.priorityWork).toBeUndefined();
  expect(world.resources).toHaveLength(0);
  expect(world.structures).toHaveLength(0);
  expect(job.construction).toBe('frame');
  expect(job.escrow.wood).toBe(12);
  expect(world.stock.wood).toBe(0);
  expect(pawn.orders.active).toBeNull();
  expect(pawn.priorities.build).toBe(0);
});

test('with the missing materials present, the same direct order finishes despite Construction zero and survives exact replay',()=>{
  const world=obstructedBed(33),pawn=world.pawns[0]!,job=world.jobs[0]!;
  const restored=deserializeWorld(serializeWorld(world));
  let sawFrame=false;
  for(let i=0;i<1000&&!world.structures.some(s=>s.kind==='bed');i++){
    sawFrame ||= job.construction==='frame';
    stepWorld(world);stepWorld(restored);
    expect(world).toEqual(restored);
    expect(validateWorld(world),`tick ${world.tick}`).toEqual([]);
  }
  expect(sawFrame).toBe(true);
  expect(world.structures).toMatchObject([{kind:'bed',x:14,z:8}]);
  expect(world.jobs).toHaveLength(0);
  expect(world.stock.wood).toBe(0);
  expect(pawn.priorities.build).toBe(0);
});
