import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../../src/sim/index';
import {registeredMap} from '../../src/sim/world-map-context';
import {campaignPresentation} from '../../src/sim/secondary-site-presentation';
import {readGroupPanelSnapshot} from '../../src/ui/group-adapter';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {pause,panel,world,expectWorld,observeErrors} from './helpers';
import {revealCells} from './player-actions';
import type {CampaignState} from '../../src/sim/world-map-state';
import type {NativeFreight413Manifest} from '../helpers/group-freight-v413';

const input=process.env.GROUP_FREIGHT_413_INPUT,manifestPath=process.env.GROUP_FREIGHT_413_MANIFEST;
const resume=process.env.GROUP_FREIGHT_413_RESUME==='1',resumeSHA=process.env.GROUP_FREIGHT_413_RESUME_SHA256;
test.skip(process.env.GROUP_FREIGHT_413!=='1'||!input||!manifestPath,'ROOT: RAW-validated258 fixture, frozen sources and native Chrome required.');
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const selected=async(page:Page)=>readGroupPanelSnapshot(await world(page)); // ALWAYS outside page.evaluate.
function local(w:CampaignState,id:number){const map=registeredMap(w,id);if(!map)throw Error('The declared original map is absent');return map;}
async function stop(page:Page){await page.keyboard.press('Escape');await pause(page);await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false);}
async function groups(page:Page){await page.keyboard.press('Escape');await panel(page,'world');await page.locator('#world-tab-group').click();await expect(page.locator('[data-group-panel]')).toBeVisible();}
async function speed(page:Page){await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();await expect(page.locator('[data-speed="1"]')).toHaveAttribute('aria-pressed','true');}
// Existing V412 SVG hit-test and keyboard rotation. No direct route command.
async function selectTile(page:Page,id:number){
 const svg=page.locator('.planet-view svg');await svg.scrollIntoViewIfNeeded();await svg.focus();
 for(let turn=0;turn<54;turn++){
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  const point=await page.locator(`[data-planet-tile="${id}"]`).evaluate(el=>{
   const p=el as SVGPathElement,d=p.getAttribute('d');if(!d||getComputedStyle(p).display==='none')return null;
   const values=d.match(/-?\d+(?:\.\d+)?/g)?.map(Number);if(!values||values.length<6)return null;
   let x=0,y=0;for(let i=0;i<values.length;i+=2){x+=values[i]!;y+=values[i+1]!;}
   const matrix=p.getScreenCTM();if(!matrix)return null;const at=new DOMPoint(x/(values.length/2),y/(values.length/2)).matrixTransform(matrix);
   return document.elementFromPoint(at.x,at.y)?.closest('[data-planet-tile]')===p?{x:at.x,y:at.y}:null;
  });
  if(point){await page.mouse.click(point.x,point.y);await expect(page.locator('[data-planet-selection]')).toHaveValue(String(id));return;}await page.keyboard.press('ArrowRight');
 }throw Error(`Tile${id} did not offer a visible hit surface`);
}

type TransportRow={direction:'sent'|'received';worker:number;id:number;type:string;command?:unknown;speed?:number;ok?:boolean;reason?:string;checkpoint?:unknown;at:number;navigation?:number};
/** Read-only transport witness. UI remains the only command producer. Save/load
 * payloads are NOT copied into this log; complete downloads are separate files. */
async function recordTransport(page:Page){await page.addInitScript(()=>{
 const witness:unknown[]=[],seen=new WeakMap<Worker,number>();let ordinal=0;
 Object.defineProperty(window,'__freight413Transport',{value:witness});
 const original=Worker.prototype.postMessage as (...args:unknown[])=>void;
 Worker.prototype.postMessage=function(this:Worker,...args:unknown[]){
  let worker=seen.get(this);if(worker===undefined){worker=++ordinal;seen.set(this,worker);const number=worker;
   this.addEventListener('message',(e:MessageEvent)=>{const d=e.data;if(d&&d.type==='reply')witness.push({direction:'received',worker:number,id:d.id,type:d.type,ok:d.ok,reason:d.reason,checkpoint:d.checkpoint,at:performance.now()});});}
  const d=args[0] as {id?:number;type?:string;command?:unknown;speed?:number}|undefined;
  if(d&&typeof d.id==='number'&&typeof d.type==='string')witness.push({direction:'sent',worker,id:d.id,type:d.type,...d.command?{command:structuredClone(d.command)}:{},...typeof d.speed==='number'?{speed:d.speed}:{},at:performance.now()});
  original.apply(this,args);
 } as Worker['postMessage'];
});}

interface Sample {tick:number;phase:string;packOwner:unknown;loaded:boolean;delivered:boolean;deadline?:number;carrierId?:number;human?:{x:number;z:number;path:number;cooldown:number;motion:unknown;end:number};animal?:{x:number;z:number;path:number;motion:unknown;end:number}}

test('declared32²: UI medicine split and heavy original pack, physical human→animal handoff, exact UI reload and actual departure',async({page},info:TestInfo)=>{
 interface RendererDiagnostic {backend:string;context:string;adapter:{vendor:string;architecture:string;device:string;description:string}|null;maxVertexBuffers:number|null}
 const rendererDiagnostics:RendererDiagnostic[]=[];
 page.on('console',message=>{const prefix='Lisière renderer diagnostics',text=message.text();if(text.startsWith(prefix)){try{rendererDiagnostics.push(JSON.parse(text.slice(prefix.length).trim()) as RendererDiagnostic);}catch{/* Malformed diagnostics are rejected below by the actual device assertions. */}}});
 const errors=observeErrors(page),raw=await readFile(input!,'utf8'),manifest=JSON.parse(await readFile(manifestPath!,'utf8')) as NativeFreight413Manifest;
 const initial=deserializeCampaign(await decodeStoredSave(raw));if(!('pawns'in initial))throw Error('The prepared input must retain its real loaded map');
 expect(validateWorld(initial)).toEqual([]);expect(initial.schemaVersion).toBe(258);expect(manifest.revision).toBe(1);expect(manifest.schemaVersion).toBe(258);
 expect([local(initial,manifest.mapId).width,local(initial,manifest.mapId).height]).toEqual([32,32]);expect(initial.worldMaps!.sites).toHaveLength(1);
 if(resume){expect(resumeSHA,'Resume must pin the last preserved complete checkpoint SHA256').toMatch(/^[a-f0-9]{64}$/);expect(sha(raw)).toBe(resumeSHA);expect(initial.worldGroups!.groups).toHaveLength(1);}
 else {expect(sha(raw)).toBe(manifest.fixtureSHA256);expect(initial.tick).toBe(0);expect(initial.worldGroups!.groups).toHaveLength(0);}
 const proof:Record<string,unknown>={complete:false,scope:resume?'bounded continuation from preserved complete checkpoint; earlier milestones are not replayed or newly claimed':'one native UI formation, physical loading and departure',inputSHA256:sha(raw),manifest,notice:manifest.notice},transport:TransportRow[]=[],samples:Sample[]=[],checkpoints:unknown[]=[];
 let navigation=0,groupId:number|undefined=resume?initial.worldGroups!.groups[0]!.state.id:undefined;
 await recordTransport(page);
 async function collectTransport(){const rows=await page.evaluate(()=>{const log=(window as unknown as {__freight413Transport?:TransportRow[]}).__freight413Transport;return log?log.splice(0):[];});transport.push(...rows.map(r=>({...r,navigation})));}
 async function load(path:string,expected:CampaignState){
  if(!('pawns'in expected))throw Error('This native freight checkpoint requires its actual loaded map');
  if(navigation)await collectTransport();await page.goto('/?e2e');navigation++;
  const front=page.locator('.front-menu');await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(path);
  await expect(front).toBeHidden({timeout:60_000});await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});await stop(page);
  await expectWorld(page,JSON.parse(JSON.stringify(campaignPresentation(expected))));
 }
 async function exported(name:string){
  await stop(page);await panel(page,'menu');const pending=page.waitForEvent('download');await page.locator('[data-save-manager-action="export"]').click();
  const path=info.outputPath(name+'.json');await(await pending).saveAs(path);const bytes=await readFile(path,'utf8');
  // COMPLETE FILE FIRST. Even a failed decode/validator leaves this real file.
  const checkpoint={name,path,fileSHA256:sha(bytes)};checkpoints.push(checkpoint);proof.latestCompleteExport=checkpoint;await info.attach(name,{path,contentType:'application/json'});
  const complete=deserializeCampaign(await decodeStoredSave(bytes));if(!('pawns'in complete))throw Error('This pilot requires its actual loaded home map');
  expect(validateWorld(complete)).toEqual([]);const canonical=serializeCampaign(complete);await expectWorld(page,JSON.parse(JSON.stringify(campaignPresentation(complete))));
  return {path,complete,canonical,fileSHA256:checkpoint.fileSHA256};
 }
 async function observe():Promise<Sample|undefined>{
  const v=await selected(page),g=v?.group;if(!v||!g||groupId!==undefined&&g.id!==groupId)return;
  const away='members'in g,people=away?g.members:v.world.pawns,animals=away?g.animalOwners?.members:v.world.wildlife?.animals,packs=away?g.packed:v.world.packed;
  const line='manifest'in g?g.bedrollLoading?.manifest.find(l=>l.structureId===manifest.pack.id):undefined,carrier=line?people.find(p=>p.id===line.carrierId):undefined,animal=animals?.find(a=>a.id===manifest.animalId),pack=packs?.find(p=>p.building.id===manifest.pack.id);
  const s:Sample={tick:v.world.tick,phase:g.phase,packOwner:pack?structuredClone(pack.owner):null,loaded:line?.loaded??away,delivered:line?.deliveredToAnimal??away,...line?.handoffReadyCore!==undefined?{deadline:line.handoffReadyCore}:{},...line?{carrierId:line.carrierId}:{},
   ...carrier?{human:{x:carrier.x,z:carrier.z,path:carrier.path.length,cooldown:carrier.moveCooldown,motion:carrier.motion?structuredClone(carrier.motion):null,end:carrier.motion?.end??0}}:{},...animal?{animal:{x:animal.x,z:animal.z,path:animal.path.length,motion:animal.motion?structuredClone(animal.motion):null,end:animal.motion?.end??0}}:{}};
  if(samples.at(-1)?.tick!==s.tick||samples.at(-1)?.phase!==s.phase)samples.push(s);return s;
 }
 try{
  await load(input!,initial);expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
  // Read the device already bound to the rendered canvas. A second requestAdapter
  // stalled on this machine and does not identify the device rendering this test.
  const hardware=rendererDiagnostics.at(-1);expect(hardware?.backend).toBe('WebGPU');expect(hardware?.context).toBe('GPUCanvasContext');expect(hardware?.adapter?.vendor.length).toBeGreaterThan(0);expect(hardware?.adapter?.architecture.length).toBeGreaterThan(0);
  expect(JSON.stringify(hardware)).not.toMatch(/swiftshader|llvmpipe|lavapipe|software adapter|basic render driver/i);proof.hardware={source:'configured canvas GPUDevice.adapterInfo',...hardware};
  // Preserve the confirmed paused import before the UI boundary under diagnosis.
  if(process.env.GROUP_FREIGHT_413_PROFILE_GROUP==='1'){
   await exported('00-confirmed-import-before-group-panel');await page.keyboard.press('Escape');
   const cdp=await page.context().newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.start');
   let stopped=false;const capture=async()=>{if(stopped)return;stopped=true;try{const result=await cdp.send('Profiler.stop');await writeFile(info.outputPath('group-panel-open-cpu.json'),JSON.stringify({scope:'Targeted8s CPU sampling around actual paused UI opening; no FPS or simulation throughput claim',profile:result.profile}));}catch(cause){await writeFile(info.outputPath('group-panel-open-cpu-error.txt'),String(cause));}};
   const timer=setTimeout(()=>{void capture();},8000);await groups(page);clearTimeout(timer);await capture();
  }else await groups(page);
  if(!resume){
   const source=local(initial,manifest.mapId).piles.find(p=>p.id===manifest.medicine.sourceId)!;expect(source).toMatchObject({item:'medicine',quantity:6,owner:{type:'ground'}});
   for(const id of manifest.memberIds)await page.locator(`[data-group-member="${id}"] input[type=checkbox]`).first().check();
   for(const id of manifest.residentIds)await expect(page.locator(`[data-group-member="${id}"] input[type=checkbox]`).first()).not.toBeChecked();
   await page.locator(`[data-group-animal="${manifest.animalId}"] input[type=checkbox]`).first().check();await page.locator(`[data-group-packed="${manifest.pack.id}"] input[type=checkbox]`).check();
   await page.locator(`[data-group-pile="${manifest.medicine.sourceId}"] input[aria-label^="Charger "]`).fill('2');await selectTile(page,manifest.destination);
   await page.locator('[data-group-preview="formation"]').click();await expect(page.locator('[data-group-route]')).toContainText('Route proposée');await expectWorld(page,JSON.parse(JSON.stringify(campaignPresentation(initial))));
   await page.screenshot({path:info.outputPath('01-finite-medicine-and-heavy-pack-selected.png')});const start=page.locator('[data-group-action="start"]');await expect(start).toHaveAttribute('aria-disabled','false');await start.click();
   await expect.poll(async()=>(await selected(page))?.group?.phase,{intervals:[20],timeout:10_000}).toBe('gathering');groupId=(await selected(page))!.group!.id;
  }
  const admitted=(await selected(page))?.group;if(!admitted||admitted.id!==groupId)throw Error('The selected original preparation is absent');
  if('manifest'in admitted){
   expect(admitted.memberIds).toEqual(manifest.memberIds);expect(admitted.animalPreparation?.lines.map(l=>l.animalId)).toEqual([manifest.animalId]);
   expect(admitted.manifest).toHaveLength(1);expect(admitted.manifest[0]).toMatchObject({pileId:manifest.medicine.sourceId,item:'medicine',quantity:2,animalCarrierId:manifest.animalId});
   expect(admitted.bedrollLoading).toMatchObject({revision:2,manifest:[{structureId:manifest.pack.id,animalCarrierId:manifest.animalId}]});
  }
  const inputPack=local(initial,manifest.mapId).packed.find(p=>p.building.id===manifest.pack.id),needsCarryCheckpoint='manifest'in admitted&&admitted.bedrollLoading?.manifest.some(l=>!l.deliveredToAnimal);
  if(needsCarryCheckpoint){
   // If resuming a real carry/wait export, use it directly; otherwise observe
   // an actual loaded moving edge away from the declared ground source.
   const heldAtInput=resume&&inputPack?.owner.type==='inventory'&&manifest.memberIds.includes(inputPack.owner.pawnId);
   if(!heldAtInput){await speed(page);await expect.poll(async()=>{const s=await observe();if(s&&s.tick-initial.tick>1800)throw Error('Actual carry exceeded the bounded1800 local ticks; keep the checkpoint');return !!s&&s.loaded&&!s.delivered&&!!s.human&&s.human.end>s.tick&&Math.abs(s.human.x-manifest.pack.ground.x)+Math.abs(s.human.z-manifest.pack.ground.z)>1;},{intervals:[10],timeout:45_000}).toBe(true);}
   const held=await exported('02-original-heavy-pack-carried-or-waiting'),map=local(held.complete,manifest.mapId),g=held.complete.worldGroups!.groups.find(r=>r.state.id===groupId)!.state;
   if(!('manifest'in g))throw Error('The carry checkpoint was passed before complete export; no preparation replay');
   const line=g.bedrollLoading!.manifest.find(l=>l.structureId===manifest.pack.id)!,pack=map.packed.find(p=>p.building.id===manifest.pack.id)!,carrier=map.pawns.find(p=>p.id===line.carrierId)!;
   expect(line.loaded).toBe(true);expect(line.deliveredToAnimal).not.toBe(true);expect(pack.owner).toEqual({type:'inventory',pawnId:carrier.id});expect(pack.building).toEqual(manifest.pack.building);
   expect(line.handoffReadyCore!==undefined||!!carrier.motion&&carrier.motion.end>map.tick,'Complete export must preserve real wait or a captured carry edge').toBe(true);
   await page.keyboard.press('Escape');await revealCells(page,[carrier]);await page.screenshot({path:info.outputPath('02-original50kg-pack-on-human.png')});
   await load(held.path,held.complete);const exact=await exported('03-same-carry-exact-ui-reload');expect(exact.canonical).toBe(held.canonical);proof.exactCarryReload={tick:held.complete.tick,input:held.fileSHA256,reexport:exact.fileSHA256};
  }else proof.exactCarryReload={acquiredHere:false,reason:'Continuation starts after handoff; earlier carry/reload evidence must be assessed separately'};
  const beforeDeparture=(await selected(page))?.group;
  if(beforeDeparture&&'manifest'in beforeDeparture){
   const from=(await world(page)).tick;await speed(page);
   await expect.poll(async()=>{const s=await observe();if(s&&s.tick-from>1800)throw Error('Actual exit exceeded the bounded1800 local ticks; keep the checkpoint');return !!s&&['travelling','at-site','awaiting-entry','stationary'].includes(s.phase);},{intervals:[10],timeout:60_000}).toBe(true);
  }
  const departed=await exported('04-actual-human-animal-departure'),map=local(departed.complete,manifest.mapId),row=departed.complete.worldGroups!.groups.find(r=>r.state.id===groupId);
  if(!row||!('members'in row.state))throw Error('Actual complete away owner not preserved');const g=row.state;
  expect(row.localMapId).toBeNull();expect(g.members.map(p=>p.id)).toEqual(manifest.memberIds);expect(g.animalOwners?.members.map(a=>a.id)).toEqual([manifest.animalId]);expect(g.packed?.find(p=>p.building.id===manifest.pack.id)).toEqual({building:manifest.pack.building,owner:{type:'inventory',pawnId:manifest.animalId}});
  expect(map.pawns.map(p=>p.id)).toEqual(manifest.residentIds);expect(map.wildlife?.animals.some(a=>a.id===manifest.animalId)).toBe(false);expect(map.packed.some(p=>p.building.id===manifest.pack.id)).toBe(false);
  expect(map.piles.find(p=>p.id===manifest.medicine.sourceId)).toMatchObject({item:'medicine',quantity:4,owner:{type:'ground'}});
  const meds=g.items.filter(p=>p.item==='medicine');expect(meds).toHaveLength(1);expect(meds[0]).toMatchObject({quantity:2,owner:{type:'inventory',pawnId:manifest.animalId}});expect(meds[0]!.id).not.toBe(manifest.medicine.sourceId);
  expect([...map.piles,...g.items].filter(p=>p.item==='medicine').reduce((n,p)=>n+p.quantity,0)).toBe(6);
  const waits=samples.filter(s=>s.deadline!==undefined);proof.waitSamples=waits;
  if(!resume||needsCarryCheckpoint){
   expect(waits.length,'25Core waiting must be observed in the real native sequence; a missed window is preserved as failure, never a replay').toBeGreaterThan(0);
   for(const s of waits){expect(s.human).toBeDefined();expect(s.animal).toBeDefined();expect(s.packOwner).toEqual({type:'inventory',pawnId:s.carrierId});expect(s.deadline!-25).toBeLessThanOrEqual(s.tick*10);expect((s.deadline!-25)%10).toBe(0);expect(s.deadline!-s.tick*10).toBeGreaterThan(0);expect(s.deadline!-s.tick*10).toBeLessThanOrEqual(25);expect(s.human!.end).toBeLessThanOrEqual(s.tick);expect(s.animal!.end).toBeLessThanOrEqual(s.tick);expect(s.human!.path+s.animal!.path+s.human!.cooldown).toBe(0);expect(Math.max(Math.abs(s.human!.x-s.animal!.x),Math.abs(s.human!.z-s.animal!.z))).toBeLessThanOrEqual(1);}
   const delivered=samples.find(s=>s.delivered&&s.tick>=waits.at(-1)!.tick);expect(delivered).toBeDefined();expect(delivered!.tick*10).toBeGreaterThanOrEqual(waits.at(-1)!.deadline!);
  }
  proof.departure={tick:departed.complete.tick,departedAt:g.departedAt,phase:g.phase,stop:g.stop,medicineSplitId:meds[0]!.id};await groups(page);await page.screenshot({path:info.outputPath('03-same-humans-animal-and-freight-actually-away.png')});
  await load(departed.path,departed.complete);const exactDeparture=await exported('05-actual-departure-exact-reload');expect(exactDeparture.canonical).toBe(departed.canonical);proof.exactDepartureReload=true;
  expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false,waiting:0});await collectTransport();
  const commands=transport.filter(r=>r.direction==='sent'&&r.type==='command');
  for(const request of commands){const reply=transport.find(r=>r.direction==='received'&&r.navigation===request.navigation&&r.worker===request.worker&&r.id===request.id);expect(reply,JSON.stringify(request)).toMatchObject({ok:true});}
  if(!resume)expect(commands.some(r=>(r.command as {type?:string})?.type==='group-start')).toBe(true);proof.complete=true;
 }catch(error){proof.error=String(error);try{if(await page.locator('.front-menu').isVisible())throw Error('Import not confirmed: no played checkpoint is available');const failure=await exported('failure-current-no-replay');proof.failure={path:failure.path,tick:failure.complete.tick,sha256:failure.fileSHA256};}catch(cause){proof.captureError=String(cause);}throw error;}
 finally{try{await collectTransport();}catch(cause){proof.transportCaptureError=String(cause);}proof.rendererDiagnostics=rendererDiagnostics;proof.errors=errors;proof.checkpoints=checkpoints;proof.transport=transport;proof.samples=samples;await writeFile(info.outputPath('proof.json'),JSON.stringify(proof,null,2));}
});
