import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { applyCommand,createWorld,deserializeWorld,serializeWorld,stepWorld,validateWorld } from '../src/sim/index';
import { PLANT_DEFINITIONS,plantGrowth,harvestable,harvestRoll } from '../src/sim/plants';
import { CROP_KINDS } from '../src/sim/crops';
import { growingLightIntegral } from '../src/sim/environment';
import { gatherResource } from '../src/sim/gathering';
import { addGroundMaterial,addMaterial,refreshStock } from '../src/sim/materials';
import { ROT_DAYS,rotAge,spoiledUnits,ticksUntilRot } from '../src/sim/food-preservation';
import { expireFood } from '../src/sim/food-expiration';
import { foodScore } from '../src/sim/food-selection';
import { CropLayer } from '../src/render/CropLayer';
import { TICKS_PER_DAY,type Command,type Resource,type World } from '../src/sim/types';

function field():World {
  const w=createWorld(42,16,16);w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.structures=[];w.jobs=[];
  w.pawns=w.pawns.slice(0,1);const p=w.pawns[0]!;Object.assign(p,{x:5,z:5,hunger:100,rest:100,foodPolicyId:4});
  p.priorities={warden:0,basic:3,hunt:0,research:0,patient:0,bedrest:0,doctor:0,gather:0,build:0,mine:0,grow:1,haul:2,cook:0,craft:0};refreshStock(w);return w;
}
const command=(w:World,c:Command)=>expect(applyCommand(w,c)).toMatchObject({ok:true});
function until(w:World,done:()=>boolean,limit=1800):void {
  for(let i=0;i<limit&&!done();i++)stepWorld(w);
  expect(done(),`tick ${w.tick}`).toBe(true);expect(validateWorld(w)).toEqual([]);
}
const units=(w:World,item:'potato'|'corn'|'simple-meal')=>w.piles.reduce((n,p)=>n+(p.item===item?p.quantity:0),0);

test('food crops integrate real light and distinct soil sensitivity; maturity and saturated harvest retain exact continuation',()=>{
  const w=field();w.pawns=[];
  const plants:Resource[]=(['potato','corn'] as const).flatMap((kind,z)=>(['gravel','grass','rich-soil'] as const).map((terrain,x)=>{
    w.tiles[(z+6)*16+x+6]={terrain};return {id:w.nextId++,kind,x:x+6,z:z+6,amount:PLANT_DEFINITIONS[kind].yield,growth:0,growthTick:0};
  }));w.resources=plants;
  // Clock-only integration oracle, not a claim of six days of colony gameplay.
  w.tick=6*TICKS_PER_DAY;
  const factors=[.88,1,1.16,.7,1,1.4];
  plants.forEach((p,i)=>expect(plantGrowth(w,p)).toBeCloseTo(growingLightIntegral(w.tick)/(PLANT_DEFINITIONS[p.kind as 'potato'|'corn'].growDays*TICKS_PER_DAY)*factors[i]!,12));
  expect(plants.every(p=>plantGrowth(w,p)<1)).toBe(true);
  const potato=plants[1]!;potato.growth=plantGrowth(w,potato);potato.growthTick=w.tick;potato.growthThermalFactor=.5;
  const saved=serializeWorld(w),resumed=deserializeWorld(saved);w.tick+=TICKS_PER_DAY;resumed.tick=w.tick;
  expect(plantGrowth(resumed,resumed.resources[1]!)).toBe(plantGrowth(w,potato));expect(serializeWorld(resumed)).toBe(serializeWorld(w));
  w.roofing={constructed:[potato.z*16+potato.x],build:[],remove:[],cursor:0};expect(plantGrowth(w,potato)).toBe(potato.growth);delete w.roofing;
  for(const kind of ['potato','corn'] as const) {
    const r=plants.find(p=>p.kind===kind)!;r.growth=.65;r.growthTick=w.tick;
    expect(harvestable(w,r)).toBe(false);expect(gatherResource(w,r,'harvest')).toBeNull();r.growth=.81;
    const roll=harvestRoll(w,r);for(let z=0;z<16;z++)for(let x=0;x<16;x++)addGroundMaterial(w,'wood',75,{x,z});
    const blocked=serializeWorld(w);expect(gatherResource(w,r,'harvest')).toBeNull();expect(serializeWorld(w)).toBe(blocked);
    w.piles=[];refreshStock(w);expect(gatherResource(w,r,'harvest')).toBe(roll.quantity);expect(units(w,kind)).toBe(roll.quantity);
    expect(w.piles.every(p=>p.item===kind)).toBe(true);expect(w.rng).toBe(roll.rng);w.piles=[];refreshStock(w);
  }
});

test('player sowing, protected species switch, physical harvest and separate storage survive a carried checkpoint',()=>{
  const w=field();
  for(const [kind,z] of [['potato',5],['corn',7]] as const) {
    command(w,{type:'area',action:'growing',from:{x:7,z},to:{x:8,z}});
    command(w,{type:'growing-policy',zoneId:w.growingZones.at(-1)!.id,plant:kind,allowSow:true,allowCut:true});
  }
  until(w,()=>w.resources.length===4);
  expect(w.resources.filter(p=>p.kind==='potato')).toHaveLength(2);expect(w.resources.filter(p=>p.kind==='corn')).toHaveLength(2);
  const zone=w.growingZones[0]!,identities=w.resources.map(p=>p.id);
  command(w,{type:'growing-policy',zoneId:zone.id,plant:'corn',allowSow:true,allowCut:false});stepWorld(w,30);
  expect(w.resources.map(p=>p.id)).toEqual(identities);expect(w.resources.filter(p=>p.kind==='potato')).toHaveLength(2);
  for(const z of w.growingZones)command(w,{type:'growing-policy',zoneId:z.id,allowSow:false,allowCut:true});
  // Mature checkpoint isolates harvesting/hauling; long colony cycles are central.
  for(const p of w.resources){p.growth=1;p.growthTick=w.tick;}
  for(const x of [11,12])command(w,{type:'stockpile',enabled:true,x,z:8,filters:{wood:false,food:true}});
  let carried:string|undefined;
  until(w,()=>{
    if(w.pawns[0]!.haul?.phase==='deliver')carried??=serializeWorld(w);
    return !w.resources.length&&units(w,'potato')===22&&units(w,'corn')===44&&w.piles.every(p=>p.owner.type==='ground'&&p.owner.z===8&&p.owner.x>=11);
  });
  expect(w.piles).toHaveLength(2);expect(w.piles.every(p=>p.rot&&p.quantity<=75)).toBe(true);expect(carried).toBeDefined();
  const a=deserializeWorld(carried!),b=deserializeWorld(carried!);stepWorld(a,500);stepWorld(b,500);expect(serializeWorld(a)).toBe(serializeWorld(b));
  expect(units(a,'potato')).toBe(22);expect(units(a,'corn')).toBe(44);
  command(w,{type:'growing-policy',zoneId:zone.id,plant:'potato',allowSow:true,allowCut:true});
  until(w,()=>w.resources.filter(p=>p.kind==='potato').length===2);expect(w.resources.every(p=>!identities.includes(p.id))).toBe(true);
});

test('new ingredients cook under their bill filters, raw food requires pickup and ingestion, and spoilage preserves type and age',()=>{
  const w=field(),p=w.pawns[0]!;p.priorities.grow=0;p.priorities.haul=0;p.priorities.cook=1;
  const station={id:w.nextId++,kind:'campfire' as const,x:7,z:7,orientation:0 as const,footprint:'standard' as const,fuel:{ticks:12000,burned:0,autoRefuel:false},bills:[] as import('../src/sim/cooking-types').CookingBill[]};w.structures=[station];
  addGroundMaterial(w,'food',4,{x:6,z:5},'potato');addGroundMaterial(w,'food',6,{x:6,z:6},'corn');
  command(w,{type:'bill-add',structureId:station.id});until(w,()=>units(w,'simple-meal')===1);
  expect(units(w,'potato')+units(w,'corn')).toBe(0);expect(p.foodPolicyId).toBe(4);expect(p.memories.some(m=>m.kind==='ate-raw-food')).toBe(false);
  const raw=field(),eater=raw.pawns[0]!;eater.priorities.grow=0;eater.priorities.haul=0;eater.hunger=20;
  addGroundMaterial(raw,'food',20,{x:6,z:5},'potato');
  stepWorld(raw,5);expect(eater.need?.kind).not.toBe('eat');
  command(raw,{type:'food-policy-update',policyId:4,name:'Pommes de terre',allowed:['potato']});
  until(raw,()=>eater.need?.kind==='eat'&&eater.need.phase==='ingest'&&eater.need.progress===1);
  expect(eater.hunger).toBeLessThan(20);expect(raw.piles.some(q=>q.item==='potato'&&q.owner.type==='pawn')).toBe(true);
  until(raw,()=>eater.memories.some(m=>m.kind==='ate-raw-food'));expect(eater.hunger).toBeGreaterThan(80);
  expect(foodScore('potato',2)).toBe(foodScore('rice',2));expect(foodScore('corn',2)).toBe(foodScore('rice',2));
  const store=field();store.pawns=[];addGroundMaterial(store,'food',20,{x:6,z:5},'potato');addGroundMaterial(store,'food',20,{x:7,z:5},'corn');
  const old=store.piles[0]!;store.tick=TICKS_PER_DAY;const before=rotAge(old,store.tick);addMaterial(store,'food',20,old.owner,'potato');
  expect(old.quantity).toBe(40);expect(rotAge(old,store.tick)).toBe(before/2);
  store.tick=ROT_DAYS.potato*TICKS_PER_DAY+TICKS_PER_DAY/2;expect(ticksUntilRot(old,store.tick)).toBe(0);expireFood(store);refreshStock(store);
  expect(units(store,'potato')).toBe(0);expect(units(store,'corn')).toBe(20);expect(store.spoiled.potato).toBe(40);
  store.tick=ROT_DAYS.corn*TICKS_PER_DAY;expireFood(store);refreshStock(store);expect(store.spoiled.corn).toBe(20);expect(spoiledUnits(store)).toBe(60);
  expect(deserializeWorld(serializeWorld(store))).toEqual(store);
});

test('V83 cannot hide future crop data; valid historical policies stay exact and four resident shapes never mutate the world',()=>{
  const w=field();command(w,{type:'area',action:'growing',from:{x:7,z:7},to:{x:7,z:7}});
  const old=JSON.parse(serializeWorld(w));old.schemaVersion=83;for(const p of old.pawns){delete p.priorities.basic;delete p.priorities.warden;}
  for(const policy of old.foodPolicies)policy.allowed=policy.allowed.filter((id:string)=>id!=='potato'&&id!=='corn');
  const migrated=deserializeWorld(JSON.stringify(old));expect(migrated.foodPolicies).toEqual(old.foodPolicies);expect(migrated.spoiled).toEqual(old.spoiled);
  expect(migrated.resources).toEqual(old.resources);expect(migrated.rng).toBe(old.rng);expect(migrated.growingZones).toEqual(old.growingZones);
  for(const kind of ['potato','corn'] as const)for(const mutate of [
    (s:World)=>{s.growingZones[0]!.plant=kind;},
    (s:World)=>{s.resources.push({id:s.nextId++,kind,x:8,z:8,amount:PLANT_DEFINITIONS[kind].yield,growth:.1,growthTick:s.tick});},
    (s:World)=>{addGroundMaterial(s,'food',1,{x:8,z:8},kind);},
    (s:World)=>{s.foodPolicies[0]!.allowed.push(kind);},
    (s:World)=>{s.spoiled[kind]=0;},
  ]){const corrupt=structuredClone(old);mutate(corrupt);expect(()=>deserializeWorld(JSON.stringify(corrupt))).toThrow(/version 83/);}
  const material=new THREE.MeshStandardNodeMaterial({vertexColors:true}),layer=new CropLayer(material);layer.update(w,true);
  const meshes=layer.group.children as THREE.InstancedMesh[],buffers=meshes.map(m=>m.instanceMatrix),geometry=meshes.map(m=>m.geometry);
  expect(meshes).toHaveLength(4);const restore=layer.prepareForCompile();expect(meshes.map(m=>m.count)).toEqual([1,1,1,1]);restore();
  w.resources=CROP_KINDS.map((kind,i)=>({id:w.nextId++,kind,x:7+i,z:8,amount:PLANT_DEFINITIONS[kind].yield,growth:1,growthTick:0}));
  const saved=serializeWorld(w);layer.update(w,false);expect(meshes.map(m=>m.count)).toEqual([1,1,1,1]);expect(serializeWorld(w)).toBe(saved);
  for(const mesh of meshes){expect(mesh.geometry.getAttribute('position').count).toBeGreaterThan(0);expect(Number.isFinite(mesh.boundingSphere!.radius)).toBe(true);}
  w.resources=[];layer.update(w,false);expect(meshes.map(m=>m.count)).toEqual([0,0,0,0]);layer.update(deserializeWorld(saved),true);
  meshes.forEach((mesh,i)=>{expect(mesh.instanceMatrix).toBe(buffers[i]);expect(mesh.geometry).toBe(geometry[i]);expect(mesh.instanceMatrix.usage).toBe(THREE.StaticDrawUsage);expect(mesh.instanceColor!.usage).toBe(THREE.StaticDrawUsage);});
  layer.dispose();material.dispose();
});
