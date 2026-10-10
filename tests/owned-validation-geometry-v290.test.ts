import {expect,test} from 'vitest';
import {createOwnedValidationGeometry} from '../src/sim/owned-validation-geometry.ts';
import {groundOccupancyAllows,storageOccupancyAllows,OCCUPANCY} from '../src/sim/occupancy.ts';
import type {Cell,Resource,Structure,World} from '../src/sim/types.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';

// Domain: stable ordinary data resources/structures and ordinary intrinsics.
// Public getters/Proxy/reentrance are not admitted by this helper's callers.
const hydroCrops=['rice','potato','cotton','healroot'];
const countHydro=(world:World,cells:ReadonlyMap<number,unknown>):number=>{
  let count=0;for(const resource of world.resources)if(cells.has(resource.z*world.width+resource.x)&&!hydroCrops.includes(resource.kind))count++;return count;
};
const outcome=(read:()=>unknown):unknown=>{try{return read();}catch(error){return `${(error as Error).name}: ${(error as Error).message}`;}};
const resource=(id:number,x:number,z:number,kind:Resource['kind']='tree'):Resource=>({id,x,z,kind,amount:25});
const structure=(id:number,kind:Structure['kind'],x:number,z:number,orientation:0|1|2|3=0):Structure=>({id,kind,x,z,orientation,footprint:'standard'});
function equalGeometry(world:World,cells:Cell[]){
  const reader=createOwnedValidationGeometry(world);
  for(const cell of cells){
    expect(outcome(()=>reader.groundAllows(cell))).toEqual(outcome(()=>groundOccupancyAllows(world,cell)));
    expect(outcome(()=>reader.storageAllows!(cell))).toEqual(outcome(()=>storageOccupancyAllows(world,cell)));
    // Cross-predicate reuse must preserve the second query too.
    expect(outcome(()=>reader.groundAllows(cell))).toEqual(outcome(()=>groundOccupancyAllows(world,cell)));
  }
}

test('all occupancy kinds and rotations keep the historical footprint point query',()=>{
  const world=deconstructionCamp(0,16),cells:Cell[]=[];
  for(let z=4;z<=12;z++)for(let x=4;x<=12;x++)cells.push({x,z});
  for(const kind of Object.keys(OCCUPANCY) as Structure['kind'][]){
    for(const orientation of [0,1,2,3] as const){
      const building=structure(1,kind,8,8,orientation);
      // Ordered, duplicated occurrences and unrelated distant buckets.
      world.structures=[structure(2,'orbital-beacon',1,1),building,building,structure(1,'wall',15,15)];
      equalGeometry(world,cells);
    }
  }
  world.structures=[{...structure(1,'bed',8,8,2),footprint:'legacy-single'},structure(2,'table-long',5,5,1),structure(3,'wind-turbine',11,8,3)];
  equalGeometry(world,cells);
});

test('ground and storage stay distinct and reread terrain, version and jobs',()=>{
  const world=deconstructionCamp(0,16),cell={x:8,z:8};
  world.structures=[structure(1,'biofuel-refinery',8,8)];
  const reader=createOwnedValidationGeometry(world);
  expect(reader.groundAllows(cell)).toBe(true);expect(reader.storageAllows!(cell)).toBe(false);
  world.tiles[cell.z*world.width+cell.x]!.terrain='water';
  expect(reader.groundAllows(cell)).toBe(false);expect(reader.storageAllows!(cell)).toBe(false);
  world.tiles[cell.z*world.width+cell.x]!.terrain='grass';
  world.jobs=[structure(2,'wall',7,8) as World['jobs'][number]];
  world.schemaVersion=15 as World['schemaVersion'];
  expect(reader.groundAllows({x:7,z:8})).toBe(false);
  world.schemaVersion=21 as World['schemaVersion'];
  expect(reader.groundAllows({x:7,z:8})).toBe(groundOccupancyAllows(world,{x:7,z:8}));
  // Storage jobs use furniture kind; they are deliberately outside the index.
  world.jobs=[{...structure(3,'wall',7,8),kind:'install',furniture:{kind:'dresser'}} as World['jobs'][number]];
  expect(reader.storageAllows!({x:7,z:8})).toBe(storageOccupancyAllows(world,{x:7,z:8}));
});

test('atypical structures and queries fall back with historical short-circuit and errors',()=>{
  const world=deconstructionCamp(0,16),cells=[{x:8,z:8},{x:9,z:8},{x:0,z:1},{x:16,z:0},{x:8.5,z:8.5},{x:NaN,z:8}];
  const scenes:Structure[][]=[
    [structure(1,'wood-generator',8.5,8.5)],
    [{...structure(1,'table',8,8),orientation:9} as unknown as Structure],
    [{...structure(1,'table',8,8),kind:'unknown'} as unknown as Structure],
    [{...structure(1,'table',8,8),furniture:{kind:'solar-generator'}} as unknown as Structure],
    [structure(1,'wall',8,8),{...structure(2,'table',8,8),kind:'unknown'} as unknown as Structure],
    [structure(1,'wall',8,8),null as unknown as Structure],
    [structure(1,'wall',Number.MAX_SAFE_INTEGER,8)],
  ];
  for(const scene of scenes){world.structures=scene;equalGeometry(world,cells);}
  world.structures=[];world.structures.length=1;equalGeometry(world,cells);
});

test('presence and hydro counts share capture while preserving aliases and occurrences',()=>{
  const world=deconstructionCamp(0,16),duplicate=resource(1,5,5);
  world.resources=[duplicate,duplicate,resource(1,16,0),resource(2,0,1),resource(3,-1,2),resource(4,15,1),resource(5,-0,7),resource(6,8,8,'rice'),resource(7,8,8,'potato'),resource(8,8,8,'cotton'),resource(9,8,8,'healroot')];
  const reader=createOwnedValidationGeometry(world),cells=new Map([[5*16+5,true],[16,true],[31,true],[7*16,true],[8*16+8,true]]);
  for(const cell of [{x:5,z:5},{x:16,z:0},{x:0,z:1},{x:-1,z:2},{x:15,z:1},{x:0,z:7},{x:8,z:8},{x:NaN,z:7}])expect(reader.hasResource(cell)).toBe(world.resources.some(r=>r.x===cell.x&&r.z===cell.z));
  expect(reader.hydroOverlapCount!(cells)).toBe(countHydro(world,cells));
  expect(reader.hydroOverlapCount!(new Map([[16,true]]))).toBe(2);
  expect(reader.hydroOverlapCount!(new Map([[8*16+8,true]]))).toBe(0);
});

test('resource fallback keeps holes, atypical numeric values, malformed records and hydro coercions',()=>{
  const world=deconstructionCamp(0,16),cells:Cell[]=[{x:1,z:1},{x:2.5,z:3.5},{x:Infinity,z:8},{x:NaN,z:4}];
  const scenes:Resource[][]=[
    [resource(1,1,1),resource(2,2.5,3.5),resource(3,Infinity,8),resource(4,NaN,4)],
    [resource(1,1,1),null as unknown as Resource],
    [resource(1,1,1),{...resource(2,2,3),x:'2',z:'3'} as unknown as Resource],
  ];
  const hole=[resource(1,1,1)];hole.length=2;scenes.push(hole);
  for(const resources of scenes){
    world.resources=resources;const reader=createOwnedValidationGeometry(world);
    for(const cell of cells)expect(outcome(()=>reader.hasResource(cell))).toEqual(outcome(()=>world.resources.some(r=>r.x===cell.x&&r.z===cell.z)));
    const linked=new Map<unknown,unknown>([[NaN,true],[Infinity,true],[1*16+1,true],['482',true]]) as ReadonlyMap<number,unknown>;
    expect(outcome(()=>reader.hydroOverlapCount!(linked))).toEqual(outcome(()=>countHydro(world,linked)));
  }
});

test('the bounded dense allocation has an exact sparse presence and hydro alternative',()=>{
  const world={...deconstructionCamp(0,16),width:1048577,height:1};
  world.resources=[resource(1,1048577,0),resource(2,0,1),resource(3,-0,0)];
  const reader=createOwnedValidationGeometry(world),linked=new Map([[1048577,true],[0,true]]);
  expect(reader.hasResource({x:1048577,z:0})).toBe(true);expect(reader.hasResource({x:0,z:1})).toBe(true);
  expect(reader.hasResource({x:0,z:0})).toBe(true);expect(reader.hasResource({x:1,z:0})).toBe(false);
  expect(reader.hydroOverlapCount!(linked)).toBe(countHydro(world,linked));
});

test('creation and terrain refusals are lazy; fresh adoption sees changed collections',()=>{
  const world=deconstructionCamp(0,16),cell={x:8,z:8};
  Object.defineProperty(world,'resources',{get(){throw new Error('resources read');},configurable:true});
  Object.defineProperty(world,'structures',{get(){throw new Error('structures read');},configurable:true});
  const lazy=createOwnedValidationGeometry(world);
  expect(lazy.groundAllows({x:-1,z:0})).toBe(false);
  world.tiles[8*16+8]!.terrain='water';expect(lazy.groundAllows(cell)).toBe(false);
  expect(()=>lazy.hasResource(cell)).toThrow('resources read');
  // Throwing accessors only establish laziness; no accessor capture is claimed.
  Object.defineProperty(world,'resources',{value:[resource(1,8,8)],writable:true,configurable:true});
  Object.defineProperty(world,'structures',{value:[structure(2,'wall',8,8)],writable:true,configurable:true});
  world.tiles[8*16+8]!.terrain='grass';
  const first=createOwnedValidationGeometry(world);expect(first.hasResource(cell)).toBe(true);expect(first.groundAllows(cell)).toBe(false);
  const next={...world,resources:[],structures:[]};
  const second=createOwnedValidationGeometry(next);expect(second.hasResource(cell)).toBe(false);expect(second.groundAllows(cell)).toBe(true);
  expect(first.hasResource(cell)).toBe(true);expect(first.groundAllows(cell)).toBe(false);
});
