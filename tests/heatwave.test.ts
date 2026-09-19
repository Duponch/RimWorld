import { withoutHunting } from './scenarios/legacy-skills';
import { expect,test } from 'vitest';
import { applyCommand,createWorld,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { HEAT_UNIT,heatStage,heatModifiers,nextHeatSeverity,comfortableTemperature,apparelInsulation } from '../src/sim/heat-rules';
import { heatwaveOffset,enableHeatwaves } from '../src/sim/heatwave';
import { createMedicalRecord,reconcileMedicalDeath,assessMedical } from '../src/sim/injury-state';
import { validateMedicalRecord } from '../src/sim/injury-validation';
import { reconcilePawnHealth } from '../src/sim/health';
import { reconcileTemperature,TemperatureView,outdoorTemperature } from '../src/sim/temperature';
import { newApparelState } from '../src/sim/apparel-rules';
import { passiveCoolingFixture,fixtureCooler } from './scenarios/passive-cooling';
import { refreshStock,addGroundMaterial } from '../src/sim/materials';
import { woodAccount } from './scenarios/colony-player';
import { builtDoorState } from '../src/sim/door-rules';
import type { World,Structure } from '../src/sim/types';
import { writeFileSync } from 'node:fs';
import { heatwaveCamp,heatwaveDecisions } from './scenarios/heatwave-player';
import { fixtureBuilding } from './scenarios/deconstruction';

function until(w:World,done:()=>boolean,max=2000){for(let i=0;i<max&&!done();i++){stepWorld(w);if(i%50===0)expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}expect(done(),`tick ${w.tick}`).toBe(true);expect(validateWorld(w)).toEqual([]);}
function hotRoom(){const w=passiveCoolingFixture();w.tick=4000;const p=w.pawns[0]!;p.x=15;p.z=15;p.schedule.fill('work');p.recreation.level=100;p.hunger=p.rest=100;for(const key in p.priorities)p.priorities[key as keyof typeof p.priorities]=0;w.resources=[];reconcileTemperature(w);w.thermal!.regions[0]!.temperature=100;return w;}

test('heat thresholds, dead band, quality and whole-body consequences remain distinct from armor and treatment',()=>{
  expect(nextHeatSeverity(0,36,26)).toBe(0);expect(nextHeatSeverity(0,36.001,26)).toBe(375000);
  expect(nextHeatSeverity(0,46,26)).toBe(645000);expect(nextHeatSeverity(0,86,26)).toBe(2580000);
  expect(nextHeatSeverity(.4*HEAT_UNIT,26,26)).toBe(.4*HEAT_UNIT);expect(nextHeatSeverity(.4*HEAT_UNIT,35,26)).toBe(.4*HEAT_UNIT);
  expect(nextHeatSeverity(.4*HEAT_UNIT,25.99,26)).toBe(389200000);expect(nextHeatSeverity(1,17,26)).toBe(0);
  for(const [threshold,stage] of [[.04,1],[.2,2],[.35,3],[.62,4]] as const){expect(heatStage(threshold*HEAT_UNIT-1)).toBe(stage-1);expect(heatStage(threshold*HEAT_UNIT)).toBe(stage);}
  const h=createMedicalRecord(0);h.heatstroke=.35*HEAT_UNIT;expect(assessMedical(h).capacities.moving).toBe(.48);expect(heatModifiers(h.heatstroke).pain).toBe(.15);
  h.heatstroke=.62*HEAT_UNIT;expect(assessMedical(h).canBeAwake).toBe(false);h.heatstroke=HEAT_UNIT;reconcileMedicalDeath(h);expect(h.death?.cause).toBe('heatstroke');expect(validateMedicalRecord(h)).toBeNull();expect(validateMedicalRecord(h,true,true,false)).not.toBeNull();
  const w=createWorld(42,16,16),p=w.pawns[0]!;w.piles=[];expect(comfortableTemperature(w,p)).toEqual({min:16,max:26});
  const shirt={id:w.nextId++,kind:'apparel' as const,item:'cloth-shirt' as const,quantity:1,owner:{type:'apparel' as const,pawnId:p.id},apparel:newApparelState('cloth-shirt')};w.piles.push(shirt);
  expect(comfortableTemperature(w,p).max).toBeCloseTo(27.8);shirt.apparel.quality='legendary';expect(apparelInsulation(shirt).heat).toBeCloseTo(3.24);shirt.apparel.hitPoints=1;expect(apparelInsulation(shirt).heat).toBeCloseTo(3.24);
  const tribal={...shirt,item:'cloth-tribalwear' as const,apparel:newApparelState('cloth-tribalwear')};expect(apparelInsulation(tribal)).toEqual({cold:9.9,heat:9.9});
});

test('heatwave envelope, independent calendar, strict migration and exact continuation across onset/end',()=>{
  const w=createWorld(42,16,16);w.pawns=[];const old=JSON.parse(serializeWorld(w));old.schemaVersion=73;withoutHunting(old);expect(deserializeWorld(JSON.stringify(old)).heatwaves).toBeUndefined();
  const oldBad=structuredClone(old);oldBad.heatwaves={};expect(()=>deserializeWorld(JSON.stringify(oldBad))).toThrow(/version 73/);
  const rng=w.rng;enableHeatwaves(w);expect(w.rng).toBe(rng);const s=w.heatwaves!;expect(s.nextAt).toBeGreaterThanOrEqual(36000);expect(s.nextAt).toBeLessThan(42000);
  w.tick=s.nextAt-1;stepWorld(w);const a=s.active!;expect(a.end-a.start).toBeGreaterThanOrEqual(9000);expect(heatwaveOffset(a.start,s)).toBe(0);expect(heatwaveOffset(a.start+600,s)).toBe(8.5);expect(heatwaveOffset(a.start+1200,s)).toBe(17);expect(heatwaveOffset(a.end-600,s)).toBe(8.5);expect(heatwaveOffset(a.end,s)).toBe(0);
  const copy=deserializeWorld(serializeWorld(w));stepWorld(copy,300);stepWorld(w,300);expect(copy).toEqual(w);expect(outdoorTemperature(w)).toBeGreaterThan(outdoorTemperature(w.tick));
  w.tick=a.end-1;stepWorld(w);expect(s.active).toBeUndefined();expect(s.lastEnd).toBe(w.tick);expect(outdoorTemperature(w)).toBe(outdoorTemperature(w.tick));expect(w.events.filter(e=>e.message.startsWith('Canicule'))).toHaveLength(1);
  for(const mutate of [(v:World)=>v.heatwaves!.rng=0,(v:World)=>v.heatwaves!.nextAt=NaN,(v:World)=>v.pawns.push({...createWorld(42,16,16).pawns[0]!,heatRefuge:{target:{x:-1,z:0},until:v.tick}})]){const bad=structuredClone(w);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
});

test('uncooled exposure incapacitates without inventing wounds; real cooler reverses exposure and preserves fuel',()=>{
  const w=hotRoom(),p=w.pawns[0]!,initial=woodAccount(w);p.health=createMedicalRecord(w.tick);p.health.heatstroke=.6199*HEAT_UNIT;
  // Mobilization keeps the patient exposed; falling removes that command.
  expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true}).ok).toBe(true);
  until(w,()=>p.state==='downed',12);expect(p.health!.injuries).toEqual([]);expect(p.draft).toBeUndefined();
  const cooler=fixtureCooler(w),copy=deserializeWorld(serializeWorld(w));stepWorld(copy,100);stepWorld(w,100);expect(copy).toEqual(w);
  until(w,()=>p.state!=='downed'&&!p.health?.heatstroke,2500);expect(new TemperatureView(w).at(w,p)).toBeLessThan(26);expect(cooler.fuel!.burned).toBeGreaterThan(0);
  // The fixture cooler introduces its initial fuel; account for that deliberate input.
  expect(woodAccount(w)).toBe(initial+50);expect(p.health!.death).toBeUndefined();
});

test('civilian physically seeks a reachable cool room, resumes after recovery and revalidates a warmed destination',()=>{
  const w=passiveCoolingFixture(),p=w.pawns[0]!;w.tick=4000;p.x=12;p.z=16;p.schedule.fill('work');p.hunger=p.rest=100;for(const key in p.priorities)p.priorities[key as keyof typeof p.priorities]=0;
  const wall=w.structures.find(s=>s.x===14&&s.z===16)!;wall.kind='door';wall.material='wood';wall.door=builtDoorState(w,wall);fixtureCooler(w);reconcileTemperature(w);w.thermal!.regions.forEach(r=>r.temperature=20);
  enableHeatwaves(w);w.heatwaves!.active={start:w.tick-1200,end:w.tick+10000};w.heatwaves!.serial=1;w.heatwaves!.nextAt=w.tick+220000;
  p.health=createMedicalRecord(w.tick);p.health.heatstroke=.4*HEAT_UNIT;reconcilePawnHealth(w,p);const origin={x:p.x,z:p.z};refreshStock(w);
  until(w,()=>!!p.heatRefuge,60);expect({x:p.x,z:p.z}).toEqual(origin);const goal={...p.heatRefuge!.target};
  const blocked=deserializeWorld(serializeWorld(w));const door=blocked.structures.find(s=>s.id===wall.id)!;door.kind='wall';delete door.door;delete blocked.pawns[0]!.heatRefuge;blocked.pawns[0]!.path=[];blocked.pawns[0]!.state='idle';blocked.pawns[0]!.planCooldown=0;stepWorld(blocked,60);expect(blocked.pawns[0]!.heatRefuge).toBeUndefined();expect(blocked.pawns[0]).toMatchObject(origin);expect(validateWorld(blocked)).toEqual([]);
  const drafted=deserializeWorld(serializeWorld(w));expect(applyCommand(drafted,{type:'draft',pawnIds:[p.id],enabled:true}).ok).toBe(true);expect(drafted.pawns[0]!.heatRefuge).toBeUndefined();expect(validateWorld(drafted)).toEqual([]);
  const warmed=deserializeWorld(serializeWorld(w));warmed.thermal!.regions.forEach(r=>r.temperature=100);warmed.structures.filter(s=>s.kind==='passive-cooler').forEach(s=>{s.fuel!.ticks=0;s.fuel!.autoRefuel=false;});stepWorld(warmed);expect(warmed.pawns[0]!.heatRefuge).toBeUndefined();expect(warmed.pawns[0]!.x).toBe(origin.x);
  const hands=deserializeWorld(serializeWorld(w)),disabled=hands.pawns[0]!;disabled.health!.missing=[{part:'left-hand',bornAt:0,tended:true},{part:'right-hand',bornAt:0,tended:true}];reconcilePawnHealth(hands,disabled);expect(assessMedical(disabled.health!).capacities.manipulation).toBe(0);expect(disabled.heatRefuge).toBeDefined();expect(validateWorld(hands)).toEqual([]);until(hands,()=>!disabled.health?.heatstroke&&!disabled.heatRefuge,1500);
  const saved=deserializeWorld(serializeWorld(w));stepWorld(saved,40);stepWorld(w,40);expect(saved).toEqual(w);
  until(w,()=>!p.health?.heatstroke&&!p.heatRefuge,1500);expect(new TemperatureView(w).at(w,p)).toBeLessThan(26);expect(p.motion?.to??p).toMatchObject(goal);
  const corrupt=JSON.parse(serializeWorld(w));corrupt.pawns[0].heatRefuge={target:goal,until:w.tick+50};corrupt.pawns[0].orders.active='equipment';expect(()=>deserializeWorld(JSON.stringify(corrupt))).toThrow();
});

test('a heatstroke patient is physically rescued into a cooled medical bed and recovers without medicine',()=>{
  const w=passiveCoolingFixture(),doctor=w.pawns[0]!;w.tick=4000;doctor.x=12;doctor.z=16;doctor.priorities.doctor=1;doctor.priorities.build=doctor.priorities.haul=0;
  const wall=w.structures.find(s=>s.x===14&&s.z===16)!;wall.kind='door';wall.material='wood';wall.door=builtDoorState(w,wall);
  fixtureCooler(w);const bed:Structure=fixtureBuilding(w,'bed',17,15);bed.medical=true;reconcileTemperature(w);w.thermal!.regions.forEach(r=>r.temperature=20);
  enableHeatwaves(w);w.heatwaves!.active={start:2800,end:14000};w.heatwaves!.serial=1;w.heatwaves!.nextAt=220000;
  const patient=structuredClone(doctor);patient.id=w.nextId++;patient.name='Patient thermique';patient.x=11;patient.z=16;patient.priorities.doctor=0;patient.health=createMedicalRecord(w.tick);patient.health.heatstroke=.7*HEAT_UNIT;w.pawns.push(patient);reconcilePawnHealth(w,patient);
  expect(patient.state).toBe('downed');const initial=woodAccount(w);expect(applyCommand(w,{type:'order-rescue',pawnId:doctor.id,patientId:patient.id,queue:false}).ok).toBe(true);
  until(w,()=>doctor.rescue?.phase==='carry'&&doctor.moveCooldown>0,1000);const copy=deserializeWorld(serializeWorld(w));stepWorld(copy,20);stepWorld(w,20);expect(copy).toEqual(w);
  until(w,()=>w.events.some(e=>e.message.includes(`a installé ${patient.name}`)),1000);
  until(w,()=>patient.state!=='downed'&&!patient.health?.heatstroke,2000);expect(patient.health!.injuries).toEqual([]);expect(patient.health!.death).toBeUndefined();expect(woodAccount(w)).toBe(initial);
});

test('expedition builds and supplies a refuge, lives through a naturally scheduled heatwave, then resumes',()=>{
  const w=heatwaveCamp(),initial=woodAccount(w);let peak=0,exposure=0,slept=false,ate=false,checkpoint=false,first=-1;const samples:unknown[]=[];
  for(let n=0;n<65000&&!w.heatwaves?.lastEnd;n++){
    if(n%200===0)for(const d of heatwaveDecisions(w))expect(applyCommand(w,d.command),d.reason).toMatchObject({ok:true});
    stepWorld(w);peak=Math.max(peak,outdoorTemperature(w));exposure=Math.max(exposure,...w.pawns.map(p=>p.health?.heatstroke??0));slept ||= w.pawns.some(p=>p.state==='sleeping');ate ||= w.pawns.some(p=>p.state==='eating');
    if(w.heatwaves?.active&&first<0){first=w.tick;expect(w.structures.some(s=>s.kind==='passive-cooler'&&s.fuel!.ticks>0)).toBe(true);expect(w.thermal?.regions.some(r=>r.cells.length===16&&r.temperature<26)).toBe(true);}
    if(!checkpoint&&w.heatwaves?.active&&exposure>=.04*HEAT_UNIT){writeFileSync('artifacts/heatwave-checkpoint-v74.json',serializeWorld(w));checkpoint=true;}
    if(n%1000===0){expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);expect(woodAccount(w)).toBe(initial);samples.push({tick:w.tick,outside:outdoorTemperature(w),air:w.thermal?.regions.map(r=>r.temperature),health:w.pawns.map(p=>({id:p.id,state:p.state,heat:p.health?.heatstroke??0}))});}
  }
  expect(w.heatwaves?.lastEnd).toBeDefined();expect(peak).toBeGreaterThan(44);expect(exposure).toBeGreaterThan(0);expect(ate&&slept).toBe(true);expect(w.pawns.every(p=>p.state!=='dead'&&p.state!=='downed')).toBe(true);expect(checkpoint).toBe(true);
  const copy=deserializeWorld(serializeWorld(w));stepWorld(copy,600);stepWorld(w,600);expect(copy).toEqual(w);expect(w.pawns.every(p=>!p.health?.heatstroke)).toBe(true);expect(woodAccount(w)).toBe(initial);
  writeFileSync('artifacts/heatwave-colony-v74.json',JSON.stringify({first,end:w.tick,calendar:w.heatwaves,peak,exposure:exposure/HEAT_UNIT,ate,slept,wood:woodAccount(w),coolers:w.structures.filter(s=>s.kind==='passive-cooler'),samples},null,2));
},30000);
