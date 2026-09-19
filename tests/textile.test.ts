import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld,applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { addGroundMaterial,refreshStock } from '../src/sim/materials';
import { gatherResource } from '../src/sim/gathering';
import { plantGrowth,harvestRoll,harvestable } from '../src/sim/plants';
import { growingLightIntegral } from '../src/sim/environment';
import { availableNutrition } from '../src/sim/items';
import { CropLayer } from '../src/render/CropLayer';
import { writeFileSync } from 'node:fs';
import type { World,Resource } from '../src/sim/types';

function camp():World {
  const w=createWorld(42,16,16);w.resources=[];w.piles=[];w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.pawns=w.pawns.slice(0,1);
  const p=w.pawns[0]!;Object.assign(p,{x:5,z:5,hunger:100,rest:100});p.priorities={patient:0,bedrest:0,doctor:0,gather:0,build:0,mine:0,grow:1,haul:2,cook:0,craft:0};refreshStock(w);return w;
}
function command(w:World,c:Parameters<typeof applyCommand>[1]):void {expect(applyCommand(w,c)).toMatchObject({ok:true});}
function until(w:World,done:()=>boolean,limit=1000):void {for(let i=0;i<limit&&!done();i++)stepWorld(w);expect(done(),`tick ${w.tick}`).toBe(true);expect(validateWorld(w)).toEqual([]);}
const cloth=(w:World)=>w.piles.reduce((n,p)=>n+(p.item==='cloth'?p.quantity:0),0);

test('ordinary grower builds a small camp then grows, harvests, stores and replants six cotton plants over real simulated days',()=>{
  const w=camp(),p=w.pawns[0]!;p.priorities.build=1;addGroundMaterial(w,'wood',140,{x:2,z:5});addGroundMaterial(w,'food',50,{x:2,z:7},'survival-meal');
  for(const [kind,x,z] of [['bed',3,3],['table',3,8],['stool',4,8],['horseshoes',6,3]] as const)command(w,{type:'designate',kind,material:'wood',x,z});
  command(w,{type:'area',action:'growing',from:{x:8,z:5},to:{x:10,z:6}});
  command(w,{type:'growing-policy',zoneId:w.growingZones[0]!.id,plant:'cotton',allowSow:true,allowCut:true});
  command(w,{type:'stockpile',enabled:true,x:12,z:8,filters:{wood:false,food:false,textile:true}});
  const days:object[]=[],initialIds=new Set<number>();let firstHarvest=0,slept=false,ate=false;
  for(let tick=0;tick<120000;tick++){
    stepWorld(w);slept ||= p.state==='sleeping';ate ||= p.state==='eating';
    if(!firstHarvest)for(const r of w.resources)if(r.kind==='cotton')initialIds.add(r.id);
    if(!firstHarvest&&cloth(w))firstHarvest=w.tick;
    if(w.tick%6000===0){expect(validateWorld(w)).toEqual([]);days.push({day:w.tick/6000,food:w.stock.food,cloth:cloth(w),hunger:p.hunger,rest:p.rest,plants:w.resources.length});}
    if(cloth(w)===60&&w.piles.some(i=>i.item==='cloth'&&i.quantity===60&&i.owner.type==='ground'&&i.owner.x===12&&i.owner.z===8)&&w.resources.filter(r=>r.kind==='cotton'&&!initialIds.has(r.id)).length===6)break;
  }
  writeFileSync('artifacts/cotton-colony-v71.json',JSON.stringify({firstHarvest,endTick:w.tick,days,slept,ate,cloth:cloth(w),plants:w.resources.filter(r=>r.kind==='cotton').length,structures:w.structures.map(s=>s.kind)},null,2));
  expect(firstHarvest).toBeGreaterThan(16*6000);expect(firstHarvest).toBeLessThan(20*6000);expect(cloth(w)).toBe(60);expect(initialIds.size).toBe(6);
  expect(w.resources.filter(r=>r.kind==='cotton'&&!initialIds.has(r.id))).toHaveLength(6);expect(w.piles.some(i=>i.item==='cloth'&&i.quantity===60&&i.owner.type==='ground'&&i.owner.x===12&&i.owner.z===8)).toBe(true);
  expect(slept&&ate).toBe(true);expect(p.state).not.toBe('dead');expect(w.structures).toHaveLength(4);expect(validateWorld(w)).toEqual([]);
},30000);

test('cotton growth uses species, fertility, light and saved thermal intervals; harvest transaction refuses a full floor',()=>{
  const w=camp(),cotton:Resource={id:w.nextId++,kind:'cotton' as const,x:8,z:8,amount:10,growth:0,growthTick:0};w.resources=[cotton];
  for(const tick of [1499,3000,6000,17000,48000]){w.tick=tick;expect(plantGrowth(w,cotton)).toBeCloseTo(growingLightIntegral(tick)/48000,12);}
  const grass=plantGrowth(w,cotton);w.tiles[8*16+8]={terrain:'soil'};expect(plantGrowth(w,cotton)).toBeCloseTo(grass*.7,12);
  cotton.growth=.3;cotton.growthTick=w.tick;w.tick+=3000;cotton.growthThermalFactor=0;
  expect(plantGrowth(w,cotton)).toBe(.3);delete cotton.growthThermalFactor;w.roofing={constructed:[8*16+8],build:[],remove:[],cursor:0};expect(plantGrowth(w,cotton)).toBe(.3);w.roofing!.constructed=[];
  cotton.growth=.65;cotton.growthTick=w.tick;expect(harvestable(w,cotton)).toBe(false);expect(gatherResource(w,cotton,'harvest')).toBeNull();
  cotton.growth=.8;const roll=harvestRoll(w,cotton);expect([7,8]).toContain(roll.quantity);
  for(let z=0;z<16;z++)for(let x=0;x<16;x++)addGroundMaterial(w,'wood',75,{x,z});
  const before=serializeWorld(w);expect(gatherResource(w,cotton,'harvest')).toBeNull();expect(serializeWorld(w)).toBe(before);
  w.piles=[];refreshStock(w);expect(gatherResource(w,cotton,'harvest')).toBe(roll.quantity);expect(w.resources).toEqual([]);expect(cloth(w)).toBe(roll.quantity);expect(w.rng).toBe(roll.rng);expect(availableNutrition(w)).toBe(0);expect(w.piles[0]!.rot).toBeUndefined();
});

test('switching an active sow is physical; mature cotton yields cloth, hauling survives interruption and exact replay',()=>{
  const w=camp();command(w,{type:'area',action:'growing',from:{x:6,z:5},to:{x:7,z:5}});const zone=w.growingZones[0]!;
  until(w,()=>w.jobs.some(j=>j.kind==='sow'&&j.progress>0));
  command(w,{type:'growing-policy',zoneId:zone.id,plant:'cotton',allowSow:true,allowCut:true});expect(w.resources).toEqual([]);expect(w.jobs).toEqual([]);
  const before=serializeWorld(w);expect(applyCommand(w,{type:'growing-policy',zoneId:zone.id,plant:'unknown' as 'cotton',allowSow:true,allowCut:true}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  until(w,()=>w.resources.filter(r=>r.kind==='cotton').length===2);
  command(w,{type:'growing-policy',zoneId:zone.id,allowSow:false,allowCut:false});expect(w.growingZones[0]!.plant).toBe('cotton');
  for(const plant of w.resources){plant.growth=1;plant.growthTick=w.tick;}
  command(w,{type:'stockpile',enabled:true,x:10,z:8,filters:{wood:false,food:false,textile:true}});
  const phases=new Map<string,string>();
  until(w,()=>{
    const p=w.pawns[0]!;if(p.haul)phases.set(p.haul.phase,phases.get(p.haul.phase)??serializeWorld(w));
    return !w.resources.length&&cloth(w)===20&&w.piles.every(p=>p.owner.type==='ground'&&p.owner.x===10&&p.owner.z===8);
  });
  expect(w.stock.food).toBe(0);expect([...phases.keys()].sort()).toEqual(['deliver','pickup']);
  for(const saved of phases.values()){const a=deserializeWorld(saved),b=deserializeWorld(saved);stepWorld(a,120);stepWorld(b,120);expect(serializeWorld(a)).toBe(serializeWorld(b));expect(cloth(a)).toBe(20);}
  const interrupted=deserializeWorld(phases.get('deliver')!),p=interrupted.pawns[0]!,beforeCloth=cloth(interrupted);
  command(interrupted,{type:'priority',pawnId:p.id,work:'haul',value:0});expect(p.haul).toBeNull();expect(cloth(interrupted)).toBe(beforeCloth);expect(validateWorld(interrupted)).toEqual([]);
  command(interrupted,{type:'stockpile',enabled:true,x:10,z:8,filters:{wood:false,food:true,textile:false}});command(interrupted,{type:'priority',pawnId:p.id,work:'haul',value:2});stepWorld(interrupted,200);
  expect(cloth(interrupted)).toBe(20);expect(interrupted.piles.some(i=>i.item==='cloth'&&i.owner.type==='ground'&&i.owner.x===10&&i.owner.z===8)).toBe(false);
  // Different existing species survives with cutting disabled; changing policy never transmutes it.
  command(w,{type:'growing-policy',zoneId:zone.id,plant:'cotton',allowSow:true,allowCut:false});until(w,()=>w.resources.length===2);
  const ids=w.resources.map(r=>r.id);command(w,{type:'growing-policy',zoneId:zone.id,plant:'rice',allowSow:true,allowCut:false});stepWorld(w,100);expect(w.resources.map(r=>r.id)).toEqual(ids);expect(w.resources.every(r=>r.kind==='cotton')).toBe(true);
  command(w,{type:'growing-policy',zoneId:zone.id,plant:'rice',allowSow:true,allowCut:true});until(w,()=>w.resources.length===2&&w.resources.every(r=>r.kind==='rice'));expect(cloth(w)).toBe(20);
});

test('V70 is strictly validated before a neutral migration; new plants/items/filters cannot hide in an old save',()=>{
  const w=camp();command(w,{type:'area',action:'growing',from:{x:6,z:5},to:{x:6,z:5}});command(w,{type:'stockpile',enabled:true,x:10,z:8});
  const old=JSON.parse(serializeWorld(w));old.schemaVersion=70;expect(deserializeWorld(JSON.stringify(old))).toEqual(w);
  for(const mutate of [
    (s:World)=>{s.growingZones[0]!.plant='cotton';},
    (s:World)=>{s.resources.push({id:s.nextId++,kind:'cotton',x:7,z:7,amount:10});},
    (s:World)=>{s.stockpiles[0]!.filters.textile=false;},
    (s:World)=>{addGroundMaterial(s,'textile',1,{x:7,z:7},'cloth');},
  ]){const bad=structuredClone(old);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/version 70/);}
  addGroundMaterial(w,'textile',75,{x:7,z:7},'cloth');const saved=serializeWorld(w);expect(deserializeWorld(saved)).toEqual(w);
  for(const mutate of [(s:World)=>{s.piles[0]!.quantity=76;},(s:World)=>{s.piles[0]!.kind='food';},(s:World)=>{s.piles[0]!.rot={progress:0,atTick:s.tick};}]){const bad=JSON.parse(saved);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
});

test('rice and cotton have separate resident shapes, static buffers and stable slots after sow/harvest/reload',()=>{
  const w=camp(),material=new THREE.MeshStandardNodeMaterial({vertexColors:true}),layer=new CropLayer(material);layer.update(w,true);
  const meshes=layer.group.children as THREE.InstancedMesh[],buffers=meshes.map(m=>m.instanceMatrix),geometries=meshes.map(m=>m.geometry);expect(meshes).toHaveLength(2);
  const restore=layer.prepareForCompile();expect(meshes.map(m=>m.count)).toEqual([1,1]);restore();
  w.resources=[{id:w.nextId++,kind:'cotton',x:7,z:7,amount:10,growth:1,growthTick:0},{id:w.nextId++,kind:'rice',x:8,z:7,amount:6,growth:.5,growthTick:0}];
  const saved=serializeWorld(w);layer.update(w,false);expect(meshes.map(m=>m.count)).toEqual([1,1]);expect(serializeWorld(w)).toBe(saved);
  w.resources=[];layer.update(w,false);expect(meshes.map(m=>m.count)).toEqual([0,0]);layer.update(deserializeWorld(saved),true);
  meshes.forEach((m,i)=>{expect(m.instanceMatrix).toBe(buffers[i]);expect(m.geometry).toBe(geometries[i]);expect(m.instanceMatrix.usage).toBe(THREE.StaticDrawUsage);expect(m.instanceColor!.usage).toBe(THREE.StaticDrawUsage);});
  layer.dispose();material.dispose();
});
