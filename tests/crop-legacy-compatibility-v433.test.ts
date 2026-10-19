import {expect,test} from 'vitest';
import {createWorld} from '../src/sim/engine';
import {readResidentNaturalSidecar} from '../src/bridge/resident-protocol';
import {readPreparedCropFrame,readPreparedNaturalFrame,collectPreparedNaturalChanges} from '../src/bridge/prepared-natural-frame';
import {cropHarness} from './crop-worker-fixtures-v433';
import * as THREE from 'three/webgpu';
import {CropLayer} from '../src/render/CropLayer';
import {SceneResourceIndex} from '../src/render/scene-resource-index';

function fixture(){const world=createWorld(433,32,32);world.tiles=world.tiles.map(()=>({terrain:'soil'}));world.resources=[];world.structures=[];world.growingZones=[];world.resources.push({id:world.nextId++,kind:'rice',x:5,z:5,amount:8,growth:.3,growthTick:world.tick},{id:world.nextId++,kind:'berries',x:8,z:6,amount:10,growth:.6,growthTick:world.tick});return world;}
function oldForm(packet:Parameters<ReturnType<typeof cropHarness>['reader']['adopt']>[0]){const raw=readResidentNaturalSidecar(packet) as Record<string,unknown>;delete raw.crops;return packet;}

test('legacy natural checkpoints and adjacent deltas retain complete natural frames but grant no crop capability',()=>{
 const h=cropHarness(fixture()),packet=oldForm(h.packet()),a=h.reader.adopt(packet);expect(a.status).toBe('applied');if(a.status!=='applied')throw Error('Legacy checkpoint refused');
 const first=readPreparedNaturalFrame(a.world)!;expect(first).toBeDefined();expect(readPreparedCropFrame(a.world)).toBeUndefined();
 expect(first.lookup(a.world.resources[1]!.id)).toEqual({size:1,ripe:false,leafless:false,harvestable:false});
 h.world.resources[0]!.growth=.4;const b=h.reader.adopt(oldForm(h.packet()));expect(b.status).toBe('applied');if(b.status!=='applied')throw Error('Legacy delta refused');
 expect(readPreparedCropFrame(b.world)).toBeUndefined();expect(collectPreparedNaturalChanges(first,readPreparedNaturalFrame(b.world)!)).toEqual([]);
});

test('present undefined or malformed extension is refused, and removing that property permits the exact legacy retry',()=>{
 const h=cropHarness(fixture()),packet=h.packet(),raw=readResidentNaturalSidecar(packet) as Record<string,unknown>;
 for(const value of [undefined,null,{}, {upsert:[],removed:[],future:true}]){raw.crops=value;expect(h.reader.adopt(packet).status).toBe('resync');}
 delete raw.crops;raw.future=true;expect(h.reader.adopt(packet).status).toBe('resync');delete raw.future;const result=h.reader.adopt(packet);expect(result.status).toBe('applied');if(result.status==='applied')expect(readPreparedCropFrame(result.world)).toBeUndefined();
});

test('extended to legacy drops current crop capability without changing old played numbers, and a full checkpoint enables it again',()=>{
 const h=cropHarness(fixture()),first=h.send(),old=readPreparedCropFrame(first)!;h.world.resources[0]!.growth=.4;
 const legacy=h.reader.adopt(oldForm(h.packet()));expect(legacy.status).toBe('applied');if(legacy.status!=='applied')throw Error('Legacy downgrade refused');
 expect(readPreparedCropFrame(legacy.world)).toBeUndefined();expect(old.lookup(h.world.resources[0]!.id)?.growth).toBe(.3);expect(readPreparedCropFrame(first)).toBe(old);
 const checkpoint=h.reader.adopt(h.packet(true));expect(checkpoint.status).toBe('applied');if(checkpoint.status==='applied')expect(readPreparedCropFrame(checkpoint.world)!.lookup(h.world.resources[0]!.id)?.growth).toBe(.4);
});

test('a legacy to extended delta cannot fabricate unmentioned crops; a legacy retry remains valid then a full checkpoint enables the extension',()=>{
 const h=cropHarness(fixture()),initial=h.reader.adopt(oldForm(h.packet()));expect(initial.status).toBe('applied');
 h.world.resources[0]!.growth=.5;const packet=h.packet();expect(h.reader.adopt(packet).status).toBe('resync');
 const legacy=h.reader.adopt(oldForm(packet));expect(legacy.status).toBe('applied');if(legacy.status==='applied')expect(readPreparedCropFrame(legacy.world)).toBeUndefined();
 const result=h.reader.adopt(h.packet(true));expect(result.status).toBe('applied');if(result.status==='applied')expect(readPreparedCropFrame(result.world)!.lookup(h.world.resources[0]!.id)?.growth).toBe(.5);
});

test('extended to legacy literal rendering and a later full extension keep exact buffers through retirement and return',()=>{
 const h=cropHarness(fixture()),index=new SceneResourceIndex(),material=new THREE.MeshStandardNodeMaterial(),layer=new CropLayer(material),literal=new CropLayer(material);
 type Batch={used:number;mesh:THREE.InstancedMesh;slots:Map<number,number>};
 const observe=(value:CropLayer)=>(value as unknown as {batches:Batch[]}).batches.map(({used,mesh,slots})=>({used,count:mesh.count,slots:[...slots],matrix:new Uint32Array(mesh.instanceMatrix.array.buffer,mesh.instanceMatrix.array.byteOffset,used*16).slice(),color:new Uint32Array(mesh.instanceColor!.array.buffer,mesh.instanceColor!.array.byteOffset,used*3).slice()}));
 const play=(world:Parameters<CropLayer['update']>[0],reset=false)=>{layer.update(world,reset,true,index.adopt(world,reset));literal.update(world,reset);expect(observe(layer)).toEqual(observe(literal));};
 const legacy=()=>{const result=h.reader.adopt(oldForm(h.packet()));expect(result.status).toBe('applied');if(result.status!=='applied')throw Error('Legacy refused');play(result.world);};
 try{
  play(h.send(),true);h.world.resources[0]!.growth=.5;legacy();const rice=h.world.resources.shift()!;legacy();h.world.resources.push(rice);legacy();
  const checkpoint=h.reader.adopt(h.packet(true));expect(checkpoint.status).toBe('applied');if(checkpoint.status==='applied')play(checkpoint.world);
 }finally{layer.dispose();literal.dispose();material.dispose();index.clear();}
});
