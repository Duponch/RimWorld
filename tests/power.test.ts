import { passiveCoolingFixture } from './scenarios/passive-cooling';
import { reconcileTemperature } from '../src/sim/temperature';
import { applyThermalSources } from '../src/sim/thermal-sources';
import { addGroundMaterial } from '../src/sim/materials';
import { PresentationChanges } from '../src/bridge/presentation-changes';
import { expect,test } from 'vitest';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { powerFixture,fixturePower } from './scenarios/power';
import { miningCamp } from './scenarios/mining';
import { PowerTopologyCache,bestPowerParent } from '../src/sim/power-topology';
import { advancePower,reconcilePower } from '../src/sim/power';
import { burnFuel } from '../src/sim/fuel';
import { WorkEnvironmentCache } from '../src/sim/work-environment';
import { constructionRecipe } from '../src/sim/construction-materials';
import { woodAccount } from './scenarios/colony-player';
import type { World } from '../src/sim/types';

function until(w:World,done:()=>boolean,limit=2500) {
  for(let i=0;i<limit&&!done();i++){stepWorld(w);if(i%25===0)expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}
  expect(done(),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns,structures:w.structures,piles:w.piles})).toBe(true);
  expect(validateWorld(w)).toEqual([]);
}

test('physical mixed construction, empty generator, hauling, light, lamp relocation and dismantling preserve ownership and material',()=>{
  const w=powerFixture(),wood=woodAccount(w);
  expect(constructionRecipe({kind:'wood-generator',material:'steel'})).toMatchObject({work:250,ingredients:[{item:'steel',quantity:100},{item:'component',quantity:2}]});
  for(const c of [{kind:'wood-generator',x:16,z:16},{kind:'standing-lamp',x:20,z:16}] as const)
    expect(applyCommand(w,{type:'designate',material:'steel',...c})).toMatchObject({ok:true});
  until(w,()=>w.structures.some(s=>s.kind==='wood-generator'));
  const generator=w.structures.find(s=>s.kind==='wood-generator')!;
  expect(generator.fuel).toEqual({ticks:0,burned:0,autoRefuel:true,burnRemainder:0});
  expect(applyCommand(w,{type:'designate',kind:'uninstall',x:16,z:16}).ok).toBe(false);
  until(w,()=>w.structures.some(s=>s.kind==='standing-lamp'&&s.power?.on));
  const lamp=w.structures.find(s=>s.kind==='standing-lamp')!;
  expect(lamp.power).toEqual({on:true,parentId:generator.id});expect(generator.fuel!.ticks).toBeGreaterThan(0);
  expect(woodAccount(w)).toBe(wood);expect(w.piles.some(p=>p.item==='steel'||p.item==='component')).toBe(false);
  const restored=deserializeWorld(serializeWorld(w));stepWorld(restored,71);const peer=structuredClone(w);stepWorld(peer,71);expect(restored).toEqual(peer);
  // A relocation preserves the actual lamp; it cannot rotate or teleport its connection.
  expect(applyCommand(w,{type:'install',structureId:lamp.id,x:27,z:16,orientation:1}).ok).toBe(false);
  expect(applyCommand(w,{type:'install',structureId:lamp.id,x:27,z:16,orientation:0}).ok).toBe(true);
  until(w,()=>w.packed.some(p=>p.building.id===lamp.id));
  expect(w.packed.find(p=>p.building.id===lamp.id)!.building.power).toEqual({on:false,parentId:null});
  const carried=deserializeWorld(serializeWorld(w));until(w,()=>w.structures.some(s=>s.id===lamp.id&&s.x===27));
  stepWorld(carried,w.tick-carried.tick);expect(carried).toEqual(w);expect(lamp.power).toEqual({on:false,parentId:null});
  expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:16,z:16}).ok).toBe(true);
  until(w,()=>!w.structures.some(s=>s.id===generator.id));
  expect(w.deconstructed.lostSteel).toBe(50);expect(w.deconstructed.lostComponents).toBe(1);
  expect(w.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0)).toBe(50);
  expect(w.piles.filter(p=>p.item==='component').reduce((n,p)=>n+p.quantity,0)).toBe(1);
  expect(woodAccount(w)).toBe(wood);
  // Refuel from every outer face of a 2×2 appliance, not just its anchor.
  for(const [x,z] of [[18,17],[17,18],[15,16],[16,15]]) {
    const side=powerFixture();side.piles=[];side.stock={wood:0,food:0};
    const p=side.pawns[0]!,g=fixturePower(side,'wood-generator',16,16);g.fuel!.ticks=0;
    p.x=x!;p.z=z!;addGroundMaterial(side,'wood',10,p,'wood');
    expect(applyCommand(side,{type:'order-haul',pawnId:p.id,target:{type:'fuel',structureId:g.id},queue:false}).ok).toBe(true);
    until(side,()=>!!p.haul?.serviceProgress,100);const resume=deserializeWorld(serializeWorld(side));
    until(side,()=>g.fuel!.ticks>0,100);stepWorld(resume,side.tick-resume.tick);expect(resume).toEqual(side);
    expect(g.fuel!.ticks+g.fuel!.burned).toBe(6000);
  }
});

test('transmitter connectivity, square connector range, retention, gradual shortage, integer fuel and exact power continuation',()=>{
  const w=miningCamp(0),a=fixturePower(w,'wood-generator',8,8),b=fixturePower(w,'wood-generator',10,8),c=fixturePower(w,'wood-generator',12,10);
  const cache=new PowerTopologyCache();expect(cache.read(w).groups).toEqual([[a.id,b.id],[c.id]]);
  expect(bestPowerParent(cache.read(w),{x:2,z:2})).toBe(a.id); // square diagonal, no circular cutoff
  expect(bestPowerParent(cache.read(w),{x:15,z:2})).toBe(b.id);
  expect(bestPowerParent(cache.read(w),{x:1,z:8})).toBe(null);
  const lamp=fixturePower(w,'standing-lamp',12,7);reconcilePower(w);expect(lamp.power!.parentId).toBe(b.id);
  c.x=12;c.z=5;reconcilePower(w);expect(lamp.power!.parentId).toBe(b.id); // nearer new parent does not steal
  w.structures=w.structures.filter(s=>s!==b);reconcilePower(w);expect(lamp.power).toEqual({on:false,parentId:c.id});
  expect(cache.read(w).groups).toEqual([[a.id],[c.id]]);
  const load=miningCamp(0),source=fixturePower(load,'wood-generator',14,14);
  for(let i=0;i<34;i++)fixturePower(load,'standing-lamp',9+i%7,9+Math.floor(i/7));
  function powerTicks(world:World,n:number){for(let i=0;i<n;i++){world.tick++;advancePower(world);burnFuel(world);}}
  powerTicks(load,600);
  expect(load.structures.filter(s=>s.kind==='standing-lamp'&&s.power!.on)).toHaveLength(33);
  expect(source.fuel!.burned).toBe(1320); // 2.2 wood in a tenth day
  powerTicks(load,5400);expect(source.fuel!.burned).toBe(13200);expect(source.fuel!.ticks).toBe(31800); // exactly 22 wood/day
  powerTicks(load,14455);
  expect(source.power!.on).toBe(false);expect(source.fuel!.ticks).toBe(0);
  const restored=deserializeWorld(serializeWorld(load));powerTicks(load,100);powerTicks(restored,100);expect(restored).toEqual(load);
  expect(load.structures.some(s=>s.power?.on)).toBe(false);
  source.fuel!.ticks=600;powerTicks(load,100);expect(load.structures.filter(s=>s.power?.on).length).toBeGreaterThan(1);
  const phases=new PresentationChanges();expect(phases.capture(load)).toBe(true);
  const switched=structuredClone(load);expect(phases.capture(switched)).toBe(false);switched.structures[1]!.power!.on=!switched.structures[1]!.power!.on;expect(phases.capture(switched)).toBe(true);
  const light=new WorkEnvironmentCache(),night=structuredClone(load);night.tick=0;
  const bright=light.read(night).lightAt(night.structures[1]!);expect(bright).toBe(.5);
  for(const s of night.structures){if(s.power)s.power.on=false;}
  expect(light.read(night).lightAt(night.structures[1]!)).toBeLessThan(bright);
});

test('V41 migrates without devices; malformed electrical ownership, recipes and fuel never load',()=>{
  const old=JSON.parse(serializeWorld(miningCamp()));old.schemaVersion=41;
  expect(deserializeWorld(JSON.stringify(old))).toEqual({...old,schemaVersion:42});
  const w=miningCamp(),g=fixturePower(w,'wood-generator',16,16),l=fixturePower(w,'standing-lamp',20,16);reconcilePower(w);
  expect(validateWorld(w)).toEqual([]);
  for(const mutate of [(v:any)=>v.schemaVersion=41,(v:World)=>v.structures[0]!.fuel!.burnRemainder=5,(v:World)=>v.structures[0]!.fuel!.ticks=45001,(v:World)=>v.structures[0]!.material='wood',(v:World)=>v.structures[0]!.power!.parentId=l.id,(v:World)=>v.structures[1]!.power!.parentId=999,(v:World)=>v.structures[1]!.power={on:true,parentId:null},(v:World)=>v.structures[1]!.orientation=1]) {
    const bad=structuredClone(w);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
  expect(g.fuel!.burned).toBe(0);
  const warm=passiveCoolingFixture(),heat=fixturePower(warm,'wood-generator',16,16),bulb=fixturePower(warm,'standing-lamp',18,16);
  reconcilePower(warm);bulb.power!.on=true;const layout=reconcileTemperature(warm),room=warm.thermal!.regions[0]!;room.temperature=35;
  applyThermalSources(warm,layout);expect(room.temperature).toBe(35+1/16);
  heat.power!.on=false;const stopped=room.temperature;applyThermalSources(warm,layout);expect(room.temperature).toBe(stopped); // powered lamp adds no heat
  heat.power!.on=true;heat.fuel!.ticks=0;applyThermalSources(warm,layout);expect(room.temperature).toBe(stopped);

});
