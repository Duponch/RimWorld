import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { cpus,platform,release } from 'node:os';
import { expect,test } from '@playwright/test';
import { testOutputPath,writeTestFile } from '../test-output.ts';
import { observeErrors } from './helpers.ts';

const sources=['src/render/OverviewLayer.ts','src/render/OverviewBatch.ts','src/render/flora-presentation.ts',
  'src/render/NaturalResourcePresentation.ts','src/render/primitives.ts','src/sim/plants.ts','src/sim/types.ts','src/world/scale.ts'];
const sourceHashes=()=>Object.fromEntries(sources.map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
interface NativeOverviewResult {
  failure?:string;probeErrors:string[];
  gpu:{initialCapacity:number;grownCapacity:number;finalPipelines:number;warmPipelines:number;
    checkedVertices:number;iso:{changedPixels:number};perspective:{changedPixels:number}};
}

// The harness imports real Vite modules. It never starts the game, worker or
// simulation loop, and the prepared forest is not a naturally elapsed colony.
const harness=String.raw`
import { OverviewLayer, THREE } from '/src/render/OverviewLayer.ts';
import { createWorld } from '/src/sim/engine.ts';
import { WORLD_SCALE } from '/src/world/scale.ts';
import { noise } from '/src/render/StaticGeometry.ts';
const assert=(value,message)=>{if(!value)throw Error(message);};
const hash=text=>{let h=0x811c9dc5;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193);}return(h>>>0).toString(16).padStart(8,'0');};
const fingerprint=w=>({hash:hash(JSON.stringify(w)),rng:w.rng,nextId:w.nextId,tick:w.tick});
const world=createWorld(42,250,250);
world.resources=[];
for(let i=0;i<10000;i++)world.resources.push({id:world.nextId++,kind:'tree',x:i%100,z:Math.floor(i/100),amount:50});
for(let i=0;i<16;i++)world.resources.push({id:world.nextId++,kind:'healroot',x:102+i%4,z:92+Math.floor(i/4),amount:1,growth:1,growthTick:world.tick});
const before=structuredClone(world),target=structuredClone(world);
const birth={id:target.nextId++,kind:'healroot',x:102,z:96,amount:1,growth:1,growthTick:target.tick};
target.resources.push(birth);
const frozen=[fingerprint(before),fingerprint(target)],delta=new Map([[birth.id,{resource:birth,size:1}]]);
const meshes=layer=>{const result={};layer.group.traverse(o=>{if(o.name.startsWith('overview-'))result[o.name.slice(9)]=o;});return result;};
const placements=layer=>{
 const entries=[];
 for(const [kind,m] of Object.entries(meshes(layer)))for(let slot=0;slot<m.activeCount;slot++){
  const matrix=Array.from(m.instanceMatrix.array.slice(slot*16,slot*16+16));
  if(Math.hypot(...matrix.slice(0,3))===0&&Math.hypot(...matrix.slice(4,7))===0&&Math.hypot(...matrix.slice(8,11))===0)continue;
  entries.push([kind+':'+matrix[12]+':'+matrix[14],matrix,Array.from(m.colorBuffer.array.slice(slot*3,slot*3+3))]);
 }
 entries.sort((a,b)=>a[0].localeCompare(b[0]));return entries;
};
const oracle=layer=>{
 const actual=placements(layer),expected=new Map(target.resources.map(r=>[(r.kind==='healroot'?'wild-plant':r.kind)+':'+r.x+':'+r.z,r]));
 assert(actual.length===expected.size,'Visible instance count differs from prepared resource count');
 for(const [key,m,c] of actual){
  const r=expected.get(key);assert(r,'Unknown instance placement');
  const n=noise(r.x,r.z,77),height=r.kind==='tree'?WORLD_SCALE.treeMinHeight+n*(WORLD_SCALE.treeMaxHeight-WORLD_SCALE.treeMinHeight):.38;
  const width=r.kind==='tree'?.8+n*.32:.3;
  assert(Math.abs(m[13]-height/2)<1e-5,'Wrong instance elevation');
  assert(Math.abs(Math.hypot(m[0],m[1],m[2])-width)<1e-5,'Wrong instance width');
  assert(Math.abs(Math.hypot(m[4],m[5],m[6])-height)<1e-5,'Wrong instance height');
  const tint=new THREE.Color(r.kind==='tree'?0xffffff:0x829b74);
  assert(c.every((v,i)=>Math.abs(v-[tint.r,tint.g,tint.b][i])<1e-6),'Wrong instance tint');
 }
 return hash(JSON.stringify(actual));
};
const bounds=layer=>{
 let vertices=0;
 for(const mesh of Object.values(meshes(layer))){
  const sphere=mesh.boundingSphere,positions=mesh.geometry.getAttribute('position'),matrix=new THREE.Matrix4(),point=new THREE.Vector3();
  if(!mesh.activeCount)continue;
  assert(Number.isFinite(sphere.radius)&&sphere.radius>0,'Non-finite or empty active bounds');
  for(let slot=0;slot<mesh.activeCount;slot++){
   mesh.getMatrixAt(slot,matrix);
   for(let vertex=0;vertex<positions.count;vertex++){
    point.fromBufferAttribute(positions,vertex).applyMatrix4(matrix);vertices++;
    assert(point.distanceTo(sphere.center)<=sphere.radius+1e-4,'Authored vertex escapes instance bounds');
   }
  }
 }
 return vertices;
};
const setup=async()=>{
 const adapter=await navigator.gpu.requestAdapter();assert(adapter,'Native WebGPU adapter absent');
 const info=adapter.info,hardware={vendor:info.vendor,architecture:info.architecture,device:info.device,description:info.description,fallback:adapter.isFallbackAdapter??null};
 assert(!hardware.fallback&&!/swiftshader|llvmpipe|lavapipe/i.test(JSON.stringify(hardware)),'Software adapter is not native GPU proof');
 const renderer=new THREE.WebGPURenderer({antialias:false});renderer.setSize(800,600);renderer.setPixelRatio(1);renderer.setClearColor(0xe7eadf);document.body.append(renderer.domElement);await renderer.init();
 assert(renderer.backend.isWebGPUBackend,'WebGPU backend required');
 const device=renderer.backend.device;
 if(device.adapterInfo){const actual=device.adapterInfo;Object.assign(hardware,{vendor:actual.vendor,architecture:actual.architecture,device:actual.device,description:actual.description});}
 assert(!/swiftshader|llvmpipe|lavapipe/i.test(JSON.stringify(hardware)),'Renderer selected a software adapter');
 device.addEventListener('uncapturederror',event=>window.__overviewProbe.errors.push(event.error.message));
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xe7eadf);
 scene.add(new THREE.HemisphereLight(0xffffff,0xd6c7b9,2));
 const light=new THREE.DirectionalLight(0xfff4dd,2);light.position.set(95,30,110);scene.add(light);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(250,250),new THREE.MeshStandardNodeMaterial({color:0xc4bfa5,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.set(124.5,-.05,124.5);scene.add(floor);
 const layer=new OverviewLayer();layer.setTexturesEnabled(false);layer.update(before,true);layer.group.visible=true;scene.add(layer.group);
 const iso=new THREE.OrthographicCamera(-16,16,12,-12,.1,500),perspective=new THREE.PerspectiveCamera(38,4/3,.1,500);
 for(const camera of [iso,perspective]){camera.position.set(121,24,113);camera.lookAt(102,0,94);camera.updateMatrixWorld();}
 const renderTarget=new THREE.RenderTarget(800,600);renderTarget.texture.colorSpace=THREE.SRGBColorSpace;
 const draw=async camera=>{
  device.pushErrorScope('validation');
  renderer.setRenderTarget(renderTarget);await renderer.renderAsync(scene,camera);await device.queue.onSubmittedWorkDone();
  const raw=await renderer.readRenderTargetPixelsAsync(renderTarget,0,0,800,600),pixels=new Uint8Array(800*600*4);
  // r186 exposes WebGPU's 256-byte aligned rows (the last row is unpadded).
  const stride=raw.length===pixels.length?800*4:Math.ceil(800*4/256)*256;
  assert(raw.length===(600-1)*stride+800*4,'Unexpected RGBA readback layout');
  for(let row=0;row<600;row++)pixels.set(raw.subarray(row*stride,row*stride+800*4),row*800*4);
  renderer.setRenderTarget(null);await renderer.renderAsync(scene,camera);await device.queue.onSubmittedWorkDone();
  const error=await device.popErrorScope();assert(!error,error?.message);
  let green=0,brown=0;for(let i=0;i<pixels.length;i+=4){const r=pixels[i],g=pixels[i+1],b=pixels[i+2];if(g>r*1.1&&g>b*1.05)green++;if(r>g*1.12&&g>b*1.12)brown++;}
  const histogram=new Map();let maxGreenDifference=-Infinity;
  for(let i=0;i<pixels.length;i+=4){const key=pixels[i]+','+pixels[i+1]+','+pixels[i+2];histogram.set(key,(histogram.get(key)??0)+1);maxGreenDifference=Math.max(maxGreenDifference,pixels[i+1]-pixels[i]);}
  const stats={camera:camera.type,green,brown,length:pixels.length,rawLength:raw.length,stride,type:pixels.constructor.name,maxGreenDifference,topColors:[...histogram].sort((a,b)=>b[1]-a[1]).slice(0,20)};
  (window.__overviewProbe.pixelStats??=[]).push(stats);
  if(green<=50||brown<=30){
   const capture=document.createElement('canvas');capture.width=800;capture.height=600;
   capture.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels),800,600),0,0);
   window.__overviewProbe.failurePixelsPNG=capture.toDataURL('image/png');
  }
  assert(green>50,'Missing green foliage pixels: '+JSON.stringify(stats));assert(brown>30,'Missing authored brown trunk pixels: '+JSON.stringify(stats));
  return {pixels,green,brown};
 };
 const initial=meshes(layer),tree=initial.tree,root=initial['wild-plant'];
 window.__overviewProbe.batches=Object.fromEntries(Object.entries(initial).map(([kind,m])=>[kind,{count:m.activeCount,
  matrix:Array.from(m.instanceMatrix.array.slice(0,16)),colorBuffer:Array.from(m.colorBuffer.array.slice(0,3)),
  baseColorStart:Array.from(m.geometry.getAttribute('color').array.slice(0,12)),baseColorEnd:Array.from(m.geometry.getAttribute('color').array.slice(-12)),
  normals:Array.from(m.geometry.getAttribute('normal').array.slice(0,12))}]));
 assert(root.instanceMatrix.count===16&&root.activeCount===16,'Expected sixteen-slot medicinal batch');
 const references={root,material:root.material,positionNode:root.material.positionNode,colorNode:root.material.colorNode,geometry:root.geometry,
  others:Object.fromEntries(Object.entries(initial).filter(([kind])=>kind!=='wild-plant').map(([kind,m])=>[kind,{mesh:m,geometry:m.geometry,matrix:m.instanceMatrix,color:m.colorBuffer,sphere:m.boundingSphere.clone(),values:hash(JSON.stringify(Array.from(m.instanceMatrix.array)))}]))};
 const restore=layer.prepareForCompile(),culling=[];scene.traverse(o=>{culling.push([o,o.frustumCulled]);o.frustumCulled=false;});
 try{await renderer.compileAsync(scene,iso);await renderer.compileAsync(scene,perspective);await renderer.compileAsync(scene,iso);}
 finally{for(const [o,value] of culling)o.frustumCulled=value;restore();}
 const beforeIso=await draw(iso),beforePerspective=await draw(perspective),warmPipelines=window.__overviewProbe.pipelines;
 layer.update(target,false,delta);
 const grown=meshes(layer)['wild-plant'];
 assert(grown===references.root&&grown.material===references.material&&grown.material.positionNode===references.positionNode&&grown.material.colorNode===references.colorNode,'Resident object/material/node identity changed');
 assert(grown.geometry!==references.geometry&&grown.instanceMatrix.count===32&&grown.activeCount===17,'Expected real sixteen-to-thirty-two growth');
 for(const [kind,old] of Object.entries(references.others)){
  const now=meshes(layer)[kind];assert(now===old.mesh&&now.geometry===old.geometry&&now.instanceMatrix===old.matrix&&now.colorBuffer===old.color,'Unrelated batch rebuilt');
  assert(now.boundingSphere.equals(old.sphere)&&hash(JSON.stringify(Array.from(now.instanceMatrix.array)))===old.values,'Unrelated transforms or bounds changed');
 }
 const semantic=oracle(layer),checkedVertices=bounds(layer),afterIso=await draw(iso),afterPerspective=await draw(perspective);
 const changed=(a,b)=>{let n=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])n++;return n;};
 const isoChanged=changed(beforeIso.pixels,afterIso.pixels),perspectiveChanged=changed(beforePerspective.pixels,afterPerspective.pixels);
 assert(isoChanged>0&&perspectiveChanged>0,'New physical medicinal silhouette is absent from a camera');
 assert(window.__overviewProbe.pipelines===warmPipelines,'A new pipeline appeared after capacity growth');
 const compilation=await Promise.all(window.__overviewProbe.compilation);assert(compilation.flat().length===0,'Shader compilation error');
 assert(window.__overviewProbe.shaders.some(code=>code.includes('overviewMatrix0')&&code.includes('overviewColor')),'Named instance attributes absent from real GPU shader');
 assert(JSON.stringify([fingerprint(before),fingerprint(target)])===JSON.stringify(frozen),'Presentation mutated World or RNG');
 const gpu={hardware,initialCapacity:16,grownCapacity:32,warmPipelines,finalPipelines:window.__overviewProbe.pipelines,semantic,checkedVertices,
  iso:{green:afterIso.green,brown:afterIso.brown,changedPixels:isoChanged},perspective:{green:afterPerspective.green,brown:afterPerspective.brown,changedPixels:perspectiveChanged},worlds:frozen};
 return {gpu,draw,iso,perspective,renderer,renderTarget,layer,floor};
};
window.__overviewNative={ready:false};
try{
 const state=await setup();
 window.__overviewNative.gpu=state.gpu;
 window.__overviewNative.camera=async name=>{await state.draw(name==='iso'?state.iso:state.perspective);};
 window.__overviewNative.cpu=async()=>{
  // GPU work is complete before this isolated browser-CPU phase. No render,
  // World generation, cloning, reset preparation or oracle is timed.
  state.renderTarget.dispose();await state.renderer.dispose();state.layer.dispose();state.floor.geometry.dispose();state.floor.material.dispose();
  const layers={A:new OverviewLayer(),B:new OverviewLayer()},rounds=[];
  for(const mode of ['A','B','B','A']){
   const layer=layers[mode],samples=[];
   for(let i=0;i<70;i++){
    layer.update(before,true); // Identical source state, outside the measured call.
    const start=performance.now();
    if(mode==='A')layer.update(target,false,delta);else layer.update(target,true);
    const elapsed=performance.now()-start;if(i>=20)samples.push(elapsed);
   }
   const semantic=oracle(layer);bounds(layer);
   samples.sort((a,b)=>a-b);rounds.push({mode,count:samples.length,p50:samples[Math.floor(samples.length*.5)],p95:samples[Math.floor(samples.length*.95)],samples,semantic});
  }
  assert(rounds.every(r=>r.semantic===rounds[0].semantic),'Delta and emulated reset placements differ');
  assert(JSON.stringify([fingerprint(before),fingerprint(target)])===JSON.stringify(frozen),'CPU presentation mutated World or RNG');
  layers.A.dispose();layers.B.dispose();return {rounds,worlds:frozen,warmupsPerRound:20,samplesPerRound:50};
 };
 window.__overviewNative.ready=true;
}catch(error){window.__overviewNative.failure=String(error?.stack??error);window.__overviewNative.ready=true;}
`;

test('V195 isolated native overview grows a medicinal batch without rebuilding the forest or GPU pipeline, then measures bounded CPU update rotations',async({playwright})=>{
  test.setTimeout(180_000);
  const beforeSources=sourceHashes(),report:Record<string,unknown>={status:'running',scene:{width:250,height:250,preparedTrees:10000,preparedMedicinalBefore:16,preparedMedicinalAfter:17,actors:3},
    sourcesBefore:beforeSources,host:{cpu:cpus()[0]?.model,node:process.version,os:platform(),release:release()},
    limits:'Prepared isolated presentation only. CPU A is current single-birth delta; B emulates full reset, not historical source. No worker, full tick, general gain, RAF, FPS or GPU timing is measured.'};
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:820,height:620}}),errors=observeErrors(page);
  try{
    await page.addInitScript(()=>{
      const probe={pipelines:0,errors:[] as string[],shaders:[] as string[],compilation:[] as Promise<string[]>[]};Object.assign(window,{__overviewProbe:probe});
      for(const name of ['createRenderPipeline','createRenderPipelineAsync'] as const){const original=GPUDevice.prototype[name];(GPUDevice.prototype[name] as unknown)=function(this:GPUDevice,...args:unknown[]){probe.pipelines++;return(original as Function).apply(this,args);};}
      const create=GPUDevice.prototype.createShaderModule;GPUDevice.prototype.createShaderModule=function(this:GPUDevice,descriptor:GPUShaderModuleDescriptor){
        probe.shaders.push(descriptor.code);const module=create.call(this,descriptor);
        probe.compilation.push(module.getCompilationInfo().then(info=>info.messages.filter(m=>m.type==='error').map(m=>m.message)));return module;
      };
    });
    // Read-only namespace export keeps Three identity identical to the actual
    // Vite-transformed layer; no production method or source file is changed.
    await page.route('**/src/render/OverviewLayer.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\nexport { THREE };\n'});});
    await page.route('**/__overview-v195-harness',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#e7eadf"><script type="module">'+harness+'</script></body></html>'}));
    await page.goto('/__overview-v195-harness');
    await page.waitForFunction(()=>!!(window as unknown as {__overviewNative?:{ready:boolean}}).__overviewNative?.ready,undefined,{timeout:90_000});
    const result=await page.evaluate('({failure:window.__overviewNative.failure,gpu:window.__overviewNative.gpu,probeErrors:window.__overviewProbe.errors})') as NativeOverviewResult;
    report.gpu=result;expect(result.failure).toBeUndefined();expect(result.probeErrors).toEqual([]);
    expect(result.gpu.initialCapacity).toBe(16);expect(result.gpu.grownCapacity).toBe(32);expect(result.gpu.finalPipelines).toBe(result.gpu.warmPipelines);
    expect(result.gpu.checkedVertices).toBeGreaterThan(10000);expect(result.gpu.iso.changedPixels).toBeGreaterThan(0);expect(result.gpu.perspective.changedPixels).toBeGreaterThan(0);
    for(const camera of ['iso','perspective']){
      await page.evaluate(name=>(window as unknown as {__overviewNative:{camera:(name:string)=>Promise<void>}}).__overviewNative.camera(name),camera);
      await page.screenshot({path:testOutputPath('artifacts/overview-residency-v195-'+camera+'.png')});
    }
    // Successive CPU-only phase after the native shader/camera proof above.
    report.cpu=await page.evaluate('window.__overviewNative.cpu()');
    expect(errors).toEqual([]);report.sourcesAfter=sourceHashes();expect(report.sourcesAfter).toEqual(beforeSources);report.status='passed';
  }catch(error){
    report.status='failed';report.failure=String(error);
    await page.screenshot({path:testOutputPath('artifacts/overview-residency-v195-failure.png')}).catch(()=>{});
    const pixels=await page.evaluate('window.__overviewProbe?.failurePixelsPNG').catch(()=>null);
    if(typeof pixels==='string')await writeTestFile('artifacts/overview-residency-v195-failure-pixels.png',Buffer.from(pixels.slice(pixels.indexOf(',')+1),'base64'));
    throw error;
  }
  finally{
    report.browser=browser.version();report.errors=errors;
    report.probe=await page.evaluate('window.__overviewProbe ? {pipelines:window.__overviewProbe.pipelines,errors:window.__overviewProbe.errors,pixelStats:window.__overviewProbe.pixelStats,batches:window.__overviewProbe.batches,shaders:window.__overviewProbe.shaders}:null').catch(()=>null);
    await writeTestFile('artifacts/overview-residency-v195.json',JSON.stringify(report,null,2));await browser.close();
  }
});
