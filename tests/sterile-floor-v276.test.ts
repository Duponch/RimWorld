import { expect,test } from 'vitest';
import { cleanlinessCamp,enclosedRoom } from './scenarios/cleanliness';
import { addGroundMaterial,applyCommand,deserializeWorld,refreshStock,serializeWorld,stepWorld,validateWorld } from '../src/sim/index';
import { FLOOR_DEFINITIONS,canDesignateFloor,flooringRecipe,removeFloor } from '../src/sim/flooring';
import { STERILE_MATERIALS_RESEARCH_COST } from '../src/sim/research';
import { validateFlooring } from '../src/sim/flooring-save';
import { validateDeconstruction } from '../src/sim/deconstruction-save';
import { floorBeauty } from '../src/sim/room-beauty';
import { addFilth,roomCleanliness } from '../src/sim/filth';
import { applyCleanRoom } from '../src/sim/cleaning';
import type { Job,World } from '../src/sim/types';

function camp():World {const w=cleanlinessCamp();w.research={project:null,points:0,sterileMaterials:{points:STERILE_MATERIALS_RESEARCH_COST,completedAt:0}};w.pawns[0]!.priorities.build=1;w.pawns[0]!.priorities.clean=0;return w;}
function until(w:World,done:()=>boolean,limit=1200):void {for(let i=0;i<limit&&!done();i++)stepWorld(w);expect(done(),JSON.stringify({tick:w.tick,jobs:w.jobs})).toBe(true);expect(validateWorld(w)).toEqual([]);}
function removal(w:World,x=16,z=16):Job {w.tiles[z*w.width+x]!.floor='sterile-tile';const j:Job={id:w.nextId++,kind:'remove-floor',floor:'sterile-tile',x,z,orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}};w.jobs.push(j);return j;}
const units=(w:World,item:'steel'|'silver')=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);

test('sterile surface has primary costs, work, skill and research without changing historical recipes',()=>{
  const w=cleanlinessCamp(),command={type:'designate' as const,kind:'lay-floor' as const,floor:'sterile-tile' as const,x:20,z:20};
  expect(canDesignateFloor(w,command).ok).toBe(false);
  w.research={project:null,points:0,sterileMaterials:{points:STERILE_MATERIALS_RESEARCH_COST,completedAt:0}};
  expect(canDesignateFloor(w,command)).toEqual({ok:true});
  expect(flooringRecipe('sterile-tile')).toEqual({ingredients:[{item:'steel',quantity:3},{item:'silver',quantity:12}],work:160,coreWork:1600});
  expect(FLOOR_DEFINITIONS['sterile-tile']).toMatchObject({skill:6,cleanliness:.6,cleaningTime:.6,flammability:0,pathCost:0});
  expect(floorBeauty({terrain:'grass',floor:'sterile-tile'})).toBe(-1);
  expect(flooringRecipe('steel-tile').ingredients).toEqual([{item:'steel',quantity:7}]);
  expect(flooringRecipe('sterile-tile',true).ingredients).toEqual([]);
});

test('real two-material delivery and frame resume consume exactly, then physical removal refunds both',()=>{
  const w=camp(),p=w.pawns[0]!,target={x:p.x+3,z:p.z};
  addGroundMaterial(w,'steel',3,{x:p.x-1,z:p.z},'steel');addGroundMaterial(w,'silver',12,{x:p.x-2,z:p.z},'silver');
  expect(applyCommand(w,{type:'designate',kind:'lay-floor',floor:'sterile-tile',...target}).ok).toBe(true);
  until(w,()=>w.jobs.some(j=>j.kind==='lay-floor'&&j.construction==='frame'));
  const copy=deserializeWorld(serializeWorld(w)),at=w.tick;
  until(w,()=>w.tiles[target.z*w.width+target.x]!.floor==='sterile-tile');stepWorld(copy,w.tick-at);expect(copy).toEqual(w);
  expect(units(w,'steel')).toBe(0);expect(units(w,'silver')).toBe(0);expect(w.tiles[target.z*w.width+target.x]!.terrain).toBe('grass');
  expect(applyCommand(w,{type:'designate',kind:'remove-floor',...target}).ok).toBe(true);
  until(w,()=>!w.tiles[target.z*w.width+target.x]!.floor);
  expect(units(w,'silver')).toBe(6);expect(w.deconstructed.lostSilver).toBe(6);
  expect(units(w,'steel')+(w.deconstructed.lostSteel??0)).toBe(3);expect(w.deconstructed.count).toBe(1);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('second refund saturation is atomic, and release of one cell allows exact resumed removal',()=>{
  const w=camp(),job=removal(w);
  for(let z=4;z<=28;z++)for(let x=4;x<=28;x++)if(x!==16||z!==16)addGroundMaterial(w,'wood',75,{x,z},'wood');
  const before=serializeWorld(w);expect(removeFloor(w,job)).toBe(false);expect(serializeWorld(w)).toBe(before);
  w.piles=w.piles.filter(p=>p.owner.type!=='ground'||p.owner.x!==16||p.owner.z!==15);refreshStock(w);
  const copy=deserializeWorld(serializeWorld(w));expect(removeFloor(w,job)).toBe(true);expect(removeFloor(copy,copy.jobs.find(j=>j.id===job.id)!)).toBe(true);expect(copy).toEqual(w);
  expect(units(w,'silver')).toBe(6);expect(units(w,'steel')).toBeGreaterThanOrEqual(1);
  const steel=w.piles.find(p=>p.item==='steel')!,silver=w.piles.find(p=>p.item==='silver')!;expect(steel.owner).not.toEqual(silver.owner);
  w.jobs=[];expect(validateWorld(w)).toEqual([]);
});

test('silver ledger and identity overflow refuse before either refund, floor or RNG changes',()=>{
  for(const overflow of ['ledger','identity'] as const){
    const w=camp(),job=removal(w);if(overflow==='ledger')w.deconstructed.lostSilver=Number.MAX_SAFE_INTEGER;else w.nextId=Number.MAX_SAFE_INTEGER;
    const before=JSON.stringify(w);expect(removeFloor(w,job)).toBe(false);expect(JSON.stringify(w)).toBe(before);
  }
});

test('only odd steel refund draws RNG, while legacy wood keeps its exact historical rounding',()=>{
  const w=camp(),job=removal(w),old=structuredClone(w);old.tiles[16*old.width+16]!.floor='wood-planks';old.jobs[0]!.floor='wood-planks';
  let next=w.rng;next^=next<<13;next^=next>>>17;next^=next<<5;next>>>=0;
  expect(removeFloor(w,job)).toBe(true);expect(removeFloor(old,old.jobs[0]!)).toBe(true);
  expect(w.rng).toBe(next);expect(old.rng).toBe(next);expect(units(w,'steel')).toBe(1+(next/4294967296<.5?1:0));expect(old.stock.wood).toBe(units(w,'steel'));
});

test('new floor, work and silver history are refused before schema211',()=>{
  const w=camp(),job=removal(w);expect(validateFlooring(w,210)).toContain('Invalid constructed floor.');expect(validateFlooring(w,210)).toContain('Invalid floor work.');
  w.deconstructed.lostSilver=6;expect(validateDeconstruction(w,210)).toContain('Invalid deconstruction ledger.');expect(validateDeconstruction(w,211)).not.toContain('Invalid deconstruction ledger.');
  w.schemaVersion=210 as World['schemaVersion'];const before=JSON.stringify(w);expect(removeFloor(w,job)).toBe(false);expect(canDesignateFloor(w,{type:'designate',kind:'remove-floor',x:16,z:16}).ok).toBe(false);expect(JSON.stringify(w)).toBe(before);
});

test('sterile room remains dirtyable and real cleaning restores its surface value with exact save continuation',()=>{
  const w=camp(),room=enclosedRoom(w,{x:10,z:10}),p=w.pawns[0]!;p.x=11;p.z=11;p.priorities.build=0;p.priorities.clean=1;w.home=[...room.cells].sort((a,b)=>a-b);
  for(const i of room.cells)w.tiles[i]!.floor='sterile-tile';
  expect(roomCleanliness(w,room.inside)).toBeCloseTo(.6);addFilth(w,{x:13,z:13},'blood',2);const trace=w.filth!.items[0]!.id;
  expect(roomCleanliness(w,room.inside)).toBeCloseTo(.6-10/9);expect(applyCleanRoom(w,{type:'clean-room',pawnId:p.id,...room.inside})).toBeNull();
  until(w,()=>p.cleaning?.phase==='clean'&&p.cleaning.progress>0);const copy=deserializeWorld(serializeWorld(w)),at=w.tick;
  until(w,()=>!w.filth!.items.some(f=>f.id===trace));stepWorld(copy,w.tick-at);expect(copy).toEqual(w);expect(roomCleanliness(w,room.inside)).toBeCloseTo(.6);
});
