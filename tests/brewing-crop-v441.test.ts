import {expect,test} from 'vitest';
import {foodWorkstationCamp} from './scenarios/food-workstations.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import type {Command,World} from '../src/sim/types.ts';

const command=(w:World,c:Command)=>{const result=applyCommand(w,c);expect(result.ok,result.reason).toBe(true);};
function until(w:World,done:()=>boolean,limit=500):void {
  for(let i=0;i<limit&&!done();i++)stepWorld(w);
  expect(done(),JSON.stringify({tick:w.tick,jobs:w.jobs.map(j=>({kind:j.kind,progress:j.progress,status:j.status})),pawn:w.pawns[0]!.state})).toBe(true);
  expect(validateWorld(w)).toEqual([]);
}
const hops=(w:World)=>w.piles.filter(p=>p.item==='hops').reduce((n,p)=>n+p.quantity,0);

test('Plants3 really sows hops; the same crop saves mid-work and yields eight hops after a declared mature harvest checkpoint',()=>{
  // Same controlled field fixture and crop workflow as fodder-farming-v316.
  // The prepared tick jump has no retrospectively simulated exposure.
  const w=foodWorkstationCamp(),p=w.pawns[0]!;
  w.deterioration!.lastTick=w.tick;if(w.fires)w.fires.clockCore=w.tick*10;
  delete p.background;delete p.traits;p.priorities.grow=1;p.priorities.haul=0;
  p.skills.plants={level:3,xp:0,dailyXp:0,passion:0};p.recreation.level=100;
  const cell={x:7,z:4};
  command(w,{type:'area',action:'growing',from:cell,to:cell});const zoneId=w.growingZones.at(-1)!.id;
  command(w,{type:'growing-policy',zoneId,plant:'hops',allowSow:true,allowCut:true});
  expect(w.resources.some(r=>r.kind==='hops')).toBe(false);expect(hops(w)).toBe(0);
  until(w,()=>w.jobs.some(j=>j.kind==='sow'&&j.growingZoneId===zoneId&&j.progress>0));
  const sow=w.jobs.find(j=>j.kind==='sow'&&j.growingZoneId===zoneId)!;
  expect(p.skills.plants.level).toBe(3);expect(p.jobId).toBe(sow.id);
  expect(Math.abs(p.x-cell.x)+Math.abs(p.z-cell.z)).toBeLessThanOrEqual(1);
  expect(p.moveCooldown).toBe(0);expect(p.motion?.end??0).toBeLessThanOrEqual(w.tick);
  const sowSaved=serializeWorld(w),sowReplay=deserializeWorld(sowSaved);
  expect(serializeWorld(sowReplay)).toBe(sowSaved);
  until(w,()=>w.resources.some(r=>r.kind==='hops'));
  stepWorld(sowReplay,w.tick-sowReplay.tick);expect(serializeWorld(sowReplay)).toBe(serializeWorld(w));
  const plant=w.resources.find(r=>r.kind==='hops')!,plantId=plant.id;
  expect(plant).toMatchObject({...cell,kind:'hops',amount:8});expect(plant.growth).toBeLessThan(.01);expect(hops(w)).toBe(0);
  command(w,{type:'growing-policy',zoneId,allowSow:false,allowCut:true});
  // Explicit prepared harvest witness, as in the existing hay test: maturity
  // and Plants8 are supplied here, without claiming five days or earned XP.
  // Plants3 sowing above remains real; full skill avoids selecting a lucky
  // harvest-failure draw merely to force the catalogue's eight-unit yield.
  plant.growth=1;plant.growthTick=w.tick;p.skills.plants.level=8;
  // Let the actual growing-zone provider create its harvest job under Grow.
  until(w,()=>w.jobs.some(j=>j.kind==='harvest'&&j.growingZoneId===zoneId&&j.x===cell.x&&j.z===cell.z&&j.progress>0));
  expect(w.resources.find(r=>r.id===plantId)).toBe(plant);expect(hops(w)).toBe(0);
  expect(Math.abs(p.x-cell.x)+Math.abs(p.z-cell.z)).toBeLessThanOrEqual(1);
  expect(p.moveCooldown).toBe(0);expect(p.motion?.end??0).toBeLessThanOrEqual(w.tick);
  const harvestSaved=serializeWorld(w),harvestReplay=deserializeWorld(harvestSaved);
  expect(serializeWorld(harvestReplay)).toBe(harvestSaved);
  until(w,()=>!w.resources.some(r=>r.id===plantId)&&hops(w)===8);
  stepWorld(harvestReplay,w.tick-harvestReplay.tick);expect(serializeWorld(harvestReplay)).toBe(serializeWorld(w));
  expect(w.resources).not.toContain(plant);expect(w.piles.filter(q=>q.item==='hops')).toHaveLength(1);
  expect(w.piles.find(q=>q.item==='hops')).toMatchObject({kind:'food',quantity:8,owner:{type:'ground'}});
  expect(w.piles.find(q=>q.item==='hops')!.rot).toBeDefined();expect(w.growingZones.find(z=>z.id===zoneId)!.allowSow).toBe(false);
  const final=serializeWorld(w);expect(serializeWorld(deserializeWorld(final))).toBe(final);
});
