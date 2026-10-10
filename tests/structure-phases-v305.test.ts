import {afterEach,expect,test,vi} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots';
import {readSnapshotStructureChanges} from '../src/bridge/snapshot-changes';
import {PresentationChanges as HistoricalChanges} from './helpers/presentation-changes-v304';
import {PresentationChanges} from '../src/bridge/presentation-changes';
import {ConfirmedStructurePhaseReader} from '../src/render/ConfirmedStructurePhases';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction';
import {newMiniTurretState} from '../src/sim/mini-turret-state';
import type {Structure,World} from '../src/sim/types';

afterEach(()=>vi.restoreAllMocks());

function literal(world:World):string {
  return JSON.stringify(world.structures.map(s=>[s.id,s.x,s.z,s.medical,s.prisoner,s.emp,s.fuel? s.fuel.ticks>0:undefined,s.door?.changedAt,s.door?.open,s.power?.on,s.power?.parentId,s.power?.switchOn,
    s.turret?[s.turret.ammoQ,s.turret.autoReload,s.turret.holdFire,s.turret.targetKey,!!s.turret.warmup,
      s.turret.burst?.targetKey,!!s.turret.burst,s.turret.cooldownCore>0,s.turret.wick]:undefined]));
}
function harness(){
  const world=deconstructionCamp();fixtureBuilding(world,'wall',4,4);fixtureBuilding(world,'bed',7,4);fixtureBuilding(world,'campfire',10,4);
  const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder();
  const send=(checkpoint=false)=>{
    const packet=structuredClone(encoder.encode(world,0,6,checkpoint)),result=decoder.adopt(packet);
    if(result.status!=='applied')throw Error(JSON.stringify(result));
    expect(result.world).toStrictEqual(world);return result.world;
  };
  return {world,encoder,decoder,send};
}

test('confirmed K recaptures ignore damage and fuel clocks while preserving a real medical phase',()=>{
  const h=harness(),reader=new ConfirmedStructurePhaseReader(),a=h.send(),initial=reader.read(a);
  h.world.structures[0]!.damage=1;h.world.structures[2]!.fuel!.ticks--;h.world.structures[2]!.fuel!.burned++;
  const b=h.send();expect(readSnapshotStructureChanges(a,b)!.structureIndices).toEqual([0,2]);
  const stringify=vi.spyOn(JSON,'stringify');expect(reader.read(b)).toBe(initial);
  expect(stringify.mock.calls).toHaveLength(2); // only two literal tuples, no global map/JSON
  expect(stringify.mock.calls.every(([value])=>Array.isArray(value)&&typeof value[0]==='number')).toBe(true);
  stringify.mockRestore();h.world.structures[1]!.medical=true;const c=h.send();
  expect(reader.read(c)).toBe(literal(c));expect(reader.read(c)).not.toBe(initial);
  const native=createClosedMainPresentationChanges(),old=new HistoricalChanges();
  expect(native.capture(a)).toBe(old.capture(a));expect(native.capture(b)).toBe(old.capture(b));expect(native.capture(c)).toBe(old.capture(c));
});

test('A to C is composed from C after D without changing retained graphs or exposing D values',()=>{
  const h=harness(),reader=new ConfirmedStructurePhaseReader(),a=h.send(),savedA=structuredClone(a);reader.read(a);
  h.world.structures[0]!.damage=1;h.send();h.world.structures[1]!.medical=true;const c=h.send(),savedC=structuredClone(c);
  delete h.world.structures[1]!.medical;h.world.structures[2]!.fuel!.ticks=0;h.world.structures[2]!.fuel!.burned=12000;const d=h.send();
  expect(readSnapshotStructureChanges(a,c)!.structureIndices).toEqual([0,1]);
  expect(reader.read(c)).toBe(literal(c));expect(reader.read(c)).not.toBe(literal(d));
  expect(a).toStrictEqual(savedA);expect(c).toStrictEqual(savedC);
  expect(reader.read(d)).toBe(literal(d));
});

test('no changed ordinal pays no tuple JSON; full, order, membership, copy, same World and clear re-read',()=>{
  const h=harness(),reader=new ConfirmedStructurePhaseReader(),a=h.send();reader.read(a);
  h.world.tick++;const b=h.send(),stringify=vi.spyOn(JSON,'stringify');
  expect(reader.read(b)).toBe(literal(b)); // oracle stringify is the only call
  expect(stringify.mock.calls).toHaveLength(1);stringify.mockRestore();
  const full=(world:World)=>{
    const spy=vi.spyOn(JSON,'stringify'),value=reader.read(world);
    expect(spy.mock.calls.some(([array])=>Array.isArray(array)&&Array.isArray(array[0]))).toBe(true);
    spy.mockRestore();expect(value).toBe(literal(world));
  };
  full(b);full(structuredClone(b));full(h.send(true));
  h.world.structures.reverse();full(h.send());
  fixtureBuilding(h.world,'wall',12,4);full(h.send());
  reader.clear();full(h.send());
});

test('every literal nested structure projection keeps the same phase decisions',()=>{
  const world=deconstructionCamp();fixtureBuilding(world,'wall',4,4);
  const native=createClosedMainPresentationChanges(),old=new HistoricalChanges();
  const s=world.structures[0]!;
  // Projection data, not a played/admitted turret or power network fixture.
  s.emp={sinceCore:1,untilCore:20};s.fuel={ticks:10,burned:0,autoRefuel:true};
  s.door={open:false,holdOpen:false,forbidden:false,changedAt:1,from:0,closeAt:null,lastTouch:-12};
  s.power={on:true,parentId:8,switchOn:true} as Structure['power'];s.turret=newMiniTurretState();
  const check=()=>{const next=structuredClone(world);expect(native.capture(next)).toBe(old.capture(next));};
  check();check();s.id++;check();s.x++;check();s.z++;check();s.medical=true;check();s.prisoner=true;check();
  s.emp.untilCore++;check();s.fuel.ticks--;check();s.fuel.ticks=0;check();s.door!.changedAt++;check();s.door!.open=true;check();
  s.power!.on=false;check();s.power!.parentId=9;check();s.power!.switchOn=false;check();s.turret.ammoQ--;check();
  s.turret.autoReload=false;check();s.turret.holdFire=true;check();s.turret.targetKey='pawn:1';check();
  s.turret.warmup={remainingCore:10,totalCore:10};check();s.turret.warmup.remainingCore--;check();
  s.turret.burst={targetKey:'pawn:1',shotsLeft:1,delayCore:2};check();s.turret.burst.delayCore--;check();
  s.turret.cooldownCore=1;check();s.turret.cooldownCore=2;check();
  s.turret.wick={startedAtCore:1,endCore:20,instigatorKey:'pawn:1'};check();s.turret.wick.endCore++;check();
});

test('a full serialization throw invalidates the structural base and preserves the next exact full read',()=>{
  const h=harness(),reader=new ConfirmedStructurePhaseReader(),a=h.send(),initial=reader.read(a);
  const invalid=structuredClone(a);invalid.structures[0]!.emp={sinceCore:1,untilCore:20,toJSON(){throw Error('deliberate projection');}} as never;
  expect(()=>reader.read(invalid)).toThrow('deliberate projection');
  h.world.structures[0]!.damage=1;const b=h.send(),stringify=vi.spyOn(JSON,'stringify');
  expect(reader.read(b)).toBe(initial);
  expect(stringify.mock.calls.some(([value])=>Array.isArray(value)&&Array.isArray(value[0]))).toBe(true);
});

test('default RAW observer retains getter, nested toJSON and throw ordering',()=>{
  function trace(Observer:typeof HistoricalChanges|typeof PresentationChanges):string[]{
    const world=deconstructionCamp();fixtureBuilding(world,'wall',4,4);fixtureBuilding(world,'wall',5,4);
    const calls:string[]=[],observer=new Observer(),first=world.structures[0]!,second=world.structures[1]!;
    Object.defineProperty(first,'medical',{get(){calls.push('first.medical');return undefined;}});
    first.emp={sinceCore:1,untilCore:20,toJSON(){calls.push('first.emp.toJSON');return {sinceCore:1,untilCore:20};}} as never;
    Object.defineProperty(second,'medical',{get(){calls.push('second.medical');return undefined;},configurable:true});
    expect(observer.capture(world)).toBe(true);expect(observer.capture(world)).toBe(false);
    Object.defineProperty(second,'medical',{get(){calls.push('second.throw');throw Error('RAW medical');}});
    expect(()=>observer.capture(world)).toThrow('RAW medical');return calls;
  }
  expect(trace(PresentationChanges)).toEqual(trace(HistoricalChanges));
});

function createClosedMainPresentationChanges():PresentationChanges {
  class NativeObserver extends PresentationChanges {
    readonly reader=new ConfirmedStructurePhaseReader();
    protected override readStructures(world:World):unknown{return this.reader.read(world);}
  }
  return new NativeObserver();
}
