import { readFileSync } from 'node:fs';
import { expect,test,type Page } from '@playwright/test';
import { COMMERCIAL_DEMO_ID } from '../scripts/create-test-save-commercial-v193.ts';
import { quoteCommercial } from '../src/sim/commercial-post.ts';
import { deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import type { CommercialTrip } from '../src/sim/commercial-state.ts';
import type { MaterialPile,World } from '../src/sim/types.ts';
import { expectWorld,observeErrors,panel,pause,world } from './integration/helpers.ts';
import { testOutputPath,writeTestFile } from './test-output.ts';
import { TEST_COLONY_COUNT } from './test-colony-count.ts';

interface Frame {tick:number;clock:number;geometry:number;instances:number;pawnIds:number[]}
interface Probe {pipelines:number;compiled:{name:string;label?:string}[];frames:Frame[]}
const frameProbe=`
const commercialFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){
 const result=commercialFrame.call(this,now);
 if(this.preparing||!this.world||!window.commercialProbe)return result;
 const geometry=this.pawns.feedbackSource;if(!geometry)return result;
 const frames=window.commercialProbe.frames;
 frames.push({tick:this.world.tick,clock:this.timeline.tick,geometry:geometry.id,
  instances:geometry.instanceCount,pawnIds:this.world.pawns.map(p=>p.id)});
 if(frames.length>4096)frames.shift();return result;
};`;
async function frame(page:Page,tick:number):Promise<Frame>{
  await expect.poll(()=>page.evaluate(tick=>{const f=(window as unknown as {commercialProbe:Probe}).commercialProbe.frames.at(-1);return !!f&&f.tick===tick&&Math.abs(f.clock-tick)<.001;},tick)).toBe(true);
  return page.evaluate(()=>(window as unknown as {commercialProbe:Probe}).commercialProbe.frames.at(-1)!);
}
async function saveResume(page:Page,expected:World){
  await panel(page,'menu');await page.locator('#save').click();await expect(page.locator('#notice')).toContainText('Colonie sauvegardée');
  await page.locator('#load').click();await expect(page.locator('#notice')).toContainText('Sauvegarde rechargée');
  await expectWorld(page,expected);await page.keyboard.press('Escape');
}
async function reachPhase(page:Page,phase:CommercialTrip['phase']){
  await page.locator('[data-speed="6"]').click();
  await page.waitForFunction(phase=>{if(window.__lisiere.world.commercialTrip?.phase!==phase)return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},phase,{polling:'raf',timeout:60_000});
  await pause(page);return world(page);
}
const items=(w:World):MaterialPile[]=>[...w.piles,...(w.commercialTrip&&'items' in w.commercialTrip?w.commercialTrip.items:[])];
const colonyQuantity=(w:World,item:string)=>items(w).reduce((n,p)=>n+(p.item===item?p.quantity:0),0);
const postQuantity=(w:World,item:string)=>w.civilianPost?.stock.reduce((n,p)=>n+(p.item===item?p.quantity:0),0)??0;

test('V193 public prepared commercial trip physically loads, trades and returns its original actor/items, with real World UI and phase reloads',async({playwright})=>{
  test.setTimeout(180_000);
  // No route injection: the scene and menu entry must actually be published.
  const prepared=deserializeWorld(readFileSync('public/test-saves/v193/expedition-commerciale.json','utf8'));
  const pawn=prepared.pawns.find(p=>p.name==='Ada')!,food=prepared.piles.find(p=>p.item==='survival-meal')!;
  expect(validateWorld(prepared)).toEqual([]);expect(prepared.pawns).toHaveLength(3);expect(prepared.width).toBe(32);
  expect(prepared.commercialTrip).toBeUndefined();expect(prepared.civilianPost).toBeUndefined();
  expect(colonyQuantity(prepared,'silver')).toBe(600);expect(colonyQuantity(prepared,'survival-meal')).toBe(4);
  expect(prepared.piles.every(p=>p.owner.type==='ground')).toBe(true);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  const stages:Record<string,{tick:number;phase:string;pipelines:number;frame:Frame;silver:number;rations:number;medicine:number;component:number}>={};
  try{
    await page.addInitScript(()=>{
      const probe:Probe={pipelines:0,compiled:[],frames:[]};Object.assign(window,{commercialProbe:probe});
      for(const name of ['createRenderPipeline','createRenderPipelineAsync'] as const){
        const original=GPUDevice.prototype[name];(GPUDevice.prototype[name] as unknown)=function(this:GPUDevice,...args:unknown[]){
          probe.pipelines++;probe.compiled.push({name,label:(args[0] as GPURenderPipelineDescriptor).label});return (original as Function).apply(this,args);
        };
      }
    });
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:frameProbe+await response.text()});});
    await page.goto('/?e2e');const front=page.locator('.front-menu');
    await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.getByRole('button',{name:'Colonies de test'}).click();
    expect(TEST_COLONY_COUNT).toBeGreaterThanOrEqual(43);await expect(front.locator('input[name="test-colony"]')).toHaveCount(TEST_COLONY_COUNT);
    await front.locator(`input[name="test-colony"][value="${COMMERCIAL_DEMO_ID}"]`).check();await front.getByRole('button',{name:'Charger cette colonie'}).click();
    await expectWorld(page,prepared);expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    const capture=async(name:string,w:World)=>{expect(validateWorld(w)).toEqual([]);const rendered=await frame(page,w.tick);stages[name]={tick:w.tick,phase:w.commercialTrip?.phase??'none',pipelines:await page.evaluate(()=>(window as unknown as {commercialProbe:Probe}).commercialProbe.pipelines),frame:rendered,silver:colonyQuantity(w,'silver'),rations:colonyQuantity(w,'survival-meal'),medicine:colonyQuantity(w,'medicine'),component:colonyQuantity(w,'component')};};
    await capture('prepared',prepared);await panel(page,'world');
    await page.locator('#commercial-pawn').selectOption(String(pawn.id));await page.locator('#commercial-food').selectOption(String(food.id));
    await page.locator('#commercial-quantity').selectOption('3');await page.locator('#commercial-silver').fill('600');
    await expect(page.locator('#commercial-start')).toBeEnabled();await expect(page.locator('#commercial-preparation')).toContainText('5,7 kg');
    await page.locator('#commercial-start').click();
    await expect.poll(async()=>(await world(page)).commercialTrip?.phase).toBe('loading');
    await expect(page.locator('#commercial-content')).toHaveAttribute('aria-busy','false');await pause(page);
    const loading=await world(page);expect(loading.commercialTrip).toMatchObject({phase:'loading',pawnId:pawn.id,foodQuantity:3,silverQuantity:600});
    expect(colonyQuantity(loading,'silver')).toBe(600);expect(loading.civilianPost).toBeUndefined();
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(id=>{const w=window.__lisiere.world,t=w.commercialTrip;if(!t||(t.phase!=='loading'&&t.phase!=='leaving')||!w.piles.some(i=>i.item==='silver'&&i.owner.type==='inventory'&&i.owner.pawnId===id))return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},pawn.id,{polling:'raf'});
    await pause(page);const carried=await world(page),carrier=carried.pawns.find(p=>p.id===pawn.id)!;
    const money=carried.piles.filter(i=>i.item==='silver'&&i.owner.type==='inventory'&&i.owner.pawnId===pawn.id);
    expect(money.length).toBeGreaterThan(0);expect(colonyQuantity(carried,'silver')).toBe(600);expect(colonyQuantity(carried,'survival-meal')).toBe(4);
    for(const pile of money){const source=prepared.piles.find(i=>i.id===pile.id)!;expect(source.owner.type).toBe('ground');if(source.owner.type==='ground')expect(Math.abs(carrier.x-source.owner.x)+Math.abs(carrier.z-source.owner.z)).toBeLessThanOrEqual(1);}
    await saveResume(page,carried);await capture('moneyCarryReload',carried);
    const outbound=await reachPhase(page,'outbound');expect(outbound.pawns.some(p=>p.id===pawn.id)).toBe(false);expect(outbound.pawns).toHaveLength(2);expect(outbound.civilianPost).toBeUndefined();
    const trip=outbound.commercialTrip!;if(trip.phase!=='outbound')throw new Error('Expected real outbound phase.');
    expect(trip.pawn.id).toBe(pawn.id);expect(trip.arrivesAt-trip.departedAt).toBe(750);expect(trip.entry.x===0||trip.entry.z===0||trip.entry.x===31||trip.entry.z===31).toBe(true);
    expect(trip.items.filter(i=>i.item==='silver').reduce((n,i)=>n+i.quantity,0)).toBe(600);
    await capture('outbound',outbound);await saveResume(page,outbound);await capture('outboundReload',outbound);
    // The arrival pause belongs to the actual UI, not this test's pause helper.
    await page.locator('[data-speed="6"]').click();await page.waitForFunction(()=>window.__lisiere.world.commercialTrip?.phase==='at-post',null,{polling:'raf',timeout:60_000});
    await expect(page.locator('[data-speed="0"]')).toHaveAttribute('aria-pressed','true');
    const arrived=await world(page),at=arrived.commercialTrip!;if(at.phase!=='at-post')throw new Error('Expected real post arrival.');
    expect(at.decisionUntil-at.arrivedAt).toBe(250);expect(at.consumed).toBeGreaterThan(0);expect(colonyQuantity(arrived,'survival-meal')+at.consumed).toBe(4);
    expect(arrived.civilianPost!.transactions).toBe(0);expect(arrived.civilianPost!.stockedAt).toBe(at.arrivedAt);
    const initialSilver=colonyQuantity(arrived,'silver')+postQuantity(arrived,'silver');
    const initialMedicine=postQuantity(arrived,'medicine'),initialComponent=postQuantity(arrived,'component');
    expect(initialMedicine).toBeGreaterThanOrEqual(25);expect(initialMedicine).toBeLessThanOrEqual(50);expect(initialComponent).toBeGreaterThanOrEqual(20);expect(initialComponent).toBeLessThanOrEqual(70);
    await panel(page,'world');await expect(page.locator('#commercial-status')).toContainText('départ automatique');await expect(page.locator('#commercial-shop')).toBeVisible();
    await expect(page.locator(`[data-pawn="${pawn.id}"]`)).toHaveCount(0);await capture('atPost',arrived);
    await page.screenshot({path:testOutputPath('artifacts/commercial-v193-at-post.png')});
    await page.keyboard.press('Escape');expect((await world(page)).commercialTrip).toEqual(at);
    await saveResume(page,arrived);await capture('atPostReload',arrived);await panel(page,'world');
    const preview=quoteCommercial(arrived,[]);if(!preview.ok)throw new Error(preview.reason);
    const medicine=preview.goods.find(g=>g.item==='medicine')!,component=preview.goods.find(g=>g.item==='component')!;
    const lines=[{pileId:medicine.pileId,quantity:2},{pileId:component.pileId,quantity:3}],quote=quoteCommercial(arrived,lines);if(!quote.ok)throw new Error(quote.reason);
    await page.locator(`[data-commercial-pile="${medicine.pileId}"]`).fill('2');await page.locator(`[data-commercial-pile="${component.pileId}"]`).fill('3');
    await expect(page.locator('#commercial-total')).toContainText(`À payer : ${quote.totalSilver} argent`);await page.locator('#commercial-buy').click();
    await expect.poll(async()=>(await world(page)).civilianPost?.transactions).toBe(1);
    const bought=await world(page),purchase=bought.commercialTrip!;if(purchase.phase!=='at-post')throw new Error('Buying must preserve the visit.');
    expect(purchase.arrivedAt).toBe(at.arrivedAt);expect(purchase.decisionUntil).toBe(at.decisionUntil);expect(purchase.silverPaid).toBe(quote.totalSilver);expect(purchase.bought).toEqual({medicine:2,component:3});
    expect(colonyQuantity(bought,'silver')).toBe(600-quote.totalSilver);expect(colonyQuantity(bought,'silver')+postQuantity(bought,'silver')).toBe(initialSilver);
    expect(colonyQuantity(bought,'medicine')+postQuantity(bought,'medicine')).toBe(initialMedicine);expect(colonyQuantity(bought,'component')+postQuantity(bought,'component')).toBe(initialComponent);
    expect(purchase.items.filter(i=>i.item==='medicine'||i.item==='component').every(i=>i.owner.type==='inventory'&&i.owner.pawnId===pawn.id)).toBe(true);
    await expect(page.locator('#commercial-return')).toHaveText('Repartir avec les achats');await capture('bought',bought);
    await saveResume(page,bought);await capture('boughtReload',bought);await panel(page,'world');
    await page.locator('#commercial-return').click();await expect.poll(async()=>(await world(page)).commercialTrip?.phase).toBe('returning');
    await expect(page.locator('#commercial-content')).toHaveAttribute('aria-busy','false');await pause(page);
    const returning=await world(page),returnTrip=returning.commercialTrip!;if(returnTrip.phase!=='returning')throw new Error('Expected explicit return.');
    expect(returnTrip.returnAt-returnTrip.leftPostAt).toBe(750);expect(returning.pawns.some(p=>p.id===pawn.id)).toBe(false);
    await saveResume(page,returning);await capture('returnReload',returning);
    const unloading=await reachPhase(page,'unloading');expect(unloading.pawns).toHaveLength(3);expect(unloading.pawns.filter(p=>p.id===pawn.id)).toHaveLength(1);
    const pending=unloading.commercialTrip!;if(pending.phase!=='unloading')throw new Error('Expected physical inventory deposits.');
    expect(pending.pendingPileIds.length).toBeGreaterThan(0);expect(unloading.piles.some(i=>i.owner.type==='inventory'&&i.owner.pawnId===pawn.id)).toBe(true);
    expect(colonyQuantity(unloading,'medicine')).toBe(2);expect(colonyQuantity(unloading,'component')).toBe(3);
    await saveResume(page,unloading);await capture('unloadReload',unloading);await panel(page,'world');await expect(page.locator('#commercial-status')).toContainText('dépose physiquement');
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>{if(window.__lisiere.world.commercialTrip)return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},null,{polling:'raf',timeout:30_000});
    await pause(page);const returned=await world(page);expect(returned.pawns.filter(p=>p.id===pawn.id)).toHaveLength(1);
    expect(returned.piles.filter(i=>i.item==='medicine'||i.item==='component').every(i=>i.owner.type==='ground')).toBe(true);
    expect(returned.piles.some(i=>i.owner.type==='inventory'&&i.owner.pawnId===pawn.id)).toBe(false);
    expect(colonyQuantity(returned,'silver')+postQuantity(returned,'silver')).toBe(initialSilver);
    expect(colonyQuantity(returned,'medicine')).toBe(2);expect(colonyQuantity(returned,'component')).toBe(3);
    expect(postQuantity(returned,'medicine')+2).toBe(initialMedicine);expect(postQuantity(returned,'component')+3).toBe(initialComponent);
    expect(returned.civilianPost!.generation).toBe(1);expect(returned.civilianPost!.transactions).toBe(1);expect(returned.civilianPost!.recent[0]).toMatchObject({pawnId:pawn.id,silver:quote.totalSilver,medicine:2,component:3});
    const consumed=returned.events.filter(e=>e.message.includes('mange une ration de survie pendant l’expédition')).length;
    expect(consumed).toBeGreaterThan(0);expect(colonyQuantity(returned,'survival-meal')+consumed).toBe(4);
    await capture('returned',returned);await saveResume(page,returned);await capture('returnedReload',returned);
    await page.screenshot({path:testOutputPath('artifacts/commercial-v193-returned.png')});
    const probe=await page.evaluate(()=>(window as unknown as {commercialProbe:Probe}).commercialProbe);
    await writeTestFile('artifacts/commercial-v193-native.json',JSON.stringify({prepared:true,catalogueEntries:TEST_COLONY_COUNT,protocol:'Actual public catalogue, real World commands and worker loading/edge/arrival/purchase/return/deposits. Off-map rendering uses no actor. Stage reloads compare exact paused World. No planet, naturally acquired resources, CPU/GPU timing or general performance claim.',browser:browser.version(),quote:{lines,totalSilver:quote.totalSilver,mass:quote.mass},stages,probe,errors},null,2));
    for(const stage of Object.values(stages)){expect(stage.pipelines).toBe(stages.prepared!.pipelines);expect(stage.frame.geometry).toBe(stages.prepared!.frame.geometry);expect(stage.frame.instances).toBe(stage.frame.pawnIds.length);}
    for(const name of ['outbound','outboundReload','atPost','atPostReload','bought','boughtReload','returnReload']){expect(stages[name]!.frame.instances).toBe(2);expect(stages[name]!.frame.pawnIds).not.toContain(pawn.id);}
    for(const name of ['prepared','moneyCarryReload','unloadReload','returned','returnedReload'])expect(stages[name]!.frame.instances).toBe(3);
    expect(errors).toEqual([]);
  }finally{await browser.close();}
});
