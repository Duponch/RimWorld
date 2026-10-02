import { expect,test } from 'vitest';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { bereavementThoughts,deathMemoryIntensity,expireBereavement,notifyPawnDeath } from '../src/sim/bereavement.ts';
import { validBereavement } from '../src/sim/bereavement-save.ts';
import { injurePawn,reconcilePawnHealth } from '../src/sim/health.ts';
import { advanceHumanCorpses } from '../src/sim/human-corpses.ts';
import { damagePile } from '../src/sim/thing-damage.ts';
import { initialGrave } from '../src/sim/burial.ts';
import { moodFrozen } from '../src/sim/mood.ts';
import { createPrisonerState } from '../src/sim/prisoner-state.ts';
import { addSocialMemory,opinionOf } from '../src/sim/social-state.ts';
import { medicalCamp } from './scenarios/health.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import type { Pawn,Structure,World } from '../src/sim/types.ts';

function directedOpinion(observer:Pawn,other:Pawn,value:number,tick:number):void {
  observer.social??={rng:1,memories:[]};
  observer.social.memories.push({otherId:other.id,kind:value>=0?'deep-talk':'insult',at:tick,offset:value});
}
function kill(world:World,pawn:Pawn):void {
  injurePawn(world,pawn,'heart','bruise',15000);
  expect(pawn.state).toBe('dead');
  expect(pawn.health?.death).toBeDefined();
}

test('real medical deaths capture each survivor’s directed opinion once, including a foreign victim',()=>{
  const world=medicalCamp(5),[friend,rival,neutral,negativeNeutral,deceased]=world.pawns as [Pawn,Pawn,Pawn,Pawn,Pawn];
  deceased.faction='outlaws';
  directedOpinion(friend,deceased,20,world.tick);
  directedOpinion(rival,deceased,-20,world.tick);
  directedOpinion(neutral,deceased,19,world.tick);
  directedOpinion(negativeNeutral,deceased,-19,world.tick);
  const control=structuredClone(world);
  for(const observer of control.pawns.slice(0,4))observer.social!.memories=[];
  kill(world,deceased);kill(control,control.pawns[4]!);
  expect(world.rng).toBe(control.rng);
  expect(friend.bereavement).toEqual([{otherId:deceased.id,kind:'friend-died',at:world.tick,opinion:20}]);
  expect(rival.bereavement).toEqual([{otherId:deceased.id,kind:'rival-died',at:world.tick,opinion:-20}]);
  expect(neutral.bereavement).toBeUndefined();expect(negativeNeutral.bereavement).toBeUndefined();
  reconcilePawnHealth(world,deceased);notifyPawnDeath(world,deceased);
  expect(friend.bereavement).toHaveLength(1);expect(rival.bereavement).toHaveLength(1);
  expect(validateWorld(world)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(world));
  expect(resumed.pawns[0]!.bereavement).toEqual(friend.bereavement);
});

test('thresholds, frozen intensity, expiry, and lost body keep the deceased identity',()=>{
  expect(deathMemoryIntensity(20)).toBeCloseTo(.15);
  expect(deathMemoryIntensity(60)).toBeCloseTo(.575);
  expect(deathMemoryIntensity(100)).toBeCloseTo(1);
  expect(deathMemoryIntensity(-20)).toBeCloseTo(.15);
  expect(deathMemoryIntensity(-60)).toBeCloseTo(.575);
  expect(deathMemoryIntensity(-100)).toBeCloseTo(1);

  const rivalWorld=medicalCamp(2),[rival,enemy]=rivalWorld.pawns as [Pawn,Pawn];
  directedOpinion(rival,enemy,-20,rivalWorld.tick);kill(rivalWorld,enemy);
  expect(bereavementThoughts(rivalWorld,rival)[0]).toMatchObject({id:`rival-died-${enemy.id}`,offset:1.5,
    expiresAt:rivalWorld.tick+10*6000});

  const strong=medicalCamp(3),[observer60,victim60,victim100]=strong.pawns as [Pawn,Pawn,Pawn];
  observer60.social={rng:1,memories:[]};
  for(let i=0;i<5;i++)addSocialMemory(observer60.social,victim60.id,'insult',strong.tick,1);
  addSocialMemory(observer60.social,victim60.id,'chitchat',strong.tick,1);
  expect(opinionOf(observer60,victim60.id,strong.tick)).toBe(-60);
  kill(strong,victim60);
  expect(bereavementThoughts(strong,observer60).find(t=>t.id===`rival-died-${victim60.id}`)?.offset).toBeCloseTo(5.75);
  for(let i=0;i<10;i++)addSocialMemory(observer60.social,victim100.id,'insult',strong.tick,1);
  addSocialMemory(observer60.social,victim100.id,'fight-angering',strong.tick,1);
  expect(opinionOf(observer60,victim100.id,strong.tick)).toBe(-100);
  kill(strong,victim100);
  expect(bereavementThoughts(strong,observer60).find(t=>t.id===`rival-died-${victim100.id}`)?.offset).toBe(10);
  expect(validateWorld(strong)).toEqual([]);

  const world=medicalCamp(2),[observer,deceased]=world.pawns as [Pawn,Pawn];
  directedOpinion(observer,deceased,20,world.tick);kill(world,deceased);
  const thought=bereavementThoughts(world,observer)[0]!;
  expect(thought).toMatchObject({id:`friend-died-${deceased.id}`,offset:-1.5,expiresAt:world.tick+20*6000});
  observer.social!.memories=[];
  expect(bereavementThoughts(world,observer)[0]).toEqual(thought);
  advanceHumanCorpses(world);const corpse=world.piles.find(p=>p.humanCorpse?.pawnId===deceased.id)!;
  expect(corpse).toBeDefined();expect(damagePile(world,corpse,100)).toBe(true);
  expect(world.pawns).toContain(deceased);expect(deceased.body?.lostAt).toBe(world.tick);
  expect(bereavementThoughts(world,observer)[0]).toEqual(thought);
  expect(validateWorld(world)).toEqual([]);
  expireBereavement(observer,thought.expiresAt!);
  expect(observer.bereavement).toBeUndefined();
});

test('five memories per family evict the oldest; one deceased person has one record',()=>{
  const world=medicalCamp(13),observer=world.pawns[0]!;
  for(const [index,deceased] of world.pawns.slice(1).entries()){
    directedOpinion(observer,deceased,index<6?20:-20,world.tick);
    kill(world,deceased);
  }
  expect(observer.bereavement).toHaveLength(10);
  expect(observer.bereavement!.filter(m=>m.kind==='friend-died').map(m=>m.otherId)).toEqual(world.pawns.slice(2,7).map(p=>p.id));
  expect(observer.bereavement!.filter(m=>m.kind==='rival-died').map(m=>m.otherId)).toEqual(world.pawns.slice(8).map(p=>p.id));
  notifyPawnDeath(world,world.pawns[12]!);
  expect(observer.bereavement).toHaveLength(10);
  expect(validateWorld(world)).toEqual([]);
});

test('sleeping, downed and Bloodlust observers receive a death; dead, captive and foreign observers do not',()=>{
  const world=medicalCamp(7),[sleeper,downed,bloodlust,dead,captive,foreign,deceased]=world.pawns as [Pawn,Pawn,Pawn,Pawn,Pawn,Pawn,Pawn];
  sleeper.need={kind:'sleep',phase:'sleep',bedId:null,target:{x:sleeper.x,z:sleeper.z}};sleeper.state='sleeping';
  injurePawn(world,downed,'left-leg','bruise',30000);injurePawn(world,downed,'right-leg','bruise',30000);
  expect(downed.state).toBe('downed');
  bloodlust.traits=['bloodlust'];
  captive.faction='outlaws';captive.prisoner=createPrisonerState(world,captive);
  foreign.faction='outlanders';
  for(const observer of [sleeper,downed,bloodlust,dead,captive,foreign])directedOpinion(observer,deceased,20,world.tick);
  kill(world,dead);kill(world,deceased);
  for(const observer of [sleeper,downed,bloodlust])expect(observer.bereavement).toMatchObject([{otherId:deceased.id,kind:'friend-died'}]);
  for(const observer of [dead,captive,foreign])expect(observer.bereavement).toBeUndefined();
  expect(moodFrozen(sleeper)).toBe(true);
  expect(moodFrozen(downed)).toBe(false); // A conscious patient still feels the thought.
  expect(validateWorld(world)).toEqual([]);
});

test('a physical burial preserves the thought and its original death identity',()=>{
  const world=medicalCamp(3),[observer,carrier,deceased]=world.pawns as [Pawn,Pawn,Pawn];
  Object.assign(observer,{x:11,z:16});Object.assign(carrier,{x:13,z:16});Object.assign(deceased,{x:18,z:16});
  carrier.priorities.haul=1;observer.priorities.haul=0;
  directedOpinion(observer,deceased,20,world.tick);kill(world,deceased);advanceHumanCorpses(world);
  const corpseId=deceased.body!.pileId!,grave=fixtureBuilding(world,'grave',25,16) as Structure;grave.grave=initialGrave();
  expect(applyCommand(world,{type:'order-bury',pawnId:carrier.id,bodyPawnId:deceased.id,graveId:grave.id}).ok).toBe(true);
  for(let i=0;i<1600&&grave.grave.corpseId!==corpseId;i++)stepWorld(world);
  expect(grave.grave.corpseId).toBe(corpseId);
  expect(world.piles.find(p=>p.id===corpseId)!.owner).toEqual({type:'grave',graveId:grave.id});
  expect(world.pawns).toContain(deceased);
  expect(bereavementThoughts(world,observer).some(t=>t.id===`friend-died-${deceased.id}`)).toBe(true);
  expect(validateWorld(world)).toEqual([]);
});

test('sparse save validation rejects future, corrupt, expired and invented records',()=>{
  const world=medicalCamp(2),[observer,deceased]=world.pawns as [Pawn,Pawn];
  directedOpinion(observer,deceased,-20,world.tick);kill(world,deceased);
  const memory=observer.bereavement![0]!;
  expect(validBereavement(observer.bereavement,observer.id,170,world)).toBe(true);
  expect(validBereavement(observer.bereavement,observer.id,169,world)).toBe(false);
  for(const bad of [
    {...memory,otherId:observer.id},
    {...memory,otherId:999999},
    {...memory,kind:'unknown'},
    {...memory,opinion:-19},
    {...memory,opinion:-20.5},
    {...memory,at:world.tick+1},
    {...memory,at:deceased.health!.death!.tick-1},
    {...memory,unexpected:true},
  ])expect(validBereavement([bad],observer.id,170,world)).toBe(false);
  expect(validBereavement([],observer.id,170,world)).toBe(false);
  expect(validBereavement([memory,memory],observer.id,170,world)).toBe(false);
  const future=structuredClone(world);future.schemaVersion=169 as never;
  expect(validateWorld(future)).not.toEqual([]);
});

test('public V180 migrates neutrally, rejects a future memory in schema 169, and V89 dead stay historical',()=>{
  const raw=readFileSync(new URL('../public/test-saves/v180/canicule-et-refuge.json',import.meta.url),'utf8');
  const old=JSON.parse(raw) as World;
  expect(old.schemaVersion).toBe(169);
  const restored=deserializeWorld(raw);
  expect(restored.tick).toBe(old.tick);expect(restored.rng).toBe(old.rng);
  expect(restored.pawns.every(p=>p.bereavement===undefined)).toBe(true);
  const forged=structuredClone(old);forged.pawns[0]!.bereavement=[{otherId:forged.pawns[1]!.id,kind:'friend-died',at:forged.tick,opinion:20}];
  expect(()=>deserializeWorld(JSON.stringify(forged))).toThrow(/version 169/);

  const v89=gunzipSync(readFileSync(new URL('./fixtures/colony-v89.json.gz',import.meta.url))).toString('utf8');
  const historical=deserializeWorld(v89),dead=historical.pawns.filter(p=>p.state==='dead');
  expect(dead.length).toBeGreaterThan(0);
  expect(historical.pawns.every(p=>p.bereavement===undefined)).toBe(true);
  const historicalDeadIds=new Set(dead.map(p=>p.id));
  stepWorld(historical);
  expect(historical.pawns.every(p=>!p.bereavement?.some(memory=>historicalDeadIds.has(memory.otherId)))).toBe(true);
  expect(validateWorld(historical)).toEqual([]);
});
