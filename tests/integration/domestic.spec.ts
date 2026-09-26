import {expect,test} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {expectWorld,observeErrors,panel,pause,world} from './helpers';

test('animaux V106 : bibliothèque, désignation, transport, tentative, soins et reprise',async({playwright},testInfo)=>{
 test.setTimeout(120000);
 const browser=await playwright.chromium.launch({channel:'chromium',headless:false,args:[]});
 const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
 const errors=observeErrors(page);page.setDefaultTimeout(15000);
 try{
  const initial=deserializeWorld(readFileSync('public/test-saves/v106/lievres.json','utf8'));
  const wild=initial.wildlife!.animals.find(a=>!a.domestic)!,patient=initial.wildlife!.animals.find(a=>a.domestic)!;
  const colon=initial.pawns[0]!;
  await page.goto('/?scenario=camp&size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await pause(page);
  await panel(page,'menu');await page.locator('#browse-saves').click();await page.getByRole('button',{name:'Colonies de test'}).click();
  await page.locator('input[name="test-colony"][value="lievres-v106"]').check();await page.getByRole('button',{name:'Charger cette colonie'}).click();await expectWorld(page,initial);
  await panel(page,'work');await expect(page.locator(`select[data-work="handle"][data-owner="${colon.id}"]`)).toHaveValue('1');
  for(const width of [1366,1440,1920]){
   await page.setViewportSize({width,height:width===1366?768:1000});
   const layout=await page.locator('#work-panel').evaluate(el=>({width:el.getBoundingClientRect().width,scroll:el.scrollWidth,client:el.clientWidth,table:el.querySelector('table')!.getBoundingClientRect().width}));
   expect(layout.scroll).toBeLessThanOrEqual(layout.client+1);expect(layout.table).toBeLessThanOrEqual(layout.width);
  }
  await page.setViewportSize({width:1440,height:1000});await page.locator('#work-panel [data-close-panel]').click();
  await page.locator('[data-panel="animals"]').click();await expect(page.locator('[data-domestic-animal]')).toHaveCount(1);
  await page.locator(`[data-domestic-focus="${patient.id}"]`).click();
  await page.locator('[data-animal-tab="health"]').click();await expect(page.locator('[data-animal-care]')).toBeVisible();
  await page.locator('[data-animal-care]').selectOption('none');await expect.poll(async()=>(await world(page)).wildlife!.animals.find(a=>a.id===patient.id)!.domestic!.care).toBe('none');
  await page.locator('[data-animal-care]').selectOption('herbal');
  await page.screenshot({path:'artifacts/domestic-health-v106.png'});
  await panel(page,'wildlife');await expect(page.locator(`[data-animal="${patient.id}"]`)).toHaveCount(0);
  await page.locator(`[data-animal-tame="${wild.id}"]`).check();await expect.poll(async()=>!!(await world(page)).wildlife!.animals.find(a=>a.id===wild.id)?.taming?.designated).toBe(true);
  await page.locator(`[data-animal="${wild.id}"] .fauna-focus`).click();await expect(page.locator('#inspector [data-animal-tame]')).toBeChecked();
  await page.locator('[data-speed="6"]').click();
  await expect.poll(async()=>(await world(page)).pawns[0].animalHandling?.step??-1,{timeout:15000,intervals:[100]}).toBeGreaterThanOrEqual(3);
  await pause(page);const midway=await world(page);expect(midway.pawns[0].animalHandling).toBeDefined();expect(validateWorld(midway)).toEqual([]);
  await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,midway);
  await expect(page.locator('#menu-panel')).toBeHidden();await page.locator('[data-speed="6"]').click();
  await expect.poll(async()=>(await world(page)).events.some(e=>/apprivois/.test(e.message)),{timeout:20000}).toBe(true);
  await expect.poll(async()=>(await world(page)).events.some(e=>e.message.includes('a soigné le lièvre')),{timeout:20000}).toBe(true);
  await pause(page);const final=await world(page);expect(validateWorld(final)).toEqual([]);
  expect(final.wildlife!.animals.map(a=>a.id)).toContain(wild.id);expect(final.wildlife!.animals.map(a=>a.id)).toContain(patient.id);
  expect(final.piles.filter(p=>p.item==='herbal-medicine').reduce((n,p)=>n+p.quantity,0)).toBe(3);
  expect(final.wildlife!.animals.find(a=>a.id===patient.id)!.health!.injuries.some(i=>i.tended)).toBe(true);
  await page.locator('[data-panel="animals"]').click();await page.locator(`[data-domestic-focus="${patient.id}"]`).click();await page.locator('[data-animal-tab="health"]').click();
  await page.screenshot({path:'artifacts/domestic-cared-v106.png'});
  await panel(page,'menu');await page.locator('#save').click();await page.reload();await expect(page.locator('#loading')).toHaveCount(0);await pause(page);await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,final);
  expect(errors).toEqual([]);const backend=await page.evaluate(()=>window.__lisiere.backend);expect(backend).toContain('WebGPU');
  const report=JSON.stringify({backend,prepared:true,fixture:'lievres-v106',start:initial.tick,checkpoint:midway.tick,final:final.tick,tamed:!!final.wildlife!.animals.find(a=>a.id===wild.id)!.domestic,events:final.events,medicineUsed:1,coldReload:true,errors},null,2)+'\n';
  writeFileSync('artifacts/domestic-native-v106.json',report);await testInfo.attach('domestic-v106',{contentType:'application/json',body:report});
 }catch(error){writeFileSync('artifacts/domestic-native-failure-v106.json',JSON.stringify({world:await world(page).catch(()=>null),errors,error:String(error)}));throw error;}
 finally{await browser.close();}
});
