import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../../src/sim/index';
import {readGroupPanelSnapshot} from '../../src/ui/group-adapter';
import {campaignPresentation} from '../../src/sim/secondary-site-presentation';
import {registeredMap} from '../../src/sim/world-map-context';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {pause,panel,world,expectWorld,observeErrors} from './helpers';
import {revealCells} from './player-actions';
import type {CampaignState} from '../../src/sim/world-map-state';

const input=process.env.GROUP_ADMISSION_412_INPUT;
const resumeFormed=process.env.GROUP_ADMISSION_412_RESUME_FORMED==='1';
const resumeLeaving=process.env.GROUP_ADMISSION_412_RESUME_LEAVING==='1';
const formedInputSHA256='b136e8fcaa1b2b1e0fb0bfa860b9e19a9ad00068902c77a1ae8200f7f1f5f324';
// Same confirmed group façade as the actual UI. Never read World.group from
// a multicartographic presentation; this helper runs OUTSIDE the browser callback.
const selectedGroup=async(page:Page)=>readGroupPanelSnapshot(await world(page))?.group;
test.skip(process.env.GROUP_ADMISSION_412!=='1'||!input,'ROOT: initial declared patient checkpoint, frozen product and native sources required.');
async function stop(page:Page){await page.keyboard.press('Escape');await pause(page);}
async function groups(page:Page){await page.keyboard.press('Escape');await panel(page,'world');await page.locator('#world-tab-group').click();await expect(page.locator('[data-group-panel]')).toBeVisible();}
async function action(page:Page,name:string){const b=page.locator(`[data-group-action="${name}"]`);await expect(b).toHaveAttribute('aria-disabled','false');await b.click();}
async function speed(page:Page,value:'1'|'6'){await page.keyboard.press('Escape');await page.locator(`[data-speed="${value}"]`).click();}
async function load(page:Page,path:string,expected:CampaignState){
 if(!('pawns'in expected))throw Error('This admission load requires its actual loaded map');
 await page.goto('/?e2e');const front=page.locator('.front-menu');await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(path);
 await expect(front).toBeHidden({timeout:30_000});await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});await stop(page);await expectWorld(page,JSON.parse(JSON.stringify(campaignPresentation(expected))));
}
async function exported(page:Page,info:TestInfo,name:string){
 await stop(page);await panel(page,'menu');const pending=page.waitForEvent('download');await page.locator('[data-save-manager-action="export"]').click();const path=info.outputPath(name+'.json');await(await pending).saveAs(path);
 const complete=deserializeCampaign(await decodeStoredSave(await readFile(path,'utf8')));if(!('pawns'in complete))throw Error('This prepared admission export requires its real loaded map');expect(validateWorld(complete)).toEqual([]);await expectWorld(page,JSON.parse(JSON.stringify(campaignPresentation(complete))));await info.attach(name,{path,contentType:'application/json'});return {path,complete};
}
// Same visible SVG hit-test/keyboard rotation as the existing group-v216 pilot.
async function selectTile(page:Page,id:number){
 const svg=page.locator('.planet-view svg');await svg.scrollIntoViewIfNeeded();await svg.focus();
 for(let turn=0;turn<54;turn++){
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  const point=await page.locator(`[data-planet-tile="${id}"]`).evaluate(el=>{
   const path=el as SVGPathElement,d=path.getAttribute('d');if(!d||getComputedStyle(path).display==='none')return null;
   const values=d.match(/-?\d+(?:\.\d+)?/g)?.map(Number);if(!values||values.length<6)return null;let x=0,y=0;for(let i=0;i<values.length;i+=2){x+=values[i]!;y+=values[i+1]!;}
   const matrix=path.getScreenCTM();if(!matrix)return null;const p=new DOMPoint(x/(values.length/2),y/(values.length/2)).matrixTransform(matrix);return document.elementFromPoint(p.x,p.y)?.closest('[data-planet-tile]')===path?{x:p.x,y:p.y}:null;
  });
  if(point){await page.mouse.click(point.x,point.y);await expect(page.locator('[data-planet-selection]')).toHaveValue(String(id));return;}await page.keyboard.press('ArrowRight');
 }
 throw Error(`Tile ${id} never offered a visible SVG hit surface.`);
}
function local(w:CampaignState){const id=w.worldMaps?.rootMapId;if(id===undefined||id===null)throw Error('Declared actual home absent');const map=registeredMap(w,id);if(!map)throw Error('Declared actual home not materialized');return map;}

test('prepared32²: real downed passenger selection, contact carry, exact edge reload, cancellation and actual departure',async({page},info)=>{
 test.skip(resumeLeaving,'Continuation uses the actual final332, without replaying acquired formation/carry/cancellation.');
 test.setTimeout(150_000);const errors=observeErrors(page),raw=await readFile(input!,'utf8'),initial=deserializeCampaign(raw),map=local(initial);
 if(!('pawns'in initial))throw Error('Prepared patient fixture requires its real loaded map');expect(validateWorld(initial)).toEqual([]);expect(initial.schemaVersion).toBe(257);expect([map.width,map.height]).toEqual([32,32]);expect(initial.worldMaps!.sites).toHaveLength(1);expect(initial.worldGroups!.groups).toHaveLength(resumeFormed?1:0);
 const patient=map.pawns.find(p=>p.state==='downed')!,carrier=map.pawns.find(p=>p.state!=='downed'&&p.state!=='dead')!;expect(patient).toBeDefined();expect(carrier).toBeDefined();expect(patient.prisoner).toBeUndefined();expect(patient.visitor).toBeUndefined();
 const silver=map.piles.find(p=>p.item==='silver'&&p.quantity===7&&p.owner.type==='inventory'&&p.owner.pawnId===patient.id)!,food=map.piles.find(p=>p.item==='survival-meal'&&p.owner.type==='ground'&&p.quantity>=4)!;expect(silver).toBeDefined();expect(food).toBeDefined();
 if(resumeFormed){
  expect(createHash('sha256').update(raw).digest('hex')).toBe(formedInputSHA256);expect(initial.tick).toBe(0);expect(map.pawns.map(p=>p.id)).toEqual([89,91,93]);expect([carrier.id,patient.id,silver.id,food.id]).toEqual([89,91,169,163]);
  expect(patient.health).toMatchObject({tick:0,nextInjuryId:6,missing:[],bloodLoss:0});expect(patient.health!.injuries.map(i=>({id:i.id,part:i.part,kind:i.kind,severity:i.severity,bornAt:i.bornAt}))).toEqual(['left-arm','right-arm','left-leg','right-leg','torso'].map((part,i)=>({id:i+1,part,kind:'bruise',severity:i===4?8000:16000,bornAt:0})));
  const row=initial.worldGroups!.groups[0]!;expect(initial.worldGroups!.selectedGroupId).toBe(row.state.id);expect(row).toMatchObject({originMapId:0,localMapId:0,state:{id:1,startedAt:0,destination:52,phase:'gathering',admission:{revision:1},travelPreparation:true,memberIds:[carrier.id,patient.id],cursor:0,humanPreparation:{revision:1,releaseIds:[],passengers:[{pawnId:patient.id,carrierId:carrier.id,phase:'approach'}]}}});
  if(!('manifest'in row.state))throw Error('Resume requires the actual gathering manifest');expect(row.state.manifest).toEqual([{pileId:food.id,item:'survival-meal',quantity:4,carrierId:carrier.id}]);expect(food.quantity).toBe(10);expect(silver.quantity).toBe(7);
 }
 const medicalIds=patient.health!.injuries.map(i=>i.id),proof:Record<string,unknown>={complete:false,mode:resumeFormed?'resume-acquired-formed-native03':'initial-ui-formation',inputSHA256:createHash('sha256').update(raw).digest('hex'),formationAlreadyAcquired:resumeFormed?{run:'native03',tick:0,groupId:1,inputSHA256:formedInputSHA256}:null,notice:resumeFormed?'Exact native03 gathering checkpoint at tick0; UI selection/preview/start already acquired and skipped. Continue real contact carry, exact reload, cancellation and same acquired carry departure; no World mutation or formation replay.':'Declared original32² V216 fixture: free downed patient and finite possessions prepared before formation. One native UI formation; cancellation branch then reload same real carry checkpoint for departure. No Camp/Aulnes replay, live World write, healing, generator or performance claim.'};
 try{
  await load(page,input!,initial);expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');await groups(page);
  if(!resumeFormed){
   for(const id of [carrier.id,patient.id]){const choice=page.locator(`[data-group-member="${id}"] input[type=checkbox]`).first();await expect(choice).toHaveAttribute('aria-disabled','false');await choice.check();}
   await expect(page.locator(`[data-group-member="${patient.id}"]`)).toContainText('Passager à terre');await page.locator(`[data-group-pile="${food.id}"] input[aria-label^="Charger "]`).fill('4');await selectTile(page,52);
   await page.locator('[data-group-preview="formation"]').click();await expect(page.locator('[data-group-route]')).toContainText('Route proposée');await expectWorld(page,JSON.parse(JSON.stringify(campaignPresentation(initial))));await page.screenshot({path:info.outputPath('01-down-patient-selected-real-formation.png')});await action(page,'start');
  }
  await expect.poll(async()=>(await selectedGroup(page))?.phase,{timeout:10_000,intervals:[30]}).toBe('gathering');const formed=await selectedGroup(page);if(!formed||!('manifest'in formed))throw Error('Actual selected gathering owner absent');const groupId=formed.id;expect(formed).toMatchObject({admission:{revision:1},memberIds:[carrier.id,patient.id]});expect(formed.manifest).toEqual([{pileId:food.id,item:'survival-meal',quantity:4,carrierId:carrier.id}]);
  if(resumeFormed){expect(groupId).toBe(initial.worldGroups!.selectedGroupId);await page.screenshot({path:info.outputPath('01-acquired-formed-checkpoint-resumed.png')});}proof.formed={tick:initial.tick,id:groupId,resumed:resumeFormed};
  // Read only the presented snapshot; ordinary UI speed owns every real step.
  await speed(page,'1');await expect.poll(async()=>{
   const view=readGroupPanelSnapshot(await world(page));if(!view)return false;const w=view.world,g=view.group;if(!g||g.id!==groupId||!('manifest'in g))return false;const row=g.humanPreparation?.passengers.find(r=>r.pawnId===patient.id),q=w.pawns.find(p=>p.id===carrier.id),p=w.pawns.find(p=>p.id===patient.id);
   return row?.phase==='carry'&&q?.motion!==null&&q?.motion!==undefined&&q.motion.end>w.tick&&p?.x===q.x&&p.z===q.z;
  },{intervals:[30],timeout:35_000}).toBe(true);await stop(page);
  const held=await exported(page,info,'02-real-patient-carry-edge'),heldMap=local(held.complete),heldPatient=heldMap.pawns.find(p=>p.id===patient.id)!,heldCarrier=heldMap.pawns.find(p=>p.id===carrier.id)!;
  expect(heldPatient.state).toBe('downed');expect(heldPatient.health!.injuries.map(i=>i.id)).toEqual(medicalIds);expect(heldCarrier.motion!.end).toBeGreaterThan(held.complete.tick);expect({x:heldPatient.x,z:heldPatient.z}).toEqual({x:heldCarrier.x,z:heldCarrier.z});expect(heldMap.piles.find(p=>p.id===silver.id)).toMatchObject({quantity:7,owner:silver.owner});
  await page.keyboard.press('Escape');await revealCells(page,[heldPatient,heldCarrier]);await page.screenshot({path:info.outputPath('02-carried-body-on-map.png')});await groups(page);await expect(page.locator(`[data-group-member="${patient.id}"]`)).toContainText('Porté vers la sortie');await page.screenshot({path:info.outputPath('02-carry-status-real-owner.png')});
  await load(page,held.path,held.complete);const reloaded=await exported(page,info,'03-carry-edge-exact-reloaded');expect(serializeCampaign(reloaded.complete)).toBe(serializeCampaign(held.complete));proof.exactCarryReload=true;
  // Cancel from the preserved edge without replacing bodies, health or poses.
  await groups(page);await action(page,'cancel');await expect.poll(async()=>(await selectedGroup(page))===undefined,{timeout:10_000,intervals:[30]}).toBe(true);const cancelled=await exported(page,info,'04-physical-cancellation'),cancelMap=local(cancelled.complete);
  expect(cancelled.complete.tick).toBe(held.complete.tick);expect(cancelled.complete.worldGroups!.groups).toHaveLength(0);expect(cancelMap.pawns.map(p=>p.id)).toEqual(heldMap.pawns.map(p=>p.id));
  for(const original of [heldPatient,heldCarrier]){const p=cancelMap.pawns.find(p=>p.id===original.id)!;expect({x:p.x,z:p.z}).toEqual({x:original.x,z:original.z});expect(p.motion).toEqual(original.motion);expect(p.health).toEqual(original.health);}
  expect(cancelMap.pawns.find(p=>p.id===patient.id)!.state).toBe('downed');expect(cancelMap.piles).toEqual(heldMap.piles);proof.cancelledAtRealEdge=cancelled.complete.tick;
  // A second declared branch resumes the same acquired carry export; no start
  // or pickup is replayed and no prepared away owner is substituted.
  await load(page,held.path,held.complete);await speed(page,'1');await expect.poll(async()=>{const g=await selectedGroup(page);return g?.id===groupId&&'members'in g;},{intervals:[30],timeout:45_000}).toBe(true);await stop(page);
  const departed=await exported(page,info,'05-real-departure'),record=departed.complete.worldGroups!.groups.find(r=>r.state.id===groupId);expect(record).toBeDefined();if(!record||!('members'in record.state))throw Error('Actual away owner not preserved at departure');const g=record.state;
  expect(g.admission).toEqual({revision:1});expect(g.travel?.revision).toBe(1);expect(g.members.map(p=>p.id)).toEqual([carrier.id,patient.id]);expect(g.members.find(p=>p.id===patient.id)!.state).toBe('downed');expect(g.members.find(p=>p.id===patient.id)!.health!.injuries.map(i=>i.id)).toEqual(medicalIds);expect(g.items.find(p=>p.id===silver.id)).toMatchObject({quantity:7,owner:silver.owner});expect(local(departed.complete).pawns.some(p=>p.id===patient.id||p.id===carrier.id)).toBe(false);
  await groups(page);await page.screenshot({path:info.outputPath('05-original-passenger-actually-away.png')});proof.departure={tick:departed.complete.tick,id:groupId,phase:g.phase,stop:g.stop};expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false,waiting:0});proof.complete=true;
 }catch(error){proof.error=String(error);try{const failure=await exported(page,info,'failure-current-no-replay');proof.failure={path:failure.path,tick:failure.complete.tick};}catch(cause){proof.captureError=String(cause);}throw error;}
 finally{proof.errors=errors;await writeFile(info.outputPath('proof.json'),JSON.stringify(proof,null,2));}
});

test('actual332 continuation: finish the acquired physical exit and reload the same original away owners',async({page},info)=>{
 test.skip(!resumeLeaving,'ROOT explicitly supplies the last actual native04 export.');test.setTimeout(60_000);
 const errors=observeErrors(page),raw=await readFile(input!,'utf8');
 expect(createHash('sha256').update(raw).digest('hex')).toBe('bd6bc83cc01ce2918a872d192ce0ee5dae31bcf71150adc6554f9ee190a1cbbe');
 const initial=deserializeCampaign(raw);if(!('pawns'in initial))throw Error('Actual exit requires its loaded map');
 const map=local(initial),row=initial.worldGroups!.groups[0]!;expect(initial.tick).toBe(332);expect(initial.worldGroups!.groups).toHaveLength(1);
 expect(row.state).toMatchObject({id:1,phase:'leaving',memberIds:[89,91],humanPreparation:{passengers:[{pawnId:91,carrierId:89,phase:'waiting'}]}});
 const patient=map.pawns.find(p=>p.id===91)!,carrier=map.pawns.find(p=>p.id===89)!,silver=map.piles.find(p=>p.id===169)!,injuryIds=patient.health!.injuries.map(i=>i.id);
 expect(patient).toMatchObject({x:15,z:0,state:'downed',motion:null});expect(carrier.motion).not.toBeNull();expect(silver).toMatchObject({item:'silver',quantity:7,owner:{type:'inventory',pawnId:91}});
 const proof:Record<string,unknown>={complete:false,inputSHA256:createHash('sha256').update(raw).digest('hex'),notice:'Continue actual native04 at332. Contact carry, exact reload and cancellation already acquired there; no formation, pickup, treatment or prior path replay.'};
 try{
  await load(page,input!,initial);expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');await speed(page,'1');
  await expect.poll(async()=>{const g=await selectedGroup(page);return g?.id===1&&'members'in g;},{intervals:[100],timeout:15_000}).toBe(true);await stop(page);
  const departed=await exported(page,info,'05-real-departure-from-actual332'),g=departed.complete.worldGroups!.groups[0]!.state;
  if(!('members'in g))throw Error('Actual departure did not preserve its away owner');
  expect(g.id).toBe(1);expect(g.admission).toEqual({revision:1});expect(g.travel?.revision).toBe(1);expect(g.members.map(p=>p.id)).toEqual([89,91]);expect(g.members.find(p=>p.id===91)!.state).toBe('downed');expect(g.members.find(p=>p.id===91)!.health!.injuries.map(i=>i.id)).toEqual(injuryIds);expect(g.items.find(p=>p.id===169)).toMatchObject({item:'silver',quantity:7,owner:silver.owner});expect(local(departed.complete).pawns.map(p=>p.id)).toEqual([93]);
  await groups(page);await page.screenshot({path:info.outputPath('05-original-passenger-actually-away.png')});
  await load(page,departed.path,departed.complete);const reloaded=await exported(page,info,'06-departure-exact-reloaded');expect(serializeCampaign(reloaded.complete)).toBe(serializeCampaign(departed.complete));
  expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false,waiting:0});proof.complete=true;proof.departure={tick:departed.complete.tick,departedAt:g.departedAt,phase:g.phase,stop:g.stop};proof.exactReload=true;
 }catch(error){proof.error=String(error);try{const failure=await exported(page,info,'failure-current-no-replay');proof.failure={path:failure.path,tick:failure.complete.tick};}catch(cause){proof.captureError=String(cause);}throw error;}
 finally{proof.errors=errors;await writeFile(info.outputPath('proof.json'),JSON.stringify(proof,null,2));}
});
