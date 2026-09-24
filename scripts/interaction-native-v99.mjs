import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('@playwright/test');
const version=process.env.VALIDATION_VERSION??'v99';
const report={date:new Date().toISOString(),checks:[],errors:[]};
const browser=await chromium.launch({channel:'chromium',headless:false});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.setDefaultTimeout(20000);
page.on('pageerror',e=>report.errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|invalid pipeline/i.test(m.text()))report.errors.push(m.text());});
const probe=`window.__interaction={};const originalInteractionFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(...args){window.__interaction.view=this;return originalInteractionFrame.apply(this,args);};`;
const point=id=>page.evaluate(id=>window.__lisiere.projectPawn(id),id);
async function focus(id){await page.evaluate(id=>{const v=window.__interaction.view;v.controls.enableDamping=false;v.focusPawn(id);v.camera.zoom=2;v.camera.updateProjectionMatrix();v.controls.update();},id);await page.waitForTimeout(100);}
async function clickActor(id,options){const p=await point(id);assert.ok(p,`visible actor ${id}`);assert.equal(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.tagName,p),'CANVAS');await page.mouse.click(p.x,p.y,options);}
async function selected(){return page.evaluate(()=>[...window.__interaction.view.selectedPawns]);}
try{
 await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()+'\nwindow.__interaction.client=client;'});});
 await page.goto('http://127.0.0.1:5173/?scenario=camp&e2e&size=32');
 await page.waitForFunction(()=>window.__interaction.view?.world&&!document.querySelector('.game-shell')?.inert);
 await page.locator('[data-speed="0"]').click();await page.waitForFunction(()=>document.querySelector('[data-speed="0"]').getAttribute('aria-pressed')==='true'&&window.__interaction.view.world.tick===window.__lisiere.tick);
 const ids=await page.evaluate(async()=>{
   const {animalCombatCamp}=await import('/tests/scenarios/animal-combat.ts');
   const {serializeWorld}=await import('/src/sim/serialization.ts');
   const w=animalCombatCamp();w.pawns[1].x=8;w.pawns[1].z=14;w.pawns[2].x=12;w.pawns[2].z=14;
   const first=w.wildlife.animals[0];const {enableBiomeWildlife}=await import('/src/sim/wildlife.ts');delete w.wildlife;enableBiomeWildlife(w,'temperate-forest');w.wildlife.animals=[first];first.nextDecision=w.tick+100;
   w.wildlife.animals.push({...structuredClone(first),id:w.nextId++,x:12}, {...structuredClone(first),id:w.nextId++,species:'deer',x:16,z:12});
   const data=serializeWorld(w);window.__interaction.fixture=data;await window.__interaction.client.load(data);
   return {pawns:w.pawns.map(p=>p.id),animals:w.wildlife.animals.map(p=>p.id)};
 });
 await focus(ids.animals[0]);await clickActor(ids.animals[0]);
 await page.locator('[data-animal-title]').waitFor();assert.deepEqual(await selected(),[ids.animals[0]]);
 await page.getByRole('tab',{name:'Santé',exact:true}).click();assert.match(await page.locator('#animal-panel-health').innerText(),/Mobilité/);
 await page.locator('[data-animal-hunt]').check();await page.waitForFunction(id=>window.__lisiere.world.hunting?.targets.includes(id),ids.animals[0]);
 await page.locator('[data-animal-hunt]').uncheck();
 await page.screenshot({path:`artifacts/interaction-${version}-animal.png`});
 report.checks.push('Animal click, actual health and reversible hunt designation');
 const a=await point(ids.animals[0]);await page.mouse.dblclick(a.x,a.y);
 assert.deepEqual((await selected()).sort((a,b)=>a-b),ids.animals.slice(0,2).sort((a,b)=>a-b));
 report.checks.push('Double click selects visible same-species animals only');
 await page.evaluate(()=>{const v=window.__interaction.view;v.focusCell({x:10,z:12});v.camera.zoom=1;v.camera.updateProjectionMatrix();v.controls.update();});await page.waitForTimeout(100);
 const group=await page.evaluate(()=>window.__interaction.view.screenPawns());
 const bounds={x1:Math.min(...group.map(p=>p.x))-12,y1:Math.min(...group.map(p=>p.y))-12,x2:Math.max(...group.map(p=>p.x))+12,y2:Math.max(...group.map(p=>p.y))+12};
 await page.mouse.move(bounds.x1,bounds.y1);await page.mouse.down();await page.mouse.move(bounds.x2,bounds.y2,{steps:8});await page.mouse.up();
 assert.deepEqual((await selected()).sort((a,b)=>a-b),ids.pawns.slice().sort((a,b)=>a-b));
 await page.keyboard.down('Shift');await clickActor(ids.animals[0]);await page.keyboard.up('Shift');assert.equal((await selected()).length,4);
 await page.keyboard.down('Shift');await clickActor(ids.animals[0]);await page.keyboard.up('Shift');assert.equal((await selected()).length,3);
 report.checks.push('Rectangle prioritizes colonists; Shift adds and removes an animal');
 await focus(ids.pawns[0]);await clickActor(ids.pawns[0]);assert.deepEqual(await selected(),[ids.pawns[0]]);
 await page.locator('#toggle-draft').click();await page.waitForFunction(id=>!window.__lisiere.world.pawns.find(p=>p.id===id).draft,ids.pawns[0]);
 await page.keyboard.press('r');await page.waitForFunction(id=>!!window.__lisiere.world.pawns.find(p=>p.id===id).draft,ids.pawns[0]);
 const boxes=await page.locator('#draft-controls>button:visible').evaluateAll(buttons=>buttons.map(b=>({id:b.id,...Object.fromEntries(['left','top','right','bottom'].map(k=>[k,b.getBoundingClientRect()[k]]))})));
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,`${a.id} overlaps ${b.id}`);}
 report.checks.push('Draft button, R and non-overlapping tactical actions');
 const target=await page.evaluate(()=>window.__lisiere.projectCell(7,10));await page.mouse.click(target.x,target.y,{button:'right'});
 await page.locator('[data-speed="1"]').click();await page.waitForFunction(()=>window.__interaction.view.actionFeedback.stats.pathSegments>0);
 await page.locator('[data-speed="0"]').click();await page.waitForFunction(()=>document.querySelector('[data-speed="0"]').getAttribute('aria-pressed')==='true'&&window.__interaction.view.world.tick===window.__lisiere.tick);
 const route=await page.evaluate(()=>{const v=window.__interaction.view,f=v.actionFeedback;return {...f.stats,visible:f.path.visible,shared:['aFrom','aTo','aTravel'].every(k=>v.pawns.feedbackSource.getAttribute(k)===f.bars.geometry.getAttribute(k))};});
 assert.ok(route.visible&&route.shared&&route.pathSegments>0);report.route=route;
 await page.screenshot({path:`artifacts/interaction-${version}-route.png`});
 report.checks.push('Right-click ground uses real movement and confirmed blue path');
 await focus(ids.animals[0]);await clickActor(ids.animals[0],{button:'right'});
 await page.locator('[data-tactical-attack="shoot"]:enabled').waitFor();
 await page.locator('[data-tactical-attack="shoot"]').click();
 await page.waitForFunction(id=>window.__lisiere.world.pawns.find(p=>p.id===id).shooting?.order,ids.pawns[0]);
 report.checks.push('Right-click wild animal explicitly issues a valid ranged order');
 await page.evaluate(()=>window.__interaction.client.load(window.__interaction.fixture));
 await focus(ids.animals[0]);await page.locator('#camera-mode').click();await page.waitForTimeout(100);
 await clickActor(ids.animals[0]);assert.deepEqual(await selected(),[ids.animals[0]]);
 report.checks.push('Animal selection also follows perspective camera');
 await page.locator('#camera-mode').click();
 await page.evaluate(async()=>{
   const w=JSON.parse(window.__interaction.fixture),a=w.wildlife.animals[0];
   const {moveAnimal,animalNavigation}=await import('/src/sim/wildlife-navigation.ts');
   const {serializeWorld}=await import('/src/sim/serialization.ts');
   a.path=Array.from({length:5},(_,i)=>({x:11+i,z:10}));moveAnimal(w,a,animalNavigation(w).step);await window.__interaction.client.load(serializeWorld(w));
 });
 await focus(ids.animals[0]);await page.locator('[data-speed="1"]').click();await page.waitForTimeout(250);await clickActor(ids.animals[0]);
 assert.deepEqual(await selected(),[ids.animals[0]]);
 await page.locator('[data-speed="0"]').click();await page.waitForFunction(()=>document.querySelector('[data-speed="0"]').getAttribute('aria-pressed')==='true'&&window.__interaction.view.world.tick===window.__lisiere.tick);
 report.checks.push('A moving animal is selected at its rendered interpolated position');
 const worker=await page.evaluate(async()=>{
   const {animalCombatCamp}=await import('/tests/scenarios/animal-combat.ts');
   const {serializeWorld}=await import('/src/sim/serialization.ts');
   const {applyCommand}=await import('/src/sim/engine.ts');
   const w=animalCombatCamp();const p=w.pawns[0];applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:false});p.priorities.gather=1;
   w.resources.push({id:w.nextId++,kind:'tree',x:5,z:10,amount:30});
   const r=applyCommand(w,{type:'designate',kind:'chop',x:5,z:10});if(!r.ok)throw Error(r.reason);
   await window.__interaction.client.load(serializeWorld(w));return p.id;
 });
 await focus(worker);await clickActor(worker);await page.locator('[data-speed="1"]').click();
 await page.waitForFunction(()=>window.__interaction.view.actionFeedback.stats.activeBars>0);
 await page.locator('[data-speed="0"]').click();await page.waitForFunction(()=>document.querySelector('[data-speed="0"]').getAttribute('aria-pressed')==='true'&&window.__interaction.view.world.tick===window.__lisiere.tick);
 const bar=await page.evaluate(()=>{const v=window.__interaction.view;return {visible:v.actionFeedback.bars.visible,fraction:v.actionFeedback.bars.geometry.getAttribute('aAction').getX(0),uploads:v.actionFeedback.stats.barUploads,tick:window.__lisiere.tick};});
 assert.ok(bar.visible&&bar.fraction>=0&&bar.fraction<1);await page.waitForTimeout(250);
 assert.equal(await page.evaluate(()=>window.__interaction.view.actionFeedback.stats.barUploads),bar.uploads);
 await page.screenshot({path:`artifacts/interaction-${version}-work.png`});
 await page.evaluate(()=>{const v=window.__interaction.view;v.camera.zoom=.15;v.camera.updateProjectionMatrix();});
 await page.waitForFunction(()=>!window.__interaction.view.actionFeedback.bars.visible);
 report.bar=bar;report.checks.push('Real work bar, pause stability and distant zoom hides bars');
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=e.stack;await page.screenshot({path:`artifacts/interaction-${version}-failure.png`}).catch(()=>{});throw e;}
finally{await writeFile(`artifacts/interaction-native-${version}.json`,JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report));}
