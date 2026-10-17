import {expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../../src/sim/serialization';
import {registeredMapPresentation,campaignOnlySummary} from '../../src/sim/world-map-presentation';
import {campaignUIFacts} from '../../src/ui/map-registry-adapter';
import type {CampaignState} from '../../src/sim/world-map-state';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {pause,panel,expectWorld,serializedWorld,observeErrors} from './helpers';

export interface Input414 {path:string;sha256:string}
export interface Manifest414 {revision:1;schemaVersion:259;notice:string;capture:Input414&{mapId:number;captainId:number;captiveId:number;destination:number};settle:Input414&{groupId:number}}
export const sha414=(s:string)=>createHash('sha256').update(s).digest('hex');
export async function input414(branch:'capture'|'settle'){
 const path=process.env.OWNERS414_MANIFEST;if(!path)throw Error('ROOT must supply OWNERS414_MANIFEST with acquired future path+SHA; no fallback fixture');
 const manifest=JSON.parse(await readFile(path,'utf8')) as Manifest414;
 expect(manifest.revision).toBe(1);expect(manifest.schemaVersion).toBe(259);expect(manifest.notice.length).toBeGreaterThan(0);
 const entry=manifest[branch];expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
 const bytes=await readFile(entry.path,'utf8');expect(sha414(bytes)).toBe(entry.sha256);
 const root=deserializeCampaign(await decodeStoredSave(bytes));expect(root.schemaVersion).toBe(259);expect(validateWorld(root)).toEqual([]);
 return {manifest,entry,root};
}

/** Copied narrowly from V413: observes the actual Worker; never sends a command. */
async function installTransport414(page:Page){await page.addInitScript(()=>{
 const rows:unknown[]=[],seen=new WeakMap<Worker,number>();let ordinal=0;
 Object.defineProperty(window,'__owners414Transport',{value:rows});
 const original=Worker.prototype.postMessage as (...args:unknown[])=>void;
 Worker.prototype.postMessage=function(this:Worker,...args:unknown[]){
  let worker=seen.get(this);if(worker===undefined){worker=++ordinal;seen.set(this,worker);const number=worker;
   this.addEventListener('message',(e:MessageEvent)=>{const d=e.data;if(!d)return;
    if(d.type==='reply')rows.push({direction:'received',worker:number,id:d.id,type:d.type,ok:d.ok,reason:d.reason,checkpoint:d.checkpoint,at:performance.now()});
    else if(['camp-entry-progress','snapshot','campaign-only','fault'].includes(d.type))rows.push({direction:'received',worker:number,type:d.type,id:d.id,epoch:d.epoch,revision:d.revision,progress:d.type==='camp-entry-progress'?structuredClone(d.progress):undefined,reason:d.reason,at:performance.now()});
   });}
  const d=args[0] as {id?:number;type?:string;command?:unknown;speed?:number}|undefined;
  if(d&&typeof d.id==='number'&&typeof d.type==='string')rows.push({direction:'sent',worker,id:d.id,type:d.type,...d.command?{command:structuredClone(d.command)}:{},...typeof d.speed==='number'?{speed:d.speed}:{},at:performance.now()});
  original.apply(this,args);
 } as Worker['postMessage'];
});}

type Row414={direction:string;worker:number;id?:number;type:string;command?:{type:string;[key:string]:unknown};ok?:boolean;checkpoint?:{epoch:number;revision:number};epoch?:number;revision?:number;navigation?:number;at:number};
type Hardware414={backend:string;context:string;adapter:{vendor:string;architecture:string;device:string;description:string}|null;maxVertexBuffers:number|null};
/** Uses the common import/export UI and entire admitted RAW as the save oracle.
 * A mapless input compares the real campaign summary, never a synthetic World. */
export async function harness414(page:Page,info:TestInfo,scope:string,options:{exactAdoptionOnce415?:true}={}){
 const errors=observeErrors(page),hardware:Hardware414[]=[],transport:Row414[]=[],checkpoints:unknown[]=[];
 const proof:Record<string,unknown>={complete:false,scope,executed:true};let navigation=0;
 page.on('console',message=>{const prefix='Lisière renderer diagnostics',text=message.text();if(text.startsWith(prefix)){try{hardware.push(JSON.parse(text.slice(prefix.length).trim()));}catch{/* Assert the actual diagnostic below. */}}});
 await installTransport414(page);
 const collect=async()=>{const rows=await page.evaluate(()=>{const log=(window as unknown as {__owners414Transport?:Row414[]}).__owners414Transport;return log?log.splice(0):[];});transport.push(...rows.map(r=>({...r,navigation})));};
 async function stop(){await page.keyboard.press('Escape');await pause(page);await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false);}
 async function adopted(root:CampaignState){
  await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false);
  const projected=registeredMapPresentation(root);
  if(options.exactAdoptionOnce415){
   // This415 path always retains the real home map. Await only its confirmed
   // scalar adoption header; the entire World is read once OUTSIDE polling.
   // Pause/inert acknowledgement above remains part of the load/export path.
   const m=projected?.campaignMap;if(!projected||m?.revision!==2)throw Error('Native415 requires its actual remaining registered map');
   const header={tick:projected.tick,seed:projected.seed,width:projected.width,height:projected.height,mapId:m.activeMapId,waiting:0};
   await expect.poll(()=>page.evaluate(()=>{const api=window.__lisiere,w=api.world,m=w.campaignMap;return {tick:w.tick,seed:w.seed,width:w.width,height:w.height,mapId:m?.revision===2?m.activeMapId:null,waiting:api.incident.waiting};}),{message:'Native415 confirmed scalar map adoption'}).toEqual(header);
   const expected=JSON.parse(JSON.stringify(projected)),actual=JSON.parse(await serializedWorld(page)),same=isDeepStrictEqual(actual,expected);
   if(!same){const path=info.outputPath('save-mismatch.json');await writeFile(path,JSON.stringify({expected,actual,notice:await page.locator('#notice').textContent()}));await info.attach('save-mismatch',{contentType:'application/json',path});}
   expect(same,'Native415 entire exact World after scalar adoption; no retry of a different state').toBe(true);proof.exactAdoptionOnce415=true;return;
  }
  if(projected)await expectWorld(page,JSON.parse(JSON.stringify(projected)));
  else {const expected=JSON.parse(JSON.stringify(campaignUIFacts(campaignOnlySummary(root))));await expect.poll(()=>page.evaluate(()=>JSON.stringify((window as unknown as {__lisiere:{campaign:unknown}}).__lisiere.campaign)).then(s=>JSON.parse(s))).toEqual(expected);}
 }
 async function load(path:string,root:CampaignState){
  if(navigation)await collect();await page.goto('/?e2e');navigation++;
  const front=page.locator('.front-menu');await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(path);
  await expect(front).toBeHidden({timeout:90_000});await expect(page.locator('#loading')).toHaveCount(0,{timeout:90_000});await stop();await adopted(root);
 }
 async function exported(name:string){
  await stop();await panel(page,'menu');const pending=page.waitForEvent('download');await page.locator('[data-save-manager-action="export"]').click();
  const path=info.outputPath(name+'.json');await(await pending).saveAs(path);const bytes=await readFile(path,'utf8');
  const receipt={name,path,fileSHA256:sha414(bytes)};checkpoints.push(receipt);proof.latestCompleteExport=receipt;await info.attach(name,{path,contentType:'application/json'});
  const root=deserializeCampaign(await decodeStoredSave(bytes));expect(validateWorld(root)).toEqual([]);const canonical=serializeCampaign(root);await adopted(root);
  return {path,root,canonical,fileSHA256:receipt.fileSHA256};
 }
 async function groups(){await page.keyboard.press('Escape');await panel(page,'world');await page.locator('#world-tab-group').click();await expect(page.locator('[data-group-panel]')).toBeVisible();}
 function actualGPU(){const h=hardware.at(-1);expect(h?.backend).toBe('WebGPU');expect(h?.context).toBe('GPUCanvasContext');expect(h?.adapter?.vendor.length).toBeGreaterThan(0);expect(h?.adapter?.architecture.length).toBeGreaterThan(0);expect(JSON.stringify(h)).not.toMatch(/swiftshader|llvmpipe|lavapipe|software adapter|basic render driver/i);proof.hardware={source:'configured canvas GPUDevice.adapterInfo',...h};}
 async function ack(type:string){
  await collect();const sent=transport.filter(r=>r.direction==='sent'&&r.type==='command'&&r.command?.type===type);expect(sent.length,type).toBeGreaterThan(0);const request=sent.at(-1)!;
  const findReply=()=>transport.find(r=>r.direction==='received'&&r.type==='reply'&&r.navigation===request.navigation&&r.worker===request.worker&&r.id===request.id);
  await expect.poll(async()=>{await collect();return !!findReply();},{message:type+' real ACK'}).toBe(true);
  const reply=findReply()!;expect(reply,type).toMatchObject({ok:true});
  if(type==='group-enter'){
   expect(reply.checkpoint,type+' confirmed checkpoint').toBeDefined();const c=reply.checkpoint!;
   expect(transport.some(r=>r.direction==='received'&&['snapshot','campaign-only'].includes(r.type)&&r.navigation===request.navigation&&r.worker===request.worker&&r.epoch===c.epoch&&r.revision!==undefined&&r.revision>=c.revision),type+' actual publication for ACK').toBe(true);
  }else{
   // Ordinary commands publish before their correlated reply, without an
   // init/load/entry checkpoint. The caller also checks the adopted UI state.
   expect(['group-start','group-cancel']).toContain(type);expect(reply.checkpoint).toBeUndefined();
   expect(transport.some(r=>r.direction==='received'&&['snapshot','campaign-only'].includes(r.type)&&r.navigation===request.navigation&&r.worker===request.worker&&r.at>=request.at&&r.at<=reply.at&&Number.isSafeInteger(r.epoch)&&Number.isSafeInteger(r.revision)),type+' actual publication preceding ACK').toBe(true);
  }return {request,reply};
 }
 async function finish(){await collect();expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false,waiting:0});proof.complete=true;}
 async function failure(error:unknown){proof.error=String(error);try{if(await page.locator('.front-menu').isVisible())throw Error('Import not confirmed');await exported('failure-current-no-replay');}catch(cause){proof.failureCaptureError=String(cause);}}
 async function save(){try{await collect();}catch(cause){proof.transportCaptureError=String(cause);}await writeFile(info.outputPath('proof.json'),JSON.stringify({...proof,errors,rendererDiagnostics:hardware,transport,checkpoints},null,2));}
 return {proof,load,exported,groups,actualGPU,ack,stop,finish,failure,save,transport};
}

/** Current dense globe uses its real numeric tile control. Historical globes
 * keep the existing SVG hit-test. Neither path calls a route or selection API. */
export async function tile414(page:Page,id:number){
 const dense=page.locator('[data-group-panel] .planet-dense-view');
 if(await dense.count()){
  await dense.getByRole('spinbutton',{name:'Numéro de case du globe',exact:true}).fill(String(id));
  await dense.getByRole('button',{name:'Afficher la case',exact:true}).click();
  await expect(dense.locator('[data-planet-selection]')).toHaveValue(String(id));return;
 }
 const svg=page.locator('.planet-view svg');await svg.scrollIntoViewIfNeeded();await svg.focus();
 for(let turn=0;turn<54;turn++){
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  if(!await page.locator(`[data-planet-tile="${id}"]`).count()){await page.keyboard.press('ArrowRight');continue;}
  const point=await page.locator(`[data-planet-tile="${id}"]`).evaluate(el=>{const p=el as SVGPathElement,d=p.getAttribute('d');if(!d||getComputedStyle(p).display==='none')return null;const values=d.match(/-?\d+(?:\.\d+)?/g)?.map(Number);if(!values||values.length<6)return null;let x=0,y=0;for(let i=0;i<values.length;i+=2){x+=values[i]!;y+=values[i+1]!;}const matrix=p.getScreenCTM();if(!matrix)return null;const at=new DOMPoint(x/(values.length/2),y/(values.length/2)).matrixTransform(matrix);return document.elementFromPoint(at.x,at.y)?.closest('[data-planet-tile]')===p?{x:at.x,y:at.y}:null;});
  if(point){await page.mouse.click(point.x,point.y);await expect(page.locator('[data-planet-selection]')).toHaveValue(String(id));return;}await page.keyboard.press('ArrowRight');
 }throw Error(`Declared destination ${id} has no visible hit surface; never choose a favorable replacement`);
}
