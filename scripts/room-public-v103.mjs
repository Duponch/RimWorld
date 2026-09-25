import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {decodeStoredSave} from '../src/ui/save-storage-codec.ts';
import {validateWorld} from '../src/sim/serialization.ts';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('@playwright/test'),url='https://lisiere-duponch.netlify.app';
const report={url,checkedAt:new Date().toISOString(),errors:[],bundle:[]};
for(const file of ['index.html',...(await readdir('dist/assets')).filter(name=>/\.(js|css)$/.test(name)).map(name=>`assets/${name}`)]){
  const local=await readFile(`dist/${file}`),served=await fetch(`${url}/${file}`);assert.equal(served.status,200);
  const data=Buffer.from(await served.arrayBuffer());
  const checked=file==='index.html'?Buffer.from(data.toString().replace(/\n<!-- This site is hosted on Netlify\.[\s\S]*?Netlify hosting facts for this site: static\/SSR served via Netlify Edge\. -->/,'')):data;
  assert.deepEqual(checked,local);report.bundle.push({file,sha256:createHash('sha256').update(data).digest('hex'),bytes:data.length});
}
const bytes=await readFile('public/test-saves/v103/salles.json'),response=await fetch(`${url}/test-saves/v103/salles.json`);
assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
report.demoHash=createHash('sha256').update(bytes).digest('hex');
const browser=await chromium.launch({channel:'chromium',headless:false});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(30000);
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))report.errors.push(m.text());});
  await page.goto(url);const front=page.locator('.front-menu');
  await front.getByRole('button',{name:'Charger une partie',exact:true}).click();
  await front.locator('input[type="file"]').setInputFiles({name:'salles-v103.json',mimeType:'application/json',buffer:bytes});
  await front.waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.querySelector('[data-speed="0"]').getAttribute('aria-pressed')==='true');
  await page.locator('[data-panel="menu"]').click();await page.locator('#save').click();
  await page.waitForFunction(()=>localStorage.getItem('lisiere.save.v1')!==null);
  const initial=await page.evaluate(()=>localStorage.getItem('lisiere.save.v1'));
  assert.deepEqual(JSON.parse(await decodeStoredSave(initial)),JSON.parse(bytes.toString()));
  await page.keyboard.press('Escape');await page.locator('.colonist').first().click();
  await page.locator('[data-colonist-tab="needs"]').click();await page.locator('[data-speed="6"]').click();
  await page.locator('[data-thought="room-dining"]').waitFor();await page.locator('[data-speed="0"]').click();
  await page.locator('[data-thought="room-dining"]').scrollIntoViewIfNeeded();
  assert.match(await page.locator('[data-thought="room-dining"]').innerText(),/Salle du dernier repas/);
  await page.screenshot({path:'artifacts/room-public-v103.png'});
  await page.locator('[data-panel="menu"]').click();await page.locator('#save').click();
  await page.waitForFunction(before=>localStorage.getItem('lisiere.save.v1')!==before,initial);
  const saved=JSON.parse(await decodeStoredSave(await page.evaluate(()=>localStorage.getItem('lisiere.save.v1'))));
  assert.deepEqual(validateWorld(saved),[]);assert.ok(saved.pawns[0].hunger>50);
  assert.ok(saved.pawns[0].roomMemories.some(m=>m.kind==='dining'&&m.stage===7&&m.expiresAt>saved.tick));
  assert.deepEqual(report.errors,[]);
  Object.assign(report,{schema:saved.schemaVersion,tick:saved.tick,exactImportAndSave:true,memories:saved.pawns[0].roomMemories,passed:true});
}finally{await browser.close();await writeFile('artifacts/room-public-v103.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
