import {expect,test} from 'vitest';
import {createWorld} from '../src/sim/index.ts';
import {animalMealTarget,reservedPlantWorkCells} from '../src/sim/wildlife-food.ts';
import {enableWildlife,reconcileWildlife} from '../src/sim/wildlife.ts';

test('tick-local plant work index keeps the direct meal target and cancellation decisions',()=>{
  const world=createWorld(42,16,16);
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  world.resources=[];world.jobs=[];world.structures=[];world.piles=[];
  const blocked={id:world.nextId++,kind:'berries' as const,x:3,z:3,amount:10,growth:1,growthTick:world.tick};
  const free={...blocked,id:world.nextId++,x:5};
  world.resources.push(blocked,free);
  enableWildlife(world,2);
  const [first,second]=world.wildlife!.animals;
  first!.meal={kind:'plant',id:blocked.id,quantity:1,progress:0};
  second!.meal={kind:'plant',id:free.id,quantity:1,progress:0};
  const job=(plant:typeof blocked,reservedBy:number|null)=>({id:world.nextId++,kind:'harvest' as const,x:plant.x,z:plant.z,
    orientation:0 as const,footprint:'standard' as const,status:'pending' as const,reservedBy,progress:0,escrow:{wood:0,food:0}});
  world.jobs.push(job(blocked,world.pawns[0]!.id),job(free,null));
  const before=JSON.stringify(world),index=reservedPlantWorkCells(world);
  for(const animal of world.wildlife!.animals)
    expect(animalMealTarget(world,animal,undefined,index)).toEqual(animalMealTarget(world,animal));
  const direct=structuredClone(world),indexed=structuredClone(world);
  reconcileWildlife(direct);
  reconcileWildlife(indexed,undefined,index);
  expect(indexed).toEqual(direct);
  expect(indexed.wildlife!.animals[0]!.meal).toBeUndefined();
  expect(indexed.wildlife!.animals[1]!.meal?.id).toBe(free.id);
  expect(JSON.stringify(world)).toBe(before);
});
