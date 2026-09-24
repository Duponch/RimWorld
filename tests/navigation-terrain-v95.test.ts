import { expect,test } from 'vitest';
import { createWorld } from '../src/sim/engine';
import { FLOOR_DEFINITIONS,type FloorKind } from '../src/sim/flooring';
import { navigationCosts,terrainTravelDelay } from '../src/sim/furniture-travel';
import { resolveSite } from '../src/sim/site';
import { candidateAccess } from '../src/sim/candidate-access';
import { blockedCells } from '../src/sim/pathfinding';

test('dense navigation captures preserve every terrain and floor cost across site and same-tick edits',()=>{
  const terrain=['grass','soil','rich-soil','gravel','rough-stone','water','rock'] as const;
  const floors=Object.keys(FLOOR_DEFINITIONS) as FloorKind[];
  for(const site of [false,true]){
    const world=createWorld(42,16,16);
    world.structures=[];world.jobs=[];world.piles=[];world.fires=undefined;
    world.tiles=world.tiles.map((_,i)=>({terrain:terrain[i%terrain.length]!,...(i%3===0?{floor:floors[i%floors.length]!}:{})}));
    if(site)world.site=resolveSite(42);
    const capture=navigationCosts(world);
    for(let i=0;i<world.tiles.length;i++){
      const expected=Math.round(terrainTravelDelay(world,i)/3*1000);
      expect(capture.floors.get(i)).toBe(expected||undefined);
      expect(capture.costs?.get(i)).toBe(expected||undefined);
    }
    const old=capture.floors.get(0);
    world.tiles[0]={terrain:'rich-soil'};
    expect(capture.floors.get(0)).toBe(old);
    expect(navigationCosts(world).floors.get(0)).toBe(67);
  }
});

test('ordinary candidate access keeps navigation costs from construction time',()=>{
  const world=createWorld(42,16,16),origin={x:2,z:2},target=2*16+3;
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));world.tiles[target]={terrain:'grass',floor:'burned-wood'};
  world.structures=[];world.jobs=[];world.piles=[];
  const access=candidateAccess(world,origin,blockedCells(world),new Set());
  world.tiles[target]={terrain:'rich-soil'};
  expect(access.resolve(new Set([target])).costs[target]).toBe(1033);
  expect(candidateAccess(world,origin,blockedCells(world),new Set()).resolve(new Set([target])).costs[target]).toBe(1067);
});
