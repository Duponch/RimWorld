// Shared native GameSession journey support. No World writes or injected commands.
import {chromium} from '@playwright/test';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,relative,join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

export const sha=value=>createHash('sha256').update(value).digest('hex');
export async function captureNativeSources(root,extra=[]){
 const files={};async function visit(folder){for(const e of(await readdir(folder,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const p=join(folder,e.name);if(e.isDirectory())await visit(p);else if(e.isFile())files[relative(root,p).replaceAll('\\','/')]=sha(await readFile(p));else throw Error('Unsupported source '+p);}}
 await visit(resolve(root,'src'));for(const p of ['index.html','package.json','package-lock.json','vite.config.ts',...extra])files[p]=sha(await readFile(resolve(root,p)));return files;
}
const sharedHook=String.raw`
const journeyTrace=[];
const journeyActivate=nativeUi.options.onActivate,journeyError=nativeUi.options.onError;
nativeUi.options.onActivate=id=>{journeyTrace.push({kind:'activate',id,at:performance.now()});return journeyActivate?.(id);};
nativeUi.options.onError=message=>{journeyTrace.push({kind:'error',message,at:performance.now()});return journeyError(message);};
window.__nativeJourney={
 get ready(){return !!window.__lisiere&&!session.busy&&!replacingWorld&&!presentationPreparation&&!graphicsRecovering},
 get healthy(){return !!renderer&&!renderer.fatalError&&!graphicsFault&&!simulationStopped&&!waitingRequests.size&&!frontMenu.isOpen()},
 load:data=>replaceColony(()=>session.loadExternal(async()=>data)),save:()=>session.exportSave(),
 get preferences(){return {font:uiFont,docks:{...nativeDockPreferences}}},
 get state(){return {speed:currentSpeed,tick:campaignState()?.tick,waiting:waitingRequests.size,sessionBusy:session.busy,soundEnabled,soundVolume,musicEnabled,musicVolume}},
 get model(){const p=nativeUi?.page;return p?{id:p.id,title:p.title,layout:p.layout,actions:p.actions?.map(c=>({id:c.id,label:c.label,disabled:!!c.disabled})),rows:p.rows.map(r=>({id:r.id,label:r.label,value:r.value,detail:r.detail,hint:r.hint,meter:r.meter,controls:r.controls?.map(c=>({id:c.id,label:c.label,disabled:!!c.disabled,select:c.select?{value:c.select.value,options:c.select.options.map(o=>({value:o.value,label:o.label,disabled:o.disabled}))}:undefined}))}))}:null},
 point(id){const d=nativeUi?.diagnostics();if(!d)return null;const p=d.controls.find(c=>c.id===id)??d.targets.find(c=>c.nativeId===id);if(!p)return null;const hit=nativeUi.hit(p.x,p.y);return {...p,id,hit:hit?.control?.id??hit?.piece.userData.nativeId};},
 cellPoint(cell){if(!renderer)return null;renderer.camera.updateMatrixWorld();const v=renderer.camera.position.clone().set(cell.x,0,cell.z).project(renderer.camera),rect=renderer.renderer.domElement.getBoundingClientRect(),x=rect.left+(v.x+1)*rect.width/2,y=rect.top+(1-v.y)*rect.height/2;return {x,y,hit:renderer.pickAt(x,y),blocked:!!nativeUi.hit(x,y),visible:v.z>=-1&&v.z<=1&&Math.abs(v.x)<=1&&Math.abs(v.y)<=1};},
 get diagnostic(){return {ready:this.ready,healthy:this.healthy,state:this.state,preferences:this.preferences,model:this.model,trace:journeyTrace.slice(-40),ui:nativeUi?.diagnostics(),backend:renderer?.backend,incident:{graphicsFault,simulationStopped,graphicsRecovering,waiting:waitingRequests.size}}}
};
`;

/** Source fence and muted private browser are shared; feature drivers supply
 * only read-only facts and their own ordinary UI journey/assertions. */
export async function openNativeGameJourney({root,origin,budgetMs,report,persist,scenarioPaths=[],hook='',driverPath,preparation}){
 assert.ok(origin.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(origin.hostname)&&!['5173','5184'].includes(origin.port));
 assert.ok(Number.isFinite(budgetMs)&&budgetMs>=120000&&budgetMs<=240000);
 const started=Date.now(),remaining=()=>Math.max(1,budgetMs-(Date.now()-started));
 const extra=[...scenarioPaths,'scripts/native-game-journey.mjs',relative(root,driverPath).replaceAll('\\','/')];
 const sources=await captureNativeSources(root,extra);report.sources=sources;report.driverSHA=sources[relative(root,driverPath).replaceAll('\\','/')];
 let browser,context,watchdog,timedOut=false,activePage;
 let rejectRoute;const routeFailure=new Promise((_,reject)=>{rejectRoute=reject;});routeFailure.catch(()=>{});
 const observe=page=>{activePage=page;page.setDefaultTimeout(12000);page.on('pageerror',e=>report.pageErrors.push(String(e)));page.on('console',m=>{if(m.type()==='error'||/GPUValidationError|device.*lost/i.test(m.text()))report.errors.push(m.text());});return page;};
 try{
  browser=await chromium.launch({executablePath:resolve(root,report.browserPath??'.playwright/chromium-1243/chrome-win64/chrome.exe'),headless:false,args:['--mute-audio','--enable-unsafe-webgpu']});
  report.browser=browser.version();watchdog=setTimeout(()=>{timedOut=true;void browser.close();},remaining());
  context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  await context.addInitScript(()=>{for(const [k,v]of Object.entries({'lisiere.audio.effects.enabled.v1':'false','lisiere.audio.music.enabled.v1':'false','lisiere.audio.effects.volume.v1':'0','lisiere.audio.music.volume.v1':'0','lisiere.autosave-minutes.v1':'0','lisiere.presentation.threat-pause.v1':'never','elsewhere.ui3d.auto-hide.v1':JSON.stringify({bottom:false,notifications:false})}))localStorage.setItem(k,v);});
  if(preparation)await context.route(new URL(preparation.path,origin).href,route=>route.fulfill({status:200,contentType:'text/html',body:preparation.html}));
  await context.route(/\/(?:src\/.*|tests\/scenarios\/.*)\.ts(?:\?|$)/,async route=>{
   try{
    let response;for(let n=0;n<3;n++){try{response=await route.fetch();break;}catch(error){report.routeRetries??=[];report.routeRetries.push({url:route.request().url(),attempt:n,error:String(error)});if(n===2)throw error;await new Promise(r=>setTimeout(r,200));}}
    const body=await response.text(),path=new URL(route.request().url()).pathname.slice(1),expected=sources[path];
    // Every product source is fenced. A scenario dependency must be declared.
    assert.equal(response.status(),200);assert.ok(expected,'Unfenced source '+path);
    const encoded=body.match(/\/\/[#@]\s*sourceMappingURL=data:application\/json(?:;charset=[^;,]+)?;base64,([A-Za-z0-9+/=]+)/),map=encoded?JSON.parse(Buffer.from(encoded[1],'base64').toString('utf8')):null;
    assert.ok(sha(body)===expected||map?.sourcesContent?.some(s=>typeof s==='string'&&sha(s)===expected),'Served source differs: '+path);
    let served=body;if(path==='src/main.ts'){for(const a of ['function replaceColony','void start().catch'])assert.ok(body.includes(a));served+=sharedHook+'\n'+hook;}
    report.served.push({path,sourceSHA:expected,responseSHA:sha(body),servedSHA:sha(served)});await route.fulfill({response,body:served});
   }catch(error){report.errors.push(String(error));rejectRoute(error);await route.abort().catch(()=>{});}
  });
 }catch(error){clearTimeout(watchdog);await context?.close().catch(()=>{});await browser?.close().catch(()=>{});throw error;}
 return {context,sources,remaining,routeFailure,observe,
  async newPage(){return observe(await context.newPage());},
  async verify(){assert.deepEqual(await captureNativeSources(root,extra),sources,'source, scenario and driver files stayed frozen');},
  async close(){clearTimeout(watchdog);report.timedOut=timedOut;report.wallMs=Date.now()-started;if(activePage&&!activePage.isClosed()&&report.status!=='passed'){report.location=activePage.url();report.diagnostic=await activePage.evaluate(()=>window.__nativeJourney?.diagnostic??{body:document.body.innerText.slice(0,1500)}).catch(e=>({error:String(e)}));await activePage.screenshot({path:resolve(report.folder,'failure.png')}).catch(()=>{});}await persist();await context?.close().catch(()=>{});await browser?.close().catch(()=>{});}
 };
}

export function nativeGameControls({page,journey,report,persist,schema}){
 const wait=(fn,arg=null,timeout=18000)=>Promise.race([journey.routeFailure,page.waitForFunction(fn,arg,{timeout:Math.min(timeout,journey.remaining())})]);
 const ready=()=>wait(()=>window.__nativeJourney?.ready&&window.__nativeJourney.healthy&&window.__lisiere.backend==='WebGPU'&&window.__nativeJourney.state.speed===0,null,60000);
 const ui=()=>page.evaluate(()=>window.__lisiere.nativeUi),model=()=>page.evaluate(()=>window.__nativeJourney.model);
 const point=async id=>{await wait(id=>{const p=window.__nativeJourney.point(id);return p&&!p.disabled&&p.hit===id;},id);return page.evaluate(id=>window.__nativeJourney.point(id),id);};
 const click=async id=>{const p=await point(id);await page.mouse.click(p.x,p.y);};
 const settle=async()=>{await page.mouse.move(page.viewportSize().width-12,8);await wait(()=>window.__lisiere.nativeUi.activeAnimations===0);await page.waitForTimeout(60);};
 const close=async()=>{await page.keyboard.press('Escape');await page.waitForTimeout(60);};
 const reveal=async id=>{for(let n=0;n<14;n++){const p=await page.evaluate(id=>window.__nativeJourney.point(id),id);if(p&&!p.disabled&&p.hit===id)return;const d=await ui();assert.ok(d.pageBounds&&d.maxScroll>0,'scrollable control '+id);await page.mouse.move(d.pageBounds.x+d.pageBounds.width*.65,d.pageBounds.y+d.pageBounds.height*.6);await page.mouse.wheel(0,180);await page.waitForTimeout(60);}throw Error('Unreachable native control '+id);};
 const capture=async(label,facts)=>{await settle();const path=resolve(report.folder,label+'.png');await page.screenshot({path});report.captures.push({label,path,sha256:sha(await readFile(path)),state:await page.evaluate(()=>window.__nativeJourney.state),ui:await ui(),model:await model(),facts:facts?await facts():undefined});await persist();};
 const exportWhole=async label=>{await ready();const data=await page.evaluate(()=>window.__nativeJourney.save());assert.equal(typeof data,'string');const parsed=JSON.parse(data),path=resolve(report.folder,label+'.json');assert.equal(parsed.schemaVersion,schema);await writeFile(path,data);const row={label,path,sha256:sha(data),bytes:Buffer.byteLength(data),tick:parsed.tick};report.saves.push(row);await persist();return {data,parsed,...row};};
 const management=async id=>{const p=(await ui()).management.find(p=>p.id===id);assert.ok(p,id);await page.mouse.click(p.x,p.y);};
 const worldClick=async cell=>{const p=await page.evaluate(c=>window.__nativeJourney.cellPoint(c),cell);assert.ok(p?.visible&&!p.blocked,'visible unobstructed world cell');assert.deepEqual(p.hit,cell,'actual world raycast');await page.mouse.click(p.x,p.y);};
 return {wait,ready,ui,model,point,click,settle,close,reveal,capture,exportWhole,management,worldClick};
}
