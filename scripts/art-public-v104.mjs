import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {decodeStoredSave} from '../src/ui/save-storage-codec.ts';
import {deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('@playwright/test'),url='https://lisiere-duponch.netlify.app';
const report={url,checkedAt:new Date().toISOString(),errors:[],bundle:[],colonies:[]};
for(const file of ['index.html',...(await readdir('dist/assets')).filter(name=>/\.(js|css)$/.test(name)).map(name=>`assets/${name}`)]){
  const local=await readFile(`dist/${file}`),served=await fetch(`${url}/${file}`);assert.equal(served.status,200);
  const data=Buffer.from(await served.arrayBuffer());
  const checked=file==='index.html'?Buffer.from(data.toString().replace(/\n<!-- This site is hosted on Netlify\.[\s\S]*?Netlify hosting facts for this site: static\/SSR served via Netlify Edge\. -->/,'')):data;
  assert.deepEqual(checked,local);report.bundle.push({file,sha256:createHash('sha256').update(data).digest('hex'),bytes:data.length});
}
const manifest=await readFile('public/test-saves/manifest.json'),response=await fetch(`${url}/test-saves/manifest.json`);
assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),manifest);
const entries=JSON.parse(manifest).saves;assert.equal(entries.length,9);
const browser=await chromium.launch({channel:'chromium',headless:false});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(30000);
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))report.errors.push(m.text());});
  await page.goto(url);const front=page.locator('.front-menu');
  await front.getByRole('button',{name:'Charger une partie',exact:true}).click();
  for(const id of ['salles-v103','art-v104']){
    const entry=entries.find(e=>e.id===id),path=`test-saves/${entry.release}/${entry.filename}`;
    const bytes=await readFile(`public/${path}`),remote=await fetch(`${url}/${path}`);
    assert.equal(remote.status,200);assert.deepEqual(Buffer.from(await remote.arrayBuffer()),bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);
    const expected=deserializeWorld(bytes.toString());
    await front.getByRole('button',{name:'Colonies de test',exact:true}).click();
    await front.locator(`input[name="test-colony"][value="${id}"]`).check();
    assert.equal(await front.locator('input[name="test-colony"]').count(),9);
    await page.screenshot({path:`artifacts/art-public-${id}-catalogue-v104.png`});
    await front.getByRole('button',{name:'Charger cette colonie',exact:true}).click();
    await front.waitFor({state:'hidden'});
    await page.waitForFunction(()=>document.querySelector('[data-speed="0"]').getAttribute('aria-pressed')==='true');
    await page.locator('[data-panel="menu"]').click();
    const old=await page.evaluate(()=>localStorage.getItem('lisiere.save.v1'));
    await page.locator('#save').click();
    await page.waitForFunction(before=>localStorage.getItem('lisiere.save.v1')!==before,old);
    const saved=JSON.parse(await decodeStoredSave(await page.evaluate(()=>localStorage.getItem('lisiere.save.v1'))));
    assert.deepEqual(validateWorld(saved),[]);assert.deepEqual(saved,expected);
    report.colonies.push({id,sha256:entry.sha256,tick:saved.tick,schema:saved.schemaVersion,exactLoadAndSave:true});
    if(id==='salles-v103')await page.locator('#browse-saves').click();
    else{
      await page.keyboard.press('Escape');await page.locator('[data-panel="work"]').click();
      const text=await page.locator('#work-panel').innerText();assert.match(text,/Art/);
      report.work=await page.locator('#work-panel .work-table-wrap').evaluate(node=>({client:node.clientWidth,scroll:node.scrollWidth}));
      assert.equal(report.work.client,report.work.scroll);
      await page.screenshot({path:'artifacts/art-public-work-v104.png'});
    }
  }
  assert.equal(await page.evaluate(()=>typeof window.__lisiere),'undefined');
  assert.deepEqual(report.errors,[]);report.passed=true;
}finally{await browser.close();await writeFile('artifacts/art-public-v104.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
