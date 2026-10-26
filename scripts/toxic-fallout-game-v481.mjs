// ROOT only, after scenario/schema qualification. No browser execution by the author.
// Actual GameSession import/export and native speed controls. Never writes a live World.
import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {resolve,relative,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const option=(name,fallback)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3)??fallback;
const origin=new URL(option('origin','http://127.0.0.1:5196'));
assert.ok(origin.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(origin.hostname)&&!['5173','5184'].includes(origin.port));
const budgetMs=Number(option('budget-seconds','240'))*1000;assert.ok(Number.isFinite(budgetMs)&&budgetMs>=120000&&budgetMs<=240000);
const folder=resolve(root,'tmp/toxic-fallout-v481','native-'+new Date().toISOString().replaceAll(':','-')+'-'+process.pid);
await mkdir(folder,{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const scenarioPath=resolve(root,'tests/scenarios/toxic-fallout-v481.ts');
const legacyReportPath=resolve(root,'tmp/ui3d-identity-v480/game-2026-10-26T01-22-58.387Z-4940/report.json');
const legacyReportBytes=await readFile(legacyReportPath),legacyReport=JSON.parse(legacyReportBytes);
assert.equal(sha(legacyReportBytes),'7befced1cbd8281f6dfb52ef64bf147b788faebf8baf200d07c5483fc193da88');
assert.equal(legacyReport.status,'passed');
const legacyRow=legacyReport.saves.find(s=>s.label==='before-ui');assert.ok(legacyRow);
const legacyBytes=await readFile(legacyRow.path),legacy=JSON.parse(legacyBytes);
assert.equal(sha(legacyBytes),'6eca57d1e7baef0f78185b0feaa9bbff2396c22eaa6d2f719b59934caf4cb99d');
assert.equal(sha(legacyBytes),legacyRow.sha256);assert.equal(legacy.schemaVersion,293);assert.equal(legacy.tick,1782);
assert.equal(legacy.miscIncidents?.toxicFallout,undefined);
const sourceFence=async()=>{
 const files={};async function visit(folder){for(const e of(await readdir(folder,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const p=join(folder,e.name);if(e.isDirectory())await visit(p);else if(e.isFile())files[relative(root,p).replaceAll('\\','/')]=sha(await readFile(p));else throw Error('Unsupported source '+p);}}
 await visit(resolve(root,'src'));for(const name of ['index.html','package.json','package-lock.json','vite.config.ts','tests/scenarios/toxic-fallout-v481.ts'])files[name]=sha(await readFile(resolve(root,name)));return files;
};
const sources=await sourceFence(),driverSHA=sha(await readFile(fileURLToPath(import.meta.url)));
const report={protocol:'toxic-fallout-native-game-v481-1',created:new Date().toISOString(),folder,origin:origin.href,sources,driverSHA,
 legacy:{reportPath:legacyReportPath,reportSHA256:sha(legacyReportBytes),path:legacyRow.path,sha256:sha(legacyBytes),schema:293,tick:legacy.tick},
 phases:[],served:[],checks:[],captures:[],saves:[],pageErrors:[],errors:[],
 limits:['The day60 property, originals, roofs, crops and selected opportunity are declared by the shared scenario; sixty earlier days and player construction are not played. The real incident resolver creates its duration/stream. No poison, corpse, favourable reroll or forced death is prepared.',
 'Only ordinary GameSession load/export and native UI speed/selection actions touch the played game. Read-only probes do not inject commands or mutate a live World. No incident end is shortened or fabricated in this bounded native run.',
 'The native run crosses a real global3451Core dose frontier and preserves a played checkpoint. Long condition end/clinical consequence continuity requires a separate Node/runtime qualification using the same originals; it is not claimed here.',
 'Visible muted private Chromium; no CPU/GPU/FPS benchmark, whole-game performance claim or control of human browsers/servers. The exact archived293 whole save supplies the legacy migration witness; the older public v419 file is263 and is not relabelled.']};
const persist=()=>writeFile(resolve(folder,'report.json'),JSON.stringify(report,null,2));
const started=Date.now(),remaining=()=>Math.max(1,budgetMs-(Date.now()-started));
const phase=async name=>{report.phase=name;report.phases.push({name,at:new Date().toISOString()});await persist();console.log(JSON.stringify({phase:name}));};

const prepareHTML=String.raw`<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><title>Préparation déclarée ToxicFallout V481</title>
<script type="module">
try {
 const {prepareFalloutExposureScenario481}=await import('/tests/scenarios/toxic-fallout-v481.ts');
 const {serializeCampaign}=await import('/src/sim/serialization.ts');
 const made=prepareFalloutExposureScenario481(64),{world,...ledger}=made;
 const data=serializeCampaign(world);
 window.__falloutPreparation={data,ledger,schema:world.schemaVersion,tick:world.tick};
} catch(error) {window.__falloutPreparationError=String(error?.stack??error);}
</script>`;
report.preparationHTMLSHA=sha(prepareHTML);
await writeFile(resolve(folder,'preparation.html'),prepareHTML);
const hook=String.raw`
const falloutTrace=[];
const falloutActivate=nativeUi.options.onActivate,falloutError=nativeUi.options.onError;
nativeUi.options.onActivate=id=>{falloutTrace.push({kind:'activate',id,at:performance.now()});return falloutActivate?.(id);};
nativeUi.options.onError=message=>{falloutTrace.push({kind:'error',message,at:performance.now()});return falloutError(message);};
window.__falloutGame={
 get ready(){return !!window.__lisiere&&!session.busy&&!replacingWorld&&!presentationPreparation&&!graphicsRecovering},
 get healthy(){return !!renderer&&!renderer.fatalError&&!graphicsFault&&!simulationStopped&&!waitingRequests.size&&!frontMenu.isOpen()},
 load:data=>replaceColony(()=>session.loadExternal(async()=>data)),save:()=>session.exportSave(),
 get preferences(){return {font:uiFont,docks:{...nativeDockPreferences}}},
 get tooltip(){return {text:nativeUi?.hintText,owner:nativeUi?.hintOwner?.userData.nativeId,visible:!!nativeUi?.hintPiece}},
 get state(){return {speed:currentSpeed,tick:campaignState()?.tick,waiting:waitingRequests.size,sessionBusy:session.busy,soundEnabled,soundVolume,musicEnabled,musicVolume}},
 get model(){const p=nativeUi?.page;return p?{id:p.id,title:p.title,layout:p.layout,rows:p.rows.map(r=>({id:r.id,label:r.label,value:r.value,detail:r.detail,hint:r.hint,meter:r.meter,controls:r.controls?.map(c=>({id:c.id,label:c.label,disabled:!!c.disabled}))}))}:null},
 point(id){const d=nativeUi?.diagnostics();if(!d)return null;const p=d.controls.find(c=>c.id===id)??d.targets.find(c=>c.nativeId===id);if(!p)return null;const hit=nativeUi.hit(p.x,p.y);return {...p,id,hit:hit?.control?.id??hit?.piece.userData.nativeId};},
 facts(ids){const w=snapshot;if(!w)return null;const actor=p=>p?{id:p.id,name:p.name,state:p.state,x:p.x,z:p.z,motion:p.motion,toxic:p.health?.toxicBuildup?.severity??0,medicalTick:p.health?.tick,civilTick:p.health?.civilTick271,dead:!!p.health?.death,draft:p.draft}:null;
 const pile=id=>{const p=w.piles.find(p=>p.id===id);return p?{id:p.id,item:p.item,quantity:p.quantity,owner:p.owner,damage:p.damage??0,rot:p.rot}:null;};
 return {schema:w.schemaVersion,tick:w.tick,condition:w.miscIncidents?.toxicFallout,exposed:actor(w.pawns.find(p=>p.id===ids.exposedHuman)),covered:actor(w.pawns.find(p=>p.id===ids.coveredHuman)),animal:actor(w.wildlife?.animals.find(p=>p.id===ids.animal)),
  piles:{exposedFood:pile(ids.exposedFood),coveredFood:pile(ids.coveredFood),exposedWood:pile(ids.exposedWood),coveredWood:pile(ids.coveredWood)},
  crops:{exposed:ids.exposedCrops.filter(id=>w.resources.some(r=>r.id===id)),covered:ids.coveredCrops.filter(id=>w.resources.some(r=>r.id===id))},
  corpsePileIds:w.piles.filter(p=>p.kind==='corpse').map(p=>p.id),retainedDeadHumans:w.pawns.filter(p=>p.state==='dead').map(p=>p.id),retainedDeadAnimals:w.wildlife?.animals.filter(p=>p.state==='dead').map(p=>p.id)??[],spoiled:w.spoiled,destroyed:w.destroyed};},
 get diagnostic(){return {ready:this.ready,healthy:this.healthy,state:this.state,preferences:this.preferences,model:this.model,trace:falloutTrace.slice(-30),ui:nativeUi?.diagnostics(),backend:renderer?.backend,incident:{graphicsFault,simulationStopped,graphicsRecovering,waiting:waitingRequests.size}}}
};
`;
let browser,context,page,preparer,watchdog,timedOut=false;
await persist();
try {
 browser=await chromium.launch({executablePath:resolve(root,option('browser','.playwright/chromium-1243/chrome-win64/chrome.exe')),headless:false,args:['--mute-audio','--enable-unsafe-webgpu']});
 report.browser=browser.version();watchdog=setTimeout(()=>{timedOut=true;void browser.close();},remaining());
 context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 await context.addInitScript(()=>{for(const [key,value]of Object.entries({'lisiere.audio.effects.enabled.v1':'false','lisiere.audio.music.enabled.v1':'false','lisiere.audio.effects.volume.v1':'0','lisiere.audio.music.volume.v1':'0','lisiere.autosave-minutes.v1':'0','lisiere.presentation.threat-pause.v1':'never','elsewhere.ui3d.auto-hide.v1':JSON.stringify({bottom:false,notifications:false})}))localStorage.setItem(key,value);});
 let rejectRoute;const routeFailure=new Promise((_,reject)=>{rejectRoute=reject;});routeFailure.catch(()=>{});
 const observe=p=>{p.on('pageerror',e=>report.pageErrors.push(String(e)));p.on('console',m=>{if(m.type()==='error'||/GPUValidationError|device.*lost/i.test(m.text()))report.errors.push(m.text());});};
 await context.route(new URL('/__fallout-prepare-v481.html',origin).href,route=>route.fulfill({status:200,contentType:'text/html',body:prepareHTML}));
 await context.route(/\/(?:src\/(?:main|bridge\/(?:SnapshotDecoder|snapshots|simulation-runtime)|sim\/(?:serialization|engine|cassandra-misc|health|wildlife-health|injury-evolution|toxic-fallout-(?:state|dose|environment|incident)-294)|ui\/(?:game-session|weather-inspection)|ui3d\/(?:NativeStage|native-hud|native-inspector|native-domain-alerts))|tests\/scenarios\/toxic-fallout-v481)\.ts(?:\?|$)/,async route=>{
  try {
   let response;for(let attempt=0;attempt<3;attempt++){try{response=await route.fetch();break;}catch(error){report.routeRetries??=[];report.routeRetries.push({url:route.request().url(),attempt,error:String(error)});if(attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,200));}}
   const body=await response.text(),path=new URL(route.request().url()).pathname.slice(1),expected=sources[path];assert.equal(response.status(),200);assert.ok(expected,path);
   const encoded=body.match(/\/\/[#@]\s*sourceMappingURL=data:application\/json(?:;charset=[^;,]+)?;base64,([A-Za-z0-9+/=]+)/),map=encoded?JSON.parse(Buffer.from(encoded[1],'base64').toString('utf8')):null;
   assert.ok(sha(body)===expected||map?.sourcesContent?.some(s=>typeof s==='string'&&sha(s)===expected),'Served source differs: '+path);
   let served=body;if(path==='src/main.ts'){for(const anchor of ['function replaceColony','void start().catch'])assert.ok(body.includes(anchor));served+=hook;}
   report.served.push({path,sourceSHA:expected,responseSHA:sha(body),servedSHA:sha(served)});await route.fulfill({response,body:served});
  }catch(error){report.errors.push(String(error));rejectRoute(error);await route.abort().catch(()=>{});}
 });
 await phase('prepare-declared-day60-colony');
 preparer=await context.newPage();observe(preparer);preparer.setDefaultTimeout(12000);
 await Promise.race([routeFailure,preparer.goto(new URL('/__fallout-prepare-v481.html',origin).href,{waitUntil:'domcontentloaded',timeout:Math.min(60000,remaining())})]);
 await Promise.race([routeFailure,preparer.waitForFunction(()=>window.__falloutPreparation||window.__falloutPreparationError,null,{timeout:Math.min(60000,remaining())})]);
 const preparationError=await preparer.evaluate(()=>window.__falloutPreparationError);assert.equal(preparationError,undefined);
 const prepared=await preparer.evaluate(()=>window.__falloutPreparation);assert.equal(prepared.schema,294);assert.equal(prepared.tick,60*6000);
 report.preparation=prepared.ledger;assert.equal(prepared.ledger.baseline.coveredToxic,0);assert.ok(prepared.ledger.nextDoseCore>prepared.tick*10&&prepared.ledger.nextDoseCore-prepared.tick*10<3451);
 const initialPath=resolve(folder,'prepared-input.json');await writeFile(initialPath,prepared.data);
 report.input={path:initialPath,sha256:sha(prepared.data),bytes:Buffer.byteLength(prepared.data),schema:294,tick:prepared.tick,scenarioPath,scenarioSHA:sources['tests/scenarios/toxic-fallout-v481.ts']};
 await preparer.close();preparer=undefined;
 page=await context.newPage();observe(page);page.setDefaultTimeout(12000);
 const wait=(fn,arg=null,timeout=18000)=>page.waitForFunction(fn,arg,{timeout:Math.min(timeout,remaining())});
 const ready=()=>wait(()=>window.__falloutGame?.ready&&window.__falloutGame.healthy&&window.__lisiere.backend==='WebGPU'&&window.__lisiere.speed===0,null,60000);
 const ui=()=>page.evaluate(()=>window.__lisiere.nativeUi),model=()=>page.evaluate(()=>window.__falloutGame.model),facts=()=>page.evaluate(ids=>window.__falloutGame.facts(ids),prepared.ledger.ids);
 const point=async id=>{await wait(id=>{const p=window.__falloutGame.point(id);return p&&!p.disabled&&p.hit===id;},id);return page.evaluate(id=>window.__falloutGame.point(id),id);};
 const click=async id=>{const p=await point(id);await page.mouse.click(p.x,p.y);};
 const settle=async()=>{await page.mouse.move(page.viewportSize().width-12,8);await wait(()=>window.__lisiere.nativeUi.activeAnimations===0);await page.waitForTimeout(60);};
 const close=async()=>{await page.keyboard.press('Escape');await page.waitForTimeout(60);};
 const capture=async(label,withScenarioFacts=true,preserveHover=false)=>{if(!preserveHover)await settle();const path=resolve(folder,label+'.png');await page.screenshot({path});report.captures.push({label,path,sha256:sha(await readFile(path)),state:await page.evaluate(()=>window.__falloutGame.state),model:await model(),ui:await ui(),tooltip:await page.evaluate(()=>window.__falloutGame.tooltip),facts:withScenarioFacts?await facts():undefined});await persist();};
 const exportWhole=async label=>{await ready();const data=await page.evaluate(()=>window.__falloutGame.save());assert.equal(typeof data,'string');const parsed=JSON.parse(data),path=resolve(folder,label+'.json');assert.equal(parsed.schemaVersion,294);await writeFile(path,data);const row={label,path,sha256:sha(data),bytes:Buffer.byteLength(data),tick:parsed.tick};report.saves.push(row);await persist();return {data,parsed,...row};};
 const reveal=async id=>{for(let n=0;n<10;n++){const p=await page.evaluate(id=>window.__falloutGame.point(id),id);if(p&&!p.disabled&&p.hit===id)return;const d=await ui();assert.ok(d.pageBounds&&d.maxScroll>0,'scrollable control '+id);await page.mouse.move(d.pageBounds.x+d.pageBounds.width*.6,d.pageBounds.y+d.pageBounds.height*.6);await page.mouse.wheel(0,200);await page.waitForTimeout(60);}throw Error('Unreachable native control '+id);};
 const showAlert=async()=>{await close();const id='hud:alert:domain:toxic-fallout',p=await page.evaluate(id=>window.__falloutGame.point(id),id);if(p?.hit===id)await click(id);else {await click('hud:alerts:all');await wait(()=>window.__lisiere.nativeUi.page==='hud-alerts');const detail='details-domain:toxic-fallout';await reveal(detail);await click(detail);}await wait(()=>window.__lisiere.nativeUi.page==='hud-alert-domain:toxic-fallout');const m=await model();assert.match(JSON.stringify(m),/Retombées toxiques/);assert.match(JSON.stringify(m),/sans guérir les lésions/);};
 const showHealth=async()=>{await close();await click('hud:pawn:'+prepared.ledger.ids.exposedHuman);await click('pawn-tab-health');await wait(id=>window.__lisiere.nativeUi.page===`inspect-pawn-${id}-health`,prepared.ledger.ids.exposedHuman);};
 const url=new URL('/',origin);url.searchParams.set('e2e','1');url.searchParams.set('ui','native');
 await phase('startup-and-ordinary-import');await Promise.race([routeFailure,page.goto(url.href,{waitUntil:'domcontentloaded',timeout:Math.min(60000,remaining())})]);
 await Promise.race([routeFailure,wait(()=>window.__falloutGame?.ready,null,60000)]);
 await page.evaluate(data=>window.__falloutGame.load(data),prepared.data);await ready();
 const initial=await exportWhole('loaded-prepared-exact');assert.deepEqual(initial.parsed,JSON.parse(prepared.data));assert.equal(initial.sha256,sha(prepared.data));assert.equal(initial.tick,prepared.tick);
 const audio=await page.evaluate(()=>window.__falloutGame.state);for(const k of ['soundEnabled','musicEnabled'])assert.equal(audio[k],false);for(const k of ['soundVolume','musicVolume'])assert.equal(audio[k],0);
 assert.equal(await page.locator('button,select,input,dialog').count(),0,'no active DOM game controls');
 report.preferencesBefore=await page.evaluate(()=>window.__falloutGame.preferences);report.factsBefore=await facts();
 assert.equal(report.factsBefore.exposed.toxic,prepared.ledger.baseline.exposedToxic);assert.equal(report.factsBefore.covered.toxic,0);
 const clock=await point('hud:clock');assert.match(clock.tooltip,/Retombées toxiques/);
 await page.mouse.move(clock.x,clock.y);await wait(()=>window.__falloutGame.tooltip.visible&&window.__falloutGame.tooltip.owner==='hud:clock'&&/Retombées toxiques/.test(window.__falloutGame.tooltip.text));report.clockTooltip={text:clock.tooltip,box:(await ui()).tooltip};
 await capture('clock-condition-tooltip-paused-1440x1000',true,true);
 await showAlert();await capture('condition-alert-paused-1440x1000');
 await showHealth();await capture('health-before-dose-1440x1000');await close();
 report.checks.push('Prepared whole campaign loaded paused exactly, native condition/letter and actual Health dossier, no poison or World change injected');

 await phase('play-native-six-times-through-next-global-dose');
 const playingStarted=Date.now();await click('hud:speed:6');await wait(()=>window.__falloutGame.state.speed===6&&!window.__falloutGame.state.waiting);
 await wait(({ids,nextDoseCore,baseline})=>{const f=window.__falloutGame.facts(ids);return f?.tick*10>=nextDoseCore&&f.exposed.toxic>baseline;},{ids:prepared.ledger.ids,nextDoseCore:prepared.ledger.nextDoseCore,baseline:prepared.ledger.baseline.exposedToxic},35000);
 await click('hud:speed:0');await ready();
 report.played={wallMs:Date.now()-playingStarted,nextDoseCore:prepared.ledger.nextDoseCore,targetTick:Math.ceil(prepared.ledger.nextDoseCore/10)};
 const played=await exportWhole('played-dose-paused');await wait(tick=>window.__falloutGame.state.tick===tick,played.tick);report.factsAfter=await facts();report.played.fromTick=initial.tick;report.played.toTick=played.tick;report.played.steps=played.tick-initial.tick;
 assert.ok(played.tick>=report.played.targetTick);assert.ok(report.factsAfter.exposed.toxic>prepared.ledger.baseline.exposedToxic);assert.equal(report.factsAfter.covered.toxic,prepared.ledger.baseline.coveredToxic);
 assert.ok(report.factsAfter.animal.toxic>prepared.ledger.baseline.animalToxic,'the real outdoor original animal also crossed the global phase');
 assert.equal(played.parsed.miscIncidents.toxicFallout.active.startCore,initial.parsed.miscIncidents.toxicFallout.active.startCore);assert.equal(played.parsed.miscIncidents.toxicFallout.active.endCore,initial.parsed.miscIncidents.toxicFallout.active.endCore);
 assert.ok(played.tick*10<played.parsed.miscIncidents.toxicFallout.active.endCore,'this short run never fabricates condition end');
 for(const key of ['exposedWood','coveredWood']){const before=report.factsBefore.piles[key],after=report.factsAfter.piles[key];if(after){assert.equal(after.id,before.id);assert.ok(after.damage>=before.damage);assert.ok(after.quantity<=before.quantity);}}
 const rotAge=(pile,tick)=>pile?.rot?pile.rot.progress+(tick-pile.rot.atTick)*(pile.rot.rate??1):undefined;
 const exposedFood=report.factsAfter.piles.exposedFood,coveredFood=report.factsAfter.piles.coveredFood;
 assert.ok(coveredFood&&coveredFood.id===prepared.ledger.ids.coveredFood,'the covered original food remains');
 assert.ok(coveredFood.quantity<=report.factsBefore.piles.coveredFood.quantity);
 if(exposedFood){assert.equal(exposedFood.id,prepared.ledger.ids.exposedFood);assert.ok(exposedFood.quantity<=report.factsBefore.piles.exposedFood.quantity);assert.ok(rotAge(exposedFood,played.tick)>rotAge(coveredFood,played.tick),'actual unroofed food retains additional fallout age');}
 report.foodObservation={exposedPresent:!!exposedFood,coveredPresent:!!coveredFood,exposedAge:rotAge(exposedFood,played.tick),coveredAge:rotAge(coveredFood,played.tick),spoiled:report.factsAfter.spoiled};
 assert.ok(report.factsAfter.crops.covered.length===prepared.ledger.ids.coveredCrops.length,'covered original crops remain');
 for(const id of report.factsAfter.crops.exposed)assert.ok(prepared.ledger.ids.exposedCrops.includes(id));
 report.checks.push('Actual native6x then pause crossed next3451Core boundary: exposed human/animal gained toxic burden, covered human unchanged; real duration, original goods/crops and adverse outcomes retained');
 for(const viewport of [{width:1440,height:1000},{width:960,height:800}]){
  await page.setViewportSize(viewport);await showHealth();const m=await model();assert.ok(m.rows.some(r=>r.id==='toxic-buildup'&&/toxi/i.test(r.label)),'actual toxic condition in Health model');
  let d=await ui();for(let n=0;n<5&&!d.rows.some(r=>r.id==='toxic-buildup'&&r.visible);n++){await page.mouse.move(d.pageBounds.x+d.pageBounds.width*.7,d.pageBounds.y+d.pageBounds.height*.6);await page.mouse.wheel(0,160);await page.waitForTimeout(60);d=await ui();}
  assert.ok(d.rows.some(r=>r.id==='toxic-buildup'&&r.visible),'actual toxic condition visibly inside the Health sheet');assert.deepEqual([d.pageBounds.width,d.pageBounds.height],[700,viewport.height===1000?620:600]);await capture('health-after-dose-'+viewport.width+'x'+viewport.height);
  if(viewport.width===960){await showAlert();await capture('condition-alert-paused-960x800');}
 }
 await close();const afterViews=await exportWhole('after-paused-native-views');assert.deepEqual(afterViews.parsed,played.parsed);assert.equal(afterViews.sha256,played.sha256,'paused UI reads preserve the entire played campaign');
 await phase('reload-same-played-whole-campaign');await page.evaluate(data=>window.__falloutGame.load(data),played.data);await ready();
 const reloaded=await exportWhole('reloaded-played-exact');assert.deepEqual(reloaded.parsed,played.parsed);assert.equal(reloaded.sha256,played.sha256);assert.deepEqual(await facts(),report.factsAfter);assert.deepEqual(await page.evaluate(()=>window.__falloutGame.preferences),report.preferencesBefore);
 report.checks.push('Own played whole campaign, original toxic/plant/item outcomes, tick and UI preferences reload exactly while paused');

 await phase('historical-eclaircies293-ordinary-migration-only');await page.setViewportSize({width:1440,height:1000});await page.evaluate(data=>window.__falloutGame.load(data),legacyBytes.toString('utf8'));await ready();
 const migrated=await exportWhole('eclaircies293-loaded-as294');const expected=structuredClone(legacy);expected.schemaVersion=294;assert.deepEqual(migrated.parsed,expected);assert.equal(migrated.tick,legacy.tick);assert.equal(migrated.parsed.miscIncidents?.toxicFallout,undefined);
 const legacyClock=await point('hud:clock');assert.doesNotMatch(legacyClock.tooltip,/Retombées toxiques/);assert.ok(!(await ui()).targets.some(p=>p.nativeId==='hud:alert:domain:toxic-fallout'));
 await page.waitForTimeout(250);const stillPaused=await exportWhole('eclaircies294-still-paused-exact');assert.deepEqual(stillPaused.parsed,migrated.parsed);assert.equal(stillPaused.sha256,migrated.sha256);assert.deepEqual(await page.evaluate(()=>window.__falloutGame.preferences),report.preferencesBefore);
 report.checks.push('Genuine archived293 Éclaircies migrates by schema number only: same entire campaign and tick, no load-time condition/adoption/dose/RNG; the paused export stays exact');
 await capture('historical-eclaircies-no-fallout',false);
 assert.deepEqual(await sourceFence(),sources,'product and scenario stayed frozen');assert.equal(sha(await readFile(fileURLToPath(import.meta.url))),driverSHA);assert.equal(sha(await readFile(legacyRow.path)),report.legacy.sha256);assert.equal(sha(await readFile(legacyReportPath)),report.legacy.reportSHA256);
 assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.errors,[]);report.status='passed';await phase('complete');
} catch(error) {
 report.status='failed';report.failure=String(error?.stack??error);
 const activePage=page&&!page.isClosed()?page:preparer&&!preparer.isClosed()?preparer:undefined;
 if(activePage){report.location=activePage.url();report.diagnostic=await activePage.evaluate(()=>window.__falloutGame?.diagnostic??{preparationError:window.__falloutPreparationError,body:document.body.innerText.slice(0,1200)}).catch(e=>({error:String(e)}));await activePage.screenshot({path:resolve(folder,'failure.png')}).catch(()=>{});}
 throw error;
} finally {
 clearTimeout(watchdog);report.timedOut=timedOut;report.wallMs=Date.now()-started;await persist();await context?.close().catch(()=>{});await browser?.close().catch(()=>{});console.log(JSON.stringify({folder,status:report.status,phase:report.phase,timedOut}));
}
