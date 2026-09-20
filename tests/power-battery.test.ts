import { expect,test } from 'vitest';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index';
import { miningCamp } from './scenarios/mining';
import { fixturePower } from './scenarios/power';
import { advancePower,reconcilePower } from '../src/sim/power';
import { newPowerState } from '../src/sim/power-rules';
import { BATTERY_CAPACITY,BATTERY_ENERGY_SCALE,chargeBatteries,dischargeBatteries,newBatteryState } from '../src/sim/power-battery';
import { BATTERIES_RESEARCH_COST,SOLAR_POWER_RESEARCH_COST,projectProgress } from '../src/sim/research';
import { validatePower } from '../src/sim/power-save';
import { validateResearch } from '../src/sim/research-save';
import type { Structure,World } from '../src/sim/types';

const wd=(n:number)=>n*BATTERY_ENERGY_SCALE;
function fixture(count=0):World {const w=miningCamp(count);w.structures=[];delete w.arrivals;delete w.raids;delete w.heatwaves;w.research={project:null,points:0,batteries:{points:BATTERIES_RESEARCH_COST,completedAt:0}};return w;}
function battery(w:World,x:number,z:number,stored=0):Structure&{battery:{stored:number}} {
  const s={id:w.nextId++,kind:'battery' as const,x,z,orientation:0 as const,footprint:'standard' as const,material:'steel' as const,power:newPowerState('battery'),battery:{stored}};w.structures.push(s);return s;
}
function powerTicks(w:World,n:number):void {for(let i=0;i<n;i++){w.tick++;advancePower(w);}}
function until(w:World,done:()=>boolean,limit=500):void {for(let i=0;i<limit&&!done();i++)stepWorld(w);expect(done(),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns.map(p=>({state:p.state,job:p.jobId,haul:p.haul})),packed:w.packed})).toBe(true);expect(validateWorld(w)).toEqual([]);}

test('energy sharing redistributes only incoming/outgoing energy at capacity boundaries, conserves quanta and does not equalize idle batteries',()=>{
  const a={id:1,battery:newBatteryState()},b={id:2,battery:{stored:BATTERY_CAPACITY-3}},c={id:3,battery:{stored:40}};
  const initial=a.battery.stored+b.battery.stored+c.battery.stored;
  expect(chargeBatteries([c,b,a],100,1)).toBe(100);
  expect(b.battery.stored).toBe(BATTERY_CAPACITY);
  expect(a.battery.stored+c.battery.stored+b.battery.stored).toBe(initial+100);
  const unequal=structuredClone([a,c]);expect(chargeBatteries([a,c],0,2)).toBe(0);expect([a,c]).toEqual(unequal);
  a.battery.stored=2;c.battery.stored=90;expect(dischargeBatteries([c,a],75,3)).toBe(75);expect(a.battery.stored).toBe(0);expect(c.battery.stored).toBe(17);
  expect(dischargeBatteries([a,c],100,4)).toBe(17);expect(c.battery.stored).toBe(0);
  a.battery.stored=BATTERY_CAPACITY-1;expect(chargeBatteries([a,b],100,5)).toBe(1);
});

test('generation charges at half efficiency while loads and leaks consume exact energy; fuel outage uses batteries and preserves continuation',()=>{
  const w=fixture(),g=fixturePower(w,'wood-generator',8,8),a=battery(w,10,8,wd(60)),b=battery(w,11,8,wd(60)),l=fixturePower(w,'standing-lamp',12,7);
  reconcilePower(w);l.power!.on=true;const before=a.battery.stored+b.battery.stored;
  powerTicks(w,200);
  // 2000 Core boundaries: 970 W surplus at 50% efficiency, minus two 5W leaks.
  expect(a.battery.stored+b.battery.stored-before).toBe((970-20)*2000);
  expect(a.battery.stored).toBe(b.battery.stored);expect(validateWorld(w)).toEqual([]);
  g.fuel!.ticks=0;g.power!.on=false;const charged=a.battery.stored+b.battery.stored;
  const peer=deserializeWorld(serializeWorld(w));powerTicks(w,37);powerTicks(peer,37);expect(peer).toEqual(w);
  expect(l.power!.on).toBe(true);expect(charged-a.battery.stored-b.battery.stored).toBe((60+20)*370);
  const full=fixture(),source=fixturePower(full,'wood-generator',8,8),store=battery(full,10,8,BATTERY_CAPACITY);
  powerTicks(full,3);expect(store.battery.stored).toBe(BATTERY_CAPACITY);expect(source.power!.on).toBe(true);
});

test('battery restart reserve differs from ongoing supply and insufficient energy sheds on the normal boundary',()=>{
  // The 5 Wd buffer gates the batch, not each device a second time. At the
  // exact startup boundary a lamp may draw from the retained energy.
  const edge=fixture();edge.tick=2019;const reserve=battery(edge,10,8,wd(5)+100),bulb=fixturePower(edge,'standing-lamp',12,8);reconcilePower(edge);
  powerTicks(edge,1);expect(bulb.power!.on).toBe(true);expect(reserve.battery.stored).toBe(wd(5)-60);
  const w=fixture(),b=battery(w,10,8,wd(4)),l=fixturePower(w,'standing-lamp',12,8);reconcilePower(w);
  powerTicks(w,40);expect(l.power!.on).toBe(false); // 4 Wd cannot pass the 5 Wd startup reserve.
  l.power!.on=true;powerTicks(w,20);expect(l.power!.on).toBe(true);
  b.battery.stored=wd(6);l.power!.on=false;powerTicks(w,40);expect(l.power!.on).toBe(true);
  b.battery.stored=0;powerTicks(w,2);expect(l.power!.on).toBe(false);expect(b.battery.stored).toBe(0);expect(validateWorld(w)).toEqual([]);
});

test('physical uninstall and relocation retain energy with the same leak while packed or carried, and saves reject future or malformed battery state',()=>{
  const w=fixture(1),p=w.pawns[0]!,b=battery(w,10,10,wd(100));p.x=8;p.z=10;p.schedule.fill('work');p.priorities.build=1;p.priorities.haul=1;p.priorities.craft=0;
  const start=w.tick;
  expect(applyCommand(w,{type:'install',structureId:b.id,x:22,z:10,orientation:1}).ok).toBe(true);
  until(w,()=>w.packed.some(p=>p.building.id===b.id));
  const packed=w.packed.find(p=>p.building.id===b.id)!;expect(packed.building.power).toEqual({on:false,parentId:null});
  expect(packed.building.battery!.stored).toBe(wd(100)-(w.tick-start)*100);
  const peer=deserializeWorld(serializeWorld(w));until(w,()=>w.structures.some(s=>s.id===b.id&&s.x===22));stepWorld(peer,w.tick-peer.tick);expect(peer).toEqual(w);
  const placed=w.structures.find(s=>s.id===b.id)!;expect(placed.orientation).toBe(1);expect(placed.battery!.stored).toBe(wd(100)-(w.tick-start)*100);
  expect(validatePower(w,84)).not.toEqual([]);
  for(const mutate of [(s:Structure)=>s.battery!.stored=-1,(s:Structure)=>s.battery!.stored=BATTERY_CAPACITY+1,(s:Structure)=>s.battery!.stored=.5,(s:Structure)=>delete s.battery,(s:Structure)=>s.power!.switchOn=false,(s:Structure)=>s.power!.on=true]){
    const bad=structuredClone(w);mutate(bad.structures.find(s=>s.id===b.id)!);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
  const legacy=fixture();delete legacy.research;const before=serializeWorld(legacy);powerTicks(legacy,1);expect(legacy.research).toBeUndefined();expect(JSON.parse(before).structures).toEqual(legacy.structures);
});

test('battery and solar research are independent physical projects; pause and switching preserve each progress and pre85 rejects them',()=>{
  const w=fixture(1),p=w.pawns[0]!;delete w.research;p.x=8;p.z=7;p.schedule.fill('work');p.priorities.research=1;
  w.structures.push({id:w.nextId++,kind:'research-bench',x:8,z:8,orientation:0,footprint:'standard',material:'wood'});
  expect(applyCommand(w,{type:'designate',kind:'battery',x:15,z:15,material:'steel'}).ok).toBe(false);
  expect(applyCommand(w,{type:'research-project',project:'batteries'}).ok).toBe(true);until(w,()=>!!w.research?.batteries?.points);
  const points=w.research!.batteries!.points;
  expect(applyCommand(w,{type:'research-project',project:'solar-power'}).ok).toBe(true);until(w,()=>!!w.research?.solarPower?.points);expect(w.research!.batteries!.points).toBe(points);
  expect(projectProgress(w.research!,'solar-power')).toBe(w.research!.solarPower);expect(SOLAR_POWER_RESEARCH_COST).toBe(600_000_000);
  const peer=deserializeWorld(serializeWorld(w));stepWorld(w,17);stepWorld(peer,17);expect(peer).toEqual(w);
  expect(validateResearch(w,84)).not.toEqual([]);
  const solar=w.research!.solarPower!.points;expect(applyCommand(w,{type:'research-project',project:null}).ok).toBe(true);stepWorld(w,9);expect(w.research!.solarPower!.points).toBe(solar);expect(w.research!.points).toBe(0);
});
