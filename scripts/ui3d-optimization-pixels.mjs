// ROOT-only native GPU qualification. No game state writes or human browser.
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import assert from 'node:assert/strict';
const arg=name=>process.argv.find(x=>x.startsWith(name+'='))?.slice(name.length+1);
const origin=arg('--origin')??'http://127.0.0.1:5196';
const out=resolve('tmp/ui3d-optimization-v478','pixels-'+new Date().toISOString().replaceAll(':','-'));
await mkdir(out,{recursive:true});
async function boot(THREE,NativeStage,PrototypeCardboardArt){
  const errors=[];
  const stage=new NativeStage({onPanel:()=>{},onEscape:()=>{},onError:x=>errors.push(x)});
  await stage.ready;stage.setWorldVisible(true);stage.setFrontVisible(false);
  // Poses are explicit: the two captures compare the exact same scene state.
  stage.animate=()=>{};stage.moving.clear();
  const renderer=new THREE.WebGPURenderer({antialias:true});
  renderer.setPixelRatio(devicePixelRatio);renderer.setSize(innerWidth,innerHeight);
  renderer.setClearColor(0x436457,1);document.body.append(renderer.domElement);await renderer.init();
  const backdrop=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
  const render=()=>{renderer.render(backdrop,camera);stage.renderOverlay(renderer);};
  const read=()=>renderer.readRenderTargetPixelsAsync(stage.overlayCache.target,0,0,stage.overlayCache.target.width,stage.overlayCache.target.height);
  const compare=async label=>{
    render();const partial=await read(),before=stage.diagnostics().cache;
    stage.overlayCache.invalidate();render();const full=await read();
    let changed=0,max=0,total=0,large=0;
    for(let i=0;i<full.length;i++)if(partial[i]!==full[i]){
      const delta=Math.abs(THREE.DataUtils.fromHalfFloat(partial[i])-THREE.DataUtils.fromHalfFloat(full[i]));
      changed++;max=Math.max(max,delta);total+=delta;if(delta>.01)large++;
    }
    return {label,changed,max,mean:total/full.length,large,channels:full.length,cache:before,standby:stage.diagnostics().standby};
  };
  const panel=(offset=0)=>({id:'pixel-page',title:'Dossier témoin',width:514,height:400,layout:'inspector',
    rows:Array.from({length:35},(_,i)=>({id:'row-'+i,label:'Compétence '+i,value:String(i+offset),hint:'Information '+i,
      controls:i%4===0?[{id:'control-'+i,label:'Action '+i,onActivate:()=>{}}]:undefined})),actions:[{id:'close',label:'Fermer',onActivate:()=>{}}]});
  const artPixels=()=>{
    const results=[];
    for(let n=0;n<4;n++){
      // Read each surface only once: repeated getImageData changes Chromium's
      // 2D backend, creating a diagnostic-induced rounding difference.
      const art=new PrototypeCardboardArt();let text='Texte initial';
      const draw=(ctx,w,h,rng)=>{ctx.fillText(text,12,26);for(let i=0;i<20;i++)ctx.fillRect(rng()*w,rng()*h,2,2);};
      const plain=art.createPiece({w:5.14,h:4.89,textureWidth:1028,textureHeight:978,seed:2003,drawFn:draw});
      const cached=art.createPiece({w:5.14,h:4.89,textureWidth:1028,textureHeight:978,seed:2003,drawFn:draw,cacheBackground:true});
      for(let repaint=0;repaint<n;repaint++){text='Valeur '+repaint;plain.redraw();cached.redraw();}
      const a=plain.userData.ctx.getImageData(0,0,1028,978).data,b=cached.userData.ctx.getImageData(0,0,1028,978).data;
      let differences=0,max=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i]){differences++;max=Math.max(max,Math.abs(a[i]-b[i]));}
      results.push({n,differences,max});
      art.dispose();
    }
    return results;
  };
  window.__pixels={stage,renderer,errors,compare,panel,artPixels,render,
    pose(index,hover,press=0){const piece=stage.management[index];piece.userData.pressVal=press;stage.setPose(piece,hover);},
    resize(){renderer.setSize(innerWidth,innerHeight);},
    scroll(value){stage.scroll=value;stage.rebuildPage(true);},
    dispose(){stage.dispose();renderer.dispose();}};
  render();stage.sceneRevision++;render(); // settle Three's initial WebGPU projection conversion
}
const fixture=resolve(out,'fixture.html');
await writeFile(fixture,'<!doctype html><meta charset="UTF-8"><link rel="icon" href="data:,"><style>body{margin:0;overflow:hidden}canvas{position:fixed;inset:0}</style><script type="module">import * as THREE from "three/webgpu";import {NativeStage} from "/src/ui3d/NativeStage.ts";import {PrototypeCardboardArt} from "/src/ui3d/prototype-art.ts";('+boot.toString()+')(THREE,NativeStage,PrototypeCardboardArt)</script>');
const report={origin,out,profiles:[],errors:[]};
const browser=await chromium.launch({executablePath:resolve('.playwright/chromium-1243/chrome-win64/chrome.exe'),headless:false,args:['--enable-unsafe-webgpu','--mute-audio']});
const timer=setTimeout(()=>void browser.close(),180000);
try{
  for(const dpr of [1,1.25,1.8]){
    const context=await browser.newContext({viewport:{width:960,height:640},deviceScaleFactor:dpr});
    const page=await context.newPage();page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
    await page.goto(origin+'/'+relative(resolve('.'),fixture).replaceAll('\\','/'),{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.__pixels);
    const profile={dpr,art:await page.evaluate(()=>window.__pixels.artPixels()),pairs:[]};report.profiles.push(profile);
    const pair=async label=>{const result=await page.evaluate(label=>window.__pixels.compare(label),label);profile.pairs.push(result);await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));};
    await pair('initial');
    for(const [i,hover,press]of [[0,.33,0],[0,.9,0],[0,1,.8],[0,0,0],[3,.75,0],[3,0,0]]){
      await page.evaluate(([i,h,p])=>window.__pixels.pose(i,h,p),[i,hover,press]);await pair('button-'+i+'-'+hover+'-'+press);
    }
    await page.evaluate(()=>window.__pixels.stage.showPage(window.__pixels.panel()));await pair('panel');
    await page.evaluate(()=>window.__pixels.scroll(43));await pair('clipped-scroll');
    await page.evaluate(()=>window.__pixels.stage.showPage(window.__pixels.panel(10)));await pair('panel-ink');
    await page.evaluate(()=>window.__pixels.stage.showPage(null));await pair('panel-removed');
    await page.evaluate(()=>{const s=window.__pixels.stage;s.setWorldReadout(['Sol fertile · 21 °C']);s.pointerOverUi=false;s.updateWorldReadoutVisibility();});await pair('transparent-readout');
    await page.setViewportSize({width:1031,height:711});await page.evaluate(()=>window.__pixels.resize());await pair('resize');
    await page.screenshot({path:resolve(out,'final-dpr-'+dpr+'.png')});
    profile.ui=await page.evaluate(()=>window.__pixels.stage.diagnostics());
    await page.evaluate(()=>window.__pixels.dispose());await context.close();
  }
  assert.deepEqual(report.errors,[],'No native graphics errors');
  for(const p of report.profiles){
    assert.ok(p.art.every(x=>x.differences===0),'Cached gouache retains exact canvas pixels');
    assert.ok(p.pairs.every(x=>x.large===0&&x.max<=.01),'Partial captures retain full-render color (HDR error <= .01)');
    assert.ok(p.pairs.at(-1).cache.partialCaptures>=6,'Actual WebGPU patch path exercised');
    assert.equal(p.ui.standby.parked,true);assert.deepEqual(p.ui.standby.drawingBuffer,{width:1,height:1});
  }
  report.status='PASS';
}catch(e){report.status='FAIL';report.failure=String(e);throw e;}
finally{clearTimeout(timer);await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({out,status:report.status}));}
