import {expect,test} from 'vitest';
import {createScenarioWorld} from '../src/sim/new-game.ts';
import {createStartingCandidateRoster,startingPartyFromRoster} from '../src/sim/starting-candidates.ts';
import {generateStartingWorld,resolveStartingSite,startingSiteChoices} from '../src/sim/starting-world.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,hashWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {captureHumanOwners,everyHumanPawnOwner} from '../src/sim/human-owners.ts';
import {civilianAdmissionFits} from '../src/sim/civilian-away.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {validatePileRecordShape} from '../src/sim/material-record-save.ts';
import {validStartingArrivalShape,validateStartingArrivalOwners} from '../src/sim/starting-arrival-save.ts';
import {validSiteClimate} from '../src/sim/site-climate-save.ts';
import type {StartingArrivalPending} from '../src/sim/starting-arrival-state.ts';
import type {World} from '../src/sim/types.ts';

const choice={version:1 as const,seed:333,tile:startingSiteChoices(generateStartingWorld(333))[0]!};
const site=resolveStartingSite(choice),party=startingPartyFromRoster(335,createStartingCandidateRoster(335));
const prepared=()=>createScenarioWorld(site.seed,32,'crashlanded',site.site,party,choice);
const arrival=(w:World)=>w.startingArrival as StartingArrivalPending;
const loose=(w:World)=>arrival(w).pods.flatMap(p=>p.items).find(p=>p.owner.type==='starting-pod')!;

test('pending owners, frozen clinic and selected relationships survive an exact save at each arrival boundary',()=>{
  const w=prepared(),p=arrival(w).pods[0]!.pawn;
  p.health={...createMedicalRecord(0),ageAilments:['bad-back']};
  const ids=arrival(w).pods.map(p=>p.pawn.id);
  w.relationships={links:[{kind:'lover',aId:Math.min(ids[0]!,ids[1]!),bId:Math.max(ids[0]!,ids[1]!),recordedAt:0}]};
  for(const target of [0,14,15,26,27,28]){
    stepWorld(w,target-w.tick);
    expect(validateWorld(w)).toEqual([]);
    const saved=serializeWorld(w),restored=deserializeWorld(saved);
    expect(restored).toEqual(w);expect(hashWorld(restored)).toBe(hashWorld(w));
    expect(restored.rng).toBe(w.rng);expect(serializeWorld(restored)).toBe(saved);
    const owners=captureHumanOwners(restored),person=owners.byId.get(p.id)!;
    expect(person.status).toBe(target<27?'away':'present');
    expect(person.validationTick).toBe(target<27?0:target);
    expect(person.pawn!.health!.tick).toBe(target<27?0:target);
    expect(person.pawn!.health!.ageAilments).toEqual(['bad-back']);
    expect(owners.census.containedOwned).toBe(target<27?3:0);
    expect(owners.census.frozenPawnArchives).toBe(0);
    const visited:number[]=[];expect(everyHumanPawnOwner(restored,pawn=>{visited.push(pawn.id);return true;})).toBe(true);
    expect(visited).toEqual(ids);
  }
});

type Forge=(w:World)=>void;
const forgeries:readonly [string,Forge][]=[
  ['duplicate capsule IDs',w=>{arrival(w).pods[1]!.id=arrival(w).pods[0]!.id;}],
  ['capsule shares a map resource ID',w=>{const p=arrival(w).pods[0]!;p.id=w.resources[0]!.id;for(const pile of p.items)if(pile.owner.type==='starting-pod')pile.owner.podId=p.id;}],
  ['person shares a material ID',w=>{arrival(w).pods[0]!.pawn.id=loose(w).id;}],
  ['person also on map',w=>{w.pawns.push(structuredClone(arrival(w).pods[0]!.pawn));}],
  ['material also on map',w=>{w.piles.push(structuredClone(loose(w)));}],
  ['foreign capsule cargo owner',w=>{loose(w).owner={type:'starting-pod',podId:w.nextId-1};}],
  ['worn shirt belongs to another person',w=>{const p=arrival(w).pods[0]!;p.items.find(i=>i.owner.type==='apparel')!.owner={type:'apparel',pawnId:arrival(w).pods[1]!.pawn.id};}],
  ['missing cargo',w=>{const p=arrival(w).pods.find(p=>p.items.some(i=>i.owner.type==='starting-pod'))!;p.items.splice(p.items.findIndex(i=>i.owner.type==='starting-pod'),1);}],
  ['extra cargo quantity',w=>{loose(w).quantity++;}],
  ['orphan drop',w=>{arrival(w).pods[0]!.drops[0]!.pileId=w.nextId;}],
  ['duplicate destination',w=>{const drops=arrival(w).pods.flatMap(p=>p.drops);drops[1]!.cell={...drops[0]!.cell};}],
  ['destination on capsule',w=>{arrival(w).pods[0]!.drops[0]!.cell={...arrival(w).pods[0]!.cell};}],
  ['premature landed phase',w=>{arrival(w).phase='landed';}],
  ['changed landing timer',w=>{arrival(w).landAt=16;}],
  ['changed opening timer',w=>{arrival(w).openAt=28;}],
  ['invented personal clock',w=>{(arrival(w) as unknown as {personalTick:number}).personalTick=1;}],
  ['future medical clock',w=>{arrival(w).pods[0]!.pawn.health=createMedicalRecord(1);}],
  ['contained acute medical condition',w=>{arrival(w).pods[0]!.pawn.health={...createMedicalRecord(0),heatstroke:1};}],
  ['contained clinical injury',w=>{arrival(w).pods[0]!.pawn.health={...createMedicalRecord(0),injuries:[{id:1,part:'torso',kind:'cut',severity:1,bornAt:0}],nextInjuryId:2};}],
  ['contained movement',w=>{arrival(w).pods[0]!.pawn.moveCooldown=1;}],
  ['contained queued work',w=>{arrival(w).pods[0]!.pawn.orders.queue.push(w.nextId);} ],
  ['contained visitor status',w=>{arrival(w).pods[0]!.pawn.faction='outlanders';}],
  ['worn shirt forbidden',w=>{arrival(w).pods[0]!.items.find(i=>i.item==='cloth-shirt')!.apparel!.forbidden=true;}],
  ['added material condition',w=>{loose(w).damage=1;}],
  ['foreign scenario',w=>{w.scenario!.revision=9;}],
  ['missing physical receipt',w=>{delete w.startingArrival;}],
  ['relationship endpoint outside all owners',w=>{w.relationships={links:[{kind:'lover',aId:arrival(w).pods[0]!.pawn.id,bId:w.nextId+1,recordedAt:0}]};}],
];
test.each(forgeries)('save rejects %s before adoption',(name,forge)=>{
  const w=prepared();forge(w);
  expect(validateWorld(w),name).not.toEqual([]);
  expect(()=>deserializeWorld(JSON.stringify(w)),name).toThrow();
});

test('arrival records reject holes, extra array fields, symbols, accessors and inherited records without evaluating getters',()=>{
  const w=prepared(),good=arrival(w);let evaluated=0;
  const shapes:unknown[]=[];
  const hole=structuredClone(good);delete hole.pods[1];shapes.push(hole);
  const extra=structuredClone(good);Object.assign(extra.pods,{surprise:1});shapes.push(extra);
  const inherited=structuredClone(good);Object.setPrototypeOf(inherited.pods[0],{id:inherited.pods[0]!.id});shapes.push(inherited);
  const symbol=structuredClone(good);Object.defineProperty(symbol.pods[0]!.pawn,Symbol('future'),{value:1});shapes.push(symbol);
  const accessor=structuredClone(good);Object.defineProperty(accessor.pods[0]!.pawn,'health',{enumerable:true,get:()=>{evaluated++;return createMedicalRecord(0);}});shapes.push(accessor);
  const cycle=structuredClone(good);Object.assign(cycle.pods[0]!.pawn,{extra:cycle});shapes.push(cycle);
  for(const bad of shapes)expect(validStartingArrivalShape(bad,231,w)).toBe(false);
  Object.defineProperty(w,'startingArrival',{enumerable:true,get:()=>{evaluated++;return good;}});
  expect(validateStartingArrivalOwners(w)).not.toEqual([]);expect(evaluated).toBe(0);
});

test('opened receipt owns no records and cannot contain capsules, early ticks or malformed cells',()=>{
  const w=prepared();stepWorld(w,27);expect(w.startingArrival!.phase).toBe('opened');
  const good=w.startingArrival!;
  for(const bad of [{...good,pods:[]},{...good,openedAt:26},{...good,openedAt:28},
    {...good,cells:[{x:-1,z:0},{x:1,z:1},{x:2,z:2}]}])expect(validStartingArrivalShape(bad,231,w)).toBe(false);
  expect(captureHumanOwners(w).census.containedOwned).toBe(0);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('version 230 migrates strictly and neutrally; revision9 climate stays valid without invented arrival',()=>{
  const w=prepared();stepWorld(w,27);delete w.startingArrival;w.scenario!.revision=9;
  const old={...w,schemaVersion:230},before=structuredClone(old),restored=deserializeWorld(JSON.stringify(old));
  expect(restored).toEqual({...before,schemaVersion:231});expect(restored.startingArrival).toBeUndefined();
  expect(validSiteClimate(old.climate,230,old as unknown as World)).toBe(true);
  expect(()=>deserializeWorld(JSON.stringify({...old,rng:0}))).toThrow();
  const pending=prepared();
  for(const version of [1,229,230])expect(()=>deserializeWorld(JSON.stringify({...pending,schemaVersion:version}))).toThrow();
  const foreign=structuredClone(old);foreign.piles[0]!.owner={type:'starting-pod',podId:1};
  expect(()=>deserializeWorld(JSON.stringify(foreign))).toThrow();
  expect(validatePileRecordShape(loose(pending) as unknown as Record<string,unknown>,pending,230)).not.toEqual([]);
});

test('contained people and piles reserve shared admission capacity while no initial colonist is on the map',()=>{
  const w=prepared(),held=arrival(w).pods.reduce((n,p)=>n+p.items.length,0);
  expect(civilianAdmissionFits(w,w.width*w.height-3,32768-w.piles.length-held)).toBe(true);
  expect(civilianAdmissionFits(w,w.width*w.height-2,0)).toBe(false);
  expect(civilianAdmissionFits(w,0,32768-w.piles.length-held+1)).toBe(false);
});
