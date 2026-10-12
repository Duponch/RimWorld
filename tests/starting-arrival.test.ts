import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {advanceStartingArrival,prepareStartingArrival} from '../src/sim/starting-arrival.ts';
import type {StartingArrivalPending} from '../src/sim/starting-arrival-state.ts';
import {createScenarioWorld} from '../src/sim/new-game.ts';
import {createStartingCandidateRoster,previewStartingCandidate,startingPartyFromRoster} from '../src/sim/starting-candidates.ts';
import {generateStartingWorld,resolveStartingSite,startingSiteChoices} from '../src/sim/starting-world.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {advanceWorldApparelWear} from '../src/sim/apparel-system.ts';
import {expireFood} from '../src/sim/food-expiration.ts';
import {freshRot,rotAge} from '../src/sim/food-preservation.ts';
import type {MaterialPile,World} from '../src/sim/types.ts';

const team=startingPartyFromRoster(335,createStartingCandidateRoster(335));
const choice={version:1 as const,seed:333,tile:startingSiteChoices(generateStartingWorld(333))[0]!};
const site=resolveStartingSite(choice);
const prepared=()=>createScenarioWorld(site.seed,32,'crashlanded',site.site,team,choice);
const pending=(world:World)=>world.startingArrival as StartingArrivalPending;
const sorted=(piles:readonly MaterialPile[])=>piles.slice().sort((a,b)=>a.id-b.id);
const allPiles=(world:World)=>[...world.piles,...(world.startingArrival&&world.startingArrival.phase!=='opened'?world.startingArrival.pods.flatMap(p=>p.items):[])];
const quantity=(piles:readonly MaterialPile[],item:string)=>piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);

test('prepared creation places original people and supplies in three exclusive owners, preserving historical Thing allocations',()=>{
  const baseline=createScenarioWorld(site.seed,32,'crashlanded',site.site,team),world=prepared(),arrival=pending(world);
  expect(world.scenario?.revision).toBe(10);expect(world.tick).toBe(0);expect(world.pawns).toEqual([]);
  expect(arrival).toMatchObject({phase:'incoming',start:0,landAt:15,openAt:27,personalTick:0});
  expect(arrival.pods.map(p=>p.pawn)).toEqual(baseline.pawns);
  expect(arrival.pods.map(p=>p.cell)).toEqual(baseline.pawns.map(({x,z})=>({x,z})));
  expect(arrival.pods.map(p=>p.id)).toEqual([baseline.nextId,baseline.nextId+1,baseline.nextId+2]);
  expect(world.nextId).toBe(baseline.nextId+3);expect(world.rng).toBe(baseline.rng);expect(world.tiles).toEqual(baseline.tiles);
  expect(sorted(allPiles(world)).map(p=>p.id)).toEqual(sorted(baseline.piles).map(p=>p.id));
  expect(quantity(world.piles,'wood')).toBe(300);expect(quantity(world.piles,'steel')).toBe(450);
  expect(world.piles.every(p=>p.item==='wood'||p.item==='steel'||p.kind==='chunk')).toBe(true);
  expect(world.stock.food).toBe(0);expect(world.stock.wood).toBe(300);
  for(const pod of arrival.pods){
    const shirts=pod.items.filter(p=>p.owner.type==='apparel');expect(shirts).toHaveLength(1);
    expect(shirts[0]!.owner).toEqual({type:'apparel',pawnId:pod.pawn.id});
    for(const pile of pod.items.filter(p=>p.owner.type!=='apparel')){
      expect(pile.owner).toEqual({type:'starting-pod',podId:pod.id});
      const original=baseline.piles.find(p=>p.id===pile.id)!;
      expect(pod.drops.find(d=>d.pileId===pile.id)!.cell).toEqual({x:original.owner.type==='ground'?original.owner.x:-1,z:original.owner.type==='ground'?original.owner.z:-1});
      expect({...pile,owner:original.owner}).toEqual(original);
    }
  }
  expect(validateWorld(world)).toEqual([]);
});

test('world tick alone controls impact and atomic opening; original people do not work or age until the following tick',()=>{
  const world=prepared(),arrival=pending(world),people=arrival.pods.map(p=>p.pawn),before=structuredClone(people),items=arrival.pods.flatMap(p=>p.items),nextId=world.nextId;
  stepWorld(world,0);expect(world.tick).toBe(0);expect(pending(world).phase).toBe('incoming');
  stepWorld(world,14);expect(world.pawns).toHaveLength(0);expect(pending(world).phase).toBe('incoming');expect(people).toEqual(before);
  stepWorld(world);expect(pending(world).phase).toBe('landed');expect(world.pawns).toHaveLength(0);
  stepWorld(world,11);expect(world.tick).toBe(26);expect(people).toEqual(before);expect(world.pawns).toHaveLength(0);
  stepWorld(world);expect(world.tick).toBe(27);expect(world.startingArrival).toMatchObject({phase:'opened',openedAt:27});
  expect(world.pawns).toHaveLength(3);expect(world.nextId).toBe(nextId);expect(world.stock.food).toBe(50);
  for(const [index,pawn] of people.entries()){
    expect(world.pawns[index]).toBe(pawn);
    const expected=structuredClone(before[index]!);if(expected.health)expected.health.tick=27;
    expect(pawn).toEqual(expected);
  }
  for(const pile of items)expect(world.piles.find(p=>p.id===pile.id)).toBe(pile);
  expect(Object.keys(world.startingArrival!).sort()).toEqual(['cells','landAt','openAt','openedAt','phase','profile','start']);
  const snapshot=serializeWorld(world);advanceStartingArrival(world);expect(serializeWorld(world)).toBe(snapshot);
  stepWorld(world);expect(world.pawns.map(p=>p.age!.biologicalTicks)).toEqual(before.map(p=>p.age!.biologicalTicks+1));
  expect(validateWorld(world)).toEqual([]);
});

test('every phase saves and resumes the same custody, owners and deterministic continuation',()=>{
  for(const tick of [0,14,15,26,27]){
    const world=prepared();stepWorld(world,tick);
    const saved=serializeWorld(world),resumed=deserializeWorld(saved);
    expect(resumed).toEqual(world);expect(serializeWorld(resumed)).toBe(saved);
    stepWorld(world,29-tick);stepWorld(resumed,29-tick);
    expect(resumed).toEqual(world);expect(validateWorld(resumed)).toEqual([]);
  }
});

test('a cancellable wall blueprint retains all three people and every held item without partial transfer or new random draws',()=>{
  const world=prepared(),arrival=pending(world),cell=arrival.pods[1]!.cell;
  expect(applyCommand(world,{type:'designate',kind:'wall',material:'wood',...cell}).ok).toBe(true);
  const before=structuredClone(arrival.pods);stepWorld(world,27);
  const rng=world.rng,nextId=world.nextId;
  // Map clocks advance normally before the repeated blocked transfer probe.
  advanceStartingArrival(world);
  expect(pending(world).phase).toBe('landed');expect(pending(world).pods).toEqual(before);
  expect(world.pawns).toEqual([]);expect(world.stock.food).toBe(0);expect(world.rng).toBe(rng);expect(world.nextId).toBe(nextId);
  expect(world.jobs.find(j=>j.x===cell.x&&j.z===cell.z)?.reservedBy).toBeNull();
  expect(serializeWorld(deserializeWorld(serializeWorld(world)))).toBe(serializeWorld(world));
  expect(applyCommand(world,{type:'cancel',...cell}).ok).toBe(true);
  stepWorld(world);
  expect(world.pawns.map(p=>p.id)).toEqual(before.map(p=>p.pawn.id));expect(world.startingArrival).toMatchObject({phase:'opened',openedAt:28});
  expect(world.rng).toBe(rng);expect(world.nextId).toBe(nextId);
});

test('an impassable supply destination or occupied pawn exit blocks the whole discharge and does not relocate original cells',()=>{
  for(const obstacle of ['terrain','pile','pawn'] as const){
    const world=prepared(),arrival=pending(world),before=structuredClone(arrival.pods),drop=arrival.pods.flatMap(p=>p.drops)[0]!,cell=obstacle==='pawn'?arrival.pods[0]!.cell:drop.cell;
    if(obstacle==='terrain')world.tiles[cell.z*world.width+cell.x]!.terrain='rock';
    if(obstacle==='pile')world.piles.push({id:world.nextId++,kind:'wood',item:'wood',quantity:1,owner:{type:'ground',...cell}});
    if(obstacle==='pawn')world.pawns.push({...structuredClone(arrival.pods[0]!.pawn),id:world.nextId++});
    const nextId=world.nextId,rng=world.rng;world.tick=27;advanceStartingArrival(world);
    expect(pending(world).pods).toEqual(before);expect(pending(world).phase).toBe('landed');expect(world.rng).toBe(rng);expect(world.nextId).toBe(nextId);
    if(obstacle==='terrain')world.tiles[cell.z*world.width+cell.x]!.terrain='grass';
    if(obstacle==='pile')world.piles.pop();if(obstacle==='pawn')world.pawns.pop();
    world.tick=28;advanceStartingArrival(world);
    for(const pod of before){expect(world.pawns.find(p=>p.id===pod.pawn.id)).toMatchObject(pod.cell);for(const d of pod.drops)expect(world.piles.find(p=>p.id===d.pileId)!.owner).toEqual({type:'ground',...d.cell});}
  }
});

test('passive initial age ailments resume on the release clock without clinical catch-up or changed personal data',()=>{
  let generation=0,pawn=previewStartingCandidate(team.seed,{serial:1,generation});
  while(!pawn.health&&generation<256)pawn=previewStartingCandidate(team.seed,{serial:1,generation:++generation});
  expect(pawn.health?.ageAilments?.length).toBeGreaterThan(0);
  const party={...team,selected:[{serial:1,generation},team.selected[1],team.selected[2]] as typeof team.selected};
  const world=createScenarioWorld(site.seed,32,'crashlanded',site.site,party,choice),held=pending(world).pods[0]!.pawn,initial=structuredClone(held);
  world.tick=83;advanceStartingArrival(world);
  expect(held.health).toEqual({...initial.health,tick:83});expect(held.age).toEqual(initial.age);expect(held.hunger).toBe(initial.hunger);expect(held.rest).toBe(initial.rest);
  expect(held.nextApparelCheckAt).toBe(0);expect(held.skills).toEqual(initial.skills);
});

test('held clothes and actual survival meals remain frozen while map food/wear calendars advance; rot anchors resume without gaining held age',()=>{
  const world=prepared(),arrival=pending(world),shirt=arrival.pods[0]!.items.find(p=>p.owner.type==='apparel')!,before=structuredClone(shirt),meal=arrival.pods.flatMap(p=>p.items).find(p=>p.item==='survival-meal')!;
  expect(meal.rot).toBeUndefined();const meals=quantity(allPiles(world),'survival-meal');
  world.tick=6000;advanceWorldApparelWear(world);expireFood(world);
  expect(shirt).toEqual(before);expect(quantity(allPiles(world),'survival-meal')).toBe(meals);expect(world.apparelWear!.nextWearAt).toBeGreaterThan(6000);
  // Runtime clock adapter exercised separately: the delivered dotation has no
  // perishable food, and the strict creation/save guard does not admit berries.
  const food=arrival.pods[0]!.items.find(p=>p.item==='component')!;
  food.rot={...freshRot('berries',0).rot!,progress:17,rate:.3};
  advanceStartingArrival(world);expect(shirt).toEqual(before);
  expect(food.rot).toEqual({progress:17,atTick:6000,rate:.3});expect(rotAge(food,6001)).toBeCloseTo(17.3);
});

test('historical and candidate-only factories remain ordinary map starts and never synthesize arrival on resume',()=>{
  for(const world of [createScenarioWorld(42,32,'survivors'),createScenarioWorld(42,32,'crashlanded'),createScenarioWorld(42,32,'crashlanded',undefined,team),createScenarioWorld(42,32,'camp')]){
    expect(world.startingArrival).toBeUndefined();expect(world.pawns.length).toBeGreaterThan(0);
    const saved=serializeWorld(world);advanceStartingArrival(world);expect(serializeWorld(world)).toBe(saved);
    expect(deserializeWorld(saved).startingArrival).toBeUndefined();
    expect(()=>prepareStartingArrival(world,world.pawns.slice(0,3).map(p=>p.id),[])).toThrow();expect(serializeWorld(world)).toBe(saved);
  }
});
