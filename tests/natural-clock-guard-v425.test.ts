import {afterEach,expect,test,vi} from 'vitest';
import {NaturalResourcePresentation} from '../src/render/NaturalResourcePresentation';
import {NaturalIdPresentationEvents} from '../src/render/natural-presentation-events';
import {NaturalResourcePresentationV225 as Reference} from './scenarios/natural-presentation-baseline-v225';
import {NaturalDirtyContractOracle} from './scenarios/natural-dirty-contract-v233';
import {createWorld} from '../src/sim/index';
import {createPlantLife} from '../src/sim/plant-life';
import {CLIMATE_DEFINITIONS} from '../src/sim/site-climate';
import type {World} from '../src/sim/types';

// Numerical query fixtures, not save/admission fixtures. Supply only the self
// witness needed to reach seedIds; every cross-World edge stays unproved and
// must retain the historical public-read fallback. Real admission is unchanged.
vi.mock('../src/bridge/snapshot-changes',async importOriginal=>{
  const original=await importOriginal<typeof import('../src/bridge/snapshot-changes')>();
  return {...original,readSnapshotChanges:(from:World,to:World)=>from===to
    ?{resourceIndices:[],tileIndices:[]}:original.readSnapshotChanges(from,to)};
});
afterEach(()=>vi.restoreAllMocks());

type SeedAccess={readHistorical(world:World,reset:boolean,immutable:boolean):World|undefined;seedIds(world:World):void;
  timedSlots:readonly (readonly [number,number])[];idWorld:World|undefined;idSources:ReadonlyMap<number,unknown>;idAgenda:boolean};
const internals=(value:NaturalResourcePresentation)=>value as unknown as SeedAccess;
function fixture(revision:1|2|4,mature=false):World {
  const world=createWorld(425,16,16);world.tiles=world.tiles.map(()=>({terrain:'soil'}));
  world.resources=[{id:world.nextId++,kind:'tree',species:'oak',x:2,z:2,amount:10,growth:mature?1:.2,growthTick:0,growthThermalFactor:1},
    {id:world.nextId++,kind:'berries',species:'berry-bush',x:3,z:2,amount:10,growth:mature?1:.64,growthTick:0,growthThermalFactor:1}];
  const common={adoptedAt:0,calendarOrigin:1500};
  world.climate=revision===1?{...common,revision,profile:'temperate-reference'}:revision===2
    ?{...common,revision,definition:{...CLIMATE_DEFINITIONS['temperate-reference']}}
    :{...common,revision,tileId:0,irregular262:true,definition:{...CLIMATE_DEFINITIONS['temperate-reference']}};
  return world;
}

test.each(['growth','leafless'] as const)('unsupported climate skips every ID read during new seed (%s)',kind=>{
  const world=fixture(4,kind==='leafless'),candidate=new NaturalResourcePresentation(),state=internals(candidate);
  if(kind==='leafless'){const plant=world.resources[0]!;plant.plantLife={...createPlantLife(world,plant),leaflessAt:0};}
  state.readHistorical(world,true,true);
  expect(state.timedSlots.length).toBeGreaterThan(0); // Already built by the historical capture.
  const initialize=vi.spyOn(NaturalIdPresentationEvents.prototype,'initialize');
  let idReads=0;
  const descriptors=world.resources.map(resource=>Object.getOwnPropertyDescriptor(resource,'id')!);
  world.resources.forEach((resource,index)=>Object.defineProperty(resource,'id',{
    configurable:true,enumerable:true,get(){idReads++;return descriptors[index]!.value as number;},
  }));
  try{state.seedIds(world);}finally{world.resources.forEach((resource,index)=>Object.defineProperty(resource,'id',descriptors[index]!));}
  expect(idReads).toBe(0);expect(initialize).not.toHaveBeenCalled();
  expect(state.idSources.size).toBe(0);expect(state.idWorld).toBeUndefined();
});

test('mature climate 4 retains its ID lane without a predictive agenda',()=>{
  const world=fixture(4,true),candidate=new NaturalResourcePresentation(),reference=new Reference();
  const initialize=vi.spyOn(NaturalIdPresentationEvents.prototype,'initialize');
  expect(candidate.read(world,true,true)).toStrictEqual(reference.read(world,true,true));
  const state=internals(candidate);expect(state.idWorld).toBe(world);expect(state.idSources.size).toBe(world.resources.length);
  expect(state.idAgenda).toBe(false);expect(initialize).not.toHaveBeenCalled();
});

test.each([1,2] as const)('supported climate %s still initializes the predictive ID agenda',revision=>{
  const world=fixture(revision),candidate=new NaturalResourcePresentation(),reference=new Reference();
  const initialize=vi.spyOn(NaturalIdPresentationEvents.prototype,'initialize');
  expect(candidate.read(world,true,true)).toStrictEqual(reference.read(world,true,true));
  const state=internals(candidate);expect(state.idWorld).toBe(world);expect(state.idSources.size).toBe(world.resources.length);
  expect(state.idAgenda).toBe(true);expect(initialize).toHaveBeenCalledTimes(1);
});

test('unsupported to supported retry preserves public views, dirty oracle and old captures',()=>{
  const candidate=new NaturalResourcePresentation(),reference=new Reference(),dirty=new NaturalDirtyContractOracle();
  const first=fixture(4),supported=structuredClone(first);supported.climate=fixture(1).climate;supported.tick=32;
  const changed=structuredClone(supported);changed.tick=64;changed.resources[0]!.growth=.76;
  changed.resources[0]!.plantLife={...createPlantLife(changed,changed.resources[0]!),leaflessAt:64};
  const removed=structuredClone(changed);removed.tick=6065;removed.resources.splice(1,1);
  const history:Array<{world:World;before:World;view:World|undefined;viewBefore:World|undefined}>=[];
  for(const [index,world]of [first,supported,changed,removed,first].entries()){
    const reset=index===0||index===4,before=structuredClone(world);
    const expected=reference.read(world,reset,true),actual=candidate.read(world,reset,true);
    expect(actual).toStrictEqual(expected);dirty.assert(world,reset,true,candidate.changes,reference.changes);
    if(actual)actual.resources.forEach((resource,i)=>expect(resource).toBe(expected!.resources[i]));
    expect(world).toStrictEqual(before);
    history.push({world,before,view:actual,viewBefore:structuredClone(actual)});
    for(const capture of history){expect(capture.world).toStrictEqual(capture.before);expect(capture.view).toStrictEqual(capture.viewBefore);}
    if(index===0||index===4)expect(internals(candidate).idWorld).toBeUndefined();
    if(index===1)expect(internals(candidate).idWorld).toBe(world);
  }
});
