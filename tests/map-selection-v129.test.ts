import {expect,test} from 'vitest';
import {createWorld} from '../src/sim/engine';
import {mapObjectCells,mapObjectsAt,nextMapObject} from '../src/ui/map-object-selection';
import {mapHoverLines} from '../src/ui/map-hover-readout';

test('bare terrain and constructed floors have a hover readout but no ordinary selection',()=>{
  const world=createWorld(129,16,16),cell={x:2,z:2};
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  world.resources=[];world.structures=[];world.jobs=[];world.piles=[];world.stockpiles=[];world.packed=[];world.growingZones=[];
  expect(mapObjectsAt(world,cell)).toEqual([]);
  expect(mapHoverLines(world,cell)[0]).toContain('Terre ordinaire');
  world.tiles[cell.z*world.width+cell.x]!.floor='wood-planks';
  expect(mapObjectsAt(world,cell)).toEqual([]);
  expect(mapHoverLines(world,cell)[0]).toContain('Plancher bois');
  world.tiles[cell.z*world.width+cell.x]={terrain:'rock',stone:'limestone'};
  expect(mapObjectsAt(world,cell)).toEqual([{kind:'rock',id:cell.z*world.width+cell.x}]);
});

test('a ground meal is selected independently of its zone and stacked things cycle by identity',()=>{
  const world=createWorld(130,16,16),cell={x:2,z:2},index=cell.z*world.width+cell.x;
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  world.resources=[];world.structures=[];world.jobs=[];world.piles=[];world.stockpiles=[];world.packed=[];world.growingZones=[];
  world.piles.push({id:world.nextId++,kind:'food',item:'simple-meal',quantity:2,owner:{type:'ground',...cell}});
  world.piles.push({id:world.nextId++,kind:'wood',item:'wood',quantity:1,owner:{type:'ground',...cell}});
  world.growingZones.push({id:world.nextId++,cells:[index,index+1],plant:'rice',allowSow:true,allowCut:true});
  const objects=mapObjectsAt(world,cell);
  expect(objects.map(object=>object.kind)).toEqual(['pile','pile','growing']);
  expect(nextMapObject(world,cell,undefined)).toEqual(objects[0]);
  expect(nextMapObject(world,cell,objects[0])).toEqual(objects[1]);
  expect(nextMapObject(world,cell,objects[1])).toEqual(objects[2]);
  expect(nextMapObject(world,cell,objects[2])).toEqual(objects[0]);
  expect(mapObjectCells(world,objects[2]!)).toEqual([cell,{x:3,z:2}]);
  expect(mapHoverLines(world,cell)).toContain('Repas simple ×2');
  expect(mapHoverLines(world,cell)).toContain('Zone de culture');
  world.piles.shift();
  expect(mapObjectCells(world,objects[0]!)).toEqual([]);
});
