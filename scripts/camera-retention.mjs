import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const {chromium} = await import('@playwright/test');
const label = process.argv[2] ?? 'current';
if (!/^[a-z0-9-]+$/.test(label)) throw Error('Invalid label');
const baseline=process.env.CAMERA_BASELINE==='1';
const report = {label, baseline, protocol: 'Native WebGPU, frozen simulation, real mouse pan/orbit/wheel plus controlled close/distant transitions without rebuilding the world. Compare the very first frame after input, and three consecutive damping frames, against a fresh draw at the SAME camera/light pose. Near views use ordinary per-camera culling; far views retain bundles. No landscape refresh between input and tested frames. Exact pixels required. A fresh bundle preserves draw order, unlike an ordinary globally sorted render list. Also verify every listed draw belongs to this camera and remains registered for uniform replay.', cases: [], errors: []};
const browser = await chromium.launch({channel:'chromium', headless:false});
try {
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => {if(m.type()==='error') report.errors.push(m.text());});
  if(baseline)await page.route('**/src/render/ColonyRenderer.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('new ReentrantRenderer(', 'new THREE.WebGPURenderer(')});});
  await page.route('**/src/main.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({response, body:`const cameraFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(t){window.__cameraView=this;return cameraFrame.call(this,t);};\n${await response.text()}\nwindow.__cameraClient=client;`});
  });
  await page.goto('http://127.0.0.1:5173/?scenario=crashlanded&e2e&size=250&seed=42');
  await page.waitForFunction(() => window.__cameraView?.world && !document.querySelector('.game-shell')?.inert, {}, {timeout:60000});
  await page.evaluate(async baseline => {
    await window.__cameraClient.setSpeed(0);
    window.__cameraClient.onSnapshot = () => {};
    const v = window.__cameraView;
    if(baseline){const refresh=v.landscape.refresh.bind(v.landscape);v.landscape.refresh=()=>refresh(true);v.landscape.setRetained=()=>{v.landscape.isBundleGroup=true;};}
    v.renderer.setAnimationLoop(null);
    v.hasTracks=false; v.timeFrom=v.timeTo; v.snapshotDuration=0;
    window.__cameraOriginal = structuredClone(v.world);
    const originalBundle=v.renderer._renderBundle;
    v.renderer._renderBundle=function(bundle,...args){
      const rb=this._bundles.get(bundle.bundleGroup,bundle.camera,this._currentRenderContext);
      const result=originalBundle.call(this,bundle,...args);
      if(bundle.bundleGroup===v.landscape&&bundle.camera===v.camera){
        const objects=this.backend.get(rb).renderObjects;
        window.__cameraBundle={recorded:objects.length,listed:bundle.renderList.opaque.length+bundle.renderList.transparent.length,camerasMatch:objects.every(o=>o.camera===bundle.camera)};
      }
      return result;
    };
  },baseline);
  for (const mode of ['orthographic','perspective']) for (const zoom of ['near','far']) for (const gesture of ['pan','orbit','wheel','lod']) {
    await page.evaluate(({mode,zoom,gesture}) => {
      if(gesture==='lod')zoom=zoom==='near'?'far':'near';
      const v=window.__cameraView;
      v.rig.setMode('orthographic'); v.applyWorld(structuredClone(window.__cameraOriginal),true);
      v.controls.enableDamping=false;v.controls.update();
      v.camera.zoom=zoom==='near'?2:v.controls.minZoom;
      v.camera.updateProjectionMatrix();v.rig.setMode(mode);v.controls.update();v.controls.enableDamping=true;
      v.landscape.isBundleGroup=true;v.landscape.refresh();v.frame(performance.now());
      window.__cameraStart={position:v.camera.position.toArray(),zoom:v.camera.zoom,version:v.landscape.version};
    },{mode,zoom,gesture});
    await page.mouse.move(780,440);
    if(gesture==='lod') await page.evaluate(({mode,zoom})=>{const v=window.__cameraView;v.rig.setMode('orthographic');v.camera.zoom=zoom==='near'?2:v.controls.minZoom;v.camera.updateProjectionMatrix();v.rig.setMode(mode);v.controls.update();},{mode,zoom});
    else if(gesture==='wheel') {await page.mouse.wheel(0,-85); await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));}
    else {await page.mouse.down({button:gesture==='pan'?'middle':'right'});await page.mouse.move(825,470,{steps:3});await page.mouse.up({button:gesture==='pan'?'middle':'right'});}
    await page.mouse.move(5,5);
    // Retain several consecutive frames before any oracle invalidates the bundle.
    const captures=await page.evaluate(async () => {
      const v=window.__cameraView, frames=[];
      v.hover.visible=false;
      for(let frame=0;frame<4;frame++){
        v.frame(performance.now());
        await v.renderer.getContext().getConfiguration().device.queue.onSubmittedWorkDone();
        frames.push({retained:v.renderer.domElement.toDataURL('image/png'),position:v.camera.position.toArray(),quaternion:v.camera.quaternion.toArray(),zoom:v.camera.zoom,lightPosition:v.daylight.light.position.toArray(),lightTarget:v.daylight.light.target.position.toArray(),version:v.landscape.version,bundle:v.landscape.isBundleGroup?window.__cameraBundle:null});
      }
      // Keep the same draw ordering, but force current-camera uniforms to be
      // recorded afresh. Ordinary scene sorting is a separate visual contract.
      for(const frame of frames){
        v.camera.position.fromArray(frame.position);v.camera.quaternion.fromArray(frame.quaternion);v.camera.zoom=frame.zoom;
        v.daylight.light.position.fromArray(frame.lightPosition);v.daylight.light.target.position.fromArray(frame.lightTarget);
        v.camera.updateProjectionMatrix();v.camera.updateMatrixWorld();v.landscape.refresh();
        v.renderer.render(v.scene,v.camera);
        await v.renderer.getContext().getConfiguration().device.queue.onSubmittedWorkDone();
        frame.plain=v.renderer.domElement.toDataURL('image/png');
        const images=await Promise.all([frame.plain,frame.retained].map(async url=>{const image=new Image();image.src=url;await image.decode();return image;}));
        const canvas=document.createElement('canvas');canvas.width=images[0].width;canvas.height=images[0].height;
        const context=canvas.getContext('2d',{willReadFrequently:true});
        const values=images.map(image=>{context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0);return context.getImageData(0,0,canvas.width,canvas.height).data;});
        let changedPixels=0,maxChannelDifference=0;
        for(let i=0;i<values[0].length;i+=4){let changed=false;for(let c=0;c<4;c++){const d=Math.abs(values[0][i+c]-values[1][i+c]);changed ||= d!==0;maxChannelDifference=Math.max(maxChannelDifference,d);}if(changed)changedPixels++;}
        Object.assign(frame,{changedPixels,maxChannelDifference});
      }
      return {frames,start:window.__cameraStart};
    });
    for(const [frame,capture] of captures.frames.entries()){
      const {retained,plain,...metrics}=capture;
      const moved=capture.position.some((n,i)=>Math.abs(n-captures.start.position[i])>1e-7)||capture.zoom!==captures.start.zoom;
      const versionExpected=gesture==='lod'?captures.frames[0].version:captures.start.version;
      const modeCorrect=gesture!=='lod'||baseline||Boolean(capture.bundle)===(zoom==='far');
      const passed=modeCorrect&&moved&&capture.changedPixels===0&&(!capture.bundle||(capture.bundle.recorded===capture.bundle.listed&&capture.bundle.camerasMatch))&&capture.version===versionExpected;
      report.cases.push({mode,distance:zoom,gesture,frame,...metrics,startVersion:captures.start.version,versionExpected,modeCorrect,moved,passed});
      if(frame===0&&!passed)for(const [type,url] of Object.entries({retained,plain}))await writeFile(`artifacts/camera-${label}-${mode}-${zoom}-${gesture}-${type}.png`,Buffer.from(url.split(',')[1],'base64'));
    }
    console.log(JSON.stringify({mode,zoom,gesture,differences:captures.frames.map(f=>f.changedPixels)}));
  }
} finally {
  await browser.close();
  await writeFile(`artifacts/camera-${label}.json`,JSON.stringify(report,null,2));
}
if(report.errors.length||report.cases.length!==64||report.cases.some(c=>!c.passed))process.exitCode=1;
