import { expect,test } from 'vitest';
import { PowerParentValidationCache } from '../src/sim/power-parent-validation.ts';
import { PowerTopologyCache,validPowerParent } from '../src/sim/power-topology.ts';
import { validatePower } from '../src/sim/power-save.ts';
import { validBiofuelTransport } from '../src/sim/biofuel-save.ts';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import type { Structure,StructureKind,Orientation,World } from '../src/sim/types.ts';
import { biofuelCamp } from './helpers/biofuel-v283.ts';

function compare(w:World,cache=new PowerParentValidationCache()){
  const full=new PowerTopologyCache().read(w),small=cache.read(w);
  expect([...small.footprints]).toEqual([...full.footprints]);expect([...small.wireParents]).toEqual([...full.wireParents]);
  for(const id of [...small.footprints.keys(),999999])for(const x of [-1,0,5,11,19,31,32])for(const z of [-1,0,5,11,19,31,32])
    expect(validPowerParent(small,{x,z},id)).toBe(validPowerParent(full,{x,z},id));
  for(const kind of ['biofuel-refinery','chemfuel-generator','nutrient-paste-dispenser','orbital-beacon','comms-console','hydroponics-basin','vitals-monitor'] as StructureKind[])
    expect(validatePower(w,w.schemaVersion,kind,cache)).toEqual(validatePower(w,w.schemaVersion,kind));
  expect(validBiofuelTransport(w,w.schemaVersion,cache)).toEqual(validBiofuelTransport(w,w.schemaVersion));
  return small;
}

test('minimal parent capture preserves all transmitter kinds, rotated footprints and unclipped boundary bounds',()=>{
  const {world:w}=biofuelCamp();w.structures=[];
  for(const kind of ['wood-generator','chemfuel-generator','solar-generator','wind-turbine','battery','power-conduit','power-switch'] as StructureKind[])
    for(const orientation of [0,1,2,3] as Orientation[])w.structures.push({id:w.nextId++,kind,x:31,z:31,orientation,footprint:'standard',material:'steel',power:{on:false,parentId:null,switchOn:true}});
  compare(w);expect(Object.keys(new PowerParentValidationCache().read(w)).sort()).toEqual(['footprints','wireParents']);
});

test('duplicate IDs preserve last footprint and historical wire-parent union, including switches',()=>{
  const {world:w}=biofuelCamp();
  const id=w.nextId++,wire:Structure={id,kind:'power-conduit',x:2,z:3,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null}};
  const sw:Structure={...wire,kind:'power-switch',x:26,z:27,power:{on:false,parentId:null,switchOn:true}};
  w.structures=[wire,sw];const a=compare(w);expect(a.footprints.get(id)).toEqual({minX:26,maxX:26,minZ:27,maxZ:27});expect(a.wireParents.has(id)).toBe(true);
  w.structures=[sw,wire];const b=compare(w);expect(b.footprints.get(id)).toEqual({minX:2,maxX:2,minZ:3,maxZ:3});expect(b.wireParents.has(id)).toBe(true);
  sw.power!.switchOn=false;w.structures=[wire,sw];compare(w);
});

test('local cache rechecks membership, switch state, footprint, orientation and dimensions on each guard',()=>{
  const {world:w,startGeneratorId,refineryId}=biofuelCamp(),cache=new PowerParentValidationCache();
  const initial=compare(w,cache),held=[...initial.footprints].map(([id,bounds])=>[id,{...bounds}]);expect(cache.rebuilds).toBe(1);
  compare(w,cache);expect(cache.rebuilds).toBe(1);
  const generator=w.structures.find(s=>s.id===startGeneratorId)!;
  generator.x++;compare(w,cache);expect(cache.rebuilds).toBe(2);
  generator.orientation=1;compare(w,cache);expect(cache.rebuilds).toBe(3);
  w.width++;compare(w,cache);expect(cache.rebuilds).toBe(4);
  w.structures=w.structures.filter(s=>s.id!==startGeneratorId);compare(w,cache);expect(cache.rebuilds).toBe(5);
  w.structures.find(s=>s.id===refineryId)!.power!.parentId=-1;compare(w,cache);expect(cache.rebuilds).toBe(5);
  expect([...initial.footprints]).toEqual(held);
});

test('closed switches transmit but never become wire parents; open switches are excluded',()=>{
  const {world:w,refineryId}=biofuelCamp(),cache=new PowerParentValidationCache();
  const sw:Structure={id:w.nextId++,kind:'power-switch',x:13,z:11,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:null,switchOn:true}};
  w.structures.push(sw);w.structures.find(s=>s.id===refineryId)!.power!.parentId=sw.id;
  for(const on of [true,false,true]){sw.power!.switchOn=on;const view=compare(w,cache);expect(view.footprints.has(sw.id)).toBe(on);expect(view.wireParents.has(sw.id)).toBe(false);}
  expect(cache.rebuilds).toBe(3);
});

test('standalone power validation retains full topology and all blueprint errors',()=>{
  const {world:w,refineryId}=biofuelCamp(),cache=new PowerParentValidationCache();
  expect(validatePower(w,w.schemaVersion,'biofuel-refinery')).toEqual([]);
  w.structures.find(s=>s.id===refineryId)!.power!.on=true;w.structures.find(s=>s.id===refineryId)!.power!.parentId=null;
  w.jobs.push({power:{on:false,parentId:null}} as never);
  expect(validatePower(w,w.schemaVersion,'biofuel-refinery',cache)).toEqual(validatePower(w,w.schemaVersion,'biofuel-refinery'));
  expect(validatePower(w,w.schemaVersion,'biofuel-refinery',cache)).toEqual(['Invalid electrical parent.','Blueprint cannot supply power.']);
});

test('minimal capture cannot survive a refused delta or replace a checkpoint parent',()=>{
  const {world:w,startGeneratorId}=biofuelCamp(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,6)));expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('checkpoint');
  const held=structuredClone(first.world);w.tick++;const good=structuredClone(encoder.encode(w,0,6)),bad=structuredClone(good);
  bad.world.structures=bad.world.structures.filter(s=>s.id!==startGeneratorId);expect(decoder.adopt(bad).status).toBe('resync');
  const next=decoder.adopt(good);expect(next.status).toBe('applied');if(next.status==='applied')expect(next.world).toEqual(w);expect(first.world).toEqual(held);
  const replacement=structuredClone(w),checkpoint=structuredClone(encoder.encode(replacement,0,6)),moved=structuredClone(checkpoint);
  const parent=moved.world.structures.find(s=>s.id===startGeneratorId)!;parent.x=31;parent.z=31;
  expect(decoder.adopt(moved).status).toBe('resync');expect(decoder.adopt(checkpoint).status).toBe('applied');expect(first.world).toEqual(held);
});
