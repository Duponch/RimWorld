import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import { resolve } from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const { chromium } = await import('@playwright/test');
const legacy = stripTypeScriptTypes(execFileSync('git', ['show', '834ce7e:src/render/HygieneLayer.ts'], { encoding: 'utf8' }))
  .replace('export class HygieneLayer {', 'export class HygieneLayer { filth={prepareForCompile:()=>()=>{}}; dispose(){}');
const probe = `window.__filthBench={view:null,active:false,frames:[],intervals:[],adoptions:[],previous:null};
const ff=ColonyRenderer.prototype.frame,fa=ColonyRenderer.prototype.applyWorld;
ColonyRenderer.prototype.frame=function(now){const b=window.__filthBench;b.view=this;const t=performance.now(),v=ff.call(this,now);if(b.active&&!this.preparing){b.frames.push(performance.now()-t);if(b.previous!==null)b.intervals.push(now-b.previous);b.previous=now;}return v;};
ColonyRenderer.prototype.applyWorld=function(...args){const t=performance.now(),v=fa.apply(this,args);if(window.__filthBench.active)window.__filthBench.adoptions.push(performance.now()-t);return v;};`;
const stats = values => { const s = [...values].sort((a,b)=>a-b), q = p => s.length ? +s[Math.min(s.length-1,Math.floor(p*s.length))].toFixed(3) : null; return { count:s.length,p50:q(.5),p95:q(.95),max:q(1) }; };
const results = [], errors = [];
const wholeMap = process.env.FILTH_OVERVIEW === '1';
const browser = await chromium.launch({ channel: 'chromium', headless: false });
try {
  for (const variant of wholeMap ? ['V107-alpha'] : ['V106-boxes', 'V107-alpha']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type()==='error' || /GPUValidationError|invalid pipeline/i.test(m.text())) errors.push(m.text()); });
    if (variant === 'V106-boxes') await page.route('**/src/render/HygieneLayer.ts*', async route => {
      const response = await route.fetch(), body = await response.text();
      const three = body.match(/from ["']([^"']*three_webgpu[^"']*)["']/)?.[1]; assert.ok(three);
      await route.fulfill({ response, body: legacy.replace("'three/webgpu'", JSON.stringify(three)) });
    });
    await page.route('**/src/main.ts*', async route => { const response = await route.fetch(); await route.fulfill({ response, body: probe + await response.text() }); });
    await page.goto('http://127.0.0.1:5173/?e2e');
    const fixture = await page.evaluate(async () => {
      const { deserializeWorld, serializeWorld, validateWorld } = await import('/src/sim/serialization.ts');
      const { addFilth } = await import('/src/sim/filth.ts');
      const { decodeStoredSave, encodeStoredSave } = await import('/src/ui/save-storage-codec.ts');
      const kinds = ['dirt','trash','blood','ash','vomit','corpse-bile'];
      const w = deserializeWorld(await decodeStoredSave(await (await fetch('/test-saves/v98/mixed-100.json')).text()));
      // Dense artificial contamination across the map, preserving the source file.
      let n=0;
      for(let z=12;z<238;z+=4)for(let x=12;x<238;x+=4){
        if(['rock','water'].includes(w.tiles[z*w.width+x].terrain))continue;
        const kind=kinds[n%kinds.length];
        if(kind==='dirt'||kind==='trash')w.tiles[z*w.width+x].floor='marble-tile';
        if(addFilth(w,{x,z},kind,5))n++;
      }
      const problems=validateWorld(w); if(problems.length)throw new Error(JSON.stringify(problems));
      const data=serializeWorld(w);localStorage.setItem('lisiere.save.v1',await encodeStoredSave(data));
      return {traces:w.filth.items.length,layers:w.filth.items.reduce((n,f)=>n+f.thickness,0),actors:w.pawns.length,tick:w.tick,serializedBytes:data.length};
    });
    await page.locator('.front-menu').getByRole('button', { name:/^Charger/ }).click();
    await page.locator('input[name="front-save"][value="lisiere.save.v1"]').check();
    await page.locator('.front-menu').getByRole('button',{name:'Charger',exact:true}).click();
    await page.waitForFunction(actors=>window.__lisiere?.world?.pawns.length===actors&&window.__filthBench.view&&!window.__filthBench.view.preparing,fixture.actors);
    await page.mouse.move(750,400);await page.mouse.wheel(0,3300);await page.waitForTimeout(1000);
    if(wholeMap){await page.mouse.wheel(0,2500);await page.waitForTimeout(750);}
    for (const speed of [0,6]) {
      await page.locator(`[data-speed="${speed}"]`).click();await page.waitForTimeout(1000);
      const start=await page.evaluate(()=>{const b=window.__filthBench;b.frames=[];b.intervals=[];b.adoptions=[];b.previous=null;b.active=true;return {tick:b.view.world.tick,time:performance.now()};});
      await page.waitForTimeout(6000);
      const measured=await page.evaluate(()=>{const b=window.__filthBench;b.active=false;const a=b.view.renderer.getContext().getConfiguration().device.adapterInfo;return {frames:b.frames,intervals:b.intervals,adoptions:b.adoptions,tick:b.view.world.tick,time:performance.now(),backend:b.view.backend,span:b.view.rig.span,adapter:{vendor:a.vendor,architecture:a.architecture,device:a.device,description:a.description}};});
      assert.equal(measured.backend,'WebGPU');assert.ok(measured.frames.length>=240);
      results.push({variant,speed,fixture,adapter:measured.adapter,span:measured.span,frameCpu:stats(measured.frames),image:stats(measured.intervals),adoptionCpu:stats(measured.adoptions),ticks:measured.tick-start.tick,actualSpeed:(measured.tick-start.tick)/((measured.time-start.time)/1000)/6});
    }
    await page.locator('[data-speed="0"]').click();
    assert.deepEqual(await page.evaluate(async()=>{const {validateWorld}=await import('/src/sim/serialization.ts');return validateWorld(window.__lisiere.world);}),[]);
    await page.screenshot({path:`artifacts/filth-load-${variant}${wholeMap?'-overview':''}.png`});await page.close();
  }
  assert.deepEqual(errors,[]);
  writeFileSync(`artifacts/filth-render${wholeMap?'-overview':''}-v107.json`,JSON.stringify({date:new Date().toISOString(),protocol:'Successive native WebGPU runs, 1440×1000, immutable mixed-100 fixture plus prepared dense filth. Baseline uses V106 HygieneLayer restored in HTTP response with compile/dispose compatibility shim. '+(wholeMap?'Maximum distant view, V107 only. ':'Wide view (span 184.32 cells), not the whole map. ')+'Pause then 6×, 1s settling + 6s each. Different intended visuals: not a quality-identical GPU microbenchmark. RAF includes scheduling; frame CPU excludes GPU execution. No simulation rules changed.',results,errors},null,2)+'\n');
  console.log(JSON.stringify(results.map(r=>({variant:r.variant,speed:r.speed,traces:r.fixture.traces,layers:r.fixture.layers,image:r.image,frameCpu:r.frameCpu,actualSpeed:r.actualSpeed})),null,2));
} finally {await browser.close();}
