import { expect,test } from 'vitest';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index';
import { powerFixture,fixturePower } from './scenarios/power';
import { constructionRecipe } from '../src/sim/construction-materials';
import { addGroundMaterial,refreshStock } from '../src/sim/materials';
import { groundCapacity,groundPile,nearbyGround } from '../src/sim/ground-placement';
import { WOOD_BURN_TICKS } from '../src/sim/fuel';
import { woodAccount } from './scenarios/colony-player';
import { newPowerState } from '../src/sim/power-rules';
import { reconcilePower } from '../src/sim/power';
import { canStandAt,captureStandability,navigationCosts,furnitureDelay } from '../src/sim/furniture-travel';
import { constructionObstruction } from '../src/sim/construction-rules';
import { initialSkills } from '../src/sim/skills';
import { BATTERIES_RESEARCH_COST,SOLAR_POWER_RESEARCH_COST } from '../src/sim/research';
import type { World } from '../src/sim/types';

function until(w:World,done:()=>boolean,limit=1400):void {
  for(let i=0;i<limit&&!done();i++){stepWorld(w);if(i%30===0)expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}
  expect(done(),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns.map(p=>({x:p.x,z:p.z,state:p.state,job:p.jobId,haul:p.haul}))})).toBe(true);
  expect(validateWorld(w)).toEqual([]);
}
function fixture():World {
  const w=powerFixture(),p=w.pawns[0]!;p.schedule.fill('work');p.priorities.basic=1;p.priorities.build=0;p.priorities.haul=0;
  return w;
}

test('switch intent needs physical travel and two local work ticks, interruption restarts its wait, and continuation preserves fuel and priorities',()=>{
  const w=fixture(),p=w.pawns[0]!,g=fixturePower(w,'wood-generator',16,16),skills=structuredClone(p.skills);
  expect(applyCommand(w,{type:'power-flick',structureId:g.id,on:false}).ok).toBe(true);
  const job=w.jobs.find(j=>j.flick)!;expect(g.power!.switchOn).toBeUndefined();
  stepWorld(w);expect(g.power!.switchOn).toBeUndefined();expect(job.progress).toBe(0);expect(g.fuel!.burned).toBeGreaterThan(0);
  until(w,()=>job.progress===10);expect(g.power!.switchOn).toBeUndefined();
  expect(applyCommand(w,{type:'priority',pawnId:p.id,work:'basic',value:0}).ok).toBe(true);
  expect(job.progress).toBe(0);expect(job.reservedBy).toBeNull();expect(validateWorld(w)).toEqual([]);
  stepWorld(w,10);expect(g.power!.switchOn).toBeUndefined();
  expect(applyCommand(w,{type:'priority',pawnId:p.id,work:'basic',value:1}).ok).toBe(true);
  until(w,()=>job.progress===10);const resumed=deserializeWorld(serializeWorld(w));
  stepWorld(w);stepWorld(resumed);expect(resumed).toEqual(w);expect(g.power).toMatchObject({switchOn:false,on:false});
  expect(w.jobs.some(j=>j.id===job.id)).toBe(false);expect(p.skills).toEqual(skills);
  const fuel=structuredClone(g.fuel);stepWorld(w,40);expect(g.fuel).toEqual(fuel);
  expect(applyCommand(w,{type:'power-flick',structureId:g.id,on:true}).ok).toBe(true);
  until(w,()=>g.power!.switchOn===true);stepWorld(w,30);expect(g.fuel!.burned).toBeGreaterThan(fuel!.burned);
});

test('intention reversal and explicit cancellation release reservations; non-flickable devices and stale removals never mutate the circuit',()=>{
  const w=fixture(),p=w.pawns[0]!,lamp=fixturePower(w,'standing-lamp',15,12);fixturePower(w,'wood-generator',16,14);reconcilePower(w);
  expect(applyCommand(w,{type:'power-flick',structureId:lamp.id,on:false}).ok).toBe(true);
  const first=w.jobs.find(j=>j.flick)!;
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:first.id,queue:false}).ok).toBe(true);
  until(w,()=>first.progress===10);
  expect(applyCommand(w,{type:'power-flick',structureId:lamp.id,on:true}).ok).toBe(true);
  expect(w.jobs).not.toContain(first);expect(p.orders.active).toBeNull();expect(validateWorld(w)).toEqual([]);
  expect(applyCommand(w,{type:'power-flick',structureId:lamp.id,on:false}).ok).toBe(true);
  expect(applyCommand(w,{type:'cancel',x:lamp.x,z:lamp.z}).ok).toBe(true);expect(w.jobs.some(j=>j.flick)).toBe(false);
  const b={id:w.nextId++,kind:'battery' as const,x:25,z:20,orientation:0 as const,footprint:'standard' as const,material:'steel' as const,power:newPowerState('battery'),battery:{stored:0}};w.structures.push(b);
  w.research={project:null,points:0,batteries:{points:BATTERIES_RESEARCH_COST,completedAt:0}};
  const before=serializeWorld(w);expect(applyCommand(w,{type:'power-flick',structureId:b.id,on:false}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  expect(applyCommand(w,{type:'power-flick',structureId:lamp.id,on:false}).ok).toBe(true);
  expect(applyCommand(w,{type:'designate',kind:'deconstruct',targetId:lamp.id,x:lamp.x,z:lamp.z}).ok).toBe(true);
  expect(w.jobs.some(j=>j.flick)).toBe(false);expect(validateWorld(w)).toEqual([]);
});

test('switching during real automatic refuelling conserves carried wood, rejects a saturated drop atomically and keeps forced refuelling distinct across saves',()=>{
  const w=fixture(),p=w.pawns[0]!,g=fixturePower(w,'wood-generator',20,20);
  // Controlled logistics fixture: only the generator requests this wood.
  w.stockpiles=[];p.priorities.basic=0;p.priorities.haul=1;g.fuel!.ticks=10*WOOD_BURN_TICKS;
  const wood=woodAccount(w);
  until(w,()=>p.haul?.destination.type==='fuel'&&p.haul.destination.structureId===g.id&&p.haul.phase==='deliver');
  expect(p.haul!.destination).toEqual({type:'fuel',structureId:g.id});expect(p.orders.active).toBeNull();
  const carried=w.piles.find(pile=>pile.id===p.haul!.carryPileId)!;
  expect(carried).toMatchObject({item:'wood',owner:{type:'pawn',pawnId:p.id}});expect(carried.quantity).toBeGreaterThan(0);
  const carriedId=carried.id,carriedQuantity=carried.quantity;

  // Branch from the actual pickup checkpoint. Every admissible local drop cell
  // is occupied: an automatic cancellation must not discard or merge the load.
  const full=deserializeWorld(serializeWorld(w)),fullPawn=full.pawns[0]!;
  for(const cell of nearbyGround(full,fullPawn))if(!groundPile(full,cell)&&groundCapacity(full,cell,'wood')>0)
    addGroundMaterial(full,'wood',1,cell,'wood');
  refreshStock(full);expect(validateWorld(full)).toEqual([]);
  const fullBefore=serializeWorld(full);
  expect(applyCommand(full,{type:'power-flick',structureId:g.id,on:false})).toMatchObject({ok:false,code:'occupied'});
  expect(serializeWorld(full)).toBe(fullBefore);

  expect(applyCommand(w,{type:'power-flick',structureId:g.id,on:false}).ok).toBe(true);
  expect(p.haul).toBeNull();expect(p.orders.active).toBeNull();
  expect(w.piles.find(pile=>pile.id===carriedId)).toMatchObject({quantity:carriedQuantity,item:'wood',owner:{type:'ground'}});
  expect(g.power!.switchOn).toBeUndefined();expect(g.fuel!.autoRefuel).toBe(true);
  const pending=deserializeWorld(serializeWorld(w));
  for(let i=0;i<40;i++){
    stepWorld(w);stepWorld(pending);
    expect(p.haul).toBeNull();expect(g.power!.switchOn).toBeUndefined();
  }
  expect(pending).toEqual(w);expect(validateWorld(w)).toEqual([]);
  expect(w.piles.find(pile=>pile.id===carriedId)).toMatchObject({quantity:carriedQuantity,owner:{type:'ground'}});
  for(const world of [w,pending])expect(applyCommand(world,{type:'priority',pawnId:p.id,work:'basic',value:1}).ok).toBe(true);
  until(w,()=>g.power!.switchOn===false);stepWorld(pending,w.tick-pending.tick);expect(pending).toEqual(w);
  const offFuel=structuredClone(g.fuel);
  for(let i=0;i<40;i++){stepWorld(w);expect(p.haul).toBeNull();}
  expect(g.fuel).toEqual(offFuel);expect(g.fuel!.autoRefuel).toBe(true);
  expect(w.piles.find(pile=>pile.id===carriedId)).toMatchObject({quantity:carriedQuantity,owner:{type:'ground'}});
  expect(woodAccount(w)).toBeCloseTo(wood,10);

  // A separate player order is allowed even while physically switched off.
  // A later pending switch-on must not cancel that explicitly requested haul.
  expect(applyCommand(w,{type:'priority',pawnId:p.id,work:'basic',value:0}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-haul',pawnId:p.id,target:{type:'fuel',structureId:g.id},queue:false}).ok).toBe(true);
  until(w,()=>p.haul?.phase==='deliver');
  expect(p.haul!.destination).toEqual({type:'fuel',structureId:g.id,forced:true});expect(p.orders.active).toBe('haul');
  const forcedTask=structuredClone(p.haul),forcedCargo=structuredClone(w.piles.find(pile=>pile.id===p.haul!.carryPileId)!);
  expect(forcedCargo.owner).toEqual({type:'pawn',pawnId:p.id});
  expect(applyCommand(w,{type:'power-flick',structureId:g.id,on:true}).ok).toBe(true);
  expect(p.haul).toEqual(forcedTask);expect(w.piles.find(pile=>pile.id===forcedCargo.id)).toEqual(forcedCargo);
  expect(g.power!.switchOn).toBe(false);expect(w.jobs.some(j=>j.flick?.structureId===g.id&&j.flick.on)).toBe(true);
  const delivery=deserializeWorld(serializeWorld(w)),fuelBefore=structuredClone(g.fuel!);
  until(w,()=>p.haul===null);stepWorld(delivery,w.tick-delivery.tick);expect(delivery).toEqual(w);
  expect(w.piles.some(pile=>pile.id===forcedCargo.id)).toBe(false);expect(p.orders.active).toBeNull();
  expect(g.power!.switchOn).toBe(false);expect(g.fuel!.ticks).toBe(fuelBefore.ticks+forcedCargo.quantity*WOOD_BURN_TICKS);
  expect(g.fuel!.burned).toBe(fuelBefore.burned);expect(woodAccount(w)).toBeCloseTo(wood,10);
  expect(applyCommand(w,{type:'priority',pawnId:p.id,work:'basic',value:1}).ok).toBe(true);
  until(w,()=>g.power!.switchOn===true);expect(woodAccount(w)).toBeCloseTo(wood,10);
});

test('conduits are built under walls and ordinary crops, retain traversable frames and can be removed by identity without refund or damage to the wall',()=>{
  const w=powerFixture(),p=w.pawns[0]!;p.schedule.fill('work');p.priorities.haul=0;
  const wall={id:w.nextId++,kind:'wall' as const,x:16,z:12,orientation:0 as const,footprint:'standard' as const,material:'wood' as const};w.structures.push(wall);
  const rice={id:w.nextId++,kind:'rice' as const,x:14,z:12,amount:6,growth:.1,growthTick:w.tick};w.resources.push(rice);
  for(const x of [14,16])expect(applyCommand(w,{type:'designate',kind:'power-conduit',material:'steel',x,z:12}).ok).toBe(true);
  const cropJob=w.jobs.find(j=>j.x===14)!;
  expect(constructionObstruction(w,cropJob).plant).toBeUndefined();
  until(w,()=>cropJob.construction==='frame');
  expect(canStandAt(w,cropJob)).toBe(true);expect(captureStandability(w)(cropJob)).toBe(true);expect(navigationCosts(w).stops.has(cropJob.z*w.width+cropJob.x)).toBe(false);
  until(w,()=>w.structures.filter(s=>s.kind==='power-conduit').length===2);
  expect(w.resources).toContain(rice);expect(rice.growth).toBe(.1);expect(canStandAt(w,wall)).toBe(false);
  const wire=w.structures.find(s=>s.kind==='power-conduit'&&s.x===16)!;
  const peer=deserializeWorld(serializeWorld(w));peer.structures.reverse();expect(validateWorld(peer)).toEqual([]);expect(canStandAt(peer,wall)).toBe(false);
  expect(furnitureDelay(peer,{x:15,z:12},wall)).toBe(furnitureDelay(w,{x:15,z:12},wall));
  expect(applyCommand(w,{type:'designate',kind:'power-conduit',material:'steel',x:16,z:12}).ok).toBe(false);
  expect(applyCommand(w,{type:'designate',kind:'power-switch',material:'steel',x:14,z:12}).ok).toBe(false);
  const steel=w.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0),lost=w.deconstructed.lostSteel??0;
  expect(applyCommand(w,{type:'designate',kind:'deconstruct',targetId:wire.id,x:wire.x,z:wire.z}).ok).toBe(true);
  until(w,()=>!w.structures.some(s=>s.id===wire.id));expect(w.structures).toContain(wall);
  expect(w.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0)).toBe(steel);expect(w.deconstructed.lostSteel).toBe(lost+1);
});

test('solar research and Construction 6 gate physical completion without changing the material recipe',()=>{
  const w=powerFixture(),p=w.pawns[0]!;p.schedule.fill('work');p.skills=initialSkills(5,0,w.tick);p.priorities.haul=0;
  expect(applyCommand(w,{type:'designate',kind:'solar-generator',material:'steel',x:16,z:16}).ok).toBe(false);
  w.research={project:null,points:0,solarPower:{points:SOLAR_POWER_RESEARCH_COST,completedAt:0}};
  addGroundMaterial(w,'component',1,{x:13,z:15},'component');refreshStock(w);
  expect(constructionRecipe({kind:'solar-generator',material:'steel'})).toMatchObject({work:250,ingredients:[{item:'steel',quantity:100},{item:'component',quantity:3}]});
  expect(applyCommand(w,{type:'designate',kind:'solar-generator',material:'steel',x:16,z:16}).ok).toBe(true);
  const job=w.jobs.find(j=>j.kind==='solar-generator')!;
  until(w,()=>w.piles.filter(p=>p.owner.type==='job'&&p.owner.jobId===job.id).reduce((n,p)=>n+p.quantity,0)===103);
  stepWorld(w,25);expect(job.progress).toBe(0);expect(w.structures.some(s=>s.kind==='solar-generator')).toBe(false);
  p.skills.construction.level=6;p.planCooldown=0;until(w,()=>w.structures.some(s=>s.kind==='solar-generator'));
});

test('the real V84 colony migrates only schema and basic priority; future fields and corrupt switch work are rejected before migration',()=>{
  const old=JSON.parse(gunzipSync(readFileSync('tests/fixtures/colony-v84.json.gz')).toString());
  const next=deserializeWorld(JSON.stringify(old)),expected=structuredClone(old);expected.schemaVersion=85;
  for(const p of expected.pawns)p.priorities.basic=3;
  expect(next).toEqual(expected);expect(validateWorld(next)).toEqual([]);
  const bad=structuredClone(old);bad.pawns[0].priorities.basic=3;expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  const w=fixture(),g=fixturePower(w,'wood-generator',16,16);applyCommand(w,{type:'power-flick',structureId:g.id,on:false});
  for(const change of [(v:World)=>v.jobs[0]!.flick!.structureId=999,(v:World)=>v.jobs[0]!.progress=10,(v:World)=>v.jobs[0]!.flick!.on=true,(v:World)=>v.jobs[0]!.escrow.wood=1]){
    const broken=structuredClone(w);change(broken);expect(()=>deserializeWorld(JSON.stringify(broken))).toThrow();
  }
});
