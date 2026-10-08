import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots';
import {NaturalPresentationEvents,NaturalIdPresentationEvents,composeFinalResourceStructure,type NaturalIdSource} from '../src/render/natural-presentation-events';
import {NaturalResourcePresentation} from '../src/render/NaturalResourcePresentation';
import {NaturalResourcePresentationV225 as Reference} from './scenarios/natural-presentation-baseline-v225';
import {createWorld} from '../src/sim/index';
import {crashlandedProfile} from '../src/sim/game-profile';
import {checkpointEclipseGrowth} from '../src/sim/eclipse';
import {resolveSelectedEclipse} from '../src/sim/cassandra-misc';
import {floraSize} from '../src/render/flora-presentation';
import type {World} from '../src/sim/types';

/** Confirmed transport/query fixture; controlled metadata exercises context
 * invalidation independently of Resource edits, not storyteller selection. */
function fixture():World {
  const world=createWorld(265,32,32);world.tick=30100;world.gameProfile=crashlandedProfile();
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));world.resources=[
    {id:world.nextId++,kind:'tree',species:'oak',x:4,z:4,amount:10,growth:.1,growthTick:30100,growthThermalFactor:1},
  ];
  world.miscIncidents={profile:'cassandra-misc-v1',adoptedAt:0,rng:123,nextCheck:30200,introDone:true,
    checks:1,opportunities:0,heatwaves:0,weather:{adoptedAt:30100,coldSnaps:0,eclipses:0}};
  return world;
}
function setTick(world:World,tick:number):void {
  world.tick=tick;
  world.miscIncidents!.nextCheck=Math.max(30100,(Math.floor(tick/100)+1)*100);
  world.miscIncidents!.checks=Math.floor((tick-30100)/100)+1;
}
function install(world:World):void {
  world.miscIncidents!.opportunities++;
  const weather=world.miscIncidents!.weather!;weather.eclipses++;weather.lastEclipseStart=30100;
  weather.eclipse={start:30100,end:34600};
}
function transport(world:World) {
  const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder();
  return ()=>{
    const result=decoder.adopt(structuredClone(encoder.encode(world,0,6)));
    expect(result.status).toBe('applied');if(result.status!=='applied')throw Error(JSON.stringify(result));
    return result.world;
  };
}
const sources=(world:World):ReadonlyMap<number,NaturalIdSource>=>new Map(world.resources.map((resource,order)=>[resource.id,{resource,order,natural:true}]));

test('eclipse context start invalidates ordinal and ID forecasts without resource edits',()=>{
  const world=fixture(),send=transport(world),before=send(),ordinal=new NaturalPresentationEvents(),ids=new NaturalIdPresentationEvents();
  expect(ordinal.initialize(before,[0],true)).toBeDefined();expect(ids.initialize(before,sources(before),ordinal)).toBeDefined();
  install(world);const after=send();expect(after.resources[0]).toBe(before.resources[0]);
  expect(ordinal.copyIdForecasts(after)).toBeUndefined();
  expect(ordinal.read(before,after)).toBeUndefined();
  const structure=composeFinalResourceStructure(before,after)!;expect(structure).toBeDefined();
  expect(ids.read(before,after,sources(after),structure)).toBeUndefined();
});

test('natural forecast certification stops at eclipse end even when the next shape is later',()=>{
  const world=fixture();install(world);setTick(world,34595);
  const current=transport(world)(),events=new NaturalPresentationEvents();
  expect(events.initialize(current,[0],true)).toBeDefined();
  const forecast=events.copyIdForecasts(current)!.get(current.resources[0]!.id)!;
  expect(forecast.deadline).toBeDefined();expect(forecast.deadline!).toBeLessThanOrEqual(34600);
});

test('interval removal invalidates both agendas and copied seeds without depending on changed anchors',()=>{
  const world=fixture();install(world);setTick(world,34595);
  const send=transport(world),before=send(),ordinal=new NaturalPresentationEvents(),ids=new NaturalIdPresentationEvents();
  expect(ordinal.initialize(before,[0],true)).toBeDefined();expect(ids.initialize(before,sources(before),ordinal)).toBeDefined();
  setTick(world,34600);delete world.miscIncidents!.weather!.eclipse;const after=send();
  expect(after.resources[0]).toBe(before.resources[0]);expect(ordinal.copyIdForecasts(after)).toBeUndefined();
  expect(ordinal.read(before,after)).toBeUndefined();
  expect(ids.read(before,after,sources(after),composeFinalResourceStructure(before,after)!)).toBeUndefined();
});

test('changed end cannot reuse a seed from an otherwise identical event and tick',()=>{
  const world=fixture();install(world);const send=transport(world),before=send(),events=new NaturalPresentationEvents();
  expect(events.initialize(before,[0],true)).toBeDefined();world.miscIncidents!.weather!.eclipse!.end++;
  const after=send();expect(events.copyIdForecasts(after)).toBeUndefined();expect(events.read(before,after)).toBeUndefined();
});

test('real eclipse checkpoints and transitions preserve exhaustive presentation and held snapshots',()=>{
  const world=fixture(),send=transport(world),actual=new NaturalResourcePresentation(),reference=new Reference();
  const held:Array<{world:World;copy:World}>=[];
  const read=(reset=false):void=>{
    const current=send(),before=structuredClone(current),expected=reference.read(current,reset,true),value=actual.read(current,reset,true);
    expect(value).toStrictEqual(expected);
    for(const [id,change]of actual.changes) {
      const resource=current.resources.find(r=>r.id===id);expect(change.resource).toBe(resource);
      expect(change.size).toBe(resource?floraSize(current,resource):0);
    }
    for(const [id,change]of reference.changes)expect(actual.changes.get(id)).toStrictEqual(change);
    expect(current).toStrictEqual(before);held.push({world:current,copy:before});
    for(const old of held)expect(old.world).toStrictEqual(old.copy);
  };
  read(true);world.miscIncidents!.opportunities++;
  expect(resolveSelectedEclipse(world)).toBe(true);read();
  const end=world.miscIncidents!.weather!.eclipse!.end;
  for(const tick of [30101,30110,30120,30160,end-20,end-1]){setTick(world,tick);read();}
  setTick(world,end);checkpointEclipseGrowth(world);delete world.miscIncidents!.weather!.eclipse;read();
  for(const tick of [end+1,end+20,end+64,end+6000]){setTick(world,tick);read();}
});
