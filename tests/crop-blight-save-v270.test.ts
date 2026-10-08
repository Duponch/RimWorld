import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots.ts';
import {MISC_FIRST_CHECK,MISC_INTRO_TICK} from '../src/sim/cassandra-misc.ts';
import {validMiscIncidents} from '../src/sim/cassandra-misc-save.ts';
import {crashlandedProfile} from '../src/sim/game-profile.ts';
import {advanceCropBlight} from '../src/sim/plant-blight.ts';
import {validCropBlight,validCropBlightCalendar} from '../src/sim/plant-blight-save.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SCHEMA_VERSION,TICKS_PER_DAY,type World} from '../src/sim/types.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';

function infected():World {
  const w=deconstructionCamp(0,24);w.growingZones=[];w.stockpiles=[];w.packed=[];
  const id=w.nextId++;
  w.resources=[{id,kind:'rice',x:8,z:8,amount:6,growth:.5,growthTick:w.tick,
    blight:{since:w.tick,severity:.2,lastHarmTick:w.tick,nextCheck:w.tick+(id-w.tick%200+200)%200+1,rng:123}}];
  return w;
}

test('shared blight guard accepts precisely the five cultivated crops and future check phase',()=>{
  const w=infected(),p=w.resources[0]!;
  for(const kind of ['rice','potato','corn','cotton','healroot'] as const)expect(validCropBlight({...p,kind},205,w)).toBe(true);
  expect(validCropBlight(p,204,w)).toBe(false);
  for(const kind of ['tree','berries','rock','wild-plant'])expect(validCropBlight({...p,kind},205,w)).toBe(false);
  expect(validCropBlight({...p,species:'healroot-wild'},205,w)).toBe(false);
  expect(validCropBlight({...p,growth:.0001},205,w)).toBe(true);
  expect(validCropBlight({...p,growth:0},205,w)).toBe(false);
  expect(validCropBlight({...p,growth:undefined},205,w)).toBe(false);
});

test('unknown blight fields and malformed numeric clocks are refused without coercion',()=>{
  const w=infected(),p=w.resources[0]!,state=p.blight!;
  const invalid:unknown[]=[null,[],{}, {...state,future:1},{...state,since:1},{...state,lastHarmTick:-1},
    {...state,lastHarmTick:1},{...state,severity:.199},{...state,severity:1.01},{...state,severity:NaN},
    {...state,rng:0},{...state,rng:0x100000000},{...state,rng:'123'},{...state,nextCheck:0},
    {...state,nextCheck:201},{...state,nextCheck:state.nextCheck===200?199:state.nextCheck+1}];
  for(const blight of invalid)expect(validCropBlight({...p,blight},205,w)).toBe(false);
  expect(validCropBlight({...p,kind:{toString(){throw Error('coercion');}}},205,w)).toBe(false);
});

test('long-paused harm history remains valid while infection and harm dates stay ordered',()=>{
  const w=infected(),p=w.resources[0]!;w.tick=20000;
  p.blight!.nextCheck=w.tick+(p.id-w.tick%200+200)%200+1;
  expect(validCropBlight(p,205,w)).toBe(true);
  p.blight!.since=2;p.blight!.lastHarmTick=1;
  expect(validCropBlight(p,205,w)).toBe(false);
});

test('save roundtrip and deterministic local continuation preserve complete blight state',()=>{
  const w=infected();expect(validateWorld(w)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(w));expect(resumed).toEqual(w);
  for(let i=0;i<4;i++){
    w.tick=w.resources[0]!.blight!.nextCheck;resumed.tick=w.tick;
    advanceCropBlight(w);advanceCropBlight(resumed);expect(resumed).toEqual(w);
  }
});

test('schema204 migration is neutral and rejects prospective infection before upgrading',()=>{
  const w=infected();delete w.resources[0]!.blight;w.schemaVersion=204 as World['schemaVersion'];
  expect(deserializeWorld(JSON.stringify(w))).toEqual({...w,schemaVersion:SCHEMA_VERSION});
  const future=infected();future.schemaVersion=204 as World['schemaVersion'];
  expect(()=>deserializeWorld(JSON.stringify(future))).toThrow('Invalid version 204 save');
});

test('Misc blight calendar validates adoption, opportunities and exact 30-day history',()=>{
  const context={tick:MISC_INTRO_TICK,gameProfile:crashlandedProfile()},misc={adoptedAt:0,opportunities:1};
  const calendar={adoptedAt:0,count:1,lastStart:MISC_INTRO_TICK};
  expect(validCropBlightCalendar(calendar,205,context,misc)).toBe(true);
  expect(validCropBlightCalendar(calendar,204,context,misc)).toBe(false);
  for(const value of [{...calendar,future:true},{...calendar,adoptedAt:context.tick+1},
    {...calendar,count:0},{...calendar,count:2},{...calendar,lastStart:MISC_INTRO_TICK+1},
    {adoptedAt:0,count:1},null,[]])expect(validCropBlightCalendar(value,205,context,misc)).toBe(false);
  const later={...context,tick:MISC_INTRO_TICK+30*TICKS_PER_DAY};
  expect(validCropBlightCalendar({...calendar,count:2,lastStart:later.tick},205,later,{...misc,opportunities:2})).toBe(true);
  expect(validCropBlightCalendar({...calendar,count:2,lastStart:later.tick-100},205,later,{...misc,opportunities:2})).toBe(false);
  expect(validCropBlightCalendar({adoptedAt:MISC_FIRST_CHECK,count:1,lastStart:MISC_FIRST_CHECK},205,
    {...context,tick:MISC_FIRST_CHECK},{...misc,adoptedAt:MISC_FIRST_CHECK})).toBe(false);
});

test('Misc successes across incident families cannot spend the same opportunity twice',()=>{
  const w=infected();w.gameProfile=crashlandedProfile();w.tick=MISC_FIRST_CHECK;
  w.miscIncidents={profile:'cassandra-misc-v1',adoptedAt:0,rng:1,nextCheck:MISC_FIRST_CHECK+100,
    introDone:true,checks:1,opportunities:1,heatwaves:0,cropBlights:{adoptedAt:0,count:1,lastStart:MISC_FIRST_CHECK}};
  expect(validMiscIncidents(w.miscIncidents,205,w)).toBe(true);
  expect(validMiscIncidents(w.miscIncidents,204,w)).toBe(false);
  w.miscIncidents.heatwaves=1;w.miscIncidents.lastHeatwaveStart=MISC_FIRST_CHECK;
  w.miscIncidents.active={start:MISC_FIRST_CHECK,end:MISC_FIRST_CHECK+2*TICKS_PER_DAY};
  expect(validMiscIncidents(w.miscIncidents,205,w)).toBe(false);
});

test('in-place state changes publish a deep copied upsert; growth-only deltas retain infection',()=>{
  const w=infected(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),p=w.resources[0]!;
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,6)));expect(first.status).toBe('applied');
  if(first.status!=='applied')throw Error('checkpoint');const before=structuredClone(first.world);
  p.blight!.severity=.4;
  const delta=encoder.encode(w,0,6);expect(delta.kind).toBe('delta');
  if(delta.kind!=='delta')throw Error('delta');
  expect(delta.resources!.upserted).toHaveLength(1);expect(delta.resources!.upserted[0]!.blight).not.toBe(p.blight);
  expect(first.world).toEqual(before);
  const updated=decoder.adopt(structuredClone(delta));expect(updated.status).toBe('applied');
  p.growth=.6;
  const growth=encoder.encode(w,0,6);if(growth.kind!=='delta')throw Error('growth delta');
  expect(growth.resources!.upserted).toHaveLength(0);expect(growth.resources!.growth).toHaveLength(4);
  const applied=decoder.adopt(structuredClone(growth));expect(applied.status).toBe('applied');
  if(applied.status==='applied')expect(applied.world.resources[0]!.blight).toEqual(p.blight);
  expect(first.world).toEqual(before);
});

test('decoder rejects forged checkpoint and upsert atomically, then accepts a clean checkpoint',()=>{
  const w=infected(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,6)));if(first.status!=='applied')throw Error('checkpoint');
  const before=structuredClone(first.world);w.resources[0]!.blight!.severity=.1;
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,6))).status).toBe('resync');
  expect(first.world).toEqual(before);
  const fresh=new SnapshotDecoder();expect(fresh.adopt(structuredClone(encoder.encode(w,0,6,true))).status).toBe('resync');
  w.resources[0]!.blight!.severity=.2;
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,6,true))).status).toBe('applied');
  expect(first.world).toEqual(before);
});
