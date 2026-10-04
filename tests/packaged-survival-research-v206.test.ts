import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder,type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index.ts';
import { cookingSpot } from '../src/sim/cooking-bills.ts';
import type { CookingTask } from '../src/sim/cooking-types.ts';
import { addGroundMaterial,refreshStock } from '../src/sim/materials.ts';
import { validPackagedSurvivalState } from '../src/sim/packaged-survival-save.ts';
import { planCookingOrder } from '../src/sim/player-cooking.ts';
import { productionWorkTotal } from '../src/sim/production-recipes.ts';
import { MICROELECTRONICS_RESEARCH_COST,PACKAGED_SURVIVAL_MEALS_RESEARCH_COST,packagedSurvivalMealsUnlocked,processResearch,researchCost,researchPrerequisite,researchStationUsable } from '../src/sim/research.ts';
import { validateResearch } from '../src/sim/research-save.ts';
import type { World } from '../src/sim/types.ts';
import { preparePackagedSurvivalDemo } from '../scripts/create-packaged-survival-v206-test-save.ts';
import { packagedSurvivalCamp } from './scenarios/packaged-survival-v206.ts';

const packet=(encoder:SnapshotEncoder,w:World,checkpoint=false)=>structuredClone(encoder.encode(w,0,1,checkpoint));
const progress=(w:World)=>w.research!.packagedSurvivalMeals!;
function start(w:World):void {
  expect(applyCommand(w,{type:'research-project',project:'packaged-survival-meals'})).toMatchObject({ok:true});
  expect(applyCommand(w,{type:'priority',pawnId:w.pawns[0]!.id,work:'research',value:1})).toMatchObject({ok:true});
}
function until(w:World,done:()=>boolean,limit=300):void {
  for(let i=0;i<limit&&!done();i++){stepWorld(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}
  expect(done(),JSON.stringify({tick:w.tick,research:w.research,pawns:w.pawns.map(p=>({state:p.state,x:p.x,z:p.z,path:p.path,research:p.research}))})).toBe(true);
}

test('packaged research costs 500 real points, requires desk contact, pauses and resumes exactly without producing a ration',()=>{
  // Only the final two points are prepared to keep this contact/replay test short.
  const w=preparePackagedSurvivalDemo(),p=w.pawns[0]!,desk=w.structures.find(s=>s.kind==='research-bench')!;
  const initial=progress(w).points,spot=cookingSpot(desk),piles=structuredClone(w.piles);
  expect(PACKAGED_SURVIVAL_MEALS_RESEARCH_COST).toBe(500_000_000);
  expect(researchCost('packaged-survival-meals')).toBe(500_000_000);
  expect(researchPrerequisite(w,'packaged-survival-meals')).toBeUndefined();
  expect(researchStationUsable(w,desk,'packaged-survival-meals')).toBe(true);
  expect(packagedSurvivalMealsUnlocked(w)).toBe(false);start(w);
  stepWorld(w);
  expect(p.research?.stationId).toBe(desk.id);expect(progress(w).points).toBe(initial);
  expect({x:p.x,z:p.z}).not.toEqual(spot);
  until(w,()=>progress(w).points>initial);
  expect({x:p.x,z:p.z}).toEqual(spot);expect(p.state).toBe('working');
  const beforeTick=progress(w).points;
  // The exact actual rate is exercised by the engine, with its current temperature.
  stepWorld(w);expect(progress(w).points-beforeTick).toBeGreaterThan(0);
  expect(progress(w).points-beforeTick).toBeLessThan(1_000_000);
  const paused=progress(w).points;
  expect(applyCommand(w,{type:'research-project',project:null})).toMatchObject({ok:true});
  stepWorld(w,5);expect(progress(w).points).toBe(paused);expect(p.research).toBeUndefined();
  start(w);until(w,()=>p.state==='working'&&p.research!==undefined);
  const checkpoint=serializeWorld(w),copy=deserializeWorld(checkpoint);
  expect(serializeWorld(copy)).toBe(checkpoint);
  until(w,()=>packagedSurvivalMealsUnlocked(w));stepWorld(copy,w.tick-copy.tick);
  expect(serializeWorld(copy)).toBe(serializeWorld(w));
  expect(progress(w)).toEqual({points:500_000_000,completedAt:w.tick});
  expect(w.research!.project).toBeNull();expect(w.pawns.every(pawn=>pawn.research===undefined)).toBe(true);
  expect(w.events.filter(e=>e.message.startsWith('Recherche achevée : Repas de survie emballés'))).toHaveLength(1);
  expect(p.skills.intellectual!.xp).toBeGreaterThan(0);
  expect(w.piles.map(pile=>({id:pile.id,item:pile.item,quantity:pile.quantity,owner:pile.owner}))).toEqual(piles.map(pile=>({id:pile.id,item:pile.item,quantity:pile.quantity,owner:pile.owner})));
  expect(w.piles.some(pile=>pile.item==='survival-meal')).toBe(false);
});

test('a prepared advanced desk requires actual power and releases its research task immediately on outage',()=>{
  const w=preparePackagedSurvivalDemo(),p=w.pawns[0]!,desk=w.structures.find(s=>s.kind==='research-bench')!;
  // Prepared supply isolates the per-contact power guard; grid delivery has its own tests.
  desk.kind='hi-tech-research-bench';desk.power={on:false,parentId:null};
  w.research!.microelectronics={points:MICROELECTRONICS_RESEARCH_COST,completedAt:0};
  start(w);
  expect(researchStationUsable(w,desk,'packaged-survival-meals')).toBe(false);
  desk.power.on=true;expect(researchStationUsable(w,desk,'packaged-survival-meals')).toBe(true);
  const spot=cookingSpot(desk);p.x=spot.x;p.z=spot.z;
  p.research={stationId:desk.id,spot,worked:0};
  const initial=progress(w).points,events:string[]=[];
  processResearch(w,p,()=>{throw Error('Already at desk contact.');},()=>125_000,text=>events.push(text));
  expect(progress(w).points).toBe(initial+125_000);expect(p.research).toBeDefined();
  desk.power.on=false;
  processResearch(w,p,()=>{throw Error('Outage must release before moving.');},()=>125_000,text=>events.push(text));
  expect(progress(w).points).toBe(initial+125_000);expect(p.research).toBeUndefined();
  expect(w.research!.project).toBe('packaged-survival-meals');expect(events).toEqual([]);
});

test('strict 187 migration preserves existing acquired rations and rejects every future research key before granting anything',()=>{
  const w=preparePackagedSurvivalDemo();delete w.research!.packagedSurvivalMeals;
  addGroundMaterial(w,'food',2,{x:21,z:21},'survival-meal');refreshStock(w);
  const old=JSON.parse(serializeWorld(w));old.schemaVersion=187;
  const serialized=JSON.stringify(old),loaded=deserializeWorld(serialized);
  expect(loaded).toEqual({...old,schemaVersion:188});expect(loaded.research!.packagedSurvivalMeals).toBeUndefined();
  expect(loaded.piles.filter(p=>p.item==='survival-meal').map(p=>p.quantity)).toEqual([2]);
  expect(JSON.stringify(old)).toBe(serialized);
  for(const change of [
    (v:World)=>{v.research!.packagedSurvivalMeals={points:0};},
    (v:World)=>{v.research!.project='packaged-survival-meals';},
    (v:World)=>{v.research!.packagedSurvivalMeals={points:500_000_000,completedAt:0};},
  ]){
    const bad=structuredClone(old) as World;change(bad);const frozen=JSON.stringify(bad);
    expect(()=>deserializeWorld(frozen)).toThrow(/version 187/);expect(JSON.stringify(bad)).toBe(frozen);
  }
  const futureUndefined=structuredClone(old) as World;futureUndefined.research!.packagedSurvivalMeals=undefined;
  expect(Object.hasOwn(futureUndefined.research!,'packagedSurvivalMeals')).toBe(true);
  expect(validateResearch(futureUndefined,187)).toContain('Invalid research project.');
  expect(validateWorld(futureUndefined)).not.toEqual([]);
  expect(validPackagedSurvivalState(futureUndefined,187)).toBe(false);
  const oldWorld=structuredClone(old) as World,retained=JSON.stringify(oldWorld);
  expect(applyCommand(oldWorld,{type:'research-project',project:'packaged-survival-meals'})).toMatchObject({ok:false});
  expect(JSON.stringify(oldWorld)).toBe(retained);
  expect(applyCommand(loaded,{type:'research-project',project:'packaged-survival-meals'})).toMatchObject({ok:true});
  expect(progress(loaded)).toEqual({points:0});
});

test('incomplete, active and future completion records are refused without repairing the caller state',()=>{
  const w=preparePackagedSurvivalDemo(),raw=serializeWorld(w);
  const changes:Array<(v:World)=>void>=[
    v=>{progress(v).points=-1;},v=>{progress(v).points=500_000_001;},
    v=>{progress(v).points=500_000_000;},
    v=>{progress(v).completedAt=v.tick;},
    v=>{v.research!.packagedSurvivalMeals={points:500_000_000,completedAt:v.tick+1};},
    v=>{v.research!.project='packaged-survival-meals';delete v.research!.packagedSurvivalMeals;},
    v=>{v.research!.project='packaged-survival-meals';v.research!.packagedSurvivalMeals={points:500_000_000,completedAt:0};},
    v=>{(progress(v) as unknown as Record<string,unknown>).extra=true;},
  ];
  for(const [i,change] of changes.entries()){
    const bad=JSON.parse(raw) as World;change(bad);const frozen=JSON.stringify(bad);
    expect(validateResearch(bad,188),`case ${i}`).toContain('Invalid research project.');
    expect(validPackagedSurvivalState(bad,188),`case ${i}`).toBe(false);
    expect(()=>deserializeWorld(frozen),`case ${i}`).toThrow();expect(JSON.stringify(bad)).toBe(frozen);
  }
  expect(serializeWorld(w)).toBe(raw);expect(deserializeWorld(raw)).toEqual(w);
});

test('numeric queued job orders remain valid beside incomplete packaged research in saves and bridge frames',()=>{
  const w=preparePackagedSurvivalDemo(),p=w.pawns[0]!;
  start(w);stepWorld(w);expect(p.research).toBeDefined();
  w.resources.push({id:w.nextId++,kind:'tree',x:20,z:20,amount:12});
  expect(applyCommand(w,{type:'priority',pawnId:p.id,work:'gather',value:1})).toMatchObject({ok:true});
  expect(applyCommand(w,{type:'designate',kind:'chop',x:20,z:20})).toMatchObject({ok:true});
  const job=w.jobs.at(-1)!;
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:true})).toMatchObject({ok:true});
  expect(p.orders.queue).toContain(job.id);
  expect(validateWorld(w)).toEqual([]);expect(validPackagedSurvivalState(w,188)).toBe(true);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  expect(decoder.adopt(packet(encoder,w)).status).toBe('applied');
  expect(decoder.adopt(packet(encoder,w)).status).toBe('applied');
});

test('research checkpoints and same-tick deltas reject corruption atomically while a valid later packet still applies',()=>{
  const w=preparePackagedSurvivalDemo(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const checkpoint=packet(encoder,w),first=decoder.adopt(checkpoint);
  if(first.status!=='applied')throw Error('Prepared research checkpoint refused.');
  const frozen=structuredClone(first.world);start(w);
  const delta=packet(encoder,w);expect(delta.kind).toBe('delta');
  const mutations:Array<(m:SnapshotMessage)=>void>=[
    m=>{m.world.schemaVersion=187 as typeof m.world.schemaVersion;},
    m=>{m.world.research!.packagedSurvivalMeals=undefined;},
    m=>{delete m.world.research!.packagedSurvivalMeals;m.world.research!.project='packaged-survival-meals';},
    m=>{m.world.research!.packagedSurvivalMeals={points:500_000_000};},
    m=>{m.world.research!.packagedSurvivalMeals={points:500_000_000,completedAt:m.world.tick+1};},
    m=>{m.world.research!.project='packaged-survival-meals';m.world.research!.packagedSurvivalMeals={points:500_000_000,completedAt:0};},
    m=>{(m.world.research!.packagedSurvivalMeals as unknown as Record<string,unknown>).extra=undefined;},
  ];
  for(const original of [checkpoint,delta])for(const [i,mutate] of mutations.entries()){
    const bad=structuredClone(original);bad.revision=delta.revision;mutate(bad);
    expect(decoder.adopt(bad).status,`${original.kind} ${i}`).toBe('resync');expect(first.world).toEqual(frozen);
    if(bad.kind==='checkpoint')expect(new SnapshotDecoder().adopt(bad).status).toBe('resync');
  }
  const adopted=decoder.adopt(delta);expect(adopted.status).toBe('applied');
  if(adopted.status!=='applied')throw Error('Valid research delta refused after corruption.');
  expect(adopted.world).toEqual(w);expect(first.world).toEqual(frozen);
  const active=structuredClone(adopted.world);until(w,()=>packagedSurvivalMealsUnlocked(w));
  const done=decoder.adopt(packet(encoder,w));expect(done.status).toBe('applied');
  if(done.status==='applied')expect(done.world).toEqual(w);
  expect(adopted.world).toEqual(active);
  expect(new SnapshotDecoder().adopt(packet(encoder,w,true)).status).toBe('applied');
});

test('packaged production envelopes reject wrong quotas, stations, phases and products in checkpoints and same-tick deltas atomically',()=>{
  const w=packagedSurvivalCamp(),p=w.pawns[0]!,stove=w.structures[0]!;
  expect(applyCommand(w,{type:'order-cook',pawnId:p.id,structureId:stove.id,queue:false})).toMatchObject({ok:true});
  expect(p.cooking?.phase).toBe('gather');const gather=structuredClone(w);
  until(w,()=>p.cooking?.phase==='work'&&p.cooking.progress>0,1200);const work=structuredClone(w);
  until(w,()=>p.cooking?.phase==='output',1200);const output=structuredClone(w);
  const queued=packagedSurvivalCamp(),proposal=planCookingOrder(queued,queued.pawns[0]!,queued.structures[0]!.id);
  if(!proposal.order||!('cooking' in proposal.order))throw Error('Prepared cooking order refused.');
  queued.pawns[0]!.orders.queue.push(proposal.order);
  const cooking=(m:SnapshotMessage):CookingTask=>{
    const pawn=m.world.pawns[0]!,order=pawn.orders.queue[0];
    if(pawn.cooking)return pawn.cooking;
    if(typeof order==='object'&&order!==null&&'cooking' in order)return order.cooking;
    throw Error('Missing production envelope.');
  };
  for(const source of [gather,work,output,queued]){
    expect(validateWorld(source)).toEqual([]);
    const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),checkpoint=packet(encoder,source),first=decoder.adopt(checkpoint);
    if(first.status!=='applied')throw Error('Valid production checkpoint refused.');
    const frozen=structuredClone(first.world),delta=packet(encoder,source);
    expect(delta.kind).toBe('delta');expect(delta.world.tick).toBe(checkpoint.world.tick);
    const changes:Array<(m:SnapshotMessage)=>void>=[
      m=>{const c=cooking(m),station=m.world.structures.find(s=>s.id===c.stationId)!;station.kind='campfire';station.bills=[];},
      m=>{cooking(m).billId=m.world.nextId;},
      m=>{cooking(m).phase='interrupted';},
      m=>{cooking(m).progress=productionWorkTotal('cook-survival-meal')+1;},
      m=>{cooking(m).productId=cooking(m).stationId;},
    ];
    if(cooking(checkpoint).phase!=='output')changes.push(m=>{
      const ingredients=cooking(m).ingredients;
      ingredients.find(i=>i.item==='milk')!.quantity=5;ingredients.find(i=>i.item==='rice')!.quantity=7;
    });
    else changes.push(m=>{cooking(m).progress=1;});
    if(cooking(checkpoint).phase==='work')changes.push(m=>{cooking(m).ingredients[0]!.stage='source';});
    if(source===queued)changes.push(m=>{cooking(m).progress=1;});
    for(const original of [checkpoint,delta])for(const [i,change] of changes.entries()){
      const bad=structuredClone(original);bad.revision=delta.revision;change(bad);
      expect(decoder.adopt(bad).status,`${cooking(checkpoint).phase} ${original.kind} ${i}`).toBe('resync');
      expect(first.world).toEqual(frozen);
      if(bad.kind==='checkpoint')expect(new SnapshotDecoder().adopt(bad).status).toBe('resync');
    }
    const next=decoder.adopt(delta);expect(next.status).toBe('applied');
    if(next.status==='applied')expect(next.world).toEqual(source);
    expect(first.world).toEqual(frozen);
  }
});
