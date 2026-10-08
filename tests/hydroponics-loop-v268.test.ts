import {expect,test} from 'vitest';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';
import {applyCommand,canDesignate,stepWorld} from '../src/sim/engine.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {initializeHydroponicBasin} from '../src/sim/hydroponics.ts';
import {reconcilePower} from '../src/sim/power.ts';
import {isPowerActive} from '../src/sim/power-rules.ts';
import {HYDROPONICS_RESEARCH_COST} from '../src/sim/research.ts';
import {damageStructure} from '../src/sim/thing-damage.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import type {Structure,World} from '../src/sim/types.ts';

function fixture(){
  const w=deconstructionCamp(2);w.tick=1600;
  w.research={points:0,project:null,hydroponics:{points:HYDROPONICS_RESEARCH_COST,completedAt:w.tick}};
  for(const p of w.pawns){p.priorities.grow=2;p.priorities.gather=2;p.skills.construction.level=12;p.skills.plants={level:12,xp:0,dailyXp:0,passion:0};}
  const generator:Structure=fixtureBuilding(w,'wood-generator',12,13);generator.material='steel';
  Object.assign(generator,{power:{on:true,parentId:null},fuel:{ticks:45000,burned:0,burnRemainder:0,autoRefuel:false}});
  return {w,generator};
}
function basin(w:World){
  const b:Structure=fixtureBuilding(w,'hydroponics-basin',16,16);b.material='steel';Object.assign(b,{power:{on:false,parentId:null}});
  initializeHydroponicBasin(w,b);reconcilePower(w);return b;
}
function until(w:World,done:()=>boolean,limit=2000){for(let i=0;i<limit&&!done();i++)stepWorld(w);expect(done(),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns.map(p=>({id:p.id,state:p.state,job:p.jobId,haul:p.haul})),resources:w.resources})).toBe(true);}
const valid=(w:World)=>expect(validateWorld(w)).toEqual([]);

test('hydroponics research gates construction; ordinary rectangles cannot alter the basin-owned policy',()=>{
  const {w}=fixture(),command={type:'designate' as const,kind:'hydroponics-basin' as const,x:16,z:16,orientation:1 as const,material:'steel' as const};
  expect(canDesignate(w,command)).toEqual({ok:true});delete w.research!.hydroponics;expect(canDesignate(w,command).ok).toBe(false);
  w.research!.hydroponics={points:HYDROPONICS_RESEARCH_COST,completedAt:w.tick};const b=basin(w),before=serializeWorld(w),zone=w.growingZones[0]!;
  expect(applyCommand(w,{type:'area',action:'remove-growing',from:{x:16,z:16},to:{x:16,z:19}}).ok).toBe(false);
  expect(serializeWorld(w)).toBe(before);
  expect(applyCommand(w,{type:'growing-policy',zoneId:zone.id,plant:'corn',allowSow:true,allowCut:true}).ok).toBe(false);
  expect(serializeWorld(w)).toBe(before);
  expect(applyCommand(w,{type:'designate',kind:'uninstall',x:b.x,z:b.z}).ok).toBe(false);valid(w);
});

test('a builder delivers actual steel and a component, builds, then plants on a floored basin',()=>{
  const {w}=fixture();for(let z=16;z<20;z++)w.tiles[z*w.width+16]!.floor='wood-planks';
  addGroundMaterial(w,'steel',100,{x:10,z:16},'steel');addGroundMaterial(w,'component',1,{x:11,z:16},'component');refreshStock(w);
  expect(applyCommand(w,{type:'designate',kind:'hydroponics-basin',x:16,z:16,orientation:0,material:'steel'})).toEqual({ok:true});
  until(w,()=>w.structures.some(s=>s.kind==='hydroponics-basin'));valid(w);
  const b=w.structures.find(s=>s.kind==='hydroponics-basin')!;
  expect(w.growingZones).toHaveLength(1);expect(w.growingZones[0]!.basinId).toBe(b.id);
  expect(w.piles.some(p=>p.item==='steel'||p.item==='component')).toBe(false);until(w,()=>isPowerActive(b));
  until(w,()=>w.resources.filter(r=>r.kind==='rice').length===4);valid(w);
  const restored=deserializeWorld(serializeWorld(w));stepWorld(w,31);stepWorld(restored,31);expect(serializeWorld(restored)).toBe(serializeWorld(w));
});

test('mature basin plants are harvested physically onto free floor outside the basin',()=>{
  const {w}=fixture();const b=basin(w),zone=w.growingZones[0]!;zone.allowSow=false;
  // Explicit crop checkpoint; no full season or natural starting growth claimed.
  w.resources=zone.cells.map(c=>({id:w.nextId++,kind:'rice',x:c%w.width,z:Math.floor(c/w.width),amount:6,growth:1,growthTick:w.tick}));
  valid(w);until(w,()=>w.resources.length===0);valid(w);
  const rice=w.piles.filter(p=>p.item==='rice');expect(rice.reduce((n,p)=>n+p.quantity,0)).toBe(24);
  expect(rice.every(p=>p.owner.type==='ground'&&!zone.cells.includes(p.owner.z*w.width+p.owner.x))).toBe(true);
  expect(w.structures).toContain(b);
});

test('power loss, plant damage and resumed ticks stay exact; destroying the basin removes its crops without harvest',()=>{
  const {w,generator}=fixture(),b=basin(w),zone=w.growingZones[0]!;zone.allowSow=false;
  w.resources=zone.cells.map(c=>({id:w.nextId++,kind:'rice',x:c%w.width,z:Math.floor(c/w.width),amount:6,growth:.5,growthTick:w.tick}));
  generator.power!.switchOn=false;generator.power!.on=false;reconcilePower(w);expect(isPowerActive(b)).toBe(false);
  stepWorld(w,35);expect(w.resources.every(r=>(r.damage??0)>=1)).toBe(true);valid(w);
  const restored=deserializeWorld(serializeWorld(w));stepWorld(w,40);stepWorld(restored,40);expect(serializeWorld(restored)).toBe(serializeWorld(w));
  expect(damageStructure(w,b,10000,'bullet')).toBe(true);expect(w.resources).toEqual([]);expect(w.growingZones).toEqual([]);
  expect(w.piles.some(p=>p.item==='rice')).toBe(false);valid(w);
});

test('admitted deconstruction retires the basin policy and plants and conserves its salvage accounting',()=>{
  const {w}=fixture(),b=basin(w),zone=w.growingZones[0]!;zone.allowSow=false;
  w.resources=[{id:w.nextId++,kind:'rice',x:b.x,z:b.z,amount:6,growth:.3,growthTick:w.tick}];
  expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:b.x,z:b.z})).toEqual({ok:true});
  until(w,()=>!w.structures.includes(b));expect(w.resources).toEqual([]);expect(w.growingZones).toEqual([]);valid(w);
  expect(w.deconstructed.count).toBe(1);
  expect(w.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0)+(w.deconstructed.lostSteel??0)).toBe(100);
  expect(w.piles.filter(p=>p.item==='component').reduce((n,p)=>n+p.quantity,0)+(w.deconstructed.lostComponents??0)).toBe(1);
});
