import {resolve} from 'node:path';
import {writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
mkdirSync('tmp/appearance-baseline',{recursive:true});
writeFileSync('tmp/appearance-baseline/pawn-portrait.ts',execFileSync('git',['show','e510f58:src/ui/pawn-portrait.ts'],{encoding:'utf8'}).replaceAll("'../render/","'/src/render/").replaceAll("'../sim/","'/src/sim/"));
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('playwright');
const browser=await chromium.launch({channel:'chromium',headless:false});
const report={errors:[],portraits:[],images:[]};
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>report.errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))report.errors.push(m.text());});
  await page.route('**/src/main.ts*',async r=>{const response=await r.fetch();await r.fulfill({response,body:`const savedFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(...args){window.__appearanceView=this;return savedFrame.apply(this,args);};\n`+await response.text()});});
  await page.goto('http://127.0.0.1:5173/?e2e');
  await page.locator('.front-menu').getByRole('button',{name:/^Charger/}).click();
  await page.getByRole('button',{name:'Colonies de test',exact:true}).click();
  await page.locator('input[name="test-colony"][value="visages-armurerie-v109"]').check();
  await page.locator('.front-menu').getByRole('button',{name:'Charger cette colonie',exact:true}).click();
  await page.waitForFunction(()=>window.__lisiere?.world?.pawns.length===5&&window.__appearanceView&&!window.__appearanceView.preparing,undefined,{timeout:60000});
  await page.evaluate(async()=>{await document.fonts.ready;const v=window.__appearanceView;v.controls.enableDamping=false;v.rig.setMode('orthographic');v.controls.target.set(14,0,12);v.camera.zoom=2.8;v.camera.updateProjectionMatrix();v.controls.update();});
  await page.waitForTimeout(350);
  for(const pawn of await page.evaluate(()=>window.__lisiere.world.pawns.map(p=>({id:p.id,name:p.name})))){
    await page.locator(`[data-pawn="${pawn.id}"]`).click();await page.getByRole('tab',{name:'Bio',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.appearance-inspection img')?.complete);
    const portrait=await page.locator(`[data-pawn="${pawn.id}"] .portrait-head`).evaluate(n=>getComputedStyle(n).backgroundImage);
    const bio=await page.locator('.appearance-inspection img').evaluate(n=>({width:n.naturalWidth,height:n.naturalHeight,src:n.src}));
    assert.match(portrait,/data:image\/svg\+xml/);assert.ok(decodeURIComponent(bio.src).includes('data-source="pawn-geometry"'));
    assert.equal(bio.width,96);assert.equal(bio.height,96);
    report.portraits.push({name:pawn.name,bytes:portrait.length,matching:portrait.includes(bio.src.slice(0,35))});
  }
  await page.locator('.appearance-inspection').scrollIntoViewIfNeeded();
  await page.screenshot({path:'artifacts/appearance-v111-bio.png'});
  await page.keyboard.press('Escape');
  for(const [name,position] of [['front',[14,9,31]],['side',[32,9,12]],['back',[14,9,-5]]]){
    await page.evaluate(pos=>{const v=window.__appearanceView;v.camera.position.set(...pos);v.controls.update();},position);
    await page.waitForTimeout(300);await page.screenshot({path:`artifacts/appearance-v111-${name}.png`});report.images.push(name);
  }
  for(const [name,position] of [['front',[11,7,26]],['side',[26,7,11]],['back',[11,7,-4]]]){
    await page.evaluate(pos=>{const v=window.__appearanceView;v.controls.target.set(11,0,11);v.camera.position.set(...pos);v.camera.zoom=8;v.camera.updateProjectionMatrix();v.controls.update();},position);
    await page.waitForTimeout(300);await page.screenshot({path:`artifacts/appearance-v111-close-${name}.png`});report.images.push(`close-${name}`);
  }
  report.batch=await page.evaluate(async()=>{
    const {createPawnAppearance}=await import('/src/sim/pawn-appearance.ts');
    const {portraitDataUrl,portraitCacheSize}=await import('/src/ui/pawn-portrait.ts');
    const old=await import('/tmp/appearance-baseline/pawn-portrait.ts');
    const {apparelAppearance}=await import('/src/render/character-apparel.ts');
    const look=apparelAppearance(),baselineStart=performance.now();
    for(let i=0;i<100;i++)old.portraitDataUrl(createPawnAppearance(42,i+1000,`Avatar ${i}`),look);
    const baselineColdMs=performance.now()-baselineStart,t0=performance.now();
    for(let i=0;i<100;i++)portraitDataUrl(createPawnAppearance(42,i+1000,`Avatar ${i}`),look);
    const coldMs=performance.now()-t0,t1=performance.now();
    for(let i=0;i<100;i++)portraitDataUrl(createPawnAppearance(42,i+1000,`Avatar ${i}`),look);
    return {baselineColdMs,coldMs,warmMs:performance.now()-t1,cacheSize:portraitCacheSize()};
  });
  assert.deepEqual(report.errors,[]);
  report.backend=await page.evaluate(()=>window.__lisiere.backend);assert.equal(report.backend,'WebGPU');
  writeFileSync('artifacts/appearance-ui-v111.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();}
