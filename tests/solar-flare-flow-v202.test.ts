import { expect,test } from 'vitest';
import { prepareSolarFlareDemo,SOLAR_FLARE_FUTURE_RNG,SOLAR_FLARE_START } from './helpers/solar-flare-v202-fixture.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { isPowerActive,newPowerState } from '../src/sim/power-rules.ts';
import { batteryQuanta,BATTERY_LEAK_PER_CORE_TICK } from '../src/sim/power-battery.ts';
import { plantGrowth } from '../src/sim/plants.ts';
import { rotAge } from '../src/sim/food-preservation.ts';
import { TemperatureView } from '../src/sim/temperature.ts';
import { addGroundMaterial,refreshStock } from '../src/sim/materials.ts';
import { MICROELECTRONICS_RESEARCH_COST } from '../src/sim/research.ts';
import { solarFlareInspection,powerInspection } from '../src/ui/power-inspection.ts';
import type { Command,Structure,StructureKind,World } from '../src/sim/types.ts';

function command(w:World,c:Command):void {expect(applyCommand(w,c),JSON.stringify(c)).toMatchObject({ok:true});}
function until(w:World,done:()=>boolean,max=1600):void {
  for(let n=0;n<max&&!done();n++)stepWorld(w);
  expect(done(),`tick ${w.tick}: ${JSON.stringify(w.pawns.map(p=>({task:p.cooking,research:p.research,state:p.state})))}`).toBe(true);
  expect(validateWorld(w)).toEqual([]);
}
const structure=(w:World,kind:StructureKind)=>w.structures.find(s=>s.kind===kind)!;

test('prepared future World opportunity truly begins, sheds, freezes transfers/growth, ages food and recovers after exact resume',()=>{
  const w=prepareSolarFlareDemo(),lamp=structure(w,'sun-lamp'),cooler=structure(w,'cooler'),battery=structure(w,'battery');
  expect(w.tick).toBe(SOLAR_FLARE_START-1);expect(w.worldIncidents!.active).toBeUndefined();
  expect(isPowerActive(lamp)&&isPowerActive(cooler)).toBe(true);
  stepWorld(w);expect(w.worldIncidents!.active).toEqual({start:SOLAR_FLARE_START,endCore:SOLAR_FLARE_START*10+9000});
  expect(isPowerActive(lamp)).toBe(true); // Start follows this tick's electrical boundaries.
  until(w,()=>['sun-lamp','cooler','standing-lamp','electric-tailor-bench'].every(kind=>!isPowerActive(structure(w,kind as StructureKind))),30);
  const offTick=w.tick,held=w.resources.map(r=>({id:r.id,growth:plantGrowth(w,r)})),stored=batteryQuanta(battery.battery!);
  const food=w.piles.find(p=>p.item==='rice')!,age=rotAge(food,w.tick),temperature=new TemperatureView(w).at(w,food.owner as {x:number;z:number});
  const burned=structure(w,'wood-generator').fuel!.burned;
  const saved=deserializeWorld(serializeWorld(w));stepWorld(w,60);stepWorld(saved,60);
  expect(saved).toEqual(w);expect(batteryQuanta(battery.battery!)).toBe(stored-60*10*BATTERY_LEAK_PER_CORE_TICK);
  for(const crop of w.resources)expect(plantGrowth(w,crop)).toBe(held.find(r=>r.id===crop.id)!.growth);
  expect(rotAge(food,w.tick)).toBeGreaterThan(age);expect(new TemperatureView(w).at(w,food.owner as {x:number;z:number})).toBeGreaterThan(temperature);
  expect(structure(w,'wood-generator').fuel!.burned).toBeGreaterThan(burned);
  expect(solarFlareInspection(w,battery)).toContain('autodécharge normale');expect(powerInspection(w,lamp)).toContain('redémarrage suspendu');
  expect(solarFlareInspection(w,structure(w,'wood-generator'))).toContain('le bois continue de brûler');
  const fuel=structure(w,'wood-generator').fuel!.ticks;
  // Last exact boundary is still active; no synthetic end or global restart.
  stepWorld(w,SOLAR_FLARE_START+900-w.tick);expect(w.worldIncidents!.active).toBeDefined();expect(isPowerActive(lamp)).toBe(false);
  const heldAtEnd=plantGrowth(w,w.resources[0]!);stepWorld(w);expect(w.worldIncidents!.active).toBeUndefined();
  expect(w.worldIncidents!.lastEndCore).toBe(SOLAR_FLARE_START*10+9000);
  until(w,()=>isPowerActive(lamp)&&isPowerActive(cooler),150);
  expect(plantGrowth(w,w.resources[0]!)).toBeCloseTo(heldAtEnd,12);
  const resumed=deserializeWorld(serializeWorld(w)),recoveryAge=rotAge(food,w.tick);stepWorld(w,40);stepWorld(resumed,40);
  expect(resumed).toEqual(w);expect(plantGrowth(w,w.resources[0]!)).toBeGreaterThan(heldAtEnd);
  expect(rotAge(food,w.tick)).toBeGreaterThanOrEqual(recoveryAge);expect(structure(w,'wood-generator').fuel!.ticks).toBeLessThan(fuel);
  expect(lamp.power!.switchOn).not.toBe(false);expect(lamp.power!.parentId).not.toBeNull();expect(validateWorld(w)).toEqual([]);
  expect(offTick).toBeGreaterThan(SOLAR_FLARE_START);
});

test('electric tailoring retains real author/material work and proceeds manually at half rate during a real flare',()=>{
  const w=prepareSolarFlareDemo(),p=w.pawns[0]!,bench=structure(w,'electric-tailor-bench');
  w.worldIncidents!.rng=42;p.x=20;p.z=21;p.skills.crafting={level:8,xp:0,dailyXp:0,passion:0};
  addGroundMaterial(w,'textile',60,{x:20,z:21},'cloth');refreshStock(w);
  command(w,{type:'priority',pawnId:p.id,work:'craft',value:1});command(w,{type:'bill-add',structureId:bench.id,recipe:'tribalwear'});
  const bill=bench.bills![0]!;command(w,{type:'bill-update',structureId:bench.id,billId:bill.id,settings:{...bill,destination:'drop'}});
  until(w,()=>p.cooking?.phase==='work');const unfinished=w.piles.find(p=>p.unfinished)!,id=unfinished.id;
  const before=unfinished.unfinished!.progress;stepWorld(w);const powered=unfinished.unfinished!.progress-before;expect(powered).toBeGreaterThan(0);
  w.worldIncidents!.rng=SOLAR_FLARE_FUTURE_RNG;until(w,()=>!!w.worldIncidents!.active&& !isPowerActive(bench),150);
  expect(w.piles.find(p=>p.unfinished)!.id).toBe(id);expect(p.cooking?.phase).toBe('work');
  const off=unfinished.unfinished!.progress;stepWorld(w);expect(unfinished.unfinished!.progress-off).toBe(Math.round(powered/2));
  expect(p.x).toBe(20);expect(p.z).toBe(21);expect(unfinished.unfinished!.authorId).toBe(p.id);
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,80);stepWorld(copy,80);expect(copy).toEqual(w);
  expect(w.piles.filter(p=>p.item==='cloth').reduce((n,p)=>n+p.quantity,0)+60).toBe(90);
  until(w,()=>w.piles.some(p=>p.item==='cloth-tribalwear'&&p.owner.type==='ground'),1200);
  expect(w.tailoring?.completed).toBe(1);expect(w.piles.filter(p=>p.item==='cloth').reduce((n,p)=>n+p.quantity,0)).toBe(30);
  expect(w.piles.some(p=>p.unfinished)).toBe(false);expect(w.worldIncidents!.active).toBeDefined();
});

test('actual electric kitchen and research pause without eating raw escrow or spending progress, then recover with real output',()=>{
  const w=prepareSolarFlareDemo();w.worldIncidents!.rng=42;
  w.structures=w.structures.filter(s=>s.kind!=='research-bench');
  function add(kind:StructureKind,x:number,z:number):Structure {const s:Structure={id:w.nextId++,kind,x,z,orientation:0,footprint:'standard',material:'steel',power:newPowerState(kind),...(kind==='electric-stove'?{bills:[]}: {})};w.structures.push(s);return s;}
  for(let z=17;z<=24;z++)add('power-conduit',20,z);
  const stove=add('electric-stove',20,19),bench=add('hi-tech-research-bench',22,25);
  w.research!.microelectronics={points:MICROELECTRONICS_RESEARCH_COST,completedAt:w.tick};
  const cook=w.pawns[0]!,scientist=w.pawns[1]!;cook.x=20;cook.z=18;scientist.x=22;scientist.z=24;
  cook.skills.cooking={level:0,xp:0,dailyXp:0,passion:0};scientist.skills.intellectual={level:8,xp:0,dailyXp:0,passion:0};
  addGroundMaterial(w,'food',40,{x:20,z:18},'rice');refreshStock(w);
  command(w,{type:'priority',pawnId:cook.id,work:'cook',value:1});command(w,{type:'priority',pawnId:scientist.id,work:'research',value:1});
  command(w,{type:'research-project',project:'solar-power'});command(w,{type:'bill-add',structureId:stove.id,recipe:'cook-simple-meal-bulk'});
  const bill=stove.bills![0]!;command(w,{type:'bill-update',structureId:stove.id,billId:bill.id,settings:{...bill,destination:'drop'}});
  until(w,()=>!!cook.cooking?.progress&&scientist.research?.stationId===bench.id,250);
  const rice=()=>w.piles.filter(p=>p.item==='rice').reduce((n,p)=>n+p.quantity,0);expect(rice()).toBe(50);
  w.worldIncidents!.rng=SOLAR_FLARE_FUTURE_RNG;until(w,()=>!!w.worldIncidents!.active&&!isPowerActive(stove)&&!isPowerActive(bench),150);
  expect(rice()).toBe(50);expect(w.piles.some(p=>p.item==='simple-meal')).toBe(false);
  const points=w.research!.solarPower!.points;stepWorld(w,70);expect(w.research!.solarPower!.points).toBe(points);expect(rice()).toBe(50);
  expect(cook.cooking).toBeNull();expect(scientist.research).toBeUndefined();
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,30);stepWorld(copy,30);expect(copy).toEqual(w);
  until(w,()=>!w.worldIncidents!.active,1000);until(w,()=>w.piles.some(p=>p.item==='simple-meal'&&p.owner.type==='ground'),550);
  expect(w.piles.filter(p=>p.item==='simple-meal').reduce((n,p)=>n+p.quantity,0)).toBe(4);expect(rice()).toBe(10);
  expect(w.research!.solarPower!.points).toBeGreaterThan(points);expect(stove.bills![0]!.target).toBe(0);expect(validateWorld(w)).toEqual([]);
});
