import { expect,test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { existsSync,readFileSync,writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { hygieneNativeFixture } from '../scenarios/hygiene-native';
import { deserializeWorld,serializeWorld,validateWorld } from '../../src/sim/serialization';
import { isColonist } from '../../src/sim/affiliation';
import { roomCleanliness } from '../../src/sim/filth';
import { cell,expectWorld,observeErrors,panel,pause,saveKey,world } from './helpers';
import { inspectPerson,perform,revealCells } from './player-actions';
import type { Command } from '../../src/sim/types';

// Read the actual resident GPU attributes after each real frame. This observer
// neither changes the World nor advances the confirmed presentation clock.
const projectionProbe=`
window.__hygieneProjection={samples:0,maxError:0,maxLegacyError:0,missing:0,first:null,last:null};
const hygieneFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(...args){const result=hygieneFrame.apply(this,args);if(this.preparing||!this.world||!this.pawns.pawnMesh)return result;
const report=window.__hygieneProjection,g=this.pawns.pawnMesh.geometry,a=g.getAttribute('aFrom'),b=g.getAttribute('aTo'),t=g.getAttribute('aTravel'),clock=this.pawns.travelTime.value,rect=this.renderer.domElement.getBoundingClientRect();
for(const pile of this.world.piles){if(!pile.humanCorpse||pile.owner.type!=='pawn')continue;const id=pile.humanCorpse.pawnId,i=this.world.pawns.findIndex(p=>p.id===id);if(i<0)continue;
const start=t.getX(i),end=t.getY(i),alpha=(clock-start)/(end-start);if(end<=start||alpha<=.1||alpha>=.9||Math.hypot(b.getX(i)-a.getX(i),b.getZ(i)-a.getZ(i))<.5)continue;
const project=(f)=>{const distance=t.getZ(i)+(t.getW(i)-t.getZ(i))*f,fromY=a.getY(i),toY=b.getY(i),rise=Math.max(0,Math.min(1,fromY<toY?distance*3:fromY>toY?distance*3-2:distance)),v=this.camera.position.clone().set(a.getX(i)+(b.getX(i)-a.getX(i))*f,fromY+(toY-fromY)*rise+.75,a.getZ(i)+(b.getZ(i)-a.getZ(i))*f).project(this.camera);return {x:rect.left+(v.x+1)*rect.width/2,y:rect.top+(1-v.y)*rect.height/2};};
const expected=project(alpha),proxy=this.screenPawns().find(p=>p.id===id),old=this.timeline.segment(id),legacyAlpha=old?Math.max(0,Math.min(1,(this.timeline.tick-old.start)/(old.end-old.start))):this.pawns.blend.value,legacy=project(legacyAlpha);
if(!proxy){report.missing++;continue;}const error=Math.hypot(proxy.x-expected.x,proxy.y-expected.y),legacyError=Math.hypot(legacy.x-expected.x,legacy.y-expected.y),sample={tick:this.world.tick,alpha,expected,proxy:{x:proxy.x,y:proxy.y},error,legacyError};report.samples++;report.maxError=Math.max(report.maxError,error);report.maxLegacyError=Math.max(report.maxLegacyError,legacyError);report.first??=sample;report.last=sample;
}return result;};
`;

test('native hygiene: physical flooring, cleaning, funeral and illness through the player controls',async({playwright})=>{
  test.setTimeout(240000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]}),page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  page.setDefaultTimeout(15000);
  const f=hygieneNativeFixture(),report:any={version:89,controlled:true,start:f.world.tick};
  try {
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:projectionProbe+await response.text()});});
    expect(validateWorld(f.world)).toEqual([]);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(f.world)});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await pause(page);
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,f.world);await page.keyboard.press('Escape');
    const rotation={value:0},act=(command:Command,reason:string)=>perform(page,{command,reason},rotation);
    await inspectPerson(page,f.patientId,'health');await expect(page.locator('[data-health="food-poisoning"]')).toContainText('phase majeure');await expect(page.locator('[data-health="food-poisoning"]')).toContainText('Vomit');
    await page.screenshot({path:'artifacts/hygiene-health-v89.png'});
    await act({type:'research-project',project:'smithing'},'Choisir Forge dans le panneau de recherche.');
    await expect(page.locator('[data-smithing-status]')).toContainText('En cours');await act({type:'research-project',project:null},'Suspendre sans inventer de progression.');
    await act({type:'area',action:'lay-floor',floor:'wood-planks',from:f.floorFrom,to:f.floorTo},'Tracer le plancher et livrer son bois physique.');
    await act({type:'designate',kind:'grave',...f.graveCell,orientation:0},'Creuser une vraie tombe sans ajouter de matériau.');
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>{const w=await world(page);return w.tiles.filter(t=>t.floor==='wood-planks').length===6&&w.structures.some(s=>s.kind==='grave');},{timeout:45000}).toBe(true);await pause(page);
    const built=await world(page),grave=built.structures.find(s=>s.kind==='grave')!;expect(validateWorld(built)).toEqual([]);expect(built.pawns.find(p=>p.id===f.patientId)!.hunger).toBeLessThan(100);
    expect(built.filth!.items.some(i=>i.kind==='vomit'&&i.id!==f.dirtId)).toBe(true);
    await act({type:'area',action:'home',from:{x:9,z:9},to:{x:11,z:11}},'Le foyer donne le périmètre de nettoyage.');
    await act({type:'priority',pawnId:f.actorId,work:'clean',value:1},'Activer Nettoyage dans Travail.');
    const before=roomCleanliness(built,f.dirty)!;
    await act({type:'clean-room',pawnId:f.actorId,...f.dirty},'Nettoyer la pièce par travail au contact.');
    await expect(page.locator('#room-description')).toContainText('Propreté');
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).filth!.items.some(i=>i.id===f.dirtId),{timeout:20000}).toBe(false);await pause(page);
    const clean=await world(page);expect(roomCleanliness(clean,f.dirty)!).toBeGreaterThan(before);expect(clean.filth!.cleaned).toBeGreaterThan(0);
    await act({type:'grave-policy',graveId:grave.id,colonists:true,strangers:false},'Choisir les dépouilles acceptées.');
    await act({type:'assign-grave',graveId:grave.id,pawnId:f.bodyPawnId},'Attribuer la tombe à une personne réelle.');
    await act({type:'priority',pawnId:f.actorId,work:'haul',value:1},'Autoriser le transport du défunt.');
    await act({type:'order-bury',pawnId:f.actorId,bodyPawnId:f.bodyPawnId,graveId:grave.id},'Transporter et inhumer le corps physique.');
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===f.actorId)?.burial?.phase,{timeout:20000}).toBe('carry');await pause(page);
    const carry=await world(page),corpseId=carry.pawns.find(p=>p.id===f.bodyPawnId)!.body!.pileId!;expect(carry.piles.find(p=>p.id===corpseId)!.owner).toEqual({type:'pawn',pawnId:f.actorId});expect(validateWorld(carry)).toEqual([]);
    await page.screenshot({path:'artifacts/hygiene-carried-body-v89.png'});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,carry);await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===grave.id)?.grave?.corpseId,{timeout:20000}).toBe(corpseId);await pause(page);
    const buried=await world(page);expect(buried.piles.find(p=>p.id===corpseId)!.owner).toEqual({type:'grave',graveId:grave.id});expect(buried.pawns.filter(p=>p.id===f.bodyPawnId)).toHaveLength(1);expect(validateWorld(buried)).toEqual([]);
    const projection=await page.evaluate(()=> (window as any).__hygieneProjection);
    expect(projection.samples,'Real mid-edge carried-body frames').toBeGreaterThan(5);
    expect(projection.missing).toBe(0);expect(projection.maxError,'Click proxy must follow the actual GPU edge').toBeLessThan(.02);
    expect(projection.maxLegacyError,'The previous deceased-clock projection must be distinguished by this path').toBeGreaterThan(.5);
    expect(await page.evaluate(id=>window.__lisiere.projectPawn(id),f.bodyPawnId),'A buried body has no visible click proxy').toBeUndefined();
    report.projection=projection;
    await revealCells(page,[grave]);await cell(page,grave.x,grave.z);await expect(page.locator('[data-burial-status]')).toContainText('Tombe occupée');
    await page.screenshot({path:'artifacts/hygiene-grave-v89.png'});
    await act({type:'area',action:'remove-floor',from:f.floorFrom,to:f.floorFrom},'Retirer un revêtement par le même outil de Construction.');
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).tiles[f.floorFrom.z*32+f.floorFrom.x]!.floor,{timeout:20000}).toBeUndefined();await pause(page);
    const final=await world(page);expect(validateWorld(final)).toEqual([]);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,final);await page.keyboard.press('Escape');
    Object.assign(report,{final:final.tick,corpseId,graveId:grave.id,cleaned:final.filth!.cleaned,floors:final.tiles.filter(t=>t.floor).length,cleanlinessBefore:before,cleanlinessAfter:roomCleanliness(clean,f.dirty),errors});expect(errors).toEqual([]);
    writeFileSync('artifacts/hygiene-native-v89.json',JSON.stringify(report,null,2));
  } finally {await browser.close();}
});

test('native completed V89 colony: cold load, thirty ticks and exact save/reload',async({playwright})=>{
  const source='tests/fixtures/colony-v89.json.gz';
  test.skip(!existsSync(source),'Requires the real completed V89 colony; a skip is not validation.');test.setTimeout(120000);
  const data=gunzipSync(readFileSync(source)).toString('utf8'),raw=JSON.parse(data),initial=deserializeWorld(data);
  expect(raw.schemaVersion).toBe(89);expect(initial.schemaVersion).toBe(90);expect(validateWorld(initial)).toEqual([]);
  const colonists=initial.pawns.filter(p=>isColonist(p)&&p.state!=='dead');expect(colonists.length).toBeGreaterThanOrEqual(4);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]}),page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  const report:any={version:90,sourceVersion:89,controlled:false,source,sha256:createHash('sha256').update(data).digest('hex'),initialTick:initial.tick,status:'running'};
  try {
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data});await page.goto('/?e2e');
    const front=page.locator('.front-menu');await expect(front).toBeVisible();await front.getByRole('button',{name:'Charger une partie',exact:true}).click();
    await front.locator(`input[name="front-save"][value="${saveKey}"]`).check();await front.getByRole('button',{name:'Charger',exact:true}).click();
    await expectWorld(page,initial);await pause(page);await expectWorld(page,initial);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');await expect(page.locator('#colonists [data-pawn]')).toHaveCount(colonists.length);
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).tick,{timeout:30000}).toBeGreaterThanOrEqual(initial.tick+30);await pause(page);
    const continued=await world(page);expect(validateWorld(continued)).toEqual([]);expect(continued.climate).toEqual(initial.climate);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,continued);await page.keyboard.press('Escape');
    await page.screenshot({path:'artifacts/hygiene-colony-native-v89.png'});expect(errors).toEqual([]);
    Object.assign(report,{status:'passed',finalTick:continued.tick,continuedTicks:continued.tick-initial.tick,colonists:colonists.length,floors:continued.tiles.filter(t=>t.floor).length,cleaned:continued.filth?.cleaned??0,errors});
  }catch(error){Object.assign(report,{status:'failed',error:String(error),errors});throw error;}
  finally{writeFileSync('artifacts/hygiene-colony-native-v89.json',JSON.stringify(report,null,2));await browser.close();}
});
