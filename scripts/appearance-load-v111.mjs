import { resolve } from 'node:path';
import { writeFileSync,mkdirSync } from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
// Freeze the committed V110 human mesh, retaining the current simulation in both arms.
mkdirSync('tmp/appearance-baseline',{recursive:true});
for(const name of ['PawnLayer.ts','pawn-geometry.ts','pawn-appearance-shape.ts','pawn-appearance-nodes.ts']){let source=execFileSync('git',['show',`30eb949:src/render/${name}`],{encoding:'utf8'}).replaceAll("'../","'/src/").replaceAll("'./","'/src/render/");for(const part of ['pawn-geometry','pawn-appearance-shape','pawn-appearance-nodes'])if(name==='PawnLayer.ts'||name==='pawn-geometry.ts'&&part==='pawn-appearance-shape'||name==='pawn-appearance-nodes.ts'&&part==='pawn-appearance-shape')source=source.replaceAll("'/src/render/"+part+"'","'/tmp/appearance-baseline/"+part+".ts'");writeFileSync(`tmp/appearance-baseline/${name}`,source);}
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');
const {chromium}=await import('playwright');
const stats=values=>{const s=[...values].sort((a,b)=>a-b),q=p=>s.length?+s[Math.min(s.length-1,Math.floor(s.length*p))].toFixed(3):null;return {count:s.length,p50:q(.5),p95:q(.95),max:q(1)};};
const probe=`window.__load={view:null,active:false,frames:[],intervals:[],lags:[],previous:null};
const loadFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){const b=window.__load;b.view=this;const start=performance.now(),r=loadFrame.call(this,now);if(b.active&&!this.preparing){b.frames.push(performance.now()-start);if(b.previous!==null)b.intervals.push(now-b.previous);b.previous=now;b.lags.push(this.received.world.tick-this.timeline.tick);}return r;};`;
const reports=[],errors=[],browser=await chromium.launch({channel:'chromium',headless:false});
try {
 for(const version of ['V110','V111','V111','V110']){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))errors.push(m.text());});
  if(version==='V110')await page.route('**/src/render/ColonyRenderer.ts*',async route=>{const response=await route.fetch(),body=await response.text();assert.match(body,/\/src\/render\/PawnLayer.ts/);await route.fulfill({response,body:body.replace(/\/src\/render\/PawnLayer.ts[^"']*/g,'/tmp/appearance-baseline/PawnLayer.ts')});});
  await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
  await page.goto('http://127.0.0.1:5173/?e2e');
  await page.evaluate(async()=>localStorage.setItem('lisiere.save.v1',await(await fetch('/test-saves/v98/mixed-100.json')).text()));
  await page.locator('.front-menu').getByRole('button',{name:/^Charger/}).click();await page.locator('input[name="front-save"][value="lisiere.save.v1"]').check();await page.locator('.front-menu').getByRole('button',{name:'Charger',exact:true}).click();
  await page.waitForFunction(()=>window.__load.view?.world?.pawns.length===104&&!window.__load.view.preparing);
  await page.mouse.move(750,400);await page.mouse.wheel(0,5800);await page.waitForTimeout(750);
  await page.evaluate(()=>{const v=window.__load.view;v.controls.enableDamping=false;v.camera.zoom=(v.camera.top-v.camera.bottom)/375.5533905932738;v.camera.updateProjectionMatrix();v.controls.update();});
  const windows=[];
  for(const speed of [0,6]){
   await page.locator(`[data-speed="${speed}"]`).click();await page.waitForTimeout(1000);
   const start=await page.evaluate(()=>{const b=window.__load;b.frames=[];b.intervals=[];b.lags=[];b.previous=null;b.active=true;return {tick:b.view.received.world.tick,time:performance.now()};});
   await page.waitForTimeout(6000);
   const data=await page.evaluate(()=>{const b=window.__load;b.active=false;return {frames:b.frames,intervals:b.intervals,lags:b.lags,time:performance.now(),tick:b.view.received.world.tick,span:b.view.rig.span,backend:b.view.backend};});
   assert.equal(data.backend,'WebGPU');assert.ok(data.frames.length>100);assert.ok(Math.abs(data.span-375.5533905932738)<.001);
   windows.push({speed,span:data.span,frameCpu:stats(data.frames),image:stats(data.intervals),presentationLagTicks:stats(data.lags),actualSpeed:(data.tick-start.tick)/((data.time-start.time)/1000)/6});
  }
  await page.locator('[data-speed="0"]').click();
  assert.deepEqual(await page.evaluate(async()=>{const {validateWorld}=await import('/src/sim/serialization.ts');return validateWorld(window.__lisiere.world);}),[]);
  reports.push({version,windows});await page.close();console.log(JSON.stringify(reports.at(-1)));
 }
 assert.deepEqual(errors,[]);
 writeFileSync('artifacts/appearance-load-v111.json',JSON.stringify({date:new Date().toISOString(),protocol:'Native WebGPU, 1440x1000, mixed-100 immutable save, all-map view, V110/V111/V111/V110 appearance renderers sequentially; same current simulation and immutable scene, pause and 6x windows of six seconds after one second settling. RAF wall time and render CPU are separate; not a GPU timer or simulation microbenchmark.',reports,errors},null,2)+'\n');
}finally{await browser.close();}
