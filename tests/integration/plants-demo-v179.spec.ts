import { readFileSync } from 'node:fs';
import { expect,test } from '@playwright/test';
import { deserializeWorld,validateWorld } from '../../src/sim/serialization';
import { HEALROOT_CELL,MEDICINE_STORE } from '../../scripts/generate-healroot-demo-v179';
import { testOutputPath,writeTestFile } from '../test-output';
import { expectWorld,observeErrors,panel,pause,pawnTab,world } from './helpers';
import { perform } from './player-actions';

test('public Roots and care colony loads from the catalogue and teaches Plants through a physical saved harvest and treatment',async({playwright})=>{
  test.setTimeout(150_000);
  const expected=deserializeWorld(readFileSync('public/test-saves/v179/racines-et-soins.json','utf8'));
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page),rotation={value:0};
  const herbal=(w:typeof expected)=>w.piles.filter(p=>p.item==='herbal-medicine').reduce((n,p)=>n+p.quantity,0);
  try{
    await page.goto('/?e2e');
    const front=page.locator('.front-menu');
    if(await front.isHidden()){await panel(page,'menu');await page.locator('#browse-saves').click();}
    else await front.getByRole('button',{name:'Charger une partie',exact:true}).click();
    await front.getByRole('button',{name:'Colonies de test'}).click();
    await expect(front.locator('input[name="test-colony"]')).toHaveCount(32);
    await front.locator('input[name="test-colony"][value="racines-et-soins-v179"]').check();
    await expect(front).toContainText('Racines et soins · 3 colons');
    await page.screenshot({path:testOutputPath('artifacts/plants-v179-catalogue.png')});
    await front.getByRole('button',{name:'Charger cette colonie'}).click();
    await expectWorld(page,expected);
    await expect(page.locator('#pause-banner')).toBeVisible();
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    const ada=expected.pawns.find(p=>p.name==='Ada')!,patient=expected.pawns.find(p=>p.name==='Noé')!;
    const job=expected.jobs.find(j=>j.kind==='harvest')!;
    await page.locator(`[data-pawn="${ada.id}"]`).click();await pawnTab(page,'bio');
    await expect(page.locator('[data-skill="plants"]')).toContainText('Plantes 8/20');
    await page.locator('[data-skill-entry="plants"] > summary').click();
    // Seed 42 preserves Ada's naturally generated bad back: Manipulation 90 %.
    await expect(page.locator('[data-skill-detail="plants"]')).toContainText('Réussite de récolte 97 %');
    await expect(page.locator('[data-skill-detail="plants"]')).toContainText('Travail 90 % avant lumière');
    await page.screenshot({path:testOutputPath('artifacts/plants-v179-bio.png')});
    await panel(page,'work');
    await expect(page.locator(`[data-owner="${ada.id}"][data-work="gather"]`)).toHaveAttribute('title',/Plantes 8\/20/);
    await expect(page.locator(`[data-owner="${ada.id}"][data-work="grow"]`)).toHaveAttribute('title',/Plantes 8\/20/);
    await page.keyboard.press('Escape');
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(id=>{
      const progress=window.__lisiere.world.jobs.find(j=>j.id===id)?.progress??0;
      if(progress<4||progress>=30)return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
    },job.id,{polling:100,timeout:30_000});
    await pause(page);
    const working=await world(page);
    expect(working.pawns.find(p=>p.id===ada.id)?.skills.plants?.xp).toBeGreaterThan(0);
    expect(herbal(working)).toBe(0);
    expect(working.resources.some(r=>r.x===HEALROOT_CELL.x&&r.z===HEALROOT_CELL.z)).toBe(true);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,working);
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>{
      if(!window.__lisiere.world.piles.some(p=>p.item==='herbal-medicine'))return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
    },undefined,{polling:100,timeout:30_000});
    await pause(page);
    const harvested=await world(page),dose=harvested.piles.find(p=>p.item==='herbal-medicine')!;
    expect(dose.quantity).toBe(1);expect(dose.owner.type).toBe('ground');
    expect(harvested.pawns.find(p=>p.id===patient.id)?.health?.injuries[0]?.tended).toBeUndefined();
    await perform(page,{reason:'Activer le transport pour la scène du catalogue.',command:{type:'priority',pawnId:ada.id,work:'haul',value:1}},rotation);
    await perform(page,{reason:'Stocker la dose récoltée réellement.',command:{type:'order-haul',pawnId:ada.id,target:{type:'pile',pileId:dose.id},queue:false}},rotation);
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(store=>{
      if(!window.__lisiere.world.piles.some(p=>p.item==='herbal-medicine'&&p.owner.type==='ground'&&p.owner.x===store.x&&p.owner.z===store.z))return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
    },MEDICINE_STORE,{polling:100,timeout:30_000});
    await pause(page);const stored=await world(page);expect(herbal(stored)).toBe(1);
    await page.locator(`[data-pawn="${patient.id}"]`).click();await pawnTab(page,'health');
    await expect(page.locator('#medical-policy')).toHaveValue('herbal');await page.locator('#self-tend-policy').check();
    await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===patient.id)?.selfTend).toBe(true);
    await perform(page,{reason:'Activer Médecin pour Noé.',command:{type:'priority',pawnId:patient.id,work:'doctor',value:1}},rotation);
    await perform(page,{reason:'Soigner la contusion préparée avec la dose stockée.',command:{type:'order-tend',pawnId:patient.id,patientId:patient.id,queue:false}},rotation);
    expect((await world(page)).pawns.find(p=>p.id===patient.id)?.tend?.medicine?.item).toBe('herbal-medicine');
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(id=>{
      if(window.__lisiere.world.pawns.find(p=>p.id===id)?.health?.injuries[0]?.tended===undefined)return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
    },patient.id,{polling:100,timeout:30_000});
    await pause(page);const treated=await world(page);
    expect(herbal(treated)).toBe(0);
    expect(treated.piles.filter(p=>p.item==='medicine').reduce((n,p)=>n+p.quantity,0)).toBe(30);
    expect(validateWorld(treated)).toEqual([]);expect(errors).toEqual([]);
    await page.screenshot({path:testOutputPath('artifacts/plants-v179-treated.png')});
    const graphics=await page.evaluate(async()=>{
      const adapter=await navigator.gpu?.requestAdapter();
      return {backend:window.__lisiere.backend,adapter:adapter?{vendor:adapter.info.vendor,architecture:adapter.info.architecture,device:adapter.info.device,description:adapter.info.description}:null};
    });
    await writeTestFile('artifacts/plants-v179-ui-report.json',JSON.stringify({...graphics,map:250,prepared:'Noé injury, policies, designation and reserve; no plant/dose injected',ticks:{working:working.tick,harvested:harvested.tick,stored:stored.tick,treated:treated.tick},plantsXp:treated.pawns.find(p=>p.id===ada.id)?.skills.plants?.xp,herbal:[0,1,1,0],industrial:30,errors},null,2));
  }finally{await browser.close();}
});
