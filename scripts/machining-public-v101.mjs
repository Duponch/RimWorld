import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {decodeStoredSave} from '../src/ui/save-storage-codec.ts';
import {validateWorld} from '../src/sim/serialization.ts';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('@playwright/test');
const url='https://lisiere-duponch.netlify.app';
const report={url,checkedAt:new Date().toISOString(),errors:[]};
report.bundle=[];
for(const file of ['index.html',...(await readdir('dist/assets')).filter(name=>/\.(js|css)$/.test(name)).map(name=>`assets/${name}`)]){
  const local=await readFile(`dist/${file}`),served=await fetch(`${url}/${file}`);assert.equal(served.status,200);
  const data=Buffer.from(await served.arrayBuffer());
  // Netlify adds one hosting-information HTML comment after charset. Asset
  // bytes remain exact; every other byte of the entry document must match too.
  const checked=file==='index.html'?Buffer.from(data.toString().replace(/\n<!-- This site is hosted on Netlify\.[\s\S]*?Netlify hosting facts for this site: static\/SSR served via Netlify Edge\. -->/,'')):data;
  assert.deepEqual(checked,local);
  report.bundle.push({file,sha256:createHash('sha256').update(data).digest('hex'),bytes:data.length,hostingCommentRemoved:file==='index.html'&&checked.length!==data.length});
}
const expected=await readFile('public/test-saves/v101/atelier.json');
const response=await fetch(`${url}/test-saves/v101/atelier.json`);
assert.equal(response.status,200);
const bytes=Buffer.from(await response.arrayBuffer());assert.deepEqual(bytes,expected);
report.sha256=createHash('sha256').update(bytes).digest('hex');report.bytes=bytes.length;
const browser=await chromium.launch({channel:'chromium',headless:false});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(30000);
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))report.errors.push(m.text());});
  await page.goto(url);
  const front=page.locator('.front-menu');
  await front.getByRole('button',{name:'Charger une partie',exact:true}).click();
  await front.locator('input[type="file"]').setInputFiles({name:'atelier-v101.json',mimeType:'application/json',buffer:bytes});
  await front.waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.querySelector('[data-speed="0"]').getAttribute('aria-pressed')==='true');
  assert.equal(await page.locator('.colonist').count(),1);
  await page.locator('[data-panel="menu"]').click();await page.locator('#save').click();
  await page.waitForFunction(()=>localStorage.getItem('lisiere.save.v1')!==null);
  const saved=JSON.parse(await decodeStoredSave(await page.evaluate(()=>localStorage.getItem('lisiere.save.v1'))));
  assert.deepEqual(saved,JSON.parse(bytes.toString()));assert.deepEqual(validateWorld(saved),[]);
  await page.keyboard.press('Escape');await page.locator('[data-panel="research"]').click();
  assert.match(await page.locator('#research-panel').innerText(),/Usinage/);
  assert.match(await page.locator('#research-panel').innerText(),/Armurerie/);
  await page.keyboard.press('Escape');await page.locator('[data-panel="architect"]').click();
  await page.locator('[data-category="production"]').click();
  assert.equal(await page.locator('[data-tool="machining-table"]').isEnabled(),true);
  await page.keyboard.press('Escape');await page.screenshot({path:'artifacts/machining-public-v101.png'});
  assert.deepEqual(report.errors,[]);
  Object.assign(report,{schema:saved.schemaVersion,tick:saved.tick,paused:true,exactImportAndSave:true,machiningUnlocked:true,passed:true});
}finally{
  await browser.close();await writeFile('artifacts/machining-public-v101.json',JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report));
