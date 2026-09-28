import { expect, test } from 'vitest';
import { deserializeWorld, serializeWorld, stepWorld, validateWorld } from '../src/sim/index.ts';
import { advanceVisitors, enableVisitors } from '../src/sim/visitors.ts';
import { INTRO_VISITOR_TICK } from '../src/sim/visitor-state.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';

test('co-located visitors keep separate rations and eat in turn on one reserved service cell', () => {
  const world=deconstructionCamp();
  enableVisitors(world,true);
  // A deterministic introductory draw creates two real visitors with their
  // own physical inventory piles; only their shared stopping cell is staged.
  world.visitors!.rng=12964;
  world.tick=INTRO_VISITOR_TICK;
  advanceVisitors(world);
  const visitors=world.pawns.filter(p=>p.visitor);
  expect(visitors).toHaveLength(2);
  const [first,second]=visitors;
  const group=world.visitors!.groups.find(g=>g.id===first!.visitor!.group)!;
  group.phase='staying';group.arrivedAt=world.tick;
  for(const pawn of visitors){
    pawn.visitor!.phase='staying';pawn.x=first!.x;pawn.z=first!.z;
    pawn.hunger=5;pawn.rest=100;pawn.state='idle';pawn.need=null;
    pawn.path=[];pawn.moveCooldown=0;delete pawn.motion;
  }
  const secondFood=world.piles.find(p=>second!.visitor!.personalFoodIds.includes(p.id))!;
  expect(secondFood.owner).toEqual({type:'inventory',pawnId:second!.id});
  const untouched=structuredClone(secondFood);
  expect(validateWorld(world)).toEqual([]);

  stepWorld(world);
  expect(first!.need).toMatchObject({kind:'eat',phase:'ingest',dining:{target:{x:first!.x,z:first!.z}}});
  expect(second!.need).toBeNull();
  expect([second!.x,second!.z]).toEqual([first!.x,first!.z]);
  expect(world.piles.find(p=>p.id===secondFood.id)).toEqual(untouched);
  expect(validateWorld(world)).toEqual([]);

  const resumed=deserializeWorld(serializeWorld(world));
  for(let tick=0;tick<120;tick++){stepWorld(world);stepWorld(resumed);}
  expect(serializeWorld(resumed)).toBe(serializeWorld(world));
  expect(first!.need).toBeNull();expect(second!.need).toBeNull();
  expect(first!.hunger).toBeGreaterThan(30);expect(second!.hunger).toBeGreaterThan(30);
  expect(world.piles.find(p=>p.id===secondFood.id)?.quantity).toBe(untouched.quantity-1);
  expect(validateWorld(world)).toEqual([]);
});
