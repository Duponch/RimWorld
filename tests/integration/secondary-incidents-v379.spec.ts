import {expect,test,type Page} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {preparedSecondaryRaidAlert} from '../scenarios/secondary-incidents-v379.ts';
import {campaignPresentation} from '../../src/sim/secondary-site-presentation.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {expectWorld,observeErrors,panel,pause,saveKey,world} from './helpers.ts';

async function centered(page:Page,id:number){
  await expect.poll(()=>page.evaluate(id=>{
    const p=window.__lisiere.world.pawns.find(p=>p.id===id);if(!p)return Infinity;
    const point=window.__lisiere.projectCell(p.x,p.z),canvas=document.querySelector('#viewport canvas')!.getBoundingClientRect();
    return Math.hypot(point.x-canvas.width/2,point.y-canvas.height/2);
  },id)).toBeLessThan(1);
}

test('V379 prepared off-map raid: actionable alert, real map and focus, live actors, complete exact reload',async({page},info)=>{
  test.setTimeout(180000);page.setDefaultTimeout(10000);
  const f=preparedSecondaryRaidAlert(),errors=observeErrors(page),proof:Record<string,unknown>={prepared:f.notice,complete:false,hostileId:f.hostileId};
  await writeFile(info.outputPath('prepared-input.json'),f.serialized);
  try{
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:f.serialized});
    await page.goto('/?scenario=camp&size=32&seed=379&e2e',{waitUntil:'domcontentloaded'});
    await expect(page.locator('#loading')).toBeHidden({timeout:60000});await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:60000});await pause(page);await panel(page,'menu');
    await page.locator('#load').click();await expectWorld(page,JSON.parse(JSON.stringify(campaignPresentation(f.w))));await page.keyboard.press('Escape');
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    const hardware=await page.evaluate(async()=>{const a=await navigator.gpu?.requestAdapter();return {vendor:a?.info.vendor,architecture:a?.info.architecture,description:a?.info.description};});
    expect(JSON.stringify(hardware)).not.toMatch(/swiftshader|llvmpipe|lavapipe|software adapter|basic render driver/i);proof.hardware=hardware;
    const before=await world(page);expect((before.campaignMap?.revision===2?undefined:before.campaignMap?.active)).toBe('home');expect(before.pawns.some(p=>p.id===f.hostileId)).toBe(false);
    const alert=page.locator(`[data-alert="campaign:secondary:raid:${f.hostileId}"]`);await expect(alert).toBeVisible();await expect(alert).toHaveAttribute('role','button');
    await page.screenshot({path:info.outputPath('home-remote-alert.png')});await alert.click();
    await page.waitForFunction(id=>(window.__lisiere.world.campaignMap?.revision===2?undefined:window.__lisiere.world.campaignMap?.active)==='secondary'&&window.__lisiere.world.pawns.some(p=>p.id===id),f.hostileId);
    await expect(page.locator('#selected-name')).toHaveText(f.local.pawns.find(p=>p.id===f.hostileId)!.name);await centered(page,f.hostileId);
    const initial=await world(page),enemy=initial.pawns.find(p=>p.id===f.hostileId)!;proof.entry={tick:initial.tick,x:enemy.x,z:enemy.z};
    await page.screenshot({path:info.outputPath('secondary-actual-target.png')});
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(({id,tick})=>{const w=window.__lisiere.world,p=w.pawns.find(p=>p.id===id);return w.tick>=tick+8&&!!p&&(p.x!==0&&p.x!==w.width-1&&p.z!==0&&p.z!==w.height-1||p.path.length>0||!!p.motion);},{id:f.hostileId,tick:initial.tick},{timeout:15000});
    await pause(page);const active=await world(page);proof.live={tick:active.tick,enemy:active.pawns.find(p=>p.id===f.hostileId)};
    expect(active.pawns.filter(p=>f.ids.includes(p.id)).map(p=>p.id).sort()).toEqual([...f.ids].sort());
    await panel(page,'menu');const pending=page.waitForEvent('download');await page.locator('[data-save-manager-action="export"]').click();
    const download=await pending,path=info.outputPath('complete-campaign.json');await download.saveAs(path);
    const raw=await readFile(path,'utf8'),complete=deserializeWorld(raw);expect(validateWorld(complete)).toEqual([]);expect(complete.secondarySite).toBeDefined();
    expect(JSON.parse(JSON.stringify(campaignPresentation(complete)))).toEqual(active);expect(serializeWorld(complete)).toBe(raw);
    await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,active);await page.keyboard.press('Escape');proof.exactReload=true;
    await panel(page,'world');const tab=page.locator('[data-world-tab="group"]');if(await tab.count())await tab.click();
    const home=page.locator('[data-site-action="home"]');await expect(home).toBeVisible();await home.click();
    await page.waitForFunction(()=>(window.__lisiere.world.campaignMap?.revision===2?undefined:window.__lisiere.world.campaignMap?.active)==='home');await page.keyboard.press('Escape');
    await expect(page.locator(`[data-alert="campaign:secondary:raid:${f.hostileId}"]`)).toBeVisible();
    await page.screenshot({path:info.outputPath('home-alert-after-reload.png')});
    const incident=await page.evaluate(()=>window.__lisiere.incident);expect(incident.graphicsFault).toBe(false);expect(incident.simulationStopped).toBe(false);
    expect(errors).toEqual([]);proof.errors=errors;proof.incident=incident;proof.complete=true;
  }finally{await writeFile(info.outputPath('proof.json'),JSON.stringify(proof,null,2));}
});
