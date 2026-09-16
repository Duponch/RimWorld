import { withoutPawnSkills } from './scenarios/legacy-skills';
import { expect,test } from 'vitest';
import { createWorld,applyCommand,stepWorld,validateWorld,serializeWorld,deserializeWorld } from '../src/sim/index';
import { addMaterial,refreshStock } from '../src/sim/materials';
import { startTravel } from '../src/sim/movement';
import { workProgress } from '../src/sim/work-progress';
import { pickDuration } from '../src/sim/mining-rules';
import { releaseWork } from '../src/sim/work-release';
import { fixtureFire,workplaceCamp } from './scenarios/work-environment';
import type { JobKind, World } from '../src/sim/types';

function camp() {
  const w=createWorld(811,32,32);w.tick=0;w.tiles=w.tiles.map(()=>({terrain:'grass'}));
  w.resources=[];w.structures=[];w.piles=[];w.jobs=[];w.stockpiles=[];w.pawns=w.pawns.slice(0,1);
  const p=w.pawns[0]!;Object.assign(p,{x:10,z:10,hunger:100,rest:100,planCooldown:0});p.recreation.level=100;p.schedule.fill('anything');refreshStock(w);return w;
}
function assigned(kind:JobKind) {
  const w=camp(),p=w.pawns[0]!,at={x:11,z:10};
  if(['chop','cut','harvest'].includes(kind))w.resources.push({id:w.nextId++,kind:kind==='chop'?'tree':'berries',...at,amount:12,...kind==='chop'?{}:{growth:1,growthTick:0}});
  if(kind==='mine')w.tiles[at.z*32+at.x]={terrain:'rock',stone:'granite'};
  if(kind==='deconstruct'||kind==='uninstall')w.structures.push({id:w.nextId++,kind:'stool',...at,orientation:0,footprint:'standard'});
  if(kind==='build-roof'||kind==='remove-roof') {
    w.structures.push({id:w.nextId++,kind:'wall',x:12,z:10,orientation:0,footprint:'standard'});
    w.roofing={constructed:kind==='remove-roof'?[331]:[],build:kind==='build-roof'?[331]:[],remove:kind==='remove-roof'?[331]:[],cursor:0};
  }
  if(kind==='sow')expect(applyCommand(w,{type:'area',action:'growing',from:at,to:at}).ok).toBe(true);
  else if(kind==='build-roof'||kind==='remove-roof') {
    w.jobs.push({id:w.nextId++,kind,...at,orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}});
  } else expect(applyCommand(w,{type:'designate',kind,...at}).ok).toBe(true);
  if(kind==='sow') {for(let i=0;i<20&&!w.jobs.some(j=>j.kind==='sow');i++)stepWorld(w);}
  const job=w.jobs.find(j=>j.kind===kind)!;expect(job).toBeDefined();
  if(kind==='wall') {job.construction='frame';addMaterial(w,'wood',5,{type:'job',jobId:job.id});refreshStock(w);}
  Object.assign(job,{status:'active',reservedBy:p.id});p.jobId=job.id;p.state='working';p.path=[];
  expect(validateWorld(w)).toEqual([]);return {w,p,job};
}
const tick=(w:World,n=1)=>{for(let i=0;i<n;i++){stepWorld(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}};

test('travaux physiques : lumière au travailleur, fractions conservées, interruption et dégagement avant construction',()=>{
  for(const kind of ['chop','harvest','cut','sow','wall','build-roof','remove-roof','deconstruct','uninstall'] as const) {
    const {w,p,job}=assigned(kind),before=workProgress(job);
    // Two dark ticks leave a real fraction; no rounding to zero or one per tick.
    tick(w,2);expect(workProgress(job)-before,kind).toBeCloseTo(1.6,8);
    const saved=serializeWorld(w),copy=deserializeWorld(saved);expect(copy).toEqual(w);
    fixtureFire(w,9,10);fixtureFire(copy,9,10);tick(w);tick(copy);expect(copy).toEqual(w);
    if(w.jobs.includes(job))expect(workProgress(job)-before,kind).toBeCloseTo(2.6,8);
    releaseWork(w,p);expect(validateWorld(w)).toEqual([]);
    if(['sow','deconstruct','uninstall','build-roof','remove-roof'].includes(kind))expect(workProgress(job)).toBe(0);
    else expect(workProgress(job)).toBeCloseTo(before+2.6,8);
  }
  const {w,p,job}=assigned('chop');
  // The colon is under a roof, the tree in daylight: sample the colon.
  w.structures.push({id:w.nextId++,kind:'wall',x:10,z:9,orientation:0,footprint:'standard'});
  w.tick=3000;w.roofing={constructed:[330],build:[],remove:[],cursor:0};tick(w);expect(workProgress(job)).toBe(.8);
  w.roofing.constructed=[];tick(w);expect(workProgress(job)).toBe(1.8);
  const clear=assigned('wall');clear.job.construction='blueprint';clear.w.piles=[];refreshStock(clear.w);
  const plant={id:clear.w.nextId++,kind:'tree' as const,x:11,z:10,amount:12};clear.w.resources=[plant];clear.job.clearance={resourceId:plant.id,progress:0};
  tick(clear.w,2);expect(workProgress(clear.job.clearance!)).toBe(1.6);expect(workProgress(clear.job)).toBe(0);
  const corrupt=JSON.parse(serializeWorld(clear.w));corrupt.jobs[0].clearance.workRemainder=10000;expect(()=>deserializeWorld(JSON.stringify(corrupt))).toThrow(/fractional/);
  releaseWork(clear.w,clear.p);expect(clear.job.clearance).toBeUndefined();expect(validateWorld(clear.w)).toEqual([]);

  // Same tick: one worker reads darkness, a miner opens the enclosure, then a
  // second worker must see the fire. No context may outlive that mutation.
  const breach=workplaceCamp();breach.structures=breach.structures.filter(s=>s.kind!=='stonecutter'&&!(s.x===7&&s.z===4));
  breach.resources=[];breach.piles=[];refreshStock(breach);breach.jobs=[];
  breach.tiles[4*32+7]={terrain:'rock',stone:'sandstone',miningDamage:320};fixtureFire(breach,8,4);
  const original=structuredClone(breach.pawns[0]!);breach.pawns=[];
  for(const [i,kind,x,z] of [[0,'chop',5,4],[1,'mine',7,4],[2,'chop',6,5]] as const) {
    const worker=structuredClone(original);Object.assign(worker,{id:breach.nextId++,x:6,z:4,hunger:100,rest:100,planCooldown:0});worker.recreation.level=100;worker.schedule.fill('anything');breach.pawns.push(worker);
    Object.assign(worker.priorities,{gather:2,mine:2});
    if(kind==='chop')breach.resources.push({id:breach.nextId++,kind:'tree',x,z,amount:12});
    const j={id:breach.nextId++,kind,x,z,orientation:0 as const,footprint:'standard' as const,status:'active' as const,reservedBy:worker.id,progress:i===1?9:0,escrow:{wood:0,food:0},...i===1?{pickTicks:100}:{}};
    breach.jobs.push(j);worker.jobId=j.id;worker.state='working';
  }
  // These tree placeholders must stand in open cells, outside constructed roofs.
  breach.roofing!.constructed=breach.roofing!.constructed.filter(i=>i!==4*32+5&&i!==5*32+6);
  expect(validateWorld(breach)).toEqual([]);tick(breach);
  expect(workProgress(breach.jobs[0]!)).toBe(.8);expect(workProgress(breach.jobs[1]!)).toBe(1);
});

test('coups et arêtes : durée capturée, diagonales exactes, délais additifs, migration V36 stricte et reprise',()=>{
  expect([1,.9,.8,100/112.5,100/111.5].map(pickDuration)).toEqual([100,111,125,112,112]);
  const {w,p,job}=assigned('mine');tick(w,6);expect(job.pickTicks).toBe(125);
  const fire=fixtureFire(w,9,10);tick(w,6);expect(w.tiles[331]!.miningDamage).toBeUndefined();
  tick(w);expect(w.tiles[331]!.miningDamage).toBe(80);expect(job.pickTicks).toBe(100);expect(workProgress(job)).toBe(.5);
  fire.fuel.ticks=0;tick(w,9);expect(w.tiles[331]!.miningDamage).toBe(80);
  const copy=deserializeWorld(serializeWorld(w));tick(w);tick(copy);expect(copy).toEqual(w);expect(w.tiles[331]!.miningDamage).toBe(160);expect(job.pickTicks).toBe(125);
  // The next two dark strokes take 25 ticks total, not two rounded 13-tick waits.
  tick(w,25);expect(w.tiles[331]!.miningDamage).toBe(320);
  const old=JSON.parse(serializeWorld(w));(old.schemaVersion=36,withoutPawnSkills(old));old.jobs[0].progress=4;delete old.jobs[0].workRemainder;delete old.jobs[0].pickTicks;
  const migrated=deserializeWorld(JSON.stringify(old));expect(migrated.jobs[0]).toMatchObject({progress:4,pickTicks:100});
  tick(migrated,6);expect(migrated.tiles[331]!.miningDamage).toBe(400);
  // Historically valid pending progress must also migrate without erasure.
  const pending=structuredClone(old);pending.jobs[0].status='pending';pending.jobs[0].reservedBy=null;
  pending.pawns[0].jobId=null;pending.pawns[0].state='idle';
  expect(deserializeWorld(JSON.stringify(pending)).jobs[0]).toMatchObject({status:'pending',progress:4,pickTicks:100});
  old.jobs[0].pickTicks=125;expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/version 36/);delete old.jobs[0].pickTicks;
  old.jobs[0].workRemainder=1;expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/version 36/);
  const bad=JSON.parse(serializeWorld(w));bad.jobs[0].pickTicks=25001;expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/pick duration/);
  bad.schemaVersion=44;bad.jobs[0].pickTicks=126;expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/version 44/);
  releaseWork(w,p);expect(job.pickTicks).toBeUndefined();expect(job.workRemainder).toBeUndefined();expect(validateWorld(w)).toEqual([]);

  const walk=camp(),actor=walk.pawns[0]!;walk.tick=3000;walk.structures.push({id:walk.nextId++,kind:'wall',x:10,z:9,orientation:0,footprint:'standard'});walk.roofing={constructed:[330],build:[],remove:[],cursor:0};
  startTravel(walk,actor,{x:11,z:11});const edge=structuredClone(actor.motion!);
  expect(edge.end-edge.start).toBeCloseTo(3*Math.SQRT2/.8,9);expect(edge.speedFactor).toBe(.8);
  walk.roofing.constructed=[];const resumed=deserializeWorld(serializeWorld(walk));tick(walk,2);tick(resumed,2);expect(resumed).toEqual(walk);expect(actor.motion).toEqual(edge);
  walk.tick=Math.ceil(edge.end);startTravel(walk,actor,{x:12,z:12});expect(actor.motion!.start).toBeCloseTo(edge.end,9);expect(actor.motion!.end-actor.motion!.start).toBeCloseTo(3*Math.SQRT2,9);
  const malformed=JSON.parse(serializeWorld(walk));malformed.pawns[0].motion.speedFactor=.8;expect(()=>deserializeWorld(JSON.stringify(malformed))).toThrow(/travel duration/);
  const furniture=camp(),carrier=furniture.pawns[0]!;furniture.structures.push({id:furniture.nextId++,kind:'table',x:11,z:10,orientation:0,footprint:'standard'});
  startTravel(furniture,carrier,{x:11,z:10});expect(carrier.motion!.end-carrier.motion!.start).toBeCloseTo(3/.8+4.2,9);expect(validateWorld(furniture)).toEqual([]);
});
