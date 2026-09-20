import { withoutHunting } from './scenarios/legacy-skills';
import { expect,test } from 'vitest';
import { writeFileSync } from 'node:fs';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld,createWorld } from '../src/sim/index';
import { coolerFaces,coolerFaceBlocked,newCoolerState,advanceCoolers } from '../src/sim/cooler';
import { AIR_CONDITIONING_COST,CLOTHING_RESEARCH_COST } from '../src/sim/research';
import { TemperatureView,reconcileTemperature } from '../src/sim/temperature';
import { powerDemand } from '../src/sim/power-rules';
import { constructionRecipe } from '../src/sim/construction-materials';
import { rotAge } from '../src/sim/food-preservation';
import { deconstructionCamp } from './scenarios/deconstruction';
import { addGroundMaterial,refreshStock } from '../src/sim/materials';
import { constructionSupplied } from '../src/sim/construction-materials';
import { fixturePower } from './scenarios/power';
import { passiveCoolingFixture } from './scenarios/passive-cooling';
import { damageBarrier } from '../src/sim/barriers';
import { blockedCells } from '../src/sim/pathfinding';
import { coldStoreCamp,coldStoreDecisions } from './scenarios/cold-store-player';
import type { Command,World,Structure } from '../src/sim/types';

const command=(w:World,c:Command)=>expect(applyCommand(w,c),JSON.stringify(c)).toMatchObject({ok:true});
function fixture(){const w=passiveCoolingFixture();w.research={project:null,points:0,airConditioning:{points:AIR_CONDITIONING_COST,completedAt:w.tick}};
  const wall=w.structures.find(s=>s.x===16&&s.z===14)!;expect(wall).toBeDefined();
  const s:Structure={...wall,kind:'cooler',material:'steel',power:{on:true,parentId:null},cooler:newCoolerState()};w.structures=w.structures.map(a=>a===wall?s:a);
  const generator=fixturePower(w,'wood-generator',20,14);s.power!.parentId=generator.id;reconcileTemperature(w);return {w,s,generator};}

test('two thermal faces, thermostat, exhaust, obstructions, enclosure and idle load',()=>{
  const {w,s}=fixture(),layout=reconcileTemperature(w),room=w.thermal!.regions.find(r=>r.cells.includes(16*w.width+16))!;
  expect(validateWorld(w)).toEqual([]);expect(blockedCells(w)[s.z*w.width+s.x]).toBe(1);
  room.temperature=30;s.cooler!.target=0;advanceCoolers(w,layout,20);expect(room.temperature).toBeLessThan(30);expect(s.cooler!.high).toBe(true);expect(powerDemand(s)).toBe(200);
  room.temperature=0;advanceCoolers(w,layout,20);expect(s.cooler!.high).toBe(false);expect(powerDemand(s)).toBe(20);
  room.temperature=30;w.tiles[13*w.width+16]={terrain:'rock'};advanceCoolers(w,layout,20);expect(room.temperature).toBe(30);expect(s.cooler!.high).toBe(false);w.tiles[13*w.width+16]={terrain:'grass'};
  for(const orientation of [0,1,2,3] as const){const {cold,hot}=coolerFaces({...s,orientation});expect(Math.abs(cold.x-hot.x)+Math.abs(cold.z-hot.z)).toBe(2);}
  // Controlled two-region oracle: exhaust remains larger than extracted energy,
  // and an enclosed hot side progressively reduces the pump's power.
  const {cold,hot}=coolerFaces(s),coldIndex=cold.z*w.width+cold.x,hotIndex=hot.z*w.width+hot.x;
  const custom={...layout,indices:new Int32Array(w.tiles.length).fill(-1)};custom.indices[coldIndex]=0;custom.indices[hotIndex]=1;
  w.thermal={regions:[{cells:[coldIndex],temperature:20},{cells:[hotIndex],temperature:20}]};advanceCoolers(w,custom,20);
  const removed=20-w.thermal.regions[0]!.temperature;expect(w.thermal.regions[1]!.temperature-20).toBeCloseTo(removed*1.25,8);
  w.thermal.regions[0]!.temperature=20;w.thermal.regions[1]!.temperature=160;advanceCoolers(w,custom,20);expect(s.cooler!.high).toBe(false);
  custom.indices[hotIndex]=0;w.thermal.regions[0]!.temperature=20;advanceCoolers(w,custom,20);expect(w.thermal.regions[0]!.temperature).toBeGreaterThan(20);
  s.power!.on=false;const before=w.thermal.regions[0]!.temperature;advanceCoolers(w,custom,20);expect(w.thermal.regions[0]!.temperature).toBe(before);
});

test('research switching, construction gating, invalid commands, migration and strict saved ownership',()=>{
  const w=coldStoreCamp(),c:Command={type:'designate',kind:'cooler',material:'steel',x:3,z:2,orientation:0};
  expect(applyCommand(w,c).ok).toBe(false);
  command(w,{type:'research-project',project:'complex-clothing'});w.research!.points=123;
  command(w,{type:'research-project',project:'air-conditioning'});w.research!.airConditioning!.points=456;
  command(w,{type:'research-project',project:'complex-clothing'});expect(w.research!.points).toBe(123);expect(w.research!.airConditioning!.points).toBe(456);
  w.research={project:null,points:CLOTHING_RESEARCH_COST,completedAt:0,airConditioning:{points:AIR_CONDITIONING_COST,completedAt:0}};
  for(const x of [NaN,Infinity,-1,.5,w.width]){const before=serializeWorld(w);expect(applyCommand(w,{...c,x}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);}
  command(w,c);expect(constructionRecipe({kind:'cooler',material:'steel'})).toMatchObject({work:160,ingredients:[{item:'steel',quantity:90},{item:'component',quantity:3}]});
  expect(coolerFaceBlocked(w,{x:3,z:2},true)).toBe(true);expect(coolerFaceBlocked(w,{x:3,z:2})).toBe(false);
  expect(applyCommand(w,{type:'designate',kind:'cooler',material:'steel',x:3,z:3}).ok).toBe(false);
  const {w:active,s}=fixture();for(const target of [NaN,Infinity,-274,1001]){const before=serializeWorld(active);expect(applyCommand(active,{type:'cooler-target',structureId:s.id,target}).ok).toBe(false);expect(serializeWorld(active)).toBe(before);}
  command(active,{type:'cooler-target',structureId:s.id,target:-5});stepWorld(active,40);const copy=deserializeWorld(serializeWorld(active));stepWorld(active,100);stepWorld(copy,100);expect(copy).toEqual(active);
  for(const corrupt of [(w:World)=>delete w.structures.find(s=>s.kind==='cooler')!.cooler,(w:World)=>w.structures.find(s=>s.kind==='cooler')!.cooler!.target=Infinity,(w:World)=>delete w.research!.airConditioning]){const bad=structuredClone(active);corrupt(bad);expect(validateWorld(bad).length).toBeGreaterThan(0);}
  const old=JSON.parse(serializeWorld(createWorld(42,16,16)));old.schemaVersion=74;withoutHunting(old);expect(deserializeWorld(JSON.stringify(old)).research).toBeUndefined();
  for(const corrupt of [(w:any)=>w.research={project:null,points:0,airConditioning:{points:0}},(w:any)=>w.pawns[0].health={tick:0,nextInjuryId:1,injuries:[],missing:[],bloodLoss:0,hypothermia:1},(w:any)=>w.structures[0]={id:w.nextId++,kind:'bed',x:0,z:0,orientation:0,footprint:'standard',cooler:{target:21,high:false}}]){const bad=structuredClone(old);corrupt(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/version 74/);}
});

test('a cooler breaches physically and conserves destruction salvage, with deterministic continuation',()=>{
  const {w,s}=fixture();expect(damageBarrier(w,s,99)).toBe(true);expect(s.damage).toBe(99);const copy=deserializeWorld(serializeWorld(w));
  expect(damageBarrier(w,s,1)).toBe(true);expect(damageBarrier(copy,copy.structures.find(b=>b.id===s.id)!,1)).toBe(true);expect(copy).toEqual(w);
  expect(w.structures.some(b=>b.id===s.id)).toBe(false);expect(w.destroyed!.lost.steel!+w.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0)).toBe(90);
  expect(w.destroyed!.lost.component!+w.piles.filter(p=>p.item==='component').reduce((n,p)=>n+p.quantity,0)).toBe(3);expect(validateWorld(w)).toEqual([]);
});

test('player builds and researches a cold store, freezes real provisions, loses power and observes spoilage',()=>{
  const w=coldStoreCamp();let frozenAt=0,outageAt=0,frozenAge=0,measured=false,prepared=false;const actions:{tick:number;reason:string}[]=[];
  for(let i=0;i<65000;i++){
    if(w.tick%50===0)for(const d of coldStoreDecisions(w)){command(w,d.command);actions.push({tick:w.tick,reason:d.reason});}
    stepWorld(w);if(!prepared&&(w.research?.airConditioning?.points??0)>480000000){writeFileSync(`artifacts/cold-store-preparation-v${w.schemaVersion}.json`,serializeWorld(w));prepared=true;}const meals=w.piles.filter(p=>p.item==='simple-meal'),c=w.structures.find(s=>s.kind==='cooler'),g=w.structures.find(s=>s.kind==='wood-generator');
    if(!frozenAt&&c&&meals.reduce((n,p)=>n+p.quantity,0)===20&&meals.every(p=>p.owner.type==='ground'&&p.rot?.rate===0)){
      frozenAt=w.tick;frozenAge=meals.reduce((n,p)=>n+rotAge(p,w.tick)*p.quantity,0);
      writeFileSync(`artifacts/cold-store-checkpoint-v${w.schemaVersion}.json`,serializeWorld(w));
      command(w,{type:'refuel-policy',structureId:g!.id,enabled:false});
    }
    if(frozenAt&&!measured&&w.tick>=frozenAt+1000){expect(meals.reduce((n,p)=>n+rotAge(p,w.tick)*p.quantity,0)).toBe(frozenAge);measured=true;}
    if(frozenAt&&!outageAt&&g?.fuel?.ticks===0)outageAt=w.tick;
    if(w.tick%1000===0)expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);
    if(outageAt&&(w.spoiled['simple-meal']??0)===20)break;
  }
  if(!frozenAt)writeFileSync('tmp/cold-store-failure.json',serializeWorld(w));
  expect(frozenAt).toBeGreaterThan(0);expect(measured).toBe(true);expect(outageAt).toBeGreaterThan(frozenAt);expect(w.spoiled['simple-meal']).toBe(20);expect(w.pawns.every(p=>p.state!=='dead'&&p.state!=='downed')).toBe(true);
  expect(w.piles.filter(p=>p.item==='component').reduce((n,p)=>n+p.quantity,0)).toBe(0);
  expect(w.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0)).toBe(10);expect(validateWorld(w)).toEqual([]);
  writeFileSync(`artifacts/cold-store-player-v${w.schemaVersion}.json`,JSON.stringify({tick:w.tick,frozenAt,outageAt,frozenAge,spoiled:w.spoiled,structures:w.structures.map(s=>s.kind),research:w.research,actions},null,2));
},120000);



test('helpers deliver the full recipe but only Construction 5 finishes; deconstruction returns half and cannot minify',()=>{
  const w=deconstructionCamp(),p=w.pawns[0]!;p.skills.construction.level=4;p.schedule.fill('work');w.tick=2000;
  w.research={project:null,points:0,airConditioning:{points:AIR_CONDITIONING_COST,completedAt:0}};
  addGroundMaterial(w,'steel',75,{x:10,z:16},'steel');addGroundMaterial(w,'steel',15,{x:10,z:17},'steel');addGroundMaterial(w,'component',3,{x:10,z:18},'component');refreshStock(w);
  command(w,{type:'designate',kind:'cooler',material:'steel',x:18,z:16});const job=w.jobs[0]!;
  for(let i=0;i<1000&&!constructionSupplied(w,job);i++)stepWorld(w);
  expect(constructionSupplied(w,job)).toBe(true);stepWorld(w,200);expect(job.progress).toBe(0);expect(w.structures).toHaveLength(0);
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:false})).toMatchObject({ok:false,reason:expect.stringContaining('Construction 5')});
  p.skills.construction.level=5;p.planCooldown=0;command(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:false});
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,600);stepWorld(copy,600);expect(copy).toEqual(w);
  const s=w.structures.find(s=>s.kind==='cooler')!;expect(s).toBeDefined();expect(applyCommand(w,{type:'designate',kind:'uninstall',x:s.x,z:s.z}).ok).toBe(false);
  command(w,{type:'designate',kind:'deconstruct',x:s.x,z:s.z});for(let i=0;i<1500&&w.structures.includes(s);i++)stepWorld(w);
  expect(w.structures.includes(s)).toBe(false);expect(w.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0)).toBe(45);
  expect([1,2]).toContain(w.piles.filter(p=>p.item==='component').reduce((n,p)=>n+p.quantity,0));expect(validateWorld(w)).toEqual([]);
});

test('failed salvage placement keeps the final hit, materials and random stream untouched',()=>{
  const {w,s}=fixture();s.damage=99;
  // Saturated geometric oracle: only the removed appliance cell can receive a
  // pile, so the two incompatible recipe items cannot both be placed.
  w.tiles=w.tiles.map(()=>({terrain:'rock'}));w.tiles[s.z*w.width+s.x]={terrain:'grass'};
  const before=JSON.stringify(w);expect(damageBarrier(w,s,1)).toBe(false);expect(JSON.stringify(w)).toBe(before);
  w.tiles[(s.z-1)*w.width+s.x]={terrain:'grass'};expect(damageBarrier(w,s,1)).toBe(true);
});
