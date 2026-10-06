import {expect,test} from 'vitest';
import {adoptSiteClimate} from '../../src/sim/site-climate';
import {isPlant} from '../../src/sim/plants';
import {PLANT_LIFE_INTERVAL} from '../../src/sim/plant-life';
import {SnapshotDecoder,SnapshotEncoder} from '../../src/bridge/snapshots';
import {camp,clock,harness,worldResult} from './fixtures';

test('scene success composes A to C after decoder D without invisible births or stale ordinals',()=>{
  const w=camp(),h=harness(w),a=h.send();h.read(a,true,false,'public');h.read(a,true);
  const removed=w.resources[0]!,survivor=w.resources[1]!;
  w.resources.push({id:w.nextId++,kind:'tree',species:'birch',x:12,z:3,amount:10,growth:.3,growthTick:0});
  const temporary=w.resources[w.resources.length-1]!;clock(w,1);h.send();
  w.resources=w.resources.filter(r=>r.id!==temporary.id&&r.id!==removed.id);clock(w,2);h.send();
  w.resources.push({...removed,x:13});survivor.growth=.51;survivor.growthTick=2;clock(w,3);
  const c=h.send();expect(h.readSnapshotResourceStructure(a,c)).toBeDefined();
  w.resources[0]!.x=15;clock(w,4);const d=h.send();expect(d).not.toBe(c);
  const result=h.read(c);expect(result.actual).toStrictEqual({changed:true});
  expect(h.b.changes.has(temporary.id)).toBe(false);
  expect(h.b.changes.get(removed.id)!.resource).toBe(c.resources[c.resources.length-1]);
  h.read(d);h.verify();
});

test('silent current refs, noView and public/scene alternation preserve exact historical changes and fixed old views',()=>{
  const w=camp(),h=harness(w),a=h.send();const old=h.read(a,true,true,'public').actual;
  expect(worldResult(old)).toBe(true);const oldBefore=structuredClone(old);
  w.resources[5]!.amount++;const silent=h.send();
  expect(h.read(silent).actual).toStrictEqual({changed:false});expect(h.b.changes.size).toBe(0);
  w.resources[0]!.x=9;const next=h.send();expect(h.read(next).actual).toStrictEqual({changed:true});
  h.read(next); // same World never receives a self-witness receipt.
  w.resources[1]!.x=11;const p=h.send();h.read(p,false,true,'public');
  w.resources[2]!.growth=.66;w.resources[2]!.growthTick=w.tick;h.read(h.send());
  expect(old).toStrictEqual(oldBefore);h.verify();
});

test('natural to crop to natural, removal and rebirth retain final classification and change ordering',()=>{
  const w=camp(),h=harness(w);h.read(h.send(),true);
  const grass=w.resources.find(r=>r.species==='grass')!,id=grass.id;
  grass.kind='rice'; // Hybrid species remains: crop predicate wins.
  h.read(h.send());expect(h.b.changes.get(id)).toStrictEqual({resource:undefined,size:0});
  grass.kind='wild-plant';grass.species='tall-grass';h.read(h.send());
  expect(h.b.changes.get(id)!.resource).toBe(h.a.changes.get(id)!.resource);
  w.resources=w.resources.filter(r=>r.id!==id);h.send();
  w.resources.push({...grass,x:20});const c=h.send();h.read(c);
  expect(h.b.changes.get(id)!.resource).toBe(c.resources[c.resources.length-1]);
  w.resources=w.resources.filter(r=>r.id!==id);h.read(h.send());
  expect(h.b.changes.get(id)).toStrictEqual({resource:undefined,size:0});
});

test('permutation, copied/mutable/sameWorld, checkpoint, epoch and 64-record eviction retain historical fallback',()=>{
  const w=camp(),h=harness(w),first=h.send();h.read(first,true);
  w.resources.reverse();clock(w,1);const reversed=h.send();
  expect(h.readSnapshotResourceStructure(first,reversed)).toBeUndefined();
  expect(worldResult(h.read(reversed).actual)).toBe(true);
  const e=new SnapshotEncoder({structureDelta:true}),d=new SnapshotDecoder(),foreign=d.adopt(structuredClone(e.encode(w,0,6,true)));
  if(foreign.status!=='applied')throw Error(JSON.stringify(foreign));
  expect(h.readSnapshotResourceStructure(reversed,foreign.world)).toBeUndefined();h.read(foreign.world);
  h.read(h.send(true),true);const base=h.send();h.read(base);
  for(let i=0;i<65;i++){clock(w,2+i);h.send();}
  clock(w,67);const evicted=h.send();expect(h.readSnapshotResourceStructure(base,evicted)).toBeUndefined();h.read(evicted);
  const checkpoint=h.send(true);h.read(checkpoint,true);h.read(checkpoint);
  const copied=structuredClone(checkpoint);h.read(copied,false,true);
  copied.resources[0]!.x=21;h.read(copied,false,false);h.read(copied,false,false,'public');
  h.read(h.send());h.verify();
});

test('timed agenda shapes keep light/roof/leaf/civil boundaries while scene results own only a boolean',()=>{
  const w=camp();adoptSiteClimate(w);clock(w,1500);
  for(const r of w.resources)if(isPlant(r)&&!['rice','potato','corn','cotton'].includes(r.kind)){
    r.growth=.25-96/180000;r.growthTick=1500;r.growthLight='artificial-full';
  }
  const leaf=w.resources[2]!,phase=(leaf.id+1)%PLANT_LIFE_INTERVAL;
  leaf.growth=1;leaf.plantLife!.leaflessAt=phase;
  const h=harness(w);h.read(h.send(),true);
  w.resources=w.resources.filter(r=>r.id!==w.resources[0]!.id);clock(w,1501);h.read(h.send());
  const cell=w.resources[0]!.z*w.width+w.resources[0]!.x;
  w.roofing={constructed:[cell],build:[],remove:[],cursor:0};clock(w,1502);h.read(h.send());
  w.roofing.constructed=[];w.tiles[cell]!.floor='wood-planks';clock(w,1503);h.read(h.send());delete w.tiles[cell]!.floor;
  for(const tick of [1531,1532,1563,1596,4799,4800,5999,6000,phase+5999,phase+6000,7499,7500,7501,359999,360000,360001]){
    clock(w,tick);h.read(h.send());
  }h.verify();
});

test('refusal/stale and corrected retry preserve last actual ledger and checkpoint recovery',()=>{
  const w=camp(),h=harness(w),a=h.send();h.read(a,true);
  w.resources[0]!.x=19;clock(w,1);const p=h.packet(),bad=structuredClone(p);
  Reflect.set(bad.world,'schemaVersion',Number.NaN);
  expect(h.decoder.adopt(bad).status).toBe('resync');const c=h.accept(p);
  expect(h.decoder.adopt(p).status).toBe('stale');h.read(c);
  expect(h.b.changes.get(w.resources[0]!.id)!.resource).toBe(c.resources[0]);
  w.resources.splice(0,1);clock(w,2);h.read(h.send());h.read(h.send(true),true);
  w.resources.push({id:w.nextId++,kind:'tree',x:12,z:19,amount:10});h.read(h.send());h.verify();
});

test('World fallback with an extra changed property is a World rather than a compact result',()=>{
  const w=camp(),h=harness(w);Reflect.set(w,'changed',true);
  const initial=h.read(h.send(),true).actual;expect(worldResult(initial)).toBe(true);
  w.resources.reverse();const next=h.read(h.send()).actual;expect(worldResult(next)).toBe(true);
  expect(next).toHaveProperty('changed',true);h.verify();
});
