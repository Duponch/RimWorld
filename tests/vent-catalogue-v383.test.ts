import {expect,test} from 'vitest';
import {STRUCTURE_DEFINITIONS} from '../src/sim/definitions.ts';
import {constructionRecipe,validConstructionMaterial} from '../src/sim/construction-materials.ts';
import {validateConstructionMaterials} from '../src/sim/construction-material-save.ts';
import {blockedCells} from '../src/sim/pathfinding.ts';
import {canStandAt} from '../src/sim/furniture-travel.ts';
import {groundOccupancyAllows,storageOccupancyAllows} from '../src/sim/occupancy.ts';
import {RoomTopologyCache} from '../src/sim/room-topology.ts';
import {structureMaxHp,structureFlammability} from '../src/sim/thing-damage-rules.ts';
import {barrierMaxHp,isBarrier,isBreachableBarrier} from '../src/sim/barriers.ts';
import {isElectrical} from '../src/sim/power-rules.ts';
import {isPassageDoor,isRoomDoor} from '../src/sim/door-rules.ts';
import {minifiable} from '../src/sim/furniture-rules.ts';
import {RoofContext} from '../src/sim/roof-rules.ts';
import type {Structure,World} from '../src/sim/types.ts';

const vent:Structure={id:1,kind:'vent',x:2,z:2,orientation:0,footprint:'standard',material:'steel'};
/** Pure catalogue/topology witness, with no played-colony chronology claimed. */
const view=(structures:Structure[]=[{...vent}]):World=>({schemaVersion:244,width:5,height:5,
  tiles:Array.from({length:25},()=>({terrain:'grass'})),structures,jobs:[],piles:[],packed:[]} as unknown as World);

test('vent recipe and material provenance begin in244 and damage uses100PV',()=>{
  expect(constructionRecipe(vent)).toEqual({ingredients:[{item:'steel',quantity:30}],work:40,coreWork:400});
  expect(validConstructionMaterial('vent','steel',243)).toBe(false);
  expect(validConstructionMaterial('vent','steel',244)).toBe(true);
  expect(validConstructionMaterial('vent','wood',244)).toBe(false);
  const w=view();expect(validateConstructionMaterials(w,243)).not.toEqual([]);
  expect(validateConstructionMaterials(w,244)).toEqual([]);
  expect(STRUCTURE_DEFINITIONS.vent.blocksMovement).toBe(true);
  expect(structureMaxHp(vent)).toBe(100);expect(barrierMaxHp(vent)).toBe(100);
  expect(structureFlammability(vent)).toBe(1);
  expect(isBarrier(vent)).toBe(true);expect(isBreachableBarrier(vent)).toBe(true);
});

test('a vent closes a physical room boundary and offers no walking or storage surface',()=>{
  const wall=(z:number):Structure=>({id:2+z,kind:'wall',x:2,z,orientation:0,footprint:'standard',material:'steel'});
  const w=view([wall(0),wall(1),{...vent},wall(3),wall(4)]),cell={x:2,z:2};
  expect(blockedCells(w)[12]).toBe(1);expect(blockedCells(w,true)[12]).toBe(1);
  expect(canStandAt(w,cell)).toBe(false);expect(groundOccupancyAllows(w,cell)).toBe(false);
  expect(storageOccupancyAllows(w,cell)).toBe(false);
  const topology=new RoomTopologyCache().read(w),left=topology.at(1,2),right=topology.at(3,2);
  expect(topology.at(2,2)?.kind).toBe('solid');
  expect(left?.kind).toBe('space');expect(right?.kind).toBe('space');
  if(left?.kind!=='space'||right?.kind!=='space')throw Error('Expected two air spaces');
  expect(left.id).not.toBe(right.id);
});

test('a vent is neither an electrical consumer, a passage, a package nor a roof support',()=>{
  expect(isElectrical('vent')).toBe(false);expect(isRoomDoor('vent')).toBe(false);
  expect(isPassageDoor('vent')).toBe(false);expect(minifiable('vent')).toBe(false);
  expect(new RoofContext(view()).holders[12]).toBe(0);
});