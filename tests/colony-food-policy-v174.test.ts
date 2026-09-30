import { expect, test } from 'vitest';
import { applyCommand } from '../src/sim/index.ts';
import { addGroundMaterial } from '../src/sim/materials.ts';
import { planCookingOrder } from '../src/sim/player-cooking.ts';
import { isCookingOrder } from '../src/sim/order-types.ts';
import { ROT_DAYS } from '../src/sim/food-preservation.ts';
import { TICKS_PER_DAY, type Command, type Structure, type World } from '../src/sim/types.ts';
import { foodWorkstationCamp } from './scenarios/food-workstations.ts';
import { playerDecisions } from './scenarios/colony-player.ts';

function fireScene() {
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!;
  pawn.priorities.cook=1;
  const fire:Structure={id:world.nextId++,kind:'campfire',x:16,z:16,orientation:0,footprint:'standard',fuel:{ticks:12000,burned:0,autoRefuel:false},bills:[]};
  world.structures.push(fire);
  return {world,pawn,fire};
}
function foodCommands(world:World,fire:Structure):Command[] {
  return playerDecisions(world,{bulkMeals:true}).map(d=>d.command).filter(c=>
    (c.type==='bill-add'||c.type==='bill-update'||c.type==='bill-move')&&c.structureId===fire.id);
}
function configure(world:World,fire:Structure):void {
  for(let round=0;round<4;round++) {
    const commands=foodCommands(world,fire);
    if(!commands.length)break;
    for(const command of commands)expect(applyCommand(world,command)).toMatchObject({ok:true});
  }
  expect(fire.bills?.map(b=>b.recipe)).toEqual(['cook-simple-meal-bulk','simple-meal']);
  for(const bill of fire.bills!) {
    expect(bill).toMatchObject({mode:'until',target:2});
    expect(Object.values(bill.filters).every(value=>typeof value==='boolean')).toBe(true);
  }
}
function proposal(world:World,fire:Structure) {
  const result=planCookingOrder(world,world.pawns[0]!,fire.id);
  expect(result.order&&isCookingOrder(result.order)).toBe(true);
  if(!result.order||!isCookingOrder(result.order))throw Error(result.reason??'Aucune cuisson réalisable.');
  return result.order.cooking;
}

test('opt-in installs x4 before unit, keeps the historical default and reads World/PRNG without mutation',()=>{
  const {world,fire}=fireScene();
  addGroundMaterial(world,'food',40,{x:11,z:11},'rice');
  const before=JSON.stringify(world);
  const old=playerDecisions(world).map(d=>d.command).filter(c=>c.type==='bill-add'&&c.structureId===fire.id);
  expect(old).toEqual([{type:'bill-add',structureId:fire.id}]);
  expect(foodCommands(world,fire)).toEqual([
    {type:'bill-add',structureId:fire.id,recipe:'cook-simple-meal-bulk'},
    {type:'bill-add',structureId:fire.id,recipe:'simple-meal'},
  ]);
  expect(JSON.stringify(world)).toBe(before);
  configure(world,fire);
  expect(proposal(world,fire)).toMatchObject({recipe:'cook-simple-meal-bulk',ingredients:expect.any(Array)});
  expect(proposal(world,fire).ingredients.reduce((n,i)=>n+i.quantity,0)).toBe(40);
});

test('an older unit bill moves behind x4 without cancelling its active cooking',()=>{
  const {world,pawn,fire}=fireScene();
  addGroundMaterial(world,'food',10,{x:11,z:11},'rice');
  expect(applyCommand(world,{type:'bill-add',structureId:fire.id,recipe:'simple-meal'})).toMatchObject({ok:true});
  const single=fire.bills![0]!;
  expect(applyCommand(world,{type:'order-cook',pawnId:pawn.id,structureId:fire.id,queue:false})).toMatchObject({ok:true});
  expect(pawn.cooking?.billId).toBe(single.id);
  const first=foodCommands(world,fire);
  expect(first).toEqual([{type:'bill-add',structureId:fire.id,recipe:'cook-simple-meal-bulk'}]);
  expect(applyCommand(world,first[0]!)).toMatchObject({ok:true});
  const second=foodCommands(world,fire);
  expect(second).toContainEqual({type:'bill-move',structureId:fire.id,billId:fire.bills![1]!.id,direction:-1});
  expect(second.some(c=>c.type==='bill-update'&&c.billId===single.id)).toBe(false);
  for(const command of second)expect(applyCommand(world,command)).toMatchObject({ok:true});
  expect(fire.bills?.map(b=>b.recipe)).toEqual(['cook-simple-meal-bulk','simple-meal']);
  expect(pawn.cooking?.billId).toBe(single.id);
  expect(pawn.cooking?.ingredients.reduce((n,i)=>n+i.quantity,0)).toBe(10);
});

test('the physical planner falls back to one meal below 40, with unreachable or expired raw sources',()=>{
  for(const circumstance of ['short','sealed','expired'] as const) {
    const {world,fire}=fireScene();configure(world,fire);
    addGroundMaterial(world,'food',circumstance==='short'?39:10,{x:11,z:11},'rice');
    const freshId=world.piles.at(-1)!.id;
    if(circumstance!=='short') {
      addGroundMaterial(world,'food',30,{x:25,z:25},'rice');
      if(circumstance==='sealed')for(let z=24;z<=26;z++)for(let x=24;x<=26;x++)if(x!==25||z!==25)world.tiles[z*world.width+x]={terrain:'rock'};
      if(circumstance==='expired')world.piles.at(-1)!.rot={progress:ROT_DAYS.rice*TICKS_PER_DAY,atTick:world.tick};
    }
    const before=JSON.stringify(world);
    const task=proposal(world,fire);
    expect(task.ingredients.reduce((n,i)=>n+i.quantity,0)).toBe(10);
    expect(task.ingredients.every(i=>i.pileId===freshId)).toBe(true);
    expect(task.recipe).toBeUndefined(); // historical unit task encoding
    expect(playerDecisions(world,{bulkMeals:true}).some(d=>d.command.type==='order-cook'&&d.command.structureId===fire.id)).toBe(true);
    expect(JSON.stringify(world)).toBe(before);
  }
});

test('a real second cooking order reserves 40 of 50 units and leaves the unit fallback',()=>{
  const {world,pawn,fire}=fireScene();configure(world,fire);
  addGroundMaterial(world,'food',50,{x:11,z:11},'rice');
  const other=structuredClone(pawn);other.id=world.nextId++;other.name='Second cuisinier';other.x=24;other.z=15;world.pawns.push(other);
  const second:Structure={id:world.nextId++,kind:'campfire',x:22,z:16,orientation:0,footprint:'standard',fuel:{ticks:12000,burned:0,autoRefuel:false},bills:[]};
  world.structures.push(second);
  expect(applyCommand(world,{type:'bill-add',structureId:second.id,recipe:'cook-simple-meal-bulk'})).toMatchObject({ok:true});
  expect(applyCommand(world,{type:'order-cook',pawnId:other.id,structureId:second.id,queue:false})).toMatchObject({ok:true});
  expect(other.cooking?.ingredients.reduce((n,i)=>n+i.quantity,0)).toBe(40);
  expect(proposal(world,fire).ingredients.reduce((n,i)=>n+i.quantity,0)).toBe(10);
  expect(proposal(world,fire).recipe).toBeUndefined();
});
