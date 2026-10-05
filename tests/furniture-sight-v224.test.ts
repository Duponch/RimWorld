import {expect,test} from 'vitest';
import {captureFurnitureSight} from '../src/sim/furniture-sight.ts';
import {captureWorldShotGrid} from '../src/sim/combat-world.ts';
import {clearShotSegment,type ShotGrid} from '../src/sim/combat-space.ts';
import {FRAME_SHOT_FILL,RESOURCE_SHOT_FILL,itemShotFill,resourceShotFill} from '../src/sim/combat-content.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {newDoorState} from '../src/sim/door-rules.ts';
import {comfortForStructure} from '../src/sim/furniture-stats.ts';
import {ITEM_DEFINITIONS,type ItemId} from '../src/sim/items.ts';
import type {Orientation,Structure,StructureKind,World} from '../src/sim/types.ts';
import {updateWellbeing} from '../src/sim/wellbeing.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';

function building(world:World,kind:StructureKind,x:number,z:number,orientation:Orientation=0):Structure {
  const result:Structure={id:world.nextId++,kind,x,z,orientation,footprint:'standard',quality:'normal',
    ...((kind==='door'||kind==='autodoor')?{door:newDoorState(world.tick)}:{})};
  world.structures.push(result);return result;
}
function comfort(world:World,bed:Structure,grid:ShotGrid):number {
  return comfortForStructure({structures:world.structures,cellsOf:value=>footprintCells(value as Structure),
    lineOfSight:(from,to)=>clearShotSegment(grid,from,to)},bed);
}
function checkComfort(world:World,beds:readonly Structure[]):void {
  const before=JSON.stringify(world),reference=captureWorldShotGrid(world),candidate=captureFurnitureSight(world);
  for(const bed of beds)expect(comfort(world,bed,candidate)).toBe(comfort(world,bed,reference));
  expect(JSON.stringify(world)).toBe(before);
}

test('comfort sight agrees with complete cover over every physical blocker and bed orientation',()=>{
  const world=deconstructionCamp();
  // Queries use one ordinary small World. Overlap here is an intentional
  // geometry oracle, not a valid player construction or a save fixture.
  for(const kind of ['wall','cooler','wood-generator','door','autodoor','bed','table','sandbags','power-conduit'] as const)
    for(const orientation of [0,1,2,3] as const)for(const footprint of ['standard','legacy-single'] as const) {
      world.structures=[];
      const bed=building(world,'bed',12,12,orientation);bed.footprint=footprint;
      const hospital=building(world,'hospital-bed',20,20,orientation);
      building(world,'end-table',13,12);building(world,'dresser',12,18,orientation);
      building(world,'end-table',21,20);building(world,'dresser',20,25,orientation);
      const obstacle=building(world,kind,12,15,orientation);
      for(const open of [false,true]) {
        if(obstacle.door)obstacle.door.open=open;
        checkComfort(world,[bed,hospital]);
        const old=captureWorldShotGrid(world),fresh=captureFurnitureSight(world);
        // Region lies within the possible fixture facility paths. Compare
        // every point, not only the successful visibility segment.
        const oldPoints:boolean[]=[],newPoints:boolean[]=[];
        for(let z=8;z<=26;z++)for(let x=8;x<=26;x++) {
          oldPoints.push(old.blocksSight(x,z));newPoints.push(fresh.blocksSight(x,z));
        }
        expect(newPoints).toEqual(oldPoints);
      }
    }
});

test('capture keeps original open-door fill arbitration and owns in-place rock/door/footprint mutations',()=>{
  const world=deconstructionCamp(),bed=building(world,'bed',12,12);
  building(world,'dresser',12,18);const door=building(world,'door',12,15),wall=building(world,'wall',12,15);
  door.door!.open=true;
  const original=captureFurnitureSight(world),reference=captureWorldShotGrid(world);
  expect(original.blocksSight(12,15)).toBe(false);
  expect(comfort(world,bed,original)).toBe(comfort(world,bed,reference));
  const before=comfort(world,bed,original);
  door.door!.open=false;world.tiles[14*world.width+12]!.terrain='rock';wall.x=13;
  expect(original.blocksSight(12,15)).toBe(false);
  expect(original.blocksSight(12,14)).toBe(false);
  expect(comfort(world,bed,original)).toBe(before);
  checkComfort(world,[bed]);expect(captureFurnitureSight(world).blocksSight(12,14)).toBe(true);
  world.tiles[14*world.width+12]!.terrain='grass';door.door!.open=true;
  wall.x=12;wall.id=door.id;door.id=world.nextId++;
  // Smaller full ID beats the opened door regardless of input array order.
  for(const reversed of [false,true]) {
    if(reversed)world.structures.reverse();
    checkComfort(world,[bed]);expect(captureFurnitureSight(world).blocksSight(12,15)).toBe(true);
  }
  world.tiles[15*world.width+12]!.terrain='rock';
  expect(captureFurnitureSight(world).blocksSight(12,15)).toBe(true);
});

test('no delivered resource, frame or ground item can turn comfort sight opaque',()=>{
  const world=deconstructionCamp(),bed=building(world,'bed',12,12);
  building(world,'dresser',12,18);
  expect(FRAME_SHOT_FILL).toBeLessThanOrEqual(.99);
  for(const fill of Object.values(RESOURCE_SHOT_FILL))expect(fill).toBeLessThanOrEqual(.99);
  for(const id of Object.keys(ITEM_DEFINITIONS) as ItemId[])expect(itemShotFill(id)).toBeLessThanOrEqual(.99);
  world.resources=[{id:world.nextId++,kind:'tree',x:12,z:14,amount:12},
    {id:world.nextId++,kind:'berries',x:12,z:15,amount:8},
    {id:world.nextId++,kind:'wild-plant',species:'agave',x:12,z:16,amount:8},
    {id:world.nextId++,kind:'tree',species:'saguaro',x:12,z:17,amount:8}];
  for(const resource of world.resources)expect(resourceShotFill(resource)).toBeLessThanOrEqual(.99);
  world.piles.push({id:world.nextId++,kind:'chunk',item:'granite-chunk',quantity:1,owner:{type:'ground',x:12,z:15}});
  world.jobs.push({id:world.nextId++,kind:'wall',x:12,z:16,orientation:0,footprint:'standard',construction:'frame',
    status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}});
  checkComfort(world,[bed]);
  const source=captureWorldShotGrid(world),candidate=captureFurnitureSight(world);
  expect(clearShotSegment(candidate,{x:12,z:12},{x:12,z:18})).toBe(clearShotSegment(source,{x:12,z:12},{x:12,z:18}));
});

test('64 and 250 geometry, edge clipping, distant beds and real wellbeing retain exact outcomes',()=>{
  const world=deconstructionCamp();
  for(const size of [64,250]) {
    // Geometric view only: avoid regenerating a natural 250-square World for
    // a sight oracle. Root's complete replay uses the real published save.
    world.width=size;world.height=size;world.tiles=Array.from({length:size*size},()=>({terrain:'grass'}));world.structures=[];
    const beds=[building(world,'bed',1,1),building(world,'bed',size-2,size-2,2),building(world,'hospital-bed',Math.floor(size/2),Math.floor(size/2))];
    building(world,'end-table',2,1);building(world,'dresser',1,6);
    building(world,'end-table',size-3,size-2);building(world,'dresser',size-2,size-7,2);
    building(world,'dresser',Math.floor(size/2),Math.floor(size/2)+6);
    world.tiles[3*size+1]!.terrain='rock';checkComfort(world,beds);
    const oldWorld=structuredClone(world),newWorld=structuredClone(world),bed=beds[2]!,pawn=world.pawns[0]!;
    const prepare=(w:World)=>Object.assign(w.pawns[0]!,{x:bed.x,z:bed.z,state:'sleeping',comfort:99.99,
      need:{kind:'sleep',phase:'sleep',progress:0,bedId:bed.id,target:{x:bed.x,z:bed.z}}});
    prepare(oldWorld);prepare(newWorld);
    const originalGrid=captureWorldShotGrid(oldWorld),candidateGrid=captureFurnitureSight(newWorld);
    updateWellbeing(oldWorld,oldWorld.pawns[0]!,undefined,()=>originalGrid);
    updateWellbeing(newWorld,newWorld.pawns[0]!,undefined,()=>candidateGrid);
    expect(newWorld).toEqual(oldWorld);expect(world.pawns[0]).toBe(pawn);
  }
});
