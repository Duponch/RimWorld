import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('@playwright/test');
const browser=await chromium.launch({channel:'chromium',headless:false});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.setDefaultTimeout(25000);
const report={date:new Date().toISOString(),layouts:[],checks:[],errors:[]};
page.on('pageerror',e=>report.errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))report.errors.push(m.text());});
const snap=async name=>{await page.evaluate(()=>document.fonts.ready);return page.screenshot({path:`artifacts/interface-v100-${name}.png`});};
async function boxCheck(selector,name){
 const value=await page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,scroll:el.scrollWidth,client:el.clientWidth};});
 report.layouts.push({name,...value});assert.ok(value.left>=0&&value.top>=0&&value.right<=page.viewportSize().width+1&&value.bottom<=page.viewportSize().height,`${name} outside viewport: ${JSON.stringify(value)}`);assert.ok(value.scroll<=value.client+2,`${name} horizontal overflow: ${JSON.stringify(value)}`);
}
try{
 await page.goto('http://127.0.0.1:5173/?e2e');
 const front=page.locator('.front-menu');await front.getByRole('button',{name:/^Nouvelle partie/}).waitFor();
 await snap('home');await front.getByRole('button',{name:/^Nouvelle partie/}).click();await snap('scenario');
 await front.getByRole('button',{name:'Suivant',exact:true}).click();await snap('story');
 await front.getByRole('radio',{name:'Récit d’aventure',exact:true}).check();await front.getByRole('radio',{name:'Rechargeable à tout moment',exact:true}).check();await front.getByRole('button',{name:'Suivant',exact:true}).click();await snap('site');
 await front.getByRole('button',{name:'Retour',exact:true}).click();await front.getByRole('button',{name:'Retour',exact:true}).click();
 await front.getByRole('button',{name:'Retour',exact:true}).click();
 await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.getByRole('button',{name:'Colonies de test',exact:true}).click();await front.locator('[name="test-colony"]').first().waitFor();await snap('load');
 await front.locator('[name="test-colony"][value="energy-food-12"]').check();await front.getByRole('button',{name:'Charger cette colonie',exact:true}).click();await front.waitFor({state:'hidden'});
 await page.locator('[data-speed="0"]').click();
 for(const viewport of [{width:1440,height:1000},{width:1366,height:768},{width:1920,height:1080}]){
  await page.setViewportSize(viewport);const size=viewport.width;
  await boxCheck('.main-tabs',`bar-${size}`);
  const resource=await page.locator('.resource-list').evaluate(el=>({width:el.getBoundingClientRect().width,background:getComputedStyle(el).backgroundColor,shadow:getComputedStyle(el).boxShadow}));assert.equal(resource.width,216);assert.equal(resource.background,'rgba(0, 0, 0, 0)');assert.equal(resource.shadow,'none');
  await page.locator('.colonist').first().click();await boxCheck('#inspector',`colonist-${size}`);assert.equal(await page.locator('.colonist-inspector-summary #room-description').count(),0);assert.equal(await page.locator('#colonist-panel-needs #room-description').count(),1);await snap(`colonist-${size}`);
  for(const name of ['Besoins','Santé','Équipement','Social','Bio']){await page.getByRole('tab',{name,exact:true}).click();assert.ok(await page.locator('[role="tabpanel"]:visible').count());if(size===1440)await snap(`colonist-${name}`);}
  for(const name of ['work','schedule','assign','wildlife','research','architect','history','menu']){
   await page.locator(`[data-panel="${name}"]`).click();await boxCheck(`#${name}-panel`,`${name}-${size}`);if(size===1440||size===1366)await snap(`${name}-${size}`);
   if(name==='work'){
    const positions=await page.locator('#work-panel tbody tr:first-child select').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().top));assert.ok(Math.max(...positions)-Math.min(...positions)<2,'work controls align');
   }
   if(name==='schedule'){
    const overlap=await page.locator('.schedule-copy').evaluateAll(cells=>cells.some(c=>{const [a,b]=[...c.querySelectorAll('button')].map(b=>b.getBoundingClientRect());return a&&b&&a.right>b.left&&a.left<b.right&&a.bottom>b.top&&a.top<b.bottom;}));assert.equal(overlap,false,'copy/paste have their own space');
   }
   if(name==='architect'){
    await page.evaluate(()=>Promise.all(['/assets/ui/lisiere/architect-1.png','/assets/ui/lisiere/architect-2.png'].map(url=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(true);img.onerror=()=>reject(Error(url));img.src=url;}))));
    report.icons=await page.locator('.tool:not([hidden]) .tool-icon').evaluateAll(nodes=>nodes.map(el=>({tool:el.parentElement.dataset.tool,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,image:getComputedStyle(el).backgroundImage,size:getComputedStyle(el).backgroundSize,position:getComputedStyle(el).backgroundPosition,clip:getComputedStyle(el).clipPath})));
    if(size===1440)await snap('architect-loaded');
    const bounds=await page.locator('#architect-panel').boundingBox();
    for(const category of ['structure','furniture','production','orders']){await page.locator(`[data-category="${category}"]`).click();assert.deepEqual(await page.locator('#architect-panel').boundingBox(),bounds);}
   }
  }
  await page.locator('[data-panel="wildlife"]').click();await page.locator('.fauna-focus').first().click();await boxCheck('#inspector',`animal-${size}`);await page.getByRole('tab',{name:'Santé',exact:true}).click();if(size===1440)await snap('animal-health');
  await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:1440,height:1000});
 // A real click on ground, not a scripted selection state.
 const cell=await page.evaluate(()=>{const w=window.__lisiere.world;for(let z=110;z<140;z++)for(let x=110;x<140;x++){const p=window.__lisiere.projectCell(x,z);if(p&&p.x>530&&p.x<1000&&p.y>200&&p.y<800&&document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS')return p;}return null;});
 assert.ok(cell);await page.mouse.click(cell.x,cell.y);await page.locator('#cell-title').waitFor();await boxCheck('#inspector','cell');await snap('cell');
 const text=await page.locator('#cell-description').innerText();assert.match(text,/Case/);assert.match(text,/Fertilité/);
 report.checks.push('Three desktop sizes; all management panels, five human tabs, animal health, cell inspection; stable Architecte categories; transparent 216px resources');
 await page.locator('[data-speed="6"]').click();
 await page.waitForTimeout(2000);
 report.frames=await page.evaluate(()=>new Promise(resolve=>{const samples=[],startTick=window.__lisiere.tick;let previous=performance.now();const start=previous;function frame(now){samples.push(now-previous);previous=now;if(now-start<6000)requestAnimationFrame(frame);else {samples.sort((a,b)=>a-b);resolve({count:samples.length,p50:samples[Math.floor(samples.length*.5)],p95:samples[Math.floor(samples.length*.95)],max:samples.at(-1),speed:(window.__lisiere.tick-startTick)/((now-start)/1000)/6});}}requestAnimationFrame(frame);}));
 await page.locator('[data-speed="0"]').click();
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.failure=error.stack;await snap('failure');throw error;}
finally{await writeFile('artifacts/interface-v100-native.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
