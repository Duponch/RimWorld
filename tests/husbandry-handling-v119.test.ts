import {expect,test} from 'vitest';
import {applyTaming,advanceTameness,handlingFeedUnits,handlingProposal,handlingSkill,handlingWanted,processHandling,startHandling} from '../src/sim/animal-handling.ts';
import {blockedCells,reachableCells} from '../src/sim/pathfinding.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {releaseWork} from '../src/sim/work-release.ts';
import {huntingCamp} from './scenarios/hunting.ts';
import type {AnimalSpeciesId} from '../src/sim/animal-species.ts';

test.each([
  ['hare',8,1],['deer',8,4],['gazelle',8,3],['muffalo',6,6],['dromedary',2,6],
] as const)('%s keeps two real offerings and its own skill threshold',(species,level,units)=>{
  const world=huntingCamp(),pawn=world.pawns[0]!,animal=world.wildlife!.animals[0]!;
  world.pawns=[pawn];pawn.priorities.hunt=0;pawn.priorities.handle=1;
  pawn.skills.animals={level:level-1,xp:0,dailyXp:0,passion:0};pawn.x=4;pawn.z=10;
  animal.species=species as AnimalSpeciesId;animal.x=5;animal.z=10;animal.path=[];animal.state='idle';animal.motion=undefined;
  addMaterial(world,'food',units*2,{type:'ground',x:pawn.x,z:pawn.z},'berries');
  expect(handlingSkill(species)).toBe(level);
  expect(handlingFeedUnits(species)).toBe(units);
  expect(applyTaming(world,{type:'tame',animalId:animal.id,enabled:true})).toEqual({ok:true});
  expect(handlingWanted(world,pawn)).toBe(false);
  pawn.skills.animals.level=level;
  expect(handlingWanted(world,pawn)).toBe(true);
  const proposal=handlingProposal(world,pawn,reachableCells(world,pawn,blockedCells(world),new Set()));
  expect(proposal?.task).toMatchObject({kind:'tame',quantity:units*2,step:0});
});

test('a tamed roamer does not inherit the hare familiarity decay',()=>{
  const world=huntingCamp(),animal=world.wildlife!.animals[0]!;
  animal.species='muffalo';animal.domestic={since:world.tick,care:'herbal',tameness:5,nextDecay:world.tick+1,lastTraining:world.tick};
  const decay=animal.domestic.nextDecay;
  world.tick+=45001;advanceTameness(world);
  expect(animal.domestic).toMatchObject({tameness:5,nextDecay:decay});
});

test('deer consumes four carried raw units at each real feeding stage',()=>{
  const world=huntingCamp(),pawn=world.pawns[0]!,animal=world.wildlife!.animals[0]!;
  world.pawns=[pawn];pawn.priorities.hunt=0;pawn.priorities.handle=1;
  pawn.skills.animals={level:8,xp:0,dailyXp:0,passion:0};pawn.x=4;pawn.z=10;
  animal.species='deer';animal.x=5;animal.z=10;animal.food=0;animal.path=[];animal.state='idle';animal.motion=undefined;
  addMaterial(world,'food',8,{type:'ground',x:pawn.x,z:pawn.z},'berries');
  applyTaming(world,{type:'tame',animalId:animal.id,enabled:true});
  const proposal=handlingProposal(world,pawn,reachableCells(world,pawn,blockedCells(world),new Set()))!;
  startHandling(pawn,proposal);
  const act=()=>{processHandling(world,pawn,{search:()=>null,candidates:()=>null,blocked:()=>new Uint8Array(),move:()=>{throw Error('unexpected travel');},release:()=>releaseWork(world,pawn),event:()=>{}});refreshStock(world);world.tick++;};
  for(let i=0;i<200&&pawn.animalHandling?.step!==3;i++)act();
  expect(pawn.animalHandling).toMatchObject({step:3,quantity:4});
  expect(animal.food).toBeCloseTo(.2);
  expect(world.piles.find(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id)?.quantity).toBe(4);
  for(let i=0;i<200&&pawn.animalHandling?.step!==5;i++)act();
  expect(pawn.animalHandling).toMatchObject({step:5,quantity:0,carryPileId:null});
  expect(animal.food).toBeCloseTo(.4);
  expect(world.piles.filter(p=>p.item==='berries').reduce((sum,p)=>sum+p.quantity,0)).toBe(0);
});
