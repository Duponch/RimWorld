// ROOT only. Real paused GameSession; all UI interactions use native raycasts.
// No direct World writes, injected commands, server or human-browser control.
import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {resolve,relative,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const option=(name,fallback)=>process.argv.find(value=>value.startsWith('--'+name+'='))?.slice(name.length+3)??fallback;
const origin=new URL(option('origin','http://127.0.0.1:5196'));
assert.ok(origin.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(origin.hostname)&&!['5173','5184'].includes(origin.port));
const budgetMs=Number(option('budget-seconds','180'))*1000;assert.ok(Number.isFinite(budgetMs)&&budgetMs>=120000&&budgetMs<=240000);
const folder=resolve(root,'tmp/ui3d-structure-v479','game-'+new Date().toISOString().replaceAll(':','-')+'-'+process.pid);
await mkdir(folder,{recursive:true});
const sha=value=>createHash('sha256').update(value).digest('hex');
const inputPath=resolve(root,'public/test-saves/v419/les-eclaircies.json'),input=await readFile(inputPath);
assert.equal(sha(input),'49e5d50abfac5a2ac0e609378877bb645da3e4559286cff706a33dc00f0df19f');
const sourceFence=async()=>{
 const files={};const visit=async folder=>{for(const entry of(await readdir(folder,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const path=join(folder,entry.name);if(entry.isDirectory())await visit(path);else if(entry.isFile())files[relative(root,path).replaceAll('\\','/')]=sha(await readFile(path));else throw Error('Unsupported source '+path);}};
 await visit(resolve(root,'src'));for(const name of ['index.html','package.json','package-lock.json','vite.config.ts'])files[name]=sha(await readFile(resolve(root,name)));return files;
};
const sources=await sourceFence();
const report={protocol:'native-structure-game-v479-1',folder,origin:origin.href,created:new Date().toISOString(),sources,
 input:{path:inputPath,sha256:sha(input),schema:JSON.parse(input).schemaVersion,tick:JSON.parse(input).tick},driverSHA:sha(await readFile(fileURLToPath(import.meta.url))),
 phases:[],captures:[],saves:[],checks:[],errors:[],pageErrors:[],served:[],limits:['Actual GameSession input and ordinary native command path. No fixture World repair or research dotation.','Paused functional checks, not CPU/GPU/FPS measurements. Concurrent League/streaming do not supply performance evidence here.','Whole acknowledged saves and exact reload are checked; ephemeral category/tool/material/orientation choices are separate from persistent World state.']};
const persist=()=>writeFile(resolve(folder,'report.json'),JSON.stringify(report,null,2));
const hook=String.raw`
const structureTrace=[];
const structureOriginalActivate=nativeUi.options.onActivate,structureOriginalError=nativeUi.options.onError;
nativeUi.options.onActivate=id=>{structureTrace.push({kind:'activate',id,at:performance.now()});return structureOriginalActivate?.(id);};
nativeUi.options.onError=message=>{structureTrace.push({kind:'error',message,at:performance.now()});return structureOriginalError(message);};
for(const kind of ['pointerdown','pointerup'])window.addEventListener(kind,event=>{const hit=nativeUi.hit(event.clientX,event.clientY);structureTrace.push({kind,id:hit?.control?.id??hit?.piece.userData.nativeId,disabled:hit?.control?.disabled,static:hit?.piece.userData.nativeStatic,down:nativeUi.down?{controlId:nativeUi.down.controlId,pointerId:nativeUi.down.pointerId}:null,at:performance.now()});},{capture:true});
window.__structureGame={
 get ready(){return !!window.__lisiere&&!session.busy&&!replacingWorld&&!presentationPreparation&&!graphicsRecovering},
 get healthy(){return !!renderer&&!renderer.fatalError&&!graphicsFault&&!simulationStopped&&!waitingRequests.size&&!frontMenu.isOpen()},
 load:data=>replaceColony(()=>session.loadExternal(async()=>data)),save:()=>session.exportSave(),
 get preferences(){return {font:uiFont,docks:{...nativeDockPreferences}}},
 get state(){return {panel:currentPanel,category:currentCategory,tool:currentTool,material:nativeConstructionMaterial,orientation:placementOrientation,speed:currentSpeed,tick:snapshot?.tick,project:snapshot?.research?.project??null,waiting:waitingRequests.size,sessionBusy:session.busy,soundEnabled,soundVolume,musicEnabled,musicVolume}},
 get model(){const p=nativeUi?.page;return p?{id:p.id,title:p.title,layout:p.layout,palette:p.palette,portrait:!!p.portrait,actions:p.actions?.map(c=>({id:c.id,label:c.label,disabled:!!c.disabled})),research:p.research?{selected:p.research.selected,width:p.research.width,height:p.research.height,nodeCount:p.rows.filter(r=>r.graphNode).length,links:p.research.links.length}:null,rows:p.rows.map(r=>({id:r.id,label:r.label,value:r.value,region:r.region,controlStyle:r.controlStyle,graphNode:r.graphNode,controls:r.controls?.map(c=>({id:c.id,label:c.label,active:!!c.active,disabled:!!c.disabled,icon:c.icon,hint:c.hint}))}))}:null},
 point(id){if(!nativeUi)return null;const d=nativeUi.diagnostics(),c=d.controls.find(c=>c.id===id)??d.targets.find(c=>c.nativeId===id);if(!c)return null;const hit=nativeUi.hit(c.x,c.y);return {...c,id,hit:hit?.control?.id??hit?.piece.userData.nativeId}},
 piece(id){if(!nativeUi)return null;let found;nativeUi.scene.updateMatrixWorld(true);nativeUi.scene.traverse(p=>{if(p.userData.nativeId===id)found=p;});if(!found)return null;const data=found.userData,v=found.position.clone();found.getWorldPosition(v).project(nativeUi.camera);return {id,width:data.w*100,height:data.h*100,style:data.nativeStyle,paper:data.paper,x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2}},
 get diagnostic(){return {trace:structureTrace.slice(-50),ready:this.ready,healthy:this.healthy,state:this.state,preferences:this.preferences,ui:nativeUi?.diagnostics(),model:this.model,hasActiveMap:client.hasActiveMap,backend:renderer?.backend,front:frontMenu.isOpen(),incident:{graphicsFault,simulationStopped,graphicsRecovering,waiting:waitingRequests.size}}}
};
`;
let browser,context,page,watchdog,timedOut=false;
const started=Date.now(),remaining=()=>Math.max(1,budgetMs-(Date.now()-started));
const phase=async name=>{report.phase=name;report.phases.push({name,at:new Date().toISOString()});await persist();console.log(JSON.stringify({phase:name}));};
await persist();
try{
 browser=await chromium.launch({executablePath:resolve(root,option('browser','.playwright/chromium-1243/chrome-win64/chrome.exe')),headless:false,args:['--mute-audio','--enable-unsafe-webgpu']});
 watchdog=setTimeout(()=>{timedOut=true;void browser.close();},remaining());report.browser=browser.version();
 context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 await context.addInitScript(()=>{for(const [key,value]of Object.entries({'lisiere.audio.effects.enabled.v1':'false','lisiere.audio.music.enabled.v1':'false','lisiere.audio.effects.volume.v1':'0','lisiere.audio.music.volume.v1':'0','lisiere.autosave-minutes.v1':'0','lisiere.presentation.threat-pause.v1':'never','elsewhere.ui3d.auto-hide.v1':JSON.stringify({bottom:false,notifications:false})}))localStorage.setItem(key,value);});
 page=await context.newPage();page.setDefaultTimeout(12000);
 page.on('pageerror',error=>report.pageErrors.push(String(error)));page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|device.*lost/i.test(m.text()))report.errors.push(m.text());});
 let rejectRoute;const routeFailure=new Promise((_,reject)=>{rejectRoute=reject;});routeFailure.catch(()=>{});
 await page.route(/\/src\/(?:main|ui3d\/(?:NativeStage|native-layout|native-panels|native-research))\.ts(?:\?|$)/,async route=>{
  try{const response=await route.fetch(),body=await response.text(),path=new URL(route.request().url()).pathname.slice(1),expected=sources[path];assert.equal(response.status(),200);assert.ok(expected);
   const encoded=body.match(/\/\/[#@]\s*sourceMappingURL=data:application\/json(?:;charset=[^;,]+)?;base64,([A-Za-z0-9+/=]+)/),map=encoded?JSON.parse(Buffer.from(encoded[1],'base64').toString('utf8')):null;
   assert.ok(map?.sourcesContent?.some(content=>typeof content==='string'&&sha(content)===expected)||sha(body)===expected,'Served source mismatch '+path);
   let served=body;if(path==='src/main.ts'){for(const anchor of ['function replaceColony','void start().catch'])assert.ok(body.includes(anchor));served+=hook;}
   report.served.push({path,sourceSHA:expected,originalSHA:sha(body),servedSHA:sha(served)});await route.fulfill({response,body:served});
  }catch(error){report.errors.push(String(error));rejectRoute(error);await route.abort().catch(()=>{});}
 });
 const url=new URL('/',origin);url.searchParams.set('e2e','1');url.searchParams.set('ui','native');
 await phase('startup-page');await Promise.race([routeFailure,page.goto(url.href,{waitUntil:'domcontentloaded',timeout:Math.min(90000,remaining())})]);
 await phase('startup-ready');await Promise.race([routeFailure,page.waitForFunction(()=>window.__structureGame?.ready,null,{timeout:Math.min(90000,remaining())})]);
 await phase('load-input');await page.evaluate(data=>window.__structureGame.load(data),input.toString('utf8'));
 const wait=(fn,arg=null)=>page.waitForFunction(fn,arg,{timeout:Math.min(18000,remaining())});
 await page.waitForFunction(()=>window.__structureGame?.ready&&window.__structureGame.healthy&&window.__lisiere.backend==='WebGPU'&&window.__lisiere.speed===0,null,{timeout:Math.min(90000,remaining())});
 await phase('loaded');const state=await page.evaluate(()=>window.__structureGame.state);assert.equal(state.tick,report.input.tick);assert.equal(state.speed,0);assert.equal(state.soundEnabled,false);assert.equal(state.musicEnabled,false);assert.equal(state.soundVolume,0);assert.equal(state.musicVolume,0);
 assert.equal(await page.locator('button,select,input,dialog').count(),0,'no active DOM game controls');
 const ui=()=>page.evaluate(()=>window.__lisiere.nativeUi),model=()=>page.evaluate(()=>window.__structureGame.model);
 const settle=async()=>{await page.mouse.move(page.viewportSize().width-12,8);await wait(()=>window.__lisiere.nativeUi.activeAnimations===0);await page.waitForTimeout(80);};
 const point=async id=>{await wait(id=>{const p=window.__structureGame.point(id);return p&&!(p.disabled??false)&&p.hit===id;},id);return page.evaluate(id=>window.__structureGame.point(id),id);};
 const click=async id=>{const p=await point(id);await page.mouse.click(p.x,p.y);};
 const management=async id=>{const p=(await ui()).management.find(p=>p.id===id);assert.ok(p,id);await page.mouse.click(p.x,p.y);};
 const close=async()=>{await page.keyboard.press('Escape');await page.waitForTimeout(80);};
 const capture=async label=>{await settle();const path=resolve(folder,label+'.png');await page.screenshot({path});report.captures.push({label,path,ui:await ui(),model:await model(),state:await page.evaluate(()=>window.__structureGame.state)});await persist();};
 const exportWhole=async label=>{await wait(()=>window.__structureGame.ready&&window.__structureGame.healthy&&!window.__structureGame.state.waiting);const data=await page.evaluate(()=>window.__structureGame.save());assert.equal(typeof data,'string');const parsed=JSON.parse(data),path=resolve(folder,label+'.json');await writeFile(path,data);const row={label,path,sha256:sha(data),bytes:Buffer.byteLength(data),tick:await page.evaluate(()=>window.__structureGame.state.tick)};report.saves.push(row);await persist();return {data,parsed,...row};};
 const revealDetail=async id=>{for(let n=0;n<9;n++){const p=await page.evaluate(id=>window.__structureGame.point(id),id);if(p&&!(p.disabled??false)&&p.hit===id)return p;const d=await ui(),r=d.regions?.details;assert.ok(r,'detail region for '+id);await page.mouse.move(d.pageBounds.x+r.x+r.width/2,d.pageBounds.y+r.y+r.height*.6);await page.mouse.wheel(0,210);await page.waitForTimeout(70);}throw Error('Detail control unreachable '+id);};
 const before=await exportWhole('before-ui');report.preferencesBefore=await page.evaluate(()=>window.__structureGame.preferences);
 await phase('map-tool-palettes');
 for(const kind of ['orders','zones']){await click('map-dock:'+kind);await wait(kind=>window.__lisiere.nativeUi.page==='map-tools-'+kind,kind);const d=await ui(),m=await model();assert.equal(m.layout,'palette');assert.equal(await page.evaluate(id=>window.__structureGame.piece(id),'page:map-tools-'+kind),null);assert.ok(d.controls.filter(c=>c.region==='catalogue').every(c=>c.style==='icon'&&c.width===48&&c.height===46));await capture(kind);await click('map-dock:'+kind);await wait(()=>window.__lisiere.nativeUi.page===null);}
 await click('map-dock:orders');await wait(()=>window.__lisiere.nativeUi.page==='map-tools-orders');await click('tool-mine-select');await wait(()=>window.__structureGame.state.tool==='mine');assert.equal((await ui()).page,'map-tools-orders');await click('map-dock:orders');await wait(()=>window.__lisiere.nativeUi.page===null);report.checks.push('Native icon palettes, transparent gaps, title toggles and selected mine tray');
 await phase('architect');await management('architect');await wait(()=>window.__structureGame.model?.layout==='architect');await click('category-structure');await wait(()=>window.__structureGame.state.category==='structure');
 let d=await ui();assert.deepEqual(Object.keys(d.regions).sort(),['catalogue','details','navigation']);assert.ok(d.controls.filter(c=>c.style==='tile').every(c=>c.height===148));await capture('architect-structure');
 await click('tool-wall-select');await wait(()=>window.__structureGame.state.tool==='wall'&&window.__structureGame.state.panel===null);await management('architect');await wait(()=>window.__structureGame.model?.layout==='architect');
 const nextMaterial=await page.evaluate(()=>window.__structureGame.state.material==='steel'?'wood':'steel');await click('tool-wall-material');await wait(()=>!!window.__lisiere.nativeUi.dropdown);await click('select-option:tool-wall-material:'+nextMaterial);await wait(value=>window.__structureGame.state.material===value,nextMaterial);
 const rotation=await page.evaluate(()=>window.__structureGame.state.orientation);await click('rotate-right');await wait(value=>window.__structureGame.state.orientation===(value+1)%4,rotation);assert.equal((await model()).rows.find(r=>r.id==='architect-rotation').value,((rotation+1)%4*90)+'°');await capture('architect-selected-wall');
 await click('category-furniture');await wait(()=>window.__structureGame.state.category==='furniture');assert.ok((await ui()).controls.some(c=>c.style==='tile'));await capture('architect-furniture');await close();
 report.checks.push('Three-part Architect, native material dropdown, orientation and Furniture category');
 await phase('colonist-dossiers');const pawn=await page.evaluate(()=>window.__lisiere.world.pawns.find(p=>p.state!=='dead'&&!p.prisoner));assert.ok(pawn);report.pawn={id:pawn.id,name:pawn.name};
 const caps={bio:{width:514,height:686},needs:{width:580,height:717},health:{width:630,height:627},journal:{width:630,height:686},gear:{width:460,height:686}};
 for(const viewport of [{width:1440,height:1000,tabs:['bio','needs','health','journal','gear']},{width:960,height:800,tabs:['bio','needs','health']}]){
  await page.setViewportSize({width:viewport.width,height:viewport.height});await click('hud:pawn:'+pawn.id);
  for(const tab of viewport.tabs){
  await click('pawn-tab-'+tab);await wait(tab=>window.__lisiere.nativeUi.page?.endsWith('-'+tab),tab);await settle();d=await ui();const m=await model(),parts=d.inspectorParts;assert.ok(parts,'separate inspector sheet/tabs/portrait strip');
  assert.ok(d.pageBounds.width<=caps[tab].width&&d.pageBounds.height<=caps[tab].height,tab+' stays within former extent');assert.ok(parts.tabs.y>=parts.sheet.y+parts.sheet.height);assert.ok(parts.summary.y>=parts.tabs.y+parts.tabs.height);assert.ok(parts.actions.y>=parts.tabs.y+parts.tabs.height);
  await wait(()=>!!window.__structureGame.piece('page:portrait'));const portrait=await page.evaluate(()=>window.__structureGame.piece('page:portrait'));assert.equal(portrait.width,70);assert.equal(portrait.height,70);assert.ok(portrait.y>d.pageBounds.y+parts.summary.y&&portrait.y<d.pageBounds.y+parts.summary.y+parts.summary.height);
  const footerActions=d.controls.filter(c=>m.actions?.some(a=>a.id===c.id));assert.ok(footerActions.length>=3);assert.ok(footerActions.every(c=>c.y>=d.pageBounds.y+parts.actions.y-4));
  if(tab==='bio'){const skills=d.rows.filter(r=>r.id.startsWith('skill-'));assert.equal(skills.length,12);assert.ok(skills.every(r=>r.visible&&r.meter),'all twelve Bio skills visible');}
  if(d.maxScroll>0)assert.ok(d.targets.some(p=>p.nativeId==='native-scroll-thumb'),tab+' visible body scrollbar');
   await capture('colonist-'+tab+'-'+viewport.width+'x'+viewport.height);
  }
  await close();
 }
 await page.setViewportSize({width:1440,height:1000});report.checks.push('Bio/Needs/Health at 1440×1000 and 960×800; Journal/Gear, lower tabs, footer portrait/actions and conditional body scrollbar');
 const afterUi=await exportWhole('after-ui-only');assert.deepEqual(afterUi.parsed,before.parsed);assert.equal(afterUi.sha256,before.sha256,'native selections do not mutate the acknowledged World');
 await phase('research');await management('research');await wait(()=>window.__structureGame.model?.layout==='research');await settle();d=await ui();let m=await model();assert.equal(m.research.nodeCount,42);assert.equal(m.research.links,30);assert.ok(m.rows.some(r=>r.id==='research-tabs'&&r.controls.some(c=>c.label==='Principal')));
 let selected;
 for(const c of d.controls.filter(c=>c.style==='research'&&!c.active)){const id=c.id.replace(/^research-/,'').replace(/-select$/,'');const play=d.controls.find(p=>p.id==='research-'+id+'-start');if(!play||play.disabled)continue;const points=await page.evaluate(([a,b])=>[window.__structureGame.point(a),window.__structureGame.point(b)],[c.id,play.id]);if(points[0]?.hit===c.id&&points[1]?.hit===play.id){selected={id,control:c.id};break;}}
 assert.ok(selected,'visible unfinished admissible research project');const preResearch=await exportWhole('before-research');await click(selected.control);await wait(id=>window.__structureGame.model.research.selected===id,selected.id);
 const afterSelection=await exportWhole('after-research-selection');assert.deepEqual(afterSelection.parsed,preResearch.parsed);assert.equal(afterSelection.sha256,preResearch.sha256,'research node selection remains draft-only');await capture('research-selected');
 await click('research-'+selected.id+'-start');await wait(id=>window.__structureGame.state.project===id&&!window.__structureGame.state.waiting,selected.id);const active=await exportWhole('after-research-start');assert.notEqual(active.sha256,preResearch.sha256);report.researchProject=selected.id;await capture('research-active');
 await revealDetail('research-pause');await click('research-pause');await wait(()=>window.__structureGame.state.project===null&&!window.__structureGame.state.waiting);const commanded=await exportWhole('after-research-pause');await capture('research-paused');report.checks.push('Research tree and Principal tab, draft-only selection, actual acknowledged start and pause commands');
 await phase('reload-commanded-save');await page.evaluate(data=>window.__structureGame.load(data),commanded.data);await page.waitForFunction(()=>window.__structureGame.ready&&window.__structureGame.healthy&&window.__lisiere.backend==='WebGPU'&&window.__lisiere.speed===0,null,{timeout:Math.min(90000,remaining())});
 const reloaded=await exportWhole('reloaded-commanded-save');assert.deepEqual(reloaded.parsed,commanded.parsed);assert.equal(reloaded.sha256,commanded.sha256,'entire commanded save reloads exactly');assert.deepEqual(await page.evaluate(()=>window.__structureGame.preferences),report.preferencesBefore);assert.equal(reloaded.tick,report.input.tick);
 report.checks.push('Whole save unchanged by UI-only selections; commanded whole save and UI preferences preserved exactly through reload');
 assert.deepEqual(await sourceFence(),sources,'served source files remained frozen');assert.equal(sha(await readFile(fileURLToPath(import.meta.url))),report.driverSHA,'driver remained frozen');assert.deepEqual(report.errors,[]);assert.deepEqual(report.pageErrors,[]);report.status='passed';await phase('complete');
}catch(error){report.status='failed';report.failure=String(error?.stack??error);if(page&&!page.isClosed()){report.diagnostic=await page.evaluate(()=>window.__structureGame?.diagnostic??{ready:false,body:document.body.innerText.slice(0,1500)}).catch(cause=>({error:String(cause)}));report.location=page.url();await page.screenshot({path:resolve(folder,'failure.png')}).catch(()=>{});}throw error;}
finally{clearTimeout(watchdog);report.timedOut=timedOut;report.wallMs=Date.now()-started;await persist();await context?.close().catch(()=>{});await browser?.close().catch(()=>{});console.log(JSON.stringify({folder,status:report.status,phase:report.phase,timedOut}));}
