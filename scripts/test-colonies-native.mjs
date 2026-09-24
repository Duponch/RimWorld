import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {decodeStoredSave} from '../src/ui/save-storage-codec.ts';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('@playwright/test');
const url=process.env.TEST_COLONIES_URL??'http://127.0.0.1:5173';
const local=new URL(url).hostname==='127.0.0.1';
const report={url,checkedAt:new Date().toISOString(),profiles:[],layouts:[],errors:[]};
const manifest=JSON.parse(await readFile('public/test-saves/v98/manifest.json','utf8'));
const browser=await chromium.launch({channel:'chromium',headless:false});
const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
page.setDefaultTimeout(30000);
page.on('pageerror',error=>report.errors.push(error.message));
page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))report.errors.push(m.text());});
const front=page.locator('.front-menu');
const button=name=>front.getByRole('button',{name,exact:true});
const slots=()=>page.evaluate(()=>({manual:localStorage.getItem('lisiere.save.v1'),previous:localStorage.getItem('lisiere.previous.v1')}));
async function openLoad(){
  await page.locator('[data-panel="menu"]').click();
  await page.locator('#browse-saves').click();
  await button('Colonies de test').waitFor();
}
async function catalogue(){
  await button('Colonies de test').click();
  await button('Charger cette colonie').waitFor();
  assert.equal(await front.locator('[name="test-colony"]').count(),6);
}
async function loaded(){
  await front.waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.querySelector('[data-speed="0"]').getAttribute('aria-pressed')==='true');
}
try{
  await mkdir('tmp',{recursive:true});
  assert.equal((await page.goto(url+(local?'/?e2e':'/'))).status(),200);
  await button('Charger une partie').click();await catalogue();
  for(const viewport of [{width:1440,height:1000},{width:1366,height:768}]){
    await page.setViewportSize(viewport);
    const layout=await front.evaluate(root=>{
      const rect=root.querySelector('.front-footer').getBoundingClientRect();
      return {scrollWidth:root.scrollWidth,width:root.clientWidth,footerBottom:rect.bottom,height:innerHeight};
    });
    assert.ok(layout.scrollWidth<=layout.width+1);assert.ok(layout.footerBottom<=layout.height);
    report.layouts.push({...viewport,...layout});
  }
  await page.screenshot({path:`artifacts/test-colonies-v98-${local?'local':'public'}-catalogue.png`});
  await page.setViewportSize({width:1440,height:1000});
  const downloadEvent=page.waitForEvent('download');await button('Télécharger le fichier').click();
  const download=await downloadEvent;await download.saveAs('tmp/test-colony-v98-download.json');
  const downloaded=await readFile('tmp/test-colony-v98-download.json','utf8');
  assert.equal(createHash('sha256').update(await decodeStoredSave(downloaded)).digest('hex'),manifest.saves[0].sha256);
  report.download=true;
  // An isolated browser context contains a real manual save throughout the test.
  await page.evaluate(data=>localStorage.setItem('lisiere.save.v1',data),downloaded);
  for(const entry of manifest.saves){
    await front.locator(`[name="test-colony"][value="${entry.id}"]`).check();
    const start=Date.now();await button('Charger cette colonie').click();await loaded();
    const count=await page.locator('.colonist').count();assert.equal(count,entry.colonists);
    const state=local?await page.evaluate(()=>({tick:window.__lisiere.tick,pawns:window.__lisiere.world.pawns.length})):null;
    if(state){assert.equal(state.tick,entry.tick);assert.equal(state.pawns,entry.pawns);}
    const before=await slots();assert.equal(before.manual,downloaded);
    await page.locator('[data-speed="6"]').click();
    if(local)await page.waitForFunction(tick=>window.__lisiere.tick>tick+2,entry.tick);
    else await page.waitForTimeout(1500);
    await page.locator('[data-speed="0"]').click();
    await page.waitForFunction(()=>document.querySelector('[data-speed="0"]').getAttribute('aria-pressed')==='true');
    const tick=local?await page.evaluate(()=>window.__lisiere.tick):null;
    report.profiles.push({id:entry.id,colonists:count,loadedPaused:true,startTick:entry.tick,endTick:tick,elapsedMs:Date.now()-start});
    if(entry.id==='mixed-100'||entry.id==='energy-food-12')await page.screenshot({path:`artifacts/test-colonies-v98-${local?'local':'public'}-${entry.id}.png`});
    const previous=local?await page.evaluate(()=>window.__lisiere.world):null;
    await openLoad();
    if(entry.id==='energy-food-12'){
      const preserved=await slots();
      await front.locator('input[type="file"]').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"schemaVersion":91,"tick":0}')});
      await front.locator('.front-error:not([hidden])').waitFor();
      assert.deepEqual(await slots(),preserved);
      if(local)assert.deepEqual(await page.evaluate(()=>window.__lisiere.world),previous);
      report.corruptImportPreserved=true;
    }
    if(entry===manifest.saves.at(-1)){
      await front.locator('input[type="file"]').setInputFiles('tmp/test-colony-v98-download.json');await loaded();
      assert.equal(await page.locator('.colonist').count(),4);
      const saved=await slots();assert.equal(saved.manual,downloaded);
      if(local)assert.deepEqual(JSON.parse(await decodeStoredSave(saved.previous)),previous);
      report.importAndRecovery=true;
      // Restore the actual preceding 100-colonist world through its ordinary slot.
      await openLoad();await front.locator('input[value="lisiere.previous.v1"]').check();await button('Charger').click();await loaded();
      assert.equal(await page.locator('.colonist').count(),100);
      if(local)assert.deepEqual(await page.evaluate(()=>window.__lisiere.world),previous);
      report.recoveryRestored=true;
    }else await catalogue();
  }
  assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.failure=error.stack;throw error;}
finally{
  await writeFile(`artifacts/test-colonies-native-v98-${local?'local':'public'}.json`,JSON.stringify(report,null,2)+'\n');
  await browser.close();console.log(JSON.stringify(report));
}
