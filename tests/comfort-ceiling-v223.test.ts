import {expect,test} from 'vitest';
import {stepWorld} from '../src/sim/engine.ts';
import {bedComfort,comfortForStructure,seatComfort} from '../src/sim/furniture-stats.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {TICKS_PER_DAY,type Structure} from '../src/sim/types.ts';
import {updateWellbeing} from '../src/sim/wellbeing.ts';
import {researchCost} from '../src/sim/research.ts';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';
import {prepareTelevisionWorld} from './scenarios/television-v208.ts';

test('an occupied excellent civilian bed with both facilities caps the need and saves an exact living continuation',()=>{
  const world=deconstructionCamp(),pawn=world.pawns[0]!;
  world.research={project:null,points:0,complexFurniture:{points:researchCost('complex-furniture'),completedAt:world.tick}};
  const bed:Structure={...fixtureBuilding(world,'bed',12,12),material:'wood',quality:'excellent'};
  world.structures[world.structures.length-1]=bed;
  fixtureBuilding(world,'end-table',13,12);fixtureBuilding(world,'dresser',16,14);
  Object.assign(pawn,{x:bed.x,z:bed.z,state:'sleeping',rest:20,comfort:99.99,bedId:bed.id,
    need:{kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:bed.x,z:bed.z}}});
  pawn.memories=[{kind:'ate-fine-meal',expiresAt:world.tick+TICKS_PER_DAY}];
  expect(validateWorld(world)).toEqual([]);
  // Raw furniture stats stay above one. Only the human need has a 100% cap.
  expect(bedComfort(bed,{endTable:true,dresser:true})).toBeCloseTo(1.054);
  expect(comfortForStructure({structures:world.structures},bed)).toBeCloseTo(1.054);
  updateWellbeing(world,pawn);expect(pawn.comfort).toBe(100);
  updateWellbeing(world,pawn);expect(pawn.comfort).toBe(100);
  expect(validateWorld(world)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(world));expect(resumed).toEqual(world);
  for(let tick=0;tick<10;tick++){stepWorld(world);stepWorld(resumed);}
  expect(validateWorld(world)).toEqual([]);expect(resumed).toEqual(world);
  expect(pawn.comfort).toBe(100);
  const malformed=structuredClone(world);malformed.pawns[0]!.comfort=100.001;
  expect(validateWorld(malformed)).toContain('Invalid comfort or meal memory.');
  expect(()=>deserializeWorld(JSON.stringify(malformed))).toThrow();
});

test('a real TV viewer on a legendary armchair stays capped and loses comfort at the old rate after leaving',()=>{
  // This small existing fixture establishes ordinary power before inspection.
  const world=prepareTelevisionWorld(1,1,true),pawn=world.pawns[0]!;
  const television=world.structures.find(s=>s.kind==='tube-television')!;
  const oldSeat=world.structures.find(s=>s.kind==='stool')!;
  const seat:Structure={...oldSeat,kind:'armchair',material:'cloth',quality:'legendary'};
  world.structures[world.structures.indexOf(oldSeat)]=seat;
  Object.assign(pawn,{x:seat.x,z:seat.z,state:'recreating',comfort:99.99});
  pawn.recreation.task={activity:'watch-television',buildingId:television.id,seatId:seat.id,
    target:{x:seat.x,z:seat.z},phase:'active',elapsed:1};
  expect(validateWorld(world)).toEqual([]);
  expect(seatComfort(seat)).toBeCloseTo(1.36);
  updateWellbeing(world,pawn);expect(pawn.comfort).toBe(100);
  updateWellbeing(world,pawn);expect(pawn.comfort).toBe(100);
  expect(validateWorld(world)).toEqual([]);
  pawn.recreation.task=null;pawn.state='idle';
  updateWellbeing(world,pawn);
  expect(pawn.comfort).toBe(100-4*24/TICKS_PER_DAY);
  expect(seatComfort(seat)).toBeCloseTo(1.36);
});

test('an ordinary occupied research chair keeps its exact ceiling and the historical rise below 100%',()=>{
  const world=deconstructionCamp(),pawn=world.pawns[0]!;
  const seat:Structure={...fixtureBuilding(world,'dining-chair',12,12),material:'wood',quality:'good'};
  world.structures[world.structures.length-1]=seat;
  const desk=fixtureBuilding(world,'research-bench',12,13);
  world.research={project:'stonecutting',points:0,stonecutting:{points:0}};
  Object.assign(pawn,{x:seat.x,z:seat.z,state:'working',need:null,
    research:{stationId:desk.id,spot:{x:seat.x,z:seat.z},worked:0}});
  const ceiling=seatComfort(seat)*100;
  pawn.comfort=ceiling-.1;updateWellbeing(world,pawn);expect(pawn.comfort).toBe(ceiling);
  const before=ceiling-1;pawn.comfort=before;updateWellbeing(world,pawn);
  expect(pawn.comfort).toBe(before+60*24/TICKS_PER_DAY);
  expect(seatComfort(seat)).toBe(.7*1.12);
});
