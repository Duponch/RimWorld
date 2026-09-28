import {expect,test} from 'vitest';
import {stepWorld} from '../src/sim/engine.ts';
import {startFoodBinge,updateMentalBreak} from '../src/sim/mental-break.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import {medicalCamp} from './scenarios/health.ts';
import {mentalCamp} from './scenarios/mental-break.ts';
import {recruitmentUiFixture} from './scenarios/prison-camp.ts';

test('confirmed low-mood entry can select either minor crisis and preserves its draw on replay',()=>{
  for(const [seed,kind] of [[1,'food-binge'],[40,'sad-wander']] as const){
    const world=mentalCamp(seed),replay=deserializeWorld(serializeWorld(world));
    for(let i=0;i<20&&!world.pawns[0]!.mental?.crisis;i++){stepWorld(world);stepWorld(replay);}
    expect(world.pawns[0]!.mental?.crisis?.kind).toBe(kind);
    expect(replay).toEqual(world);
    expect(validateWorld(world)).toEqual([]);
  }
});

test('food binge eats a real reserved portion even when full and its assigned diet forbids food, then replays exactly',()=>{
  const world=medicalCamp(),pawn=world.pawns[0]!;
  pawn.hunger=98;pawn.rest=90;pawn.foodPolicyId=4;
  addMaterial(world,'food',40,{type:'ground',x:pawn.x+2,z:pawn.z},'rice');
  const initialFood=world.piles.filter(p=>p.kind==='food').reduce((sum,p)=>sum+p.quantity,0);
  expect(startFoodBinge(world,pawn)).toBe(true);
  expect(world.pawns[0]!.mental?.crisis?.kind).toBe('food-binge');
  for(let i=0;i<180&&pawn.need?.kind!=='eat';i++)stepWorld(world);
  expect(pawn.need?.kind).toBe('eat');
  const resumed=deserializeWorld(serializeWorld(world));
  for(let i=0;i<300;i++){stepWorld(world);stepWorld(resumed);}
  expect(resumed).toEqual(world);
  expect(world.events.some(e=>e.message.includes('a mangé une portion'))).toBe(true);
  expect(world.piles.filter(p=>p.kind==='food').reduce((sum,p)=>sum+p.quantity,0)).toBeLessThan(initialFood);
  expect(world.pawns[0]!.mental?.crisis?.kind).toBe('food-binge');
  expect(validateWorld(world)).toEqual([]);
});

test('food binge waits for physical food without inventing it and does not take voluntary bed rest',()=>{
  const world=medicalCamp(),pawn=world.pawns[0]!;
  pawn.hunger=100;pawn.rest=15;
  const bed=fixtureBuilding(world,'bed',pawn.x,pawn.z+1);pawn.bedId=bed.id;
  const initialFood=world.piles.filter(p=>p.kind==='food').reduce((sum,p)=>sum+p.quantity,0);
  expect(startFoodBinge(world,pawn)).toBe(true);
  stepWorld(world,35);
  expect(pawn.mental?.crisis?.kind).toBe('food-binge');
  expect(pawn.need?.kind).not.toBe('sleep');
  expect(world.piles.filter(p=>p.kind==='food').reduce((sum,p)=>sum+p.quantity,0)).toBe(initialFood);
  expect(validateWorld(world)).toEqual([]);
});

test('food binge excludes prisoners and ends with the shared catharsis at its duration bound',()=>{
  const {world:prisonerWorld,patientId}=recruitmentUiFixture();
  const prisoner=prisonerWorld.pawns.find(p=>p.id===patientId)!;
  const before=serializeWorld(prisonerWorld);
  expect(startFoodBinge(prisonerWorld,prisoner)).toBe(false);
  expect(serializeWorld(prisonerWorld)).toBe(before);

  const world=medicalCamp(),pawn=world.pawns[0]!;
  expect(startFoodBinge(world,pawn)).toBe(true);
  pawn.mental!.crisis!.age=44970;
  for(let i=0;i<3&&pawn.mental?.crisis;i++){world.tick++;updateMentalBreak(world,pawn);}
  expect(pawn.mental?.crisis).toBeUndefined();
  expect(pawn.mental?.catharsis).toEqual([world.tick+18000]);
  expect(validateWorld(world)).toEqual([]);
});
