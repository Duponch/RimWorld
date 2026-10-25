import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,sep,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import { expect,test } from '@playwright/test';
import { decodeStoredSave } from '../../src/ui/save-storage-codec.ts';

const hash=(v:Buffer|string)=>createHash('sha256').update(v).digest('hex');
const enabled=process.env.SHADOW_CACHE_BROWSER==='1';
if(enabled&&(!process.env.SHADOW_CACHE_BASE_URL||!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(process.env.SHADOW_CACHE_BASE_URL)))throw Error('Opt-in requires explicit frozen localhost SHADOW_CACHE_BASE_URL; this test starts no server');
test.skip(process.env.SHADOW_CACHE_BROWSER!=='1','Native shadow-cache contract is opt-in; no server starts.');

test('paused atlas oracles plus active cadence and urgent projection remain native',async({playwright})=>{
  const servedMain:{url:string,sha256:string,injectedSHA:string}[]=[],servedCore:{url:string,sha256:string,injectedSHA:string}[]=[];
  test.setTimeout(180_000);
  const output=resolve(process.env.SHADOW_CACHE_OUTPUT??('tmp/shadow-cache-native/'+new Date().toISOString().replace(/[:.]/g,'-'))),tmp=resolve('tmp')+sep;
  if(!output.toLowerCase().startsWith(tmp.toLowerCase()))throw Error('SHADOW_CACHE_OUTPUT must stay inside project TMP');
  mkdirSync(dirname(output),{recursive:true});
  mkdirSync(output,{recursive:false});
  const browser=await playwright.chromium.launch({channel:'chrome',headless:false,args:['--mute-audio']});
  const page=await browser.newPage({baseURL:process.env.SHADOW_CACHE_BASE_URL!,viewport:{width:1440,height:900},deviceScaleFactor:1});
  await page.addInitScript(()=>{
    for(const key of ['lisiere.audio.effects.enabled.v1','lisiere.audio.music.enabled.v1'])localStorage.setItem(key,'false');
    for(const key of ['lisiere.audio.effects.volume.v1','lisiere.audio.music.volume.v1'])localStorage.setItem(key,'0');
    localStorage.setItem('lisiere.presentation.shadows.v1',JSON.stringify({frequency:60,resolution:2048}));
  });
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  const prefix=`
window.__shadowProbe={view:null,client:null,active:false,frames:[],passes:0,moving:false,force:false,poses:[],urgent:0,cameraUrgent:0,heldFrames:0,holdViolations:0,frameAt:0};
const shadowProbe=window.__shadowProbe;
const oldShadowFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){
  shadowProbe.view=this;
  if(shadowProbe.moving&&this.world){this.camera.position.x+=.025;this.controls.target.x+=.025;}
  shadowProbe.frameAt=now;
  const start=performance.now();
  const watched=shadowProbe.active&&this.daylight,shadow=watched?(this.room?.lighting.shadowLight??this.daylight.light).shadow:null;
  const passBefore=shadowProbe.passes,held=shadow?[...shadow.camera.matrixWorld.elements,...shadow.camera.projectionMatrix.elements].join(','):null;
  const result=oldShadowFrame.call(this,now);
  if(shadow&&shadowProbe.passes===passBefore){shadowProbe.heldFrames++;if(held!==[...shadow.camera.matrixWorld.elements,...shadow.camera.projectionMatrix.elements].join(','))shadowProbe.holdViolations++;}
  if(shadowProbe.active)shadowProbe.frames.push(performance.now()-start);
  return result;
};
`;
  await page.route('**/src/main.ts*',async route=>{
    const response=await route.fetch();
    const raw=await response.text(),body=prefix+raw+'\nshadowProbe.client=client;\n';
    if(!raw.includes('const native = new MainSimulationClient();'))throw Error('Expected native Main anchor absent');
    servedMain.push({url:route.request().url(),sha256:hash(raw),injectedSHA:hash(body)});
    await route.fulfill({response,body});
  });
  await page.route('**/src/render/SceneRenderCore.ts*',async route=>{
    const response=await route.fetch(),raw=await response.text(),needle='this.invalidatePausedShadow(urgentShadowViewChange);';
    if(raw.split(needle).length!==2)throw Error('Unique reviewed cadence anchor absent');
    const body=raw.replace(needle,'if(window.__shadowProbe?.active)window.__shadowProbe.cameraUrgent+=Number(urgentShadowViewChange);'+needle);
    servedCore.push({url:route.request().url(),sha256:hash(raw),injectedSHA:hash(body)});
    await route.fulfill({response,body});
  });
  try {
    await page.goto('/?scenario=camp&e2e&size=32&seed=42');
    await page.addStyleTag({content:'#fps-counter{visibility:hidden!important}'});
    await page.waitForFunction(()=>(window as any).__shadowProbe?.view?.world&&!document.querySelector<HTMLElement>('.game-shell')?.inert);
    const fixture=readFileSync('public/test-saves/v419/les-eclaircies.json','utf8');
    expect(hash(fixture)).toBe('49e5d50abfac5a2ac0e609378877bb645da3e4559286cff706a33dc00f0df19f');
    // Current decodeStoredSave returns Promise<string>, not a .raw union.
    const raw=await decodeStoredSave(fixture);
    await page.evaluate(value=>(window as any).__shadowProbe.client.load(value),raw);
    await page.evaluate(()=>(window as any).__shadowProbe.client.setSpeed(0));
    await page.waitForFunction(()=>(window as any).__shadowProbe.view.world?.width===250);
    const backend=await page.evaluate(()=>((window as any).__shadowProbe.view.backend));
    expect(backend).toBe('WebGPU');
    await page.evaluate(()=>{
      const probe=(window as any).__shadowProbe,view=probe.view,render=view.renderer.render;
      view.renderer.render=function(scene:unknown,camera:unknown){
        if(camera===(view.room?.lighting.shadowLight??view.daylight.light).shadow.camera){
          probe.passes++;
          if(probe.active)probe.poses.push({at:performance.now(),frameAt:probe.frameAt,
            view:[...view.camera.matrixWorld.elements],projection:[...view.camera.projectionMatrix.elements],
            shadowView:[...(view.room?.lighting.shadowLight??view.daylight.light).shadow.camera.matrixWorld.elements],shadowProjection:[...(view.room?.lighting.shadowLight??view.daylight.light).shadow.camera.projectionMatrix.elements]});
        }
        return render.call(this,scene,camera);
      };
      const invalidate=view.invalidatePausedShadow;
      view.invalidatePausedShadow=function(urgent=true){if(probe.active&&urgent)probe.urgent++;return invalidate.call(this,urgent);};
      const canReuse=view.pausedShadow.canReuse.bind(view.pausedShadow);
      view.pausedShadow.canReuse=(...args:unknown[])=>!probe.force&&canReuse(...args);
      view.focusPawn(view.world.pawns[0].id);
    });
    const sample=async(force:boolean,moving:boolean)=>{
      await page.evaluate(({force,moving})=>{
        const probe=(window as any).__shadowProbe;
        probe.force=force;probe.moving=moving;probe.view.invalidatePausedShadow();
      },{force,moving});
      await page.waitForTimeout(500);
      await page.evaluate(()=>{const probe=(window as any).__shadowProbe;probe.frames=[];probe.passes=0;probe.poses=[];probe.urgent=0;probe.cameraUrgent=0;probe.heldFrames=0;probe.holdViolations=0;probe.windowStart=performance.now();probe.active=true;});
      await page.waitForFunction(()=>(window as any).__shadowProbe.frames.length>=90);
      return page.evaluate(()=>{
        const probe=(window as any).__shadowProbe;probe.active=false;
        const sorted=[...probe.frames].sort((a,b)=>a-b);
        return {frames:sorted.length,passes:probe.passes,poses:probe.poses,urgent:probe.urgent,cameraUrgent:probe.cameraUrgent,heldFrames:probe.heldFrames,holdViolations:probe.holdViolations,durationMs:performance.now()-probe.windowStart,medianCpuMs:sorted[Math.floor(sorted.length/2)],p95CpuMs:sorted[Math.floor(sorted.length*.95)]};
      });
    };
    const cached=await sample(false,false);
    const uncached=await sample(true,false);
    const movingCached=await sample(false,true);
    const movingUncached=await sample(true,true);
    await page.evaluate(()=>{const probe=(window as any).__shadowProbe;probe.moving=false;probe.force=false;probe.view.invalidatePausedShadow();});
    await page.waitForTimeout(500);
    const canvas=page.locator('[data-testid="world-canvas"]');
    const pixelsCached=await canvas.screenshot();
    await page.evaluate(()=>{const probe=(window as any).__shadowProbe;probe.force=true;probe.view.invalidatePausedShadow();});
    await page.waitForTimeout(300);
    const pixelsRefreshed=await canvas.screenshot();
    console.log(JSON.stringify({backend,cached,uncached,movingCached,movingUncached,pixelsEqual:pixelsCached.equals(pixelsRefreshed),errors}));
    expect(pixelsCached.equals(pixelsRefreshed)).toBe(true);
    expect(cached.passes).toBeLessThan(3);
    expect(uncached.passes).toBeGreaterThan(50);
    expect(movingCached.passes).toBeGreaterThan(50);
    expect(movingUncached.passes).toBeGreaterThan(50);
    // Preserve the original paused/pixel assertions above before advancing World.
    expect(movingCached.poses.length).toBeGreaterThan(1);
    const first=movingCached.poses[0],last=movingCached.poses.at(-1)!;
    expect(first.view).not.toEqual(last.view);
    expect(first.shadowView.join(',')+'|'+first.shadowProjection.join(',')).not.toBe(last.shadowView.join(',')+'|'+last.shadowProjection.join(','));
    await page.evaluate(async()=>{const p=(window as any).__shadowProbe;p.force=false;p.moving=false;await p.client.setSpeed(1);});
    await page.waitForFunction(()=>(window as any).__shadowProbe.view.received?.speed===1);
    const activeMoving=await sample(false,true);
    // Include every pass. Explicit urgent invalidations may refresh before deadline;
    // their count is retained, not clipped or hidden from the result.
    expect(activeMoving.cameraUrgent).toBe(0);
    expect(activeMoving.heldFrames).toBeGreaterThan(0);
    expect(activeMoving.passes).toBeLessThan(activeMoving.frames);
    expect(activeMoving.holdViolations).toBe(0);
    expect(activeMoving.passes).toBeLessThanOrEqual(Math.ceil(activeMoving.durationMs*60/1000)+activeMoving.urgent+2);
    const projection=await page.evaluate(()=>{
      const p=(window as any).__shadowProbe,v=p.view;p.active=false;p.moving=false;
      const before=p.passes,old=v.camera.projectionMatrix.elements.slice();
      v.camera.zoom*=1.02;v.camera.updateProjectionMatrix();
      // Deterministic early frame before next scheduler deadline: projection must
      // still force a real native shadow pass; no shouldRefresh override.
      const at=Number.isFinite(v.shadowRefresh.lastCompleted)?v.shadowRefresh.lastCompleted+.001:performance.now();
      v.frame(at);
      return {passes:p.passes-before,old,next:v.camera.projectionMatrix.elements.slice(),shadowProjection:(v.room?.lighting.shadowLight??v.daylight.light).shadow.camera.projectionMatrix.elements.slice(),needsUpdate:(v.room?.lighting.shadowLight??v.daylight.light).shadow.needsUpdate};
    });
    expect(projection.next).not.toEqual(projection.old);
    expect(projection.passes).toBeGreaterThan(0);
    expect(projection.needsUpdate).toBe(false);
    // Retain the complete diagnostic even if the final console-error oracle fails.
    const result={browser:{channel:'chrome',version:browser.version()},diagnosticOnly:true,benchmark:false,servedMain,servedCore,cached,uncached,movingCached,movingUncached,activeMoving,projection,errors};
    writeFileSync(resolve(output,'shadow-cadence-native.json'),JSON.stringify(result,null,2));
    expect(errors).toEqual([]);
    expect(servedMain).toHaveLength(1);
    expect(servedCore).toHaveLength(1);
  }finally{await browser.close();}
});
