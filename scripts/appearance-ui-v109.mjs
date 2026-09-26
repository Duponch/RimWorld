import {resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('playwright');
const browser=await chromium.launch({channel:'chromium',headless:false});
const report={portraits:[],errors:[]};
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>report.errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))report.errors.push(m.text());});
 await page.route('**/src/main.ts*',async r=>{const response=await r.fetch();await r.fulfill({response,body:`const originalFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(...args){window.__appearanceView=this;return originalFrame.apply(this,args);};\n`+await response.text()});});
 await page.route('**/src/bridge/snapshots.ts*',async r=>{const response=await r.fetch();await r.fulfill({response,body:await response.text()+"\nif(typeof window!=='undefined'){window.__appearanceResync=0;const original=SnapshotDecoder.prototype.adopt;SnapshotDecoder.prototype.adopt=function(...args){const result=original.apply(this,args);if(result.status==='resync')window.__appearanceResync++;return result;};}"});});
 await page.goto('http://127.0.0.1:5173/?e2e');
 await page.locator('.front-menu').getByRole('button',{name:/^Charger/}).click();
 await page.getByRole('button',{name:'Colonies de test',exact:true}).click();
 await page.locator('input[name="test-colony"][value="visages-armurerie-v109"]').check();
 await page.locator('.front-menu').getByRole('button',{name:'Charger cette colonie',exact:true}).click();
 await page.waitForFunction(()=>window.__lisiere?.world?.pawns.length===5&&window.__appearanceView&&!window.__appearanceView.preparing,undefined,{timeout:60000});
 assert.equal(await page.evaluate(()=>window.__lisiere.backend),'WebGPU');
 await page.evaluate(async()=>{await document.fonts.ready;const v=window.__appearanceView;v.controls.enableDamping=false;v.rig.setMode('orthographic');v.controls.target.set(14,0,12);v.camera.position.set(29,23,33);v.camera.zoom=2.8;v.camera.updateProjectionMatrix();v.controls.update();});
 await page.waitForTimeout(500);
 const ids=await page.evaluate(()=>window.__lisiere.world.pawns.map(p=>p.id));
 for(const id of ids){
  await page.locator(`[data-pawn="${id}"]`).click();await page.getByRole('tab',{name:'Bio',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.appearance-inspection img')?.complete);
  assert.equal(await page.locator('.appearance-inspection').count(),1);
  const portrait=await page.locator(`[data-pawn="${id}"] .portrait-head`).evaluate(n=>getComputedStyle(n).backgroundImage);
  assert.match(portrait,/data:image\/svg\+xml/);report.portraits.push({id,text:await page.locator('.appearance-inspection-description').textContent(),portraitBytes:portrait.length});
 }
 await page.screenshot({path:'artifacts/appearance-v109-bio.png'});
 await page.keyboard.press('Escape');
 for(const [name,position] of [['front',[14,9,31]],['side',[32,9,12]],['back',[14,9,-5]]]){
  await page.evaluate(pos=>{const v=window.__appearanceView;v.camera.position.set(...pos);v.controls.update();},position);
  await page.waitForTimeout(250);await page.screenshot({path:`artifacts/appearance-v109-${name}.png`});
 }
 assert.deepEqual(report.errors,[]);
 // Real input: portrait selection, Research, existing bill and physical manufacturing.
 await page.locator('[data-panel="research"]').click();
 report.research=await page.locator('[data-flak-armor-status]').textContent();assert.match(report.research,/Terminée/);
 await page.keyboard.press('Escape');
 await page.locator('[data-speed="6"]').click();
 await page.waitForFunction(()=>{if(!window.__lisiere.world.piles.some(p=>p.item==='flak-vest'))return false;document.querySelector('[data-speed="0"]').click();return true;},undefined,{timeout:150000});
 await page.waitForFunction(()=>document.querySelector('[data-speed="0"]').getAttribute('aria-pressed')==='true');
 report.finished=await page.evaluate(async()=>{const w=window.__lisiere.world,{validateWorld}=await import('/src/sim/serialization.ts');return {tick:w.tick,vest:w.piles.find(p=>p.item==='flak-vest'),errors:validateWorld(w),profiles:w.pawns.map(p=>p.appearance)};});
 assert.deepEqual(report.finished.errors,[]);assert.deepEqual(report.errors,[]);report.resync=await page.evaluate(()=>window.__appearanceResync);assert.equal(report.resync,0);
 await page.screenshot({path:'artifacts/appearance-v109-work.png'});
 writeFileSync('artifacts/appearance-ui-v109.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({portraits:report.portraits,finished:report.finished.tick,errors:report.errors}));
}catch(error){writeFileSync('artifacts/appearance-ui-v109-failed.json',JSON.stringify({...report,failure:String(error)},null,2)+'\n');throw error;}
finally{await browser.close();}
