import {expect,test} from 'vitest';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {annualGrowingLightIntegral} from '../src/sim/environment.ts';
import {jobDuration} from '../src/sim/farming.ts';
import {gatherResource} from '../src/sim/gathering.ts';
import {expireFood} from '../src/sim/food-expiration.ts';
import {rotAge,ticksUntilRot} from '../src/sim/food-preservation.ts';
import {initializeHydroponicBasin} from '../src/sim/hydroponics.ts';
import {addGroundMaterial,addMaterial,refreshStock} from '../src/sim/materials.ts';
import {berryYield,harvestable,plantGrowth} from '../src/sim/plants.ts';
import {newPowerState} from '../src/sim/power-rules.ts';
import {HYDROPONICS_RESEARCH_COST} from '../src/sim/research.ts';
import {TICKS_PER_DAY,type Command,type Resource,type Structure,type World} from '../src/sim/types.ts';
import {foodWorkstationCamp} from './scenarios/food-workstations.ts';
import {fixturePower} from './scenarios/power.ts';

function field():World {
  const w=foodWorkstationCamp(),p=w.pawns[0]!;
  delete p.background;delete p.traits;p.foodPolicyId=4;p.priorities.grow=1;p.priorities.haul=2;
  p.skills.plants={level:8,xp:0,dailyXp:0,passion:0};return w;
}
const command=(w:World,c:Command)=>expect(applyCommand(w,c)).toMatchObject({ok:true});
const units=(w:World,item:'hay'|'kibble')=>w.piles.reduce((n,p)=>n+(p.item===item?p.quantity:0),0);
function until(w:World,done:()=>boolean,limit=1500):void {
  for(let i=0;i<limit&&!done();i++)stepWorld(w);
  expect(done(),`transition missing at tick ${w.tick}`).toBe(true);expect(validateWorld(w)).toEqual([]);
}
function crop(w:World,x=7,z=7,growth=1):Resource {
  const r:Resource={id:w.nextId++,kind:'haygrass',x,z,amount:18,growth,growthTick:w.tick};
  w.resources=[...w.resources,r];return r;
}

test('haygrass integrates seven weighted growing days, soil and thermal checkpoints without losing its anchor',()=>{
  const w=field();w.pawns=[];const anchor=w.tick;
  const plants=(['gravel','grass','rich-soil','rough-stone'] as const).map((terrain,i)=>{
    w.tiles[7*w.width+7+i]={terrain,...terrain==='rough-stone'?{stone:'granite' as const}:{}};
    return crop(w,7+i,7,.1);
  });
  // An integration boundary fixture; this is not a long colony campaign.
  w.tick+=3*TICKS_PER_DAY;
  const elapsed=annualGrowingLightIntegral(w)-annualGrowingLightIntegral(w,anchor);
  for(const [i,factor] of [[0,.82],[1,1],[2,1.24]] as const)
    expect(plantGrowth(w,plants[i]!)).toBeCloseTo(.1+elapsed*factor/(7*TICKS_PER_DAY),12);
  expect(plantGrowth(w,plants[3]!)).toBe(.1);
  const r=plants[1]!;r.growth=plantGrowth(w,r);r.growthTick=w.tick;r.growthThermalFactor=.5;
  const resumed=deserializeWorld(serializeWorld(w));stepWorld(w,37);stepWorld(resumed,37);
  expect(plantGrowth(resumed,resumed.resources[1]!)).toBe(plantGrowth(w,r));
  expect(serializeWorld(resumed)).toBe(serializeWorld(w));
  w.roofing={constructed:[r.z*w.width+r.x],build:[],remove:[],cursor:0};
  expect(plantGrowth(w,r)).toBe(r.growth);
});

test('a level-zero worker sows hay, then real harvest and hauling retain a finite eighteen-unit ledger on reload',()=>{
  const w=field(),p=w.pawns[0]!;p.skills.plants!.level=0;
  command(w,{type:'area',action:'growing',from:{x:7,z:4},to:{x:7,z:4}});
  const zone=w.growingZones.at(-1)!;
  command(w,{type:'growing-policy',zoneId:zone.id,plant:'haygrass',allowSow:true,allowCut:true});
  until(w,()=>w.jobs.some(j=>j.kind==='sow'&&j.progress>0));
  expect(jobDuration(w,w.jobs.find(j=>j.kind==='sow')!)).toBe(17);
  const sowCheckpoint=serializeWorld(w),sowResume=deserializeWorld(sowCheckpoint);
  until(w,()=>w.resources.some(r=>r.kind==='haygrass'));
  stepWorld(sowResume,w.tick-sowResume.tick);expect(serializeWorld(sowResume)).toBe(serializeWorld(w));
  const original=w.resources[0]!.id;expect(w.resources[0]).toMatchObject({kind:'haygrass',amount:18});
  command(w,{type:'growing-policy',zoneId:zone.id,allowSow:false,allowCut:true});
  // A declared mature fixture isolates harvest, not seven days of autonomous growth.
  w.resources[0]!.growth=1;w.resources[0]!.growthTick=w.tick;p.skills.plants!.level=8;
  command(w,{type:'stockpile',enabled:true,x:12,z:8,filters:{wood:false,food:true}});
  until(w,()=>w.jobs.some(j=>j.kind==='harvest'));
  expect(jobDuration(w,w.jobs.find(j=>j.kind==='harvest')!)).toBe(20);
  until(w,()=>p.haul?.phase==='deliver');
  expect(w.resources.some(r=>r.id===original)).toBe(false);expect(units(w,'hay')).toBe(18);
  const held=w.piles.find(q=>q.item==='hay'&&q.owner.type==='pawn')!;
  expect(held.quantity).toBe(10);expect(held.rot).toBeDefined();
  const remainder=w.piles.find(q=>q.item==='hay'&&q.owner.type==='ground')!;
  expect(remainder.quantity).toBe(8);expect(rotAge(held,w.tick)).toBe(rotAge(remainder,w.tick));
  const storedHay=(world:World)=>world.piles.reduce((n,q)=>n+(q.item==='hay'&&q.owner.type==='ground'&&q.owner.x===12&&q.owner.z===8?q.quantity:0),0);
  const resumed=deserializeWorld(serializeWorld(w));
  until(w,()=>p.haul?.phase==='deliver'&&w.piles.some(q=>q.item==='hay'&&q.owner.type==='pawn'&&q.id!==held.id));
  stepWorld(resumed,w.tick-resumed.tick);expect(serializeWorld(resumed)).toBe(serializeWorld(w));
  expect(storedHay(w)).toBe(10);expect(w.piles.find(q=>q.item==='hay'&&q.owner.type==='pawn')!.quantity).toBe(8);
  expect(units(w,'hay')).toBe(18);const secondResume=deserializeWorld(serializeWorld(w));
  until(w,()=>storedHay(w)===18);
  stepWorld(resumed,w.tick-resumed.tick);stepWorld(secondResume,w.tick-secondResume.tick);
  expect(serializeWorld(resumed)).toBe(serializeWorld(w));expect(serializeWorld(secondResume)).toBe(serializeWorld(w));
  expect(units(w,'hay')).toBe(18);expect(w.resources).toEqual([]);
  expect(w.piles.filter(q=>q.item==='hay').every(q=>q.owner.type==='ground'&&q.owner.x===12&&q.owner.z===8)).toBe(true);
});

test('hay harvest is strictly above sixty-five percent, scales with surviving health, and clearing yields no hay',()=>{
  const w=field();w.pawns=[];const r=crop(w,7,7,.65),before=serializeWorld(w);
  expect(harvestable(w,r)).toBe(false);expect(gatherResource(w,r,'harvest')).toBeNull();
  expect(serializeWorld(w)).toBe(before);
  r.growth=1;r.damage=17;expect(berryYield(w,r)).toBeCloseTo(16.2,12);
  r.blight={since:w.tick,severity:.2,lastHarmTick:w.tick,nextCheck:w.tick+1,rng:1};
  expect(harvestable(w,r)).toBe(false);expect(gatherResource(w,r,'harvest')).toBeNull();
  delete r.blight;const rng=w.rng;
  expect(gatherResource(w,r,'cut')).toBe(0);expect(units(w,'hay')).toBe(0);
  expect(w.resources).toEqual([]);expect(w.rng).toBe(rng);expect(validateWorld(w)).toEqual([]);
});

test('a saturated harvest keeps the original plant and RNG until an entire hay output can be placed',()=>{
  const w=field();w.pawns=[];const r=crop(w);
  for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)addGroundMaterial(w,'wood',75,{x,z});
  const blocked=serializeWorld(w);expect(gatherResource(w,r,'harvest')).toBeNull();
  expect(serializeWorld(w)).toBe(blocked);
  w.piles=[];refreshStock(w);expect(gatherResource(w,r,'harvest')).toBe(18);refreshStock(w);
  expect(units(w,'hay')).toBe(18);expect(w.resources).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(w));stepWorld(w,9);stepWorld(resumed,9);
  expect(serializeWorld(resumed)).toBe(serializeWorld(w));
});

test('a live researched hydroponic basin rejects hay atomically and retains its ordinary rice policy',()=>{
  const w=field();w.pawns=[];w.research??={points:0,project:null};
  w.research.hydroponics={points:HYDROPONICS_RESEARCH_COST,completedAt:w.tick};
  const source=fixturePower(w,'wood-generator',12,4);
  const basin:Structure={id:w.nextId++,kind:'hydroponics-basin',x:6,z:4,orientation:0,footprint:'standard',material:'steel',power:{...newPowerState('hydroponics-basin'),on:true,parentId:source.id}};
  w.structures.push(basin);initializeHydroponicBasin(w,basin);
  const zone=w.growingZones.find(z=>z.basinId===basin.id)!,before=serializeWorld(w);
  expect(applyCommand(w,{type:'growing-policy',zoneId:zone.id,plant:'haygrass',allowSow:true,allowCut:true}).ok).toBe(false);
  expect(serializeWorld(w)).toBe(before);stepWorld(w,5);
  expect(zone.plant).toBe('rice');expect(w.resources.some(r=>r.kind==='haygrass')).toBe(false);
  expect(validateWorld(w)).toEqual([]);
});

test('hay merges weighted age and expires at sixty days while capped kibble survives the same ordinary tick',()=>{
  const w=field();w.pawns=[];delete w.climate;
  addGroundMaterial(w,'food',100,{x:6,z:6},'hay');addGroundMaterial(w,'food',76,{x:8,z:6},'kibble');
  const old=w.piles.find(p=>p.item==='hay')!;
  w.tick+=TICKS_PER_DAY;const age=rotAge(old,w.tick);addMaterial(w,'food',100,old.owner,'hay');refreshStock(w);
  expect(old.quantity).toBe(200);expect(rotAge(old,w.tick)).toBe(age/2);
  expect(w.piles.filter(p=>p.item==='kibble').map(p=>p.quantity).sort((a,b)=>a-b)).toEqual([1,75]);
  expect(w.piles.filter(p=>p.item==='kibble').every(p=>!p.rot)).toBe(true);
  w.tick+=60*TICKS_PER_DAY-age/2-1;
  expect(ticksUntilRot(old,w.tick)).toBe(1);expireFood(w);expect(units(w,'hay')).toBe(200);
  const resumed=deserializeWorld(serializeWorld(w));stepWorld(w);stepWorld(resumed);
  expect(units(w,'hay')).toBe(0);expect(w.spoiled.hay).toBe(200);expect(units(w,'kibble')).toBe(76);
  expect(serializeWorld(resumed)).toBe(serializeWorld(w));expect(validateWorld(w)).toEqual([]);
});
