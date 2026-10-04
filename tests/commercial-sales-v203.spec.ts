import { readFileSync } from 'node:fs';
import { expect,test,type Page } from '@playwright/test';
import { COMMERCIAL_SALES_DEMO_ID,COMMERCIAL_SALES_DEMO_PATH } from '../scripts/create-test-save-commercial-sales-v203.ts';
import { quoteCommercial,quoteCommercialSell } from '../src/sim/commercial-post.ts';
import { deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import type { CommercialBuyLine,CommercialTrip } from '../src/sim/commercial-state.ts';
import type { MaterialPile,World } from '../src/sim/types.ts';
import { expectWorld,observeErrors,panel,pause,world } from './integration/helpers.ts';
import { testOutputPath,writeTestFile } from './test-output.ts';
import { TEST_COLONY_COUNT } from './test-colony-count.ts';

interface Frame {tick:number;clock:number;geometry:number;instances:number;pawnIds:number[]}
interface Hardware {vendor:string;architecture:string;device:string;description:string;fallback:boolean}
interface Probe {pipelines:number;compiled:{name:string;label?:string}[];frames:Frame[];hardware?:Hardware}
const frameProbe=`
const commercialSalesFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){
 const result=commercialSalesFrame.call(this,now);
 if(this.preparing||!this.world||!window.commercialSalesProbe)return result;
 const geometry=this.pawns.feedbackSource;if(!geometry)return result;
 const probe=window.commercialSalesProbe,info=this.renderer.getContext().getConfiguration()?.device?.adapterInfo;
 if(info&&!probe.hardware)probe.hardware={vendor:info.vendor,architecture:info.architecture,device:info.device,description:info.description,fallback:info.isFallbackAdapter};
 probe.frames.push({tick:this.world.tick,clock:this.timeline.tick,geometry:geometry.id,
  instances:geometry.instanceCount,pawnIds:this.world.pawns.map(p=>p.id)});
 if(probe.frames.length>4096)probe.frames.shift();return result;
};`;
async function frame(page:Page,tick:number):Promise<Frame>{
  await expect.poll(()=>page.evaluate(tick=>{const f=(window as unknown as {commercialSalesProbe:Probe}).commercialSalesProbe.frames.at(-1);return !!f&&f.tick===tick&&Math.abs(f.clock-tick)<.001;},tick)).toBe(true);
  return page.evaluate(()=>(window as unknown as {commercialSalesProbe:Probe}).commercialSalesProbe.frames.at(-1)!);
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
function textileLines(goods:{pileId:number;item:string;available:number}[],cloth:number,wool:number):CommercialBuyLine[]{
  const remaining:Record<string,number>={cloth,'muffalo-wool':wool},lines:CommercialBuyLine[]=[];
  for(const g of goods){const quantity=Math.min(remaining[g.item]??0,g.available);if(quantity){lines.push({pileId:g.pileId,quantity});remaining[g.item]!-=quantity;}}
  expect(remaining).toEqual({cloth:0,'muffalo-wool':0});return lines;
}

test('V203 public textiles travel from ground, sell for real post funds, buy supplies and return unsold cargo through the actual UI and worker',async({playwright})=>{
  test.setTimeout(180_000);
  const prepared=deserializeWorld(readFileSync(COMMERCIAL_SALES_DEMO_PATH,'utf8'));
  const pawn=prepared.pawns.find(p=>p.name==='Ada')!,food=prepared.piles.find(p=>p.item==='survival-meal')!;
  expect(validateWorld(prepared)).toEqual([]);expect(prepared.pawns).toHaveLength(3);expect(prepared.width).toBe(32);
  expect(prepared.commercialTrip).toBeUndefined();expect(prepared.civilianPost).toBeUndefined();
  expect(colonyQuantity(prepared,'silver')).toBe(0);expect(colonyQuantity(prepared,'survival-meal')).toBe(4);
  expect(colonyQuantity(prepared,'cloth')).toBe(75);expect(colonyQuantity(prepared,'muffalo-wool')).toBe(60);
  expect(prepared.piles.every(p=>p.owner.type==='ground')).toBe(true);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  const stages:Record<string,{tick:number;phase:string;pipelines:number;frame:Frame;silver:number;cloth:number;wool:number;medicine:number;component:number}>={};
  try{
    await page.addInitScript(()=>{
      const probe:Probe={pipelines:0,compiled:[],frames:[]};Object.assign(window,{commercialSalesProbe:probe});
      for(const name of ['createRenderPipeline','createRenderPipelineAsync'] as const){
        const original=GPUDevice.prototype[name];(GPUDevice.prototype[name] as unknown)=function(this:GPUDevice,...args:unknown[]){
          probe.pipelines++;probe.compiled.push({name,label:(args[0] as GPURenderPipelineDescriptor).label});return (original as Function).apply(this,args);
        };
      }
    });
    // Instrument rendering only. The public save and catalogue are fetched unchanged.
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:frameProbe+await response.text()});});
    await page.goto('/?e2e');const front=page.locator('.front-menu');
    await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.getByRole('button',{name:'Colonies de test'}).click();
    expect(TEST_COLONY_COUNT).toBeGreaterThanOrEqual(49);await expect(front.locator('input[name="test-colony"]')).toHaveCount(TEST_COLONY_COUNT);
    await front.locator(`input[name="test-colony"][value="${COMMERCIAL_SALES_DEMO_ID}"]`).check();await front.getByRole('button',{name:'Charger cette colonie'}).click();
    await expectWorld(page,prepared);expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    const capture=async(name:string,w:World)=>{expect(validateWorld(w)).toEqual([]);const rendered=await frame(page,w.tick);stages[name]={tick:w.tick,phase:w.commercialTrip?.phase??'none',pipelines:await page.evaluate(()=>(window as unknown as {commercialSalesProbe:Probe}).commercialSalesProbe.pipelines),frame:rendered,silver:colonyQuantity(w,'silver'),cloth:colonyQuantity(w,'cloth'),wool:colonyQuantity(w,'muffalo-wool'),medicine:colonyQuantity(w,'medicine'),component:colonyQuantity(w,'component')};};
    await capture('prepared',prepared);
    const hardware=await page.evaluate(()=>(window as unknown as {commercialSalesProbe:Probe}).commercialSalesProbe.hardware);
    expect(hardware,'Hardware information must come from the renderer device.').toBeDefined();expect(hardware!.fallback).toBe(false);
    expect(JSON.stringify(hardware)).not.toMatch(/swiftshader|llvmpipe|lavapipe|software/i);expect(hardware!.vendor).not.toBe('');
    await panel(page,'world');await page.locator('#commercial-pawn').selectOption(String(pawn.id));await page.locator('#commercial-food').selectOption(String(food.id));
    await page.locator('#commercial-quantity').selectOption('3');await page.locator('#commercial-silver').fill('0');
    await expect(page.locator('#commercial-start')).toBeDisabled();
    const cargo=textileLines(prepared.piles.filter(p=>p.item==='cloth'||p.item==='muffalo-wool').map(p=>({pileId:p.id,item:p.item,available:p.quantity})),75,60);
    for(const line of cargo)await page.locator(`[data-commercial-cargo="${line.pileId}"]`).fill(String(line.quantity));
    await expect(page.locator('#commercial-start')).toBeEnabled();await expect(page.locator('#commercial-preparation')).toContainText('4,53 kg');
    await page.screenshot({path:testOutputPath('artifacts/commercial-sales-v203-preparation.png')});
    await page.locator('#commercial-start').click();await expect.poll(async()=>(await world(page)).commercialTrip?.phase).toBe('loading');
    await expect(page.locator('#commercial-content')).toHaveAttribute('aria-busy','false');await pause(page);
    const loading=await world(page);expect(loading.commercialTrip).toMatchObject({phase:'loading',pawnId:pawn.id,foodQuantity:3,silverQuantity:0,cargo:{cloth:75,'muffalo-wool':60}});
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(id=>{const w=window.__lisiere.world,t=w.commercialTrip;if(!t||t.phase!=='loading'||!w.piles.some(i=>(i.item==='cloth'||i.item==='muffalo-wool')&&i.owner.type==='inventory'&&i.owner.pawnId===id))return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},pawn.id,{polling:'raf'});
    await pause(page);const carried=await world(page),carrier=carried.pawns.find(p=>p.id===pawn.id)!;
    const held=carried.piles.filter(i=>(i.item==='cloth'||i.item==='muffalo-wool')&&i.owner.type==='inventory'&&i.owner.pawnId===pawn.id);expect(held.length).toBeGreaterThan(0);
    for(const pile of held){const source=prepared.piles.find(i=>i.id===pile.id)!;expect(source.owner.type).toBe('ground');if(source.owner.type==='ground')expect(Math.abs(carrier.x-source.owner.x)+Math.abs(carrier.z-source.owner.z)).toBeLessThanOrEqual(1);}
    expect(colonyQuantity(carried,'cloth')).toBe(75);expect(colonyQuantity(carried,'muffalo-wool')).toBe(60);expect(colonyQuantity(carried,'silver')).toBe(0);
    await saveResume(page,carried);await capture('cargoCarryReload',carried);
    const outbound=await reachPhase(page,'outbound'),trip=outbound.commercialTrip!;if(trip.phase!=='outbound')throw new Error('Expected actual departure.');
    expect(outbound.pawns.some(p=>p.id===pawn.id)).toBe(false);expect(trip.pawn.id).toBe(pawn.id);expect(trip.arrivesAt-trip.departedAt).toBe(750);
    expect(trip.items.filter(i=>i.item==='cloth'||i.item==='muffalo-wool').map(i=>i.id).sort()).toEqual(cargo.map(l=>l.pileId).sort());
    await capture('outbound',outbound);await saveResume(page,outbound);await capture('outboundReload',outbound);
    await page.locator('[data-speed="6"]').click();await page.waitForFunction(()=>window.__lisiere.world.commercialTrip?.phase==='at-post',null,{polling:'raf',timeout:60_000});
    await expect(page.locator('[data-speed="0"]')).toHaveAttribute('aria-pressed','true');
    const arrived=await world(page),at=arrived.commercialTrip!;if(at.phase!=='at-post')throw new Error('Expected post arrival.');
    expect(at.decisionUntil-at.arrivedAt).toBe(250);expect(at.consumed).toBeGreaterThan(0);expect(colonyQuantity(arrived,'survival-meal')+at.consumed).toBe(4);
    expect(arrived.civilianPost!.transactions).toBe(0);expect(colonyQuantity(arrived,'silver')).toBe(0);
    const initialSilver=postQuantity(arrived,'silver'),initialMedicine=postQuantity(arrived,'medicine'),initialComponent=postQuantity(arrived,'component');
    await panel(page,'world');await expect(page.locator('#commercial-shop')).toBeVisible();await expect(page.locator('#commercial-post-funds')).toContainText(String(initialSilver));
    await expect(page.locator('#commercial-inventory')).toContainText('Invendus');await capture('atPost',arrived);
    await page.keyboard.press('Escape');expect((await world(page)).commercialTrip).toEqual(at);await saveResume(page,arrived);await capture('atPostReload',arrived);await panel(page,'world');
    const beforeSale=quoteCommercial(arrived,[]);if(!beforeSale.ok)throw new Error(beforeSale.reason);
    const medicine=beforeSale.goods.find(g=>g.item==='medicine')!,component=beforeSale.goods.find(g=>g.item==='component')!;
    const buyLines=[{pileId:medicine.pileId,quantity:1},{pileId:component.pileId,quantity:1}];
    await page.locator(`[data-commercial-pile="${medicine.pileId}"]`).fill('1');await page.locator(`[data-commercial-pile="${component.pileId}"]`).fill('1');await expect(page.locator('#commercial-buy')).toBeDisabled();
    const sellPreview=quoteCommercialSell(arrived,[]);if(!sellPreview.ok)throw new Error(sellPreview.reason);
    const saleLines=textileLines(sellPreview.goods,60,40),sale=quoteCommercialSell(arrived,saleLines);if(!sale.ok)throw new Error(sale.reason);
    for(const line of saleLines)await page.locator(`[data-commercial-sale="${line.pileId}"]`).fill(String(line.quantity));
    await expect(page.locator('#commercial-sell-total')).toContainText(`À encaisser : ${sale.totalSilver} argent`);await page.locator('#commercial-sell').click();
    await expect.poll(async()=>(await world(page)).civilianPost?.transactions).toBe(1);await expect(page.locator('#commercial-content')).toHaveAttribute('aria-busy','false');
    const sold=await world(page),soldTrip=sold.commercialTrip!;if(soldTrip.phase!=='at-post')throw new Error('Sale must preserve the visit.');
    expect(soldTrip.sold).toEqual({cloth:60,'muffalo-wool':40});expect(soldTrip.silverEarned).toBe(sale.totalSilver);expect(soldTrip.silverPaid).toBe(0);
    expect(colonyQuantity(sold,'silver')).toBe(sale.totalSilver);expect(postQuantity(sold,'silver')+sale.totalSilver).toBe(initialSilver);
    expect(colonyQuantity(sold,'cloth')).toBe(15);expect(colonyQuantity(sold,'muffalo-wool')).toBe(20);expect(postQuantity(sold,'cloth')).toBe(60);expect(postQuantity(sold,'muffalo-wool')).toBe(40);
    await expect(page.locator('#commercial-inventory')).toContainText(`total encaissé : ${sale.totalSilver} argent`);await expect(page.locator('#commercial-buy')).toBeEnabled();
    await capture('sold',sold);await page.screenshot({path:testOutputPath('artifacts/commercial-sales-v203-at-post.png')});await saveResume(page,sold);await capture('soldReload',sold);await panel(page,'world');
    // Re-enter the actual purchase basket after reopening; sale and purchase round separately.
    await page.locator(`[data-commercial-pile="${medicine.pileId}"]`).fill('1');await page.locator(`[data-commercial-pile="${component.pileId}"]`).fill('1');
    const purchaseQuote=quoteCommercial(sold,buyLines);if(!purchaseQuote.ok)throw new Error(purchaseQuote.reason);
    expect(purchaseQuote.totalSilver).toBeGreaterThan(0);expect(purchaseQuote.totalSilver).toBeLessThanOrEqual(sale.totalSilver);
    await expect(page.locator('#commercial-total')).toContainText(`À payer : ${purchaseQuote.totalSilver} argent`);await page.locator('#commercial-buy').click();await expect.poll(async()=>(await world(page)).civilianPost?.transactions).toBe(2);
    const bought=await world(page),purchase=bought.commercialTrip!;if(purchase.phase!=='at-post')throw new Error('Purchase must preserve the visit.');
    expect(purchase.bought).toEqual({medicine:1,component:1});expect(purchase.silverPaid).toBe(purchaseQuote.totalSilver);expect(purchase.silverEarned).toBe(sale.totalSilver);
    expect(colonyQuantity(bought,'silver')).toBe(sale.totalSilver-purchaseQuote.totalSilver);expect(colonyQuantity(bought,'silver')+postQuantity(bought,'silver')).toBe(initialSilver);
    expect(colonyQuantity(bought,'medicine')+postQuantity(bought,'medicine')).toBe(initialMedicine);expect(colonyQuantity(bought,'component')+postQuantity(bought,'component')).toBe(initialComponent);
    await capture('bought',bought);await saveResume(page,bought);await capture('boughtReload',bought);await panel(page,'world');
    await page.locator('#commercial-return').click();await expect.poll(async()=>(await world(page)).commercialTrip?.phase).toBe('returning');await expect(page.locator('#commercial-content')).toHaveAttribute('aria-busy','false');await pause(page);
    const returning=await world(page),returnTrip=returning.commercialTrip!;if(returnTrip.phase!=='returning')throw new Error('Expected explicit return.');
    expect(returnTrip.returnAt-returnTrip.leftPostAt).toBe(750);await saveResume(page,returning);await capture('returnReload',returning);
    const unloading=await reachPhase(page,'unloading'),pending=unloading.commercialTrip!;if(pending.phase!=='unloading')throw new Error('Expected actual deposits.');
    expect(unloading.pawns.filter(p=>p.id===pawn.id)).toHaveLength(1);expect(pending.pendingPileIds.length).toBeGreaterThan(0);expect(unloading.piles.some(i=>i.owner.type==='inventory'&&i.owner.pawnId===pawn.id&&(i.item==='cloth'||i.item==='muffalo-wool'))).toBe(true);
    await saveResume(page,unloading);await capture('unloadReload',unloading);await panel(page,'world');await expect(page.locator('#commercial-status')).toContainText('dépose physiquement');
    await page.locator('[data-speed="6"]').click();await page.waitForFunction(()=>{if(window.__lisiere.world.commercialTrip)return false;document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;},null,{polling:'raf',timeout:30_000});await pause(page);
    const returned=await world(page);expect(returned.pawns.filter(p=>p.id===pawn.id)).toHaveLength(1);expect(returned.piles.some(i=>i.owner.type==='inventory'&&i.owner.pawnId===pawn.id)).toBe(false);
    expect(colonyQuantity(returned,'cloth')).toBe(15);expect(colonyQuantity(returned,'muffalo-wool')).toBe(20);expect(colonyQuantity(returned,'medicine')).toBe(1);expect(colonyQuantity(returned,'component')).toBe(1);
    expect(returned.piles.filter(i=>['cloth','muffalo-wool','medicine','component','silver'].includes(i.item)).every(i=>i.owner.type==='ground')).toBe(true);
    expect(colonyQuantity(returned,'silver')+postQuantity(returned,'silver')).toBe(initialSilver);expect(colonyQuantity(returned,'cloth')+postQuantity(returned,'cloth')).toBe(75);expect(colonyQuantity(returned,'muffalo-wool')+postQuantity(returned,'muffalo-wool')).toBe(60);
    expect(returned.civilianPost!.generation).toBe(1);expect(returned.civilianPost!.transactions).toBe(2);expect(returned.civilianPost!.recent[0]).toMatchObject({pawnId:pawn.id,silver:sale.totalSilver,sold:{cloth:60,'muffalo-wool':40}});expect(returned.civilianPost!.recent[1]).toMatchObject({silver:purchaseQuote.totalSilver,medicine:1,component:1});
    const consumed=returned.events.filter(e=>e.message.includes('mange une ration de survie pendant l’expédition')).length;expect(consumed).toBeGreaterThan(0);expect(colonyQuantity(returned,'survival-meal')+consumed).toBe(4);
    await capture('returned',returned);await saveResume(page,returned);await capture('returnedReload',returned);await page.screenshot({path:testOutputPath('artifacts/commercial-sales-v203-returned.png')});
    const probe=await page.evaluate(()=>(window as unknown as {commercialSalesProbe:Probe}).commercialSalesProbe);
    await writeTestFile('artifacts/commercial-sales-v203-native.json',JSON.stringify({prepared:true,catalogueEntries:TEST_COLONY_COUNT,protocol:'Unchanged public catalogue/save. Real UI commands and worker loading, exit, sale, purchase, return and deposits; exact paused reloads. Hardware device and resident pipelines/geometries checked. No natural textile production, campaign, CPU/GPU timing or general performance claim.',browser:browser.version(),hardware,sale:{lines:saleLines,totalSilver:sale.totalSilver,mass:sale.mass},purchase:{lines:buyLines,totalSilver:purchaseQuote.totalSilver,mass:purchaseQuote.mass},stages,probe,errors},null,2));
    for(const stage of Object.values(stages)){expect(stage.pipelines).toBe(stages.prepared!.pipelines);expect(stage.frame.geometry).toBe(stages.prepared!.frame.geometry);expect(stage.frame.instances).toBe(stage.frame.pawnIds.length);}
    for(const name of ['outbound','outboundReload','atPost','atPostReload','sold','soldReload','bought','boughtReload','returnReload']){expect(stages[name]!.frame.instances).toBe(2);expect(stages[name]!.frame.pawnIds).not.toContain(pawn.id);}
    for(const name of ['prepared','cargoCarryReload','unloadReload','returned','returnedReload'])expect(stages[name]!.frame.instances).toBe(3);expect(errors).toEqual([]);
  }finally{await browser.close();}
});
