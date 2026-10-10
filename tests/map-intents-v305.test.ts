import {afterEach,expect,test,vi} from 'vitest';
import {createWorld} from '../src/sim/engine';
import type {World} from '../src/sim/types';
import {PresentationQueue as HistoricalQueue} from './helpers/presentation-queue-v304';
import {PresentationQueue} from '../src/render/PresentationQueue';
import {createClosedMainMapIntentReader} from '../src/render/closed-main-map-intents';

afterEach(()=>vi.restoreAllMocks());

function literal(world:World):string {
  return JSON.stringify([
    world.jobs.map(j=>[j.id,j.kind,j.x,j.z,j.orientation,j.footprint,j.construction]),
    world.growingZones.map(zone=>[zone.id,zone.cells,zone.plant]),
    world.stockpiles.map(cell=>[cell.id,cell.zoneId,cell.x,cell.z]),world.home,world.roofing?.build,world.roofing?.remove,
    world.piles.filter(p=>p.kind==='chunk'&&p.haulRequested).map(p=>[p.id,p.owner]),
  ]);
}
function fixture():World {
  const world=createWorld(305,8,8);
  world.jobs=[{id:901,kind:'chop',x:2,z:2,orientation:0,footprint:'standard',progress:0,status:'pending',reservedBy:null,escrow:{...world.stock}}];
  world.growingZones=[{id:902,cells:[18,19],plant:'rice',allowSow:true,allowCut:true}];
  world.stockpiles=[{id:903,zoneId:903,x:3,z:3,capacity:75,priority:2,filters:{wood:true,food:true}}];
  world.home=[18,19];world.roofing={constructed:[],build:[18],remove:[19],cursor:0};
  world.piles=[{id:904,item:'granite-chunk',kind:'chunk',quantity:1,owner:{type:'ground',x:4,z:4},haulRequested:true}];
  return world;
}

test('stable cloned facts avoid the large JSON and tuple allocation path',()=>{
  const world=fixture(),reader=createClosedMainMapIntentReader(),first=reader.read(world);
  expect(first).toBe(literal(world));
  const next=structuredClone(world);next.tick++;next.jobs[0]!.progress=17;next.jobs[0]!.reservedBy=123;next.jobs[0]!.status='active';
  const stringify=vi.spyOn(JSON,'stringify');
  expect(reader.read(next)).toBe(first);
  expect(stringify.mock.calls.filter(([value])=>Array.isArray(value))).toHaveLength(0);
  expect(stringify.mock.calls).toHaveLength(1); // small designated owner only
});

test('all observed discrete fields and group boundaries retain literal equality',()=>{
  const edits:Array<(world:World)=>void>=[
    w=>{w.jobs[0]!.id++;},w=>{w.jobs[0]!.kind='mine';},w=>{w.jobs[0]!.x++;},w=>{w.jobs[0]!.z++;},
    w=>{w.jobs[0]!.orientation=1;},w=>{w.jobs[0]!.footprint='legacy-single';},w=>{w.jobs[0]!.construction='frame';},
    w=>{w.jobs=[];},w=>{w.growingZones[0]!.id++;},w=>{w.growingZones[0]!.plant='cotton';},
    w=>{w.growingZones[0]!.cells=[19,18];},w=>{w.growingZones=[];},
    w=>{w.stockpiles[0]!.id++;},w=>{delete w.stockpiles[0]!.zoneId;},w=>{w.stockpiles[0]!.x++;},w=>{w.stockpiles[0]!.z++;},
    w=>{w.stockpiles=[];},w=>{delete w.home;},w=>{w.home=[];},w=>{w.home=[19,18];},
    w=>{w.roofing!.build=[];},w=>{w.roofing!.remove=[];},w=>{delete w.roofing;},
    w=>{w.piles[0]!.id++;},w=>{w.piles[0]!.owner={type:'pawn',pawnId:123};},w=>{delete w.piles[0]!.haulRequested;},
  ];
  for(const edit of edits){
    const world=fixture(),reader=createClosedMainMapIntentReader(),before=reader.read(world);
    const next=structuredClone(world);edit(next);
    expect(reader.read(next)).toBe(literal(next));expect(reader.read(next)).not.toBe(before);
    expect(reader.read(structuredClone(next))).toBe(literal(next));
  }
});

test('job order, optional zero and owner key order match the historical JSON',()=>{
  const world=fixture(),reader=createClosedMainMapIntentReader();
  world.jobs.push({...world.jobs[0]!,id:905,x:3});
  reader.read(world);
  const reversed=structuredClone(world);reversed.jobs.reverse();
  expect(reader.read(reversed)).toBe(literal(reversed));expect(literal(reversed)).not.toBe(literal(world));
  const sign=structuredClone(reversed);sign.jobs[0]!.orientation=-0 as 0;
  const previous=reader.read(sign),zero=structuredClone(sign);zero.jobs[0]!.orientation=0;
  const stringify=vi.spyOn(JSON,'stringify');expect(reader.read(zero)).toBe(previous);
  expect(stringify.mock.calls.filter(([value])=>Array.isArray(value))).toHaveLength(0);
  stringify.mockClear();
  const ordered=structuredClone(zero);ordered.piles[0]!.owner={x:4,z:4,type:'ground'};
  expect(reader.read(ordered)).toBe(literal(ordered));expect(reader.read(ordered)).not.toBe(previous);
});

test('clear recaptures and atypical data falls back without poisoning the next capture',()=>{
  const world=fixture(),reader=createClosedMainMapIntentReader(),first=reader.read(world);
  reader.clear();const stringify=vi.spyOn(JSON,'stringify');expect(reader.read(world)).toBe(first);
  expect(stringify.mock.calls.filter(([value])=>Array.isArray(value))).toHaveLength(1);
  const unusual=structuredClone(world);(unusual.home as unknown[])[0]=null;
  expect(reader.read(unusual)).toBe(literal(unusual));
  expect(reader.read(world)).toBe(literal(world));stringify.mockClear();
  expect(reader.read(structuredClone(world))).toBe(first);
  expect(stringify.mock.calls.filter(([value])=>Array.isArray(value))).toHaveLength(0);
});

test('a failed historical serialization leaves primitive facts uncommitted',()=>{
  const world=fixture(),reader=createClosedMainMapIntentReader(),first=reader.read(world);
  const invalid=structuredClone(world);invalid.jobs[0]!.id=902;
  (invalid.home as unknown[])[0]=1n;
  expect(()=>reader.read(invalid)).toThrow();
  const stringify=vi.spyOn(JSON,'stringify');expect(reader.read(world)).toBe(first);
  expect(stringify.mock.calls.filter(([value])=>Array.isArray(value))).toHaveLength(0);
});

test('native injection preserves confirmed tick, periodic cadence, same World and paused edit',()=>{
  const original=new HistoricalQueue(),candidate=new PresentationQueue(createClosedMainMapIntentReader()),world=fixture();
  const push=(next:World)=>{original.push(next);candidate.push(next);};
  const take=(tick:number,now:number)=>{const a=original.take(tick,now),b=candidate.take(tick,now);expect(b).toBe(a);expect(candidate.size).toBe(original.size);return a;};
  push(world);expect(take(world.tick,0)).toBe(world);
  const work=structuredClone(world);work.tick++;work.jobs[0]!.progress++;
  push(work);expect(take(work.tick,10)).toBeUndefined();expect(take(work.tick,199)).toBeUndefined();expect(take(work.tick,200)).toBe(work);
  const edit=structuredClone(work);edit.tick++;edit.growingZones[0]!.cells.push(20);push(edit);
  expect(take(work.tick,201)).toBeUndefined();expect(take(edit.tick,202)).toBe(edit);
  const paused=structuredClone(edit);paused.home=[];push(paused);expect(take(paused.tick,203)).toBe(paused);
  candidate.clear();original.clear();expect(take(Infinity,204)).toBeUndefined();
});

test('default RAW queues keep getters, toJSON, throw and same-object behavior literal',()=>{
  function trace(Queue:typeof HistoricalQueue|typeof PresentationQueue):string[]{
    const world=fixture(),queue=new Queue(),calls:string[]=[],jobs=world.jobs,zones=world.growingZones,home=world.home!;
    Object.defineProperty(world,'jobs',{get(){calls.push('jobs');return jobs;},configurable:true});
    Object.defineProperty(world,'growingZones',{get(){calls.push('zones');return zones;},configurable:true});
    Object.defineProperty(home,'toJSON',{value(){calls.push('home.toJSON');return [20,21];}});
    queue.push(world);expect(queue.take(world.tick,0)).toBe(world);
    const throwing={...world};Object.defineProperty(throwing,'growingZones',{get(){calls.push('zones.throw');throw Error('deliberate RAW');}});
    queue.push(throwing);expect(()=>queue.take(throwing.tick,1)).toThrow('deliberate RAW');
    const length=calls.length;expect(queue.take(throwing.tick,2)).toBe(throwing);expect(calls).toHaveLength(length);
    return calls;
  }
  expect(trace(PresentationQueue)).toEqual(trace(HistoricalQueue));
});

test('intent read precedes phase capture and is not committed in the queue when phases throw',()=>{
  const world=fixture(),calls:string[]=[],queue=new PresentationQueue({read(){calls.push('intent');return 'same';},clear(){calls.push('clear');}});
  Object.defineProperty(world,'events',{get(){calls.push('phases');throw Error('deliberate phase');}});
  queue.push(world);expect(()=>queue.take(world.tick,0)).toThrow('deliberate phase');expect(calls).toEqual(['intent','phases']);
  const next=fixture();queue.push(next);expect(queue.take(next.tick,1)).toBe(next);
  expect(calls).toEqual(['intent','phases','intent']);
  queue.clear();expect(calls.at(-1)).toBe('clear');
});
