import { expect, test } from 'vitest';
import { applyCommand, addGroundMaterial } from '../src/sim/index.ts';
import { queryCookingBillStatus } from '../src/sim/cooking-diagnostics.ts';
import { cookingSpot } from '../src/sim/cooking-bills.ts';
import { queuedCookingReason } from '../src/sim/player-cooking.ts';
import { AudioCueRecorder } from '../src/bridge/audio-cues.ts';
import { foodWorkstationCamp, fixtureFoodStation } from './scenarios/food-workstations.ts';
import type { CookingOrder } from '../src/sim/order-types.ts';

test('a stove bill reports each filtered food group and the required cooking skill',()=>{
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,station=fixtureFoodStation(world,'fueled-stove');
  station.fuel!.ticks=600;pawn.priorities.cook=1;pawn.skills.cooking!.level=5;
  expect(applyCommand(world,{type:'bill-add',structureId:station.id,recipe:'fine-meal'}).ok).toBe(true);
  const bill=station.bills![0]!;
  expect(queryCookingBillStatus(world,station,bill)).toMatchObject({code:'skill-required',reason:expect.stringContaining('Cuisine 6')});
  pawn.skills.cooking!.level=6;
  addGroundMaterial(world,'food',10,{x:7,z:7},'rice');
  expect(queryCookingBillStatus(world,station,bill)).toEqual({code:'missing-ingredients',reason:'Dans le rayon et les filtres : 0/5 protéines (viande ou lait) · 10/5 végétaux.'});
  addGroundMaterial(world,'food',5,{x:8,z:7},'milk');
  expect(queryCookingBillStatus(world,station,bill).code).toBe('waiting');
  bill.filters.milk=false;
  expect(queryCookingBillStatus(world,station,bill)).toMatchObject({code:'missing-ingredients',reason:expect.stringContaining('0/5 protéines')});
});

test('a queued direct order rejects ten vegetables even when total ingredients are sufficient',()=>{
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,station=fixtureFoodStation(world,'fueled-stove');
  station.fuel!.ticks=600;pawn.priorities.cook=1;
  expect(applyCommand(world,{type:'bill-add',structureId:station.id,recipe:'fine-meal'}).ok).toBe(true);
  addGroundMaterial(world,'food',10,{x:7,z:7},'rice');const pile=world.piles.at(-1)!;
  const order:CookingOrder={cooking:{recipe:'fine-meal',stationId:station.id,billId:station.bills![0]!.id,
    spot:cookingSpot(station),actionCell:{x:station.x,z:station.z},phase:'gather',
    ingredients:[{pileId:pile.id,item:'rice',quantity:10,stage:'source',cell:{x:station.x,z:station.z}}],
    progress:0,productId:null,storageId:null}};
  pawn.orders.queue.push(order);
  expect(queuedCookingReason(world,order)).toContain('cinq protéines');
});

test('fine-meal work emits the existing cooking cue from confirmed progress',()=>{
  const world=foodWorkstationCamp(),pawn=world.pawns[0]!,station=fixtureFoodStation(world,'fueled-stove');
  pawn.cooking={recipe:'fine-meal',stationId:station.id,billId:world.nextId++,spot:cookingSpot(station),
    actionCell:{x:station.x,z:station.z},phase:'work',ingredients:[],progress:0,productId:null,storageId:null};
  pawn.state='working';const recorder=new AudioCueRecorder();recorder.capture(world);
  world.tick++;pawn.cooking.progress=10000;recorder.capture(world);
  expect(recorder.drain()).toMatchObject([{kind:'cooking.work',x:station.x,z:station.z}]);
});
