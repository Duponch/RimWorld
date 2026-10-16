import {medicalCamp} from './health.ts';
import {addMaterial,refreshStock} from '../../src/sim/materials.ts';
import {newBuildingFuel} from '../../src/sim/fuel.ts';
import {serializeWorld} from '../../src/sim/serialization.ts';
import type {Pawn,Structure} from '../../src/sim/types.ts';

/** Finite declared night camp. No construction, burn or service transition played. */
export function torchWorkshopV390(size=32){
  const world=medicalCamp(1,size),pawn=world.pawns[0]!;
  world.tick=6000;world.piles=[];pawn.x=5;pawn.z=7;
  pawn.hunger=pawn.rest=pawn.recreation.level=100;pawn.apparelAutomation=false;pawn.schedule.fill('work');
  for(const key of Object.keys(pawn.priorities) as (keyof Pawn['priorities'])[])pawn.priorities[key]=0;
  pawn.priorities.build=1;pawn.priorities.haul=0;
  const torchCell={x:8,z:7},storage={x:5,z:6};
  addMaterial(world,'wood',20,{type:'ground',...storage},'wood');const constructionWoodId=world.piles.at(-1)!.id;
  addMaterial(world,'wood',10,{type:'ground',x:15,z:7},'wood');const reserveWoodId=world.piles.at(-1)!.id;
  const preparedTorch:Structure={id:world.nextId++,kind:'torch-lamp',x:17,z:7,orientation:0,footprint:'standard',material:'wood',
    fuel:{...newBuildingFuel('torch-lamp'),ticks:1,burned:0,burnRemainder:4,autoRefuel:false}};
  world.structures.push(preparedTorch);
  refreshStock(world);
  return {world,initial:serializeWorld(world),pawnId:pawn.id,torchCell,storage,constructionWoodId,
    preparedTorchId:preparedTorch.id,reserveWoodId,
    notice:'PRÉPARÉ : camp nocturne, 20 bois de chantier + 10 bois de recharge ; seconde torche à réserve 1 et reste 4, Auto désactivé. Aucun travail joué.'};
}
