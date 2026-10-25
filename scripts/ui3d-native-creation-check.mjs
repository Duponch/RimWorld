// ROOT only after source freeze. Preparation does not run this script.
// One real native front -> geographic draft -> confirmed site -> original
// starting roster -> WebGPU local map. No fixture, injected service, simulated
// click, direct callback, Worker command, or fabricated world is substituted.
import {chromium} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),args=process.argv.slice(2);
for(const arg of args)if(!/^--(origin|seed|budget|browser)=/.test(arg))throw Error(`Unknown argument ${arg}`);
const option=(name,fallback)=>args.find(arg=>arg.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
const origin=new URL(option('origin','http://127.0.0.1:5196')),seed=option('seed','476250'),budget=Number(option('budget','240'));
if(origin.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(origin.hostname)||['5173','5184'].includes(origin.port))throw Error('A private local DEV server, excluding human ports5173/5184, is required.');
if(!/^\d{1,10}$/.test(seed)||Number(seed)>0xffffffff||!Number.isInteger(budget)||budget<180||budget>240)throw Error('Use --seed=uint32 --budget=180..240.');
const out=resolve(root,'tmp/ui3d-v476',`native-creation-${new Date().toISOString().replace(/[:.]/g,'-')}-${process.pid}`);await mkdir(out,{recursive:true});
const hash=value=>createHash('sha256').update(value).digest('hex');
const observedSources=['src/main.ts','src/ui3d/NativeStage.ts','src/ui3d/NativeGlobe.ts','src/ui3d/native-front.ts','src/ui/world-creation-flow.ts','src/ui/world-creation-contract.ts'];
async function sources(){return Object.fromEntries(await Promise.all(observedSources.map(async name=>[name,hash(await readFile(resolve(root,name)))])));}
const report={protocol:'native-creation-ui-v476-1',out,started:new Date().toISOString(),seed,budgetSeconds:budget,sources:await sources(),driverSHA:hash(await readFile(fileURLToPath(import.meta.url))),
 steps:[],errors:[],workers:[],failures:[],limits:[
  'All decisions use actual native pointer/keyboard controls. DEV nativeUi/globe diagnostics and __lisiere World are read-only observations.',
  'Eight candidates are counted from native controls made visible by real scrolling. Three chosen people are renamed through the native editor and their names are checked in their actual final owners, including unopened starting pods.',
  'The site receipt is exercised through the actual confirmation UI and accepted creation flow. The opaque Worker ticket is neither exposed nor fabricated by this driver.',
  'Globe rotation, zoom and a ray-picked selection must be observable in the read-only nativeUi.globe diagnostic. Missing/incompatible diagnostics fail explicitly.',
  'This is a bounded functional creation check, not a performance comparison, a survival campaign, or a proof of complete content parity.',
  'Save export/reload is intentionally outside this driver because root qualifies that service separately. No human save or browser profile is loaded or replaced.',
 ]};
const persist=()=>writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2));
await persist();
let browser,page,watchdog;
const startedAt=Date.now(),remaining=()=>Math.max(1,budget*1000-(Date.now()-startedAt));
const viewport={width:1440,height:1000};
const ui=()=>page.evaluate(()=>window.__lisiere?.nativeUi??null);
async function checkpoint(name,screenshot=true){
 const state=await ui(),step={name,at:new Date().toISOString(),elapsedMs:Date.now()-startedAt,ui:state};report.steps.push(step);
 if(screenshot)await page.screenshot({path:resolve(out,`${String(report.steps.length).padStart(2,'0')}-${name}.png`)});
 await persist();return state;
}
async function waitPage(id,timeout=15000){await page.waitForFunction(id=>window.__lisiere?.nativeUi?.page===id,id,{timeout:Math.min(timeout,remaining())});}
async function scroll(delta){await page.mouse.move(viewport.width*.68,viewport.height*.5);await page.mouse.wheel(0,delta);await page.waitForTimeout(65);}
function visibleControl(state,id){const target=state?.controls?.find(control=>control.id===id);return target&&Number.isFinite(target.x)&&Number.isFinite(target.y)&&target.x>2&&target.x<viewport.width-2&&target.y>2&&target.y<viewport.height-2?target:null;}
async function find(id){
 let state=await ui(),found=visibleControl(state,id);if(found)return found;
 await scroll(-30000);let old;
 for(let attempt=0;attempt<100;attempt++){
  state=await ui();found=visibleControl(state,id);if(found)return found;
  if(old!==undefined&&state.scroll===old)break;old=state.scroll;await scroll(160);
 }
 throw Error(`Native control was not reachable by visible scrolling: ${id}`);
}
async function click(id){
 let target=await find(id);const deadline=Date.now()+Math.min(12000,remaining()),waitingSince=Date.now();
 // A visible disabled button is already located. Poll its real current state
 // in place; scrolling cannot make a pending service/operation activable.
 while(target.disabled!==false){
  if(Date.now()>=deadline)throw Error(`Native control did not become explicitly enabled within12s: ${id}`);
  await page.waitForTimeout(Math.min(120,remaining()));
  const state=await ui(),visible=visibleControl(state,id);
  target=visible??await find(id);
 }
 const waitedMs=Date.now()-waitingSince;
 if(waitedMs>=100)report.steps.push({name:'wait-native-enabled',id,waitedMs,elapsedMs:Date.now()-startedAt});
 await page.mouse.click(target.x,target.y);await page.waitForTimeout(90);report.steps.push({name:'click',id,x:target.x,y:target.y,elapsedMs:Date.now()-startedAt});
}
async function edit(id,value){await click(id);await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type(value);await page.keyboard.press('Enter');await page.waitForTimeout(120);report.steps.push({name:'commit-native-input',id,value,elapsedMs:Date.now()-startedAt});}
function globeFrame(state){
 const globe=state?.globe;if(!globe||globe.visible===false)throw Error('Required read-only nativeUi.globe diagnostic is absent.');
 const center=globe.center??globe.screen?.center??{x:globe.x,y:globe.y},radius=globe.radiusPixels??globe.screenRadius??globe.projectedRadius??globe.screen?.radius??globe.radius;
 if(!Number.isFinite(center?.x)||!Number.isFinite(center?.y)||!Number.isFinite(radius)||radius<5)throw Error('Expected nativeUi.globe projected center{x,y} and radiusPixels.');
 const pose=globe.rotation??globe.quaternion??globe.pose??(Number.isFinite(globe.yaw)&&Number.isFinite(globe.pitch)?{yaw:globe.yaw,pitch:globe.pitch}:undefined);
 const zoom=globe.zoomFactor??globe.zoom??globe.scale;
 return {raw:globe,center,radius,pose,zoom,selected:globe.selected??globe.selectedTile??null};
}
async function collectCandidates(){
 const ids=new Set();await scroll(-30000);let old;
 for(let attempt=0;attempt<100;attempt++){
  const state=await ui();for(const control of state.controls??[])if(/^inspect-[1-8]$/.test(control.id))ids.add(Number(control.id.slice(8)));
  if(ids.size===8)return [...ids].sort((a,b)=>a-b);
  if(old!==undefined&&state.scroll===old)break;old=state.scroll;await scroll(160);
 }
 throw Error(`Expected eight visible native candidate profiles, observed ${[...ids].join(',')}`);
}
try{
 watchdog=setTimeout(()=>{report.watchdogExpired=true;report.failures.push(`Total ${budget}s creation budget exceeded`);void persist().finally(()=>browser?.close());},budget*1000);
 browser=await chromium.launch({executablePath:resolve(root,option('browser','.playwright/chromium-1243/chrome-win64/chrome.exe')),headless:false,args:['--mute-audio','--enable-unsafe-webgpu']});report.browser=browser.version();
 const context=await browser.newContext({viewport,deviceScaleFactor:1});
 await context.addInitScript(()=>{for(const [key,value]of Object.entries({'lisiere.audio.effects.enabled.v1':'false','lisiere.audio.music.enabled.v1':'false','lisiere.audio.effects.volume.v1':'0','lisiere.audio.music.volume.v1':'0','lisiere.autosave-minutes.v1':'0','lisiere.presentation.threat-pause.v1':'never'}))localStorage.setItem(key,value);});
 page=await context.newPage();page.setDefaultTimeout(Math.min(90000,remaining()));
 page.on('pageerror',error=>report.errors.push(String(error)));page.on('console',message=>{if(message.type()==='error'||/GPUValidationError|device.*lost/i.test(message.text()))report.errors.push(message.text());});page.on('worker',worker=>report.workers.push({url:worker.url(),at:new Date().toISOString()}));
 const url=new URL('/',origin);url.searchParams.set('e2e','1');await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:Math.min(90000,remaining())});await waitPage('front-home',60000);
 assert.equal((await ui()).mode,'native-meshes');assert.equal(await page.locator('button,select,dialog,input').count(),0);await checkpoint('home');
 await click('new-game');await waitPage('front-scenario');await checkpoint('scenario');await click('scenario-next');await waitPage('front-story');
 await click('difficulty-Récit d’aventure');await click('reloadable');await checkpoint('story-choices');await click('story-next');await waitPage('front-world');
 await edit('world-seed',seed);await click('coverage-0');await click('map-size-2');await click('season-0');await edit('world-rainfall','2');await edit('world-rainfall','3');await checkpoint('world-parameters-250');
 await click('generate-world');await waitPage('front-site',150000);await checkpoint('generated-geography');
 let globe=globeFrame(await ui());assert.notEqual(globe.pose,undefined,'Globe pose must be observable for rotation validation.');
 const beforeDrag=globe;await page.mouse.move(globe.center.x,globe.center.y);await page.mouse.down();await page.mouse.move(globe.center.x+Math.min(globe.radius*.2,35),globe.center.y+Math.min(globe.radius*.1,18),{steps:12});await page.mouse.up();await page.waitForTimeout(150);
 globe=globeFrame(await checkpoint('globe-after-drag'));assert.notDeepEqual(globe.pose,beforeDrag.pose,'Actual globe drag did not rotate its observed pose.');
 const beforeWheel=globe;await page.mouse.move(globe.center.x,globe.center.y);await page.mouse.wheel(0,-160);await page.waitForTimeout(150);globe=globeFrame(await checkpoint('globe-after-wheel'));
 assert.ok(JSON.stringify(globe.zoom)!==JSON.stringify(beforeWheel.zoom)||Math.abs(globe.radius-beforeWheel.radius)>.1,'Globe wheel did not change the observed scale.');
 // Actual pointer ray picking, with bounded visible probes. Eligibility remains
 // the real onSelect/UI authority; no geographic helper chooses a tile here.
 const rayProbes=[[0,0],[.12,0],[-.12,0],[0,.12],[0,-.12],[.26,.12],[-.26,.12],[.26,-.12],[-.26,-.12],[.4,0],[-.4,0],[0,.4],[0,-.4]];
 let raySelected=false;const probes=[];
 for(const [dx,dy]of rayProbes){globe=globeFrame(await ui());const x=globe.center.x+dx*globe.radius,y=globe.center.y+dy*globe.radius;await page.mouse.click(x,y);await page.waitForTimeout(90);const after=globeFrame(await ui());probes.push({x,y,selected:after.selected});if(Number.isSafeInteger(after.selected)&&after.selected!==null){raySelected=true;break;}}
 report.rayPick={probes,selected:raySelected};assert.ok(raySelected,'No accepted site selection was observed after real globe ray-picking probes.');await checkpoint('globe-ray-picked');
 // Use an eligible visible list choice for the final site. The list is built
 // by the actual canPlaceWorldSettlement owner in the native front screen.
 await scroll(-30000);let choice;
 for(let attempt=0;attempt<90&&!choice;attempt++){const state=await ui();choice=(state.controls??[]).find(control=>/^choose-tile-\d+$/.test(control.id)&&visibleControl(state,control.id));if(!choice)await scroll(160);}
 assert.ok(choice,'An eligible native site control must be visible.');const selectedTile=Number(choice.id.slice('choose-tile-'.length));await click(choice.id);
 assert.equal(globeFrame(await ui()).selected,selectedTile,'The selected native list site disagrees with the globe marker.');report.selectedTile=selectedTile;await checkpoint('eligible-site-chosen');
 await click('confirm-site');await waitPage('front-confirm');await checkpoint('site-confirmation');await click('confirm-accept');await waitPage('front-pawns',45000);await checkpoint('confirmed-site-candidates');
 report.candidates=await collectCandidates();assert.deepEqual(report.candidates,[1,2,3,4,5,6,7,8]);
 // Reserve4 becomes first, moving former third into reserve. Select exactly
 // the real 4,1,2 originals using the exposed native reorder controls.
 await click('up-4');await click('up-4');await click('up-4');
 const chosen=[{serial:4,name:'Native476 A'},{serial:1,name:'Native476 B'},{serial:2,name:'Native476 C'}];
 for(const candidate of chosen){await click(`inspect-${candidate.serial}`);await edit('candidate-name',candidate.name);await checkpoint(`chosen-candidate-${candidate.serial}`);}
 report.chosen=chosen;await click('start-colony');
 await page.waitForFunction(()=>window.__lisiere?.nativeUi?.page==='front-confirm'||window.__lisiere?.hasActiveMap&&!window.__lisiere?.nativeUi?.front,null,{timeout:Math.min(90000,remaining())});
 if((await ui()).page==='front-confirm'){await checkpoint('starting-work-warning');await click('confirm-accept');}
 await page.waitForFunction(()=>window.__lisiere?.backend==='WebGPU'&&window.__lisiere?.hasActiveMap&&!window.__lisiere?.nativeUi?.front,null,{timeout:Math.min(120000,remaining())});
 if(await page.evaluate(()=>window.__lisiere.speed)!==0){await page.keyboard.press('Space');await page.waitForFunction(()=>window.__lisiere.speed===0,null,{timeout:Math.min(15000,remaining())});}
 await page.waitForTimeout(300);const world=await page.evaluate(()=>window.__lisiere.world);const bytes=Buffer.from(JSON.stringify(world));await writeFile(resolve(out,'confirmed-world-projection.json'),bytes);report.finalWorld={path:resolve(out,'confirmed-world-projection.json'),sha256:hash(bytes),bytes:bytes.length,width:world.width,height:world.height,tick:world.tick,scenario:world.scenario,planetRevision:world.planet?.revision,homeTile:world.planet?.homeTile,startingArrival:world.startingArrival?.phase};
 assert.equal(world.width,250);assert.equal(world.height,250);assert.equal(world.scenario?.id,'crashlanded');assert.equal(world.planet?.revision,3);assert.equal(world.planet?.homeTile,selectedTile);
 const contained=world.startingArrival&&world.startingArrival.phase!=='opened'?world.startingArrival.pods.map(pod=>pod.pawn):[],people=[...world.pawns,...contained];
 for(const candidate of chosen)assert.equal(people.filter(person=>person.name===candidate.name).length,1,`Chosen original ${candidate.name} must have exactly one final owner`);
 assert.equal(people.length,3);report.finalPeople=people.map(person=>({id:person.id,name:person.name,contained:contained.some(pawn=>pawn.id===person.id)}));
 assert.equal(await page.locator('button,select,dialog,input').count(),0);await checkpoint('real-webgpu-250-colony');
 report.finalAudio=await page.evaluate(()=>window.__lisiere.audio);assert.deepEqual(report.errors,[]);assert.deepEqual(await sources(),report.sources,'Observed creation source files changed during the run.');report.status='acquired';
}catch(error){report.status='failed';report.failures.push(String(error));if(page){report.lastUi=await ui().catch(()=>null);await page.screenshot({path:resolve(out,'failure.png')}).catch(()=>{});}throw error;}
finally{clearTimeout(watchdog);await persist();if(browser)await browser.close();console.log(JSON.stringify({out,status:report.status,failures:report.failures}));}
