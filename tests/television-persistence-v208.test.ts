import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder,type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { initializeTelevisionRecreation,validTelevisionState } from '../src/sim/television-save.ts';
import { addGroundMaterial } from '../src/sim/materials.ts';
import { SCHEMA_VERSION,type World } from '../src/sim/types.ts';
import { commercialCamp } from './helpers/commercial-v193.ts';
import { prepareTelevisionWorld } from './scenarios/television-v208.ts';
import { visitorTradeFixture } from './scenarios/visitors.ts';
import { visitorGroupDanger } from '../src/sim/visitors.ts';

function until(w:World,done:()=>boolean,limit=700):void {for(let i=0;i<limit&&!done();i++)stepWorld(w);expect(done(),`TV checkpoint missing at ${w.tick}`).toBe(true);expect(validateWorld(w)).toEqual([]);}
function legacy189(w:World):World {
  const old=structuredClone(w);(old as {schemaVersion:number}).schemaVersion=189;delete old.research?.tubeTelevision;
  const remove=(p:World['pawns'][number])=>{delete p.background;delete (p.recreation.tolerance as Partial<typeof p.recreation.tolerance>).television;delete (p.recreation.bored as Partial<typeof p.recreation.bored>).television;};
  for(const p of old.pawns)remove(p);
  for(const d of old.visitors?.departed??[])remove(d.pawn);
  if(old.scout&&'pawn' in old.scout)remove(old.scout.pawn);if(old.commercialTrip&&'pawn' in old.commercialTrip)remove(old.commercialTrip.pawn);
  return old;
}
function ordinary():World {const w=prepareTelevisionWorld(2,0,false);w.structures=[];delete w.research!.tubeTelevision;return w;}
function compare(w:World,ticks=5):void {const copy=deserializeWorld(serializeWorld(w));expect(copy).toEqual(w);stepWorld(w,ticks);stepWorld(copy,ticks);expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);}
const packet=(encoder:SnapshotEncoder,w:World,checkpoint=false)=>structuredClone(encoder.encode(w,0,6,checkpoint));

test('strict189 migration changes only schema and television0/false, preserving meters, RNG, research and identities',()=>{
  const old=legacy189(ordinary()),saved=JSON.stringify(old),expected=structuredClone(old);initializeTelevisionRecreation(expected);Object.assign(expected,{schemaVersion:SCHEMA_VERSION});
  const loaded=deserializeWorld(saved);expect(loaded).toEqual(expected);
  expect(loaded.rng).toBe(old.rng);expect(loaded.nextId).toBe(old.nextId);expect(loaded.research!.tubeTelevision).toBeUndefined();expect(JSON.stringify(old)).toBe(saved);compare(loaded);
  const bad=structuredClone(old);bad.pawns[0]!.id=0;expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/version 189/);
});

test('189 refuses CRT structures, jobs, packages, transfer/removal payloads, research and new recreation keys before migration',()=>{
  const source=prepareTelevisionWorld(1,0,false),base=legacy189(ordinary());
  const cases:World[]=[];
  const installed=legacy189(source);cases.push(installed);
  const packaged=legacy189(source);packaged.packed.push({building:packaged.structures.pop()!,owner:{type:'ground',x:15,z:12}});cases.push(packaged);
  for(const kind of ['tube-television','uninstall','deconstruct'] as const){
    const w=structuredClone(source);
    expect(applyCommand(w,{type:'designate',kind,x:kind==='tube-television'?22:15,z:kind==='tube-television'?20:12}).ok).toBe(true);
    cases.push(legacy189(w));
  }
  for(const project of [false,true]){const w=structuredClone(base);w.research!.tubeTelevision={points:0};if(project)w.research!.project='tube-television';cases.push(w);}
  for(const key of ['tolerance','bored'] as const){const w=structuredClone(base);Object.assign(w.pawns[0]!.recreation[key],{television:key==='tolerance'?0:false});cases.push(w);}
  const futureTask=structuredClone(base);futureTask.pawns[0]!.recreation.task={activity:'watch-television',target:{x:15,z:14},buildingId:999,seatId:998,phase:'travel',elapsed:0};cases.push(futureTask);
  for(const w of cases){const saved=JSON.stringify(w);expect(validTelevisionState(w,189)).toBe(false);expect(()=>deserializeWorld(saved)).toThrow(/version 189/);expect(JSON.stringify(w)).toBe(saved);}
});

test('CRT saves reject quality, breakdown, bad HP/material/power, missing parents and malformed progress on active and packed instances',()=>{
  for(const packed of [false,true]){
    const w=prepareTelevisionWorld(1,0,false);if(packed)w.packed.push({building:w.structures.pop()!,owner:{type:'ground',x:15,z:12}});
    const saved=serializeWorld(w);expect(deserializeWorld(saved)).toEqual(w);
    const changes:Array<(v:World)=>void>=[
      v=>{(packed?v.packed[0]!.building:v.structures[0]!).quality='normal';},
      v=>{Object.assign(packed?v.packed[0]!.building:v.structures[0]!,{breakdown:{}});},
      v=>{(packed?v.packed[0]!.building:v.structures[0]!).material='wood';},
      ...[0,-1,.5,100].map(damage=>(v:World)=>{(packed?v.packed[0]!.building:v.structures[0]!).damage=damage;}),
      v=>{delete (packed?v.packed[0]!.building:v.structures[0]!).power;},
      v=>{(packed?v.packed[0]!.building:v.structures[0]!).power!.on=true;},
      v=>{delete v.research!.complexFurniture;},v=>{delete v.research!.tubeTelevision;},
      v=>{v.research!.tubeTelevision!.points--;},v=>{v.research!.project='tube-television';},
      v=>{v.research!.tubeTelevision!.completedAt=v.tick+1;},
    ];
    for(const change of changes){const bad=JSON.parse(saved) as World;change(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
    expect(serializeWorld(w)).toBe(saved);
  }
});

test('neutral189 migration reaches original off-map scout and commercial owner without adding a past TV activity',()=>{
  const scout=ordinary(),p=scout.pawns[0]!;addGroundMaterial(scout,'food',2,{x:p.x,z:p.z+1},'survival-meal');
  const food=scout.piles.find(i=>i.item==='survival-meal')!;
  expect(applyCommand(scout,{type:'scout-start',pawnId:p.id,pileId:food.id,quantity:2}).ok).toBe(true);until(scout,()=>!!scout.scout&&'pawn' in scout.scout);
  const {world:commercial,pawnId,foodId}=commercialCamp();
  expect(applyCommand(commercial,{type:'commercial-start',pawnId,foodPileId:foodId,quantity:2,silver:600}).ok).toBe(true);
  until(commercial,()=>!!commercial.commercialTrip&&'pawn' in commercial.commercialTrip);
  for(const w of [scout,commercial]){
    const old=legacy189(w),expected=structuredClone(old);initializeTelevisionRecreation(expected);Object.assign(expected,{schemaVersion:SCHEMA_VERSION});
    const saved=JSON.stringify(old),loaded=deserializeWorld(saved);expect(loaded).toEqual(expected);expect(JSON.stringify(old)).toBe(saved);compare(loaded,3);
    const owner=loaded.scout&&'pawn' in loaded.scout?loaded.scout.pawn:loaded.commercialTrip&&'pawn' in loaded.commercialTrip?loaded.commercialTrip.pawn:null;
    expect(owner!.recreation.tolerance.television).toBe(0);expect(owner!.recreation.bored.television).toBe(false);expect(owner!.recreation.task).toBeNull();
  }
});

test('real travel and watching resume exactly; a saved power-loss boundary is accepted then releases the viewer without gain',()=>{
  const w=prepareTelevisionWorld(1,1,true),p=w.pawns[0]!;p.recreation.level=20;
  expect(applyCommand(w,{type:'schedule-replace',pawnId:p.id,assignments:Array(24).fill('recreation')}).ok).toBe(true);
  until(w,()=>p.recreation.task?.activity==='watch-television'&&p.recreation.task.phase==='travel');compare(w,2);
  until(w,()=>p.recreation.task?.phase==='active'&&p.recreation.task.elapsed>0);compare(w,4);
  const tv=w.structures.find(s=>s.kind==='tube-television')!,joy=p.recreation.level;
  tv.power!.on=false;tv.power!.switchOn=false;
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);expect(p.recreation.task).toBeNull();expect(p.recreation.level).toBeLessThanOrEqual(joy);
});

test('frozen visitor departures retain their recorded four families after migration; only190 accepts an archived fifth family',()=>{
  const {world:w,traderId}=visitorTradeFixture(),trader=w.pawns.find(p=>p.id===traderId)!;
  visitorGroupDanger(w,trader,'hostile');until(w,()=>!w.pawns.some(p=>p.id===traderId));
  const old=legacy189(w),archive=old.visitors!.departed.find(d=>d.pawn.id===traderId)!;
  delete (archive.pawn.recreation.tolerance as Partial<typeof archive.pawn.recreation.tolerance>).television;
  delete (archive.pawn.recreation.bored as Partial<typeof archive.pawn.recreation.bored>).television;
  const frozen=JSON.stringify(archive),loaded=deserializeWorld(JSON.stringify(old));
  expect(JSON.stringify(loaded.visitors!.departed.find(d=>d.pawn.id===traderId))).toBe(frozen);
  const current=structuredClone(loaded),record=current.visitors!.departed.find(d=>d.pawn.id===traderId)!.pawn.recreation;
  record.tolerance.television=0;record.bored.television=false;expect(deserializeWorld(serializeWorld(current))).toEqual(current);
  const future=legacy189(current),futureArchive=future.visitors!.departed.find(d=>d.pawn.id===traderId)!.pawn.recreation;
  futureArchive.tolerance.television=0;futureArchive.bored.television=false;
  expect(()=>deserializeWorld(JSON.stringify(future))).toThrow(/version 189/);
  delete (record.bored as Partial<typeof record.bored>).television;expect(()=>deserializeWorld(JSON.stringify(current))).toThrow();
});

test('checkpoint and delta reject malformed TV tasks atomically and retain previous adopted frames',()=>{
  const w=prepareTelevisionWorld(2,2,true);for(const p of w.pawns){p.recreation.level=20;expect(applyCommand(w,{type:'schedule-replace',pawnId:p.id,assignments:Array(24).fill('recreation')}).ok).toBe(true);}
  until(w,()=>w.pawns.every(p=>p.recreation.task?.activity==='watch-television'&&p.recreation.task.phase==='active'));
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),checkpoint=packet(encoder,w),first=decoder.adopt(checkpoint);
  if(first.status!=='applied')throw new Error('Valid TV checkpoint rejected');const frozen=structuredClone(first.world);
  stepWorld(w);const delta=packet(encoder,w);
  const corruptions:Array<(m:SnapshotMessage)=>void>=[
    m=>{m.world.pawns[0]!.recreation.task!.seatId=999;},
    m=>{m.world.pawns[0]!.recreation.task!.elapsed=400;},
    m=>{m.world.pawns[0]!.recreation.task!.buildingId=m.world.structures.find(s=>s.kind==='wood-generator')!.id;},
    m=>{m.world.pawns[0]!.recreation.task!.target={x:1,z:1};},
    m=>{m.world.pawns[0]!.recreation.task!.phase='travel';},
    m=>{m.world.pawns[1]!.recreation.task=structuredClone(m.world.pawns[0]!.recreation.task);},
    m=>{m.world.pawns[0]!.recreation.tolerance.television=NaN;},
    m=>{m.world.structures.find(s=>s.kind==='tube-television')!.quality='normal';},
    m=>{(m.world as {schemaVersion:number}).schemaVersion=189;},
  ];
  for(const original of [checkpoint,delta])for(const change of corruptions){const bad=structuredClone(original);bad.revision=delta.revision;change(bad);expect(decoder.adopt(bad).status).toBe('resync');expect(first.world).toEqual(frozen);if(bad.kind==='checkpoint')expect(new SnapshotDecoder().adopt(bad).status).toBe('resync');}
  const resumed=decoder.adopt(delta);expect(resumed.status).toBe('applied');if(resumed.status==='applied')expect(resumed.world).toEqual(w);expect(first.world).toEqual(frozen);
});
