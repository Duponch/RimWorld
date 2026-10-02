import { expect,test } from 'vitest';
import { medicalCamp,controlledInjury } from './scenarios/health.ts';
import { bereavementThoughts,FRIEND_DEATH_DURATION } from '../src/sim/bereavement.ts';
import { validateWorld } from '../src/sim/serialization.ts';
import { validBereavement } from '../src/sim/bereavement-save.ts';
import { createPrisonerState } from '../src/sim/prisoner-state.ts';

test('Core homonym groups average strengths and diminish by 0.75 without merging identities or expiry',()=>{
  const world=medicalCamp(3),[observer,a,b]=world.pawns;
  a!.name=b!.name='Noé';
  controlledInjury(world,a!,'heart',20000);controlledInjury(world,b!,'heart',20000);
  observer!.bereavement=[
    {otherId:a!.id,kind:'friend-died',at:world.tick,opinion:20},
    {otherId:b!.id,kind:'friend-died',at:world.tick+1,opinion:100},
  ];
  world.tick++;
  expect(bereavementThoughts(world,observer!)).toMatchObject([{label:'Mort de Noé (ami) ×2',offset:-10.0625,expiresAt:3000+FRIEND_DEATH_DURATION}]);
  expect(observer!.bereavement).toHaveLength(2);
  world.tick=3000+FRIEND_DEATH_DURATION;
  expect(bereavementThoughts(world,observer!)).toMatchObject([{label:'Mort de Noé (ami)',offset:-10}]);
  b!.name='Basile';world.tick=3001;
  expect(bereavementThoughts(world,observer!).map(t=>t.offset)).toEqual([-1.5,-10]);
  // Clock advancement above is isolated thought inspection, not simulated time.
  world.tick=3000;observer!.bereavement![1]!.at=3000;
  expect(validateWorld(world)).toEqual([]);
});

test('the receiving colonist may later die, but foreign and captive forged memories are refused',()=>{
  const world=medicalCamp(2),[observer,victim]=world.pawns;
  controlledInjury(world,victim!,'heart',20000);
  observer!.bereavement=[{otherId:victim!.id,kind:'friend-died',at:world.tick,opinion:20}];
  expect(validBereavement(observer!.bereavement,observer!.id,170,world)).toBe(true);
  observer!.faction='outlanders';
  expect(validBereavement(observer!.bereavement,observer!.id,170,world)).toBe(false);
  delete observer!.faction;
  observer!.prisoner=createPrisonerState(world,observer!);
  expect(validBereavement(observer!.bereavement,observer!.id,170,world)).toBe(false);
  delete observer!.prisoner;
  controlledInjury(world,observer!,'heart',20000);
  expect(validBereavement(observer!.bereavement,observer!.id,170,world)).toBe(true);
  expect(validateWorld(world)).toEqual([]);
});
