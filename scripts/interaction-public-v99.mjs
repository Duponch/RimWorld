import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('@playwright/test');
const version=process.env.VALIDATION_VERSION??'v99';
const report={date:new Date().toISOString(),url:'https://lisiere-duponch.netlify.app',errors:[],scripts:[]};
const browser=await chromium.launch({channel:'chromium',headless:false});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.setDefaultTimeout(60000);
page.on('pageerror',e=>report.errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))report.errors.push(m.text());});
page.on('response',r=>{if(r.url().includes('/assets/game-')&&r.url().endsWith('.js'))report.scripts.push(r.url());});
try{
 assert.equal((await page.goto(report.url)).status(),200);
 const front=page.locator('.front-menu');
 await front.getByRole('button',{name:'Charger une partie',exact:true}).click();
 await front.getByRole('button',{name:'Colonies de test',exact:true}).click();
 await front.locator('[name="test-colony"][value="energy-food-12"]').check();
 await front.getByRole('button',{name:'Charger cette colonie',exact:true}).click();
 await front.waitFor({state:'hidden'});
 assert.equal(await page.evaluate(()=>typeof window.__lisiere),'undefined');
 if(version==='v100'){
  assert.equal(await page.locator('.resource-list').evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)');
  assert.equal(await page.locator('.main-tabs').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(248, 237, 216)');
 }
 await page.locator('[data-panel="wildlife"]').click();await page.locator('.fauna-focus').first().click();
 await page.getByRole('tab',{name:'Santé',exact:true}).click();
 report.animal=await page.locator('[data-animal-title]').innerText();
 assert.match(await page.locator('#animal-panel-health').innerText(),/Mobilité/);
 await page.screenshot({path:`artifacts/interaction-${version}-public.png`});
 await page.locator('.colonist').first().click();await page.locator('#toggle-draft').click();
 await page.waitForFunction(()=>document.querySelector('#toggle-draft')?.getAttribute('aria-pressed')==='true');
 await page.keyboard.press('r');await page.waitForFunction(()=>document.querySelector('#toggle-draft')?.getAttribute('aria-pressed')==='false');
 const html=await readFile('dist/index.html','utf8'),asset=html.match(/\/assets\/game-[^" ]+\.js/)?.[0];
 assert.ok(asset&&report.scripts.some(url=>url.endsWith(asset)));report.asset=asset;
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=e.stack;throw e;}
finally{await writeFile(`artifacts/interaction-public-${version}.json`,JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
