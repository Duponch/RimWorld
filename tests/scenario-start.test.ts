import { expect,test } from 'vitest';
import { enableArrivals } from '../src/sim/arrivals';
import { candidateAccess } from '../src/sim/candidate-access';
import { setupEncounter } from '../src/sim/encounter-scenario';
import { generateWorld } from '../src/sim/generation';
import { enableHeatwaves } from '../src/sim/heatwave';
import { ITEM_DEFINITIONS } from '../src/sim/items';
import { createScenarioWorld } from '../src/sim/new-game';
import { blockedCells } from '../src/sim/pathfinding';
import { enableRaids } from '../src/sim/raids';
import { AIR_CONDITIONING_COST,CLOTHING_RESEARCH_COST } from '../src/sim/research';
import { DEFAULT_SCENARIO,type ScenarioId } from '../src/sim/scenario-definitions';
import { validScenario } from '../src/sim/scenario-save';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization';
import { startingSkills } from '../src/sim/skills';
import { stepWorld } from '../src/sim/engine';
import { initializeCampTraits } from '../src/sim/traits';
import { enableWildlife } from '../src/sim/wildlife';
import { adoptEnvironment } from '../src/sim/environment-step';
import type { World } from '../src/sim/types';

function inventory(w:World):Record<string,number> {
  const counts:Record<string,number>={};
  for(const p of w.piles)counts[p.item]=(counts[p.item]??0)+p.quantity;
  return counts;
}

test('historical camp and armed encounter preserve their original setup without scenario injection on load',()=>{
  for(const id of ['camp','sentry'] as const) {
    const old=generateWorld(42,64,64);
    if(id==='sentry')setupEncounter(old);
    else {initializeCampTraits(old);enableArrivals(old);enableRaids(old);enableHeatwaves(old);enableWildlife(old);}
    const made=createScenarioWorld(42,64,id),{scenario,...withoutStamp}=made;
    expect(withoutStamp).toEqual(old);expect(scenario).toEqual({id,revision:1,landing:{x:32,z:32}});
    expect(validateWorld(made)).toEqual([]);expect(deserializeWorld(serializeWorld(made))).toEqual(made);
  }
});

test('survivors arrive with exact physical stocks and known technology on unmodified terrain across compact and standard maps',()=>{
  for(const [seed,size] of [[0,32],[1,32],[42,32],[93,32],[2048,32],[0,64],[1,64],[42,64],[93,64],[2048,64],[42,250]]) {
    const w=createScenarioWorld(seed!,size!),terrain=generateWorld(seed!,size!,size!,'temperate-survivors-v1');
    // V87 initializes biological age on the same generated plants; this must
    // not change their locations, identities, yield or initial growth.
    adoptEnvironment(terrain);
    expect(w.scenario?.id,`${seed}/${size}`).toBe(DEFAULT_SCENARIO);
    expect(w.tiles).toEqual(terrain.tiles);expect(w.resources).toEqual(terrain.resources);
    expect(w.pawns).toHaveLength(3);expect(w.jobs).toEqual([]);expect(w.structures).toEqual([]);
    expect(inventory(w)).toEqual({wood:300,steel:450,component:30,'survival-meal':50,medicine:30,revolver:1,'cloth-shirt':3,'flak-vest':1});
    expect(w.research).toEqual({project:null,points:CLOTHING_RESEARCH_COST,completedAt:0,airConditioning:{points:AIR_CONDITIONING_COST,completedAt:0}});
    const occupied=new Set<number>(),resources=new Set(w.resources.map(r=>r.z*w.width+r.x));
    const reach=candidateAccess(w,w.scenario!.landing,blockedCells(w),new Set());
    const border=[];
    for(let x=0;x<w.width;x++)border.push(x,(w.height-1)*w.width+x);
    for(let z=1;z<w.height-1;z++)border.push(z*w.width,z*w.width+w.width-1);
    expect(border.some(index=>reach.has(index)),`Border access ${seed}/${size}`).toBe(true);
    for(const [index,p] of w.pawns.entries()) {
      const key=p.z*w.width+p.x;expect(occupied.has(key)).toBe(false);occupied.add(key);
      expect(resources.has(key)).toBe(false);expect(reach.has(key)).toBe(true);
      expect(p.skills).toEqual(startingSkills(index));expect(p.traits?.length).toBe(2);
      expect(w.piles.filter(i=>i.owner.type==='apparel'&&i.owner.pawnId===p.id).map(i=>i.item)).toEqual(['cloth-shirt']);
      expect(w.piles.some(i=>i.owner.type==='equipment'&&i.owner.pawnId===p.id)).toBe(false);
    }
    for(const pile of w.piles) {
      expect(pile.quantity).toBeLessThanOrEqual(ITEM_DEFINITIONS[pile.item].stackLimit);
      if(pile.owner.type!=='ground')continue;
      const key=pile.owner.z*w.width+pile.owner.x;expect(occupied.has(key)).toBe(false);occupied.add(key);
      expect(resources.has(key)).toBe(false);expect(reach.has(key)).toBe(true);
    }
    expect(w.arrivals?.nextCheck).toBeGreaterThan(0);expect(w.raids?.nextCheck).toBeGreaterThan(0);expect(w.heatwaves?.nextAt).toBeGreaterThan(0);
    expect(w.wildlife?.animals.length).toBe(size===250?12:3);
    for(const a of w.wildlife!.animals)expect(occupied.has(a.z*w.width+a.x)).toBe(false);
    expect(validateWorld(w),`${seed}/${size}`).toEqual([]);
  }
});

test('new scenario provenance survives ordinary evolution and deterministic continuation without resetting consumed supplies',()=>{
  const w=createScenarioWorld(93,64,'survivors'),same=createScenarioWorld(93,64,'survivors');
  expect(same).toEqual(w);
  w.pawns[0]!.hunger=10;
  for(let i=0;i<250;i++)stepWorld(w);
  expect(inventory(w)['survival-meal']).toBeLessThan(50);
  const saved=serializeWorld(w),copy=deserializeWorld(saved);expect(copy).toEqual(w);
  expect(copy.scenario).toEqual(same.scenario);
  for(let i=0;i<100;i++){stepWorld(w);stepWorld(copy);}
  expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);
  w.pawns[0]!.traits!.pop();w.pawns[0]!.skills.construction.level=0;
  expect(same.pawns[0]!.traits).toHaveLength(2);expect(same.pawns[0]!.skills.construction.level).toBe(8);
});

test('scenario metadata rejects unknown, malformed and pre-V80 provenance but permits changed inventories and landing terrain',()=>{
  const stamp={id:'survivors',revision:1,landing:{x:0,z:31}};
  expect(validScenario(undefined,79,32,32)).toBe(true);expect(validScenario(stamp,79,32,32)).toBe(false);
  expect(validScenario(stamp,80,32,32)).toBe(true);
  expect(validScenario({...stamp,id:'sentry'},80,32,32)).toBe(false);
  expect(validScenario(stamp,80,31,32)).toBe(false);
  expect(validScenario(stamp,80,32,31)).toBe(false);
  for(const invalid of [null,[],{}, {...stamp,id:'unknown'}, {...stamp,id:'toString'}, {...stamp,revision:0}, {...stamp,revision:2}, {...stamp,other:1},
    {...stamp,landing:null},{...stamp,landing:{x:0,z:32}},{...stamp,landing:{x:-1,z:0}},
    {...stamp,landing:{x:.5,z:0}},{...stamp,landing:{x:NaN,z:0}},{...stamp,landing:{x:0,z:0,other:1}},
    Object.assign(Object.create({id:'survivors'}),{revision:1,landing:{x:0,z:0},other:1})])expect(validScenario(invalid,80,32,32)).toBe(false);
  const w=createScenarioWorld(42,32);w.piles=[];w.stock={wood:0,food:0};
  const cell=w.scenario!.landing;w.tiles[cell.z*w.width+cell.x]!.terrain='soil';
  expect(validScenario(w.scenario,80,w.width,w.height)).toBe(true);
  for(const id of [null,'unknown','__proto__'])expect(()=>createScenarioWorld(42,32,id as ScenarioId)).toThrow();
  for(const size of [null,31,251,NaN,64.5])expect(()=>createScenarioWorld(42,size as number,'survivors')).toThrow();
  expect(()=>createScenarioWorld(42,32,'sentry')).toThrow();
  for(const seed of [null,NaN,Infinity,-1,.5,0x100000000])expect(()=>createScenarioWorld(seed as number,32,'survivors')).toThrow();
  expect(createScenarioWorld(0xffffffff,32).seed).toBe(0xffffffff);
});
