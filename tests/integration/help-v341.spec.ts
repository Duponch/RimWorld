import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {world,pause,panel,expectWorld,observeErrors} from './helpers';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';

const front=(page:Page)=>page.locator('.front-menu');
const frontButton=(page:Page,name:string)=>front(page).getByRole('button',{name,exact:true});
const help=(page:Page)=>page.locator('#help');
const close=(page:Page)=>help(page).getByRole('button',{name:'Fermer l’aide',exact:true});
async function noColony(page:Page){
  await expect.poll(()=>page.evaluate(()=>typeof window.__lisiere)).toBe('object');
  expect(await page.evaluate(()=>({world:typeof window.__lisiere.world,backend:typeof window.__lisiere.backend}))).toEqual({world:'undefined',backend:'undefined'});
  await expect(page.locator('.game-shell')).toHaveJSProperty('hidden',true);
  await expect(page.locator('.game-shell')).toHaveJSProperty('inert',true);
}
async function modal(page:Page){
  await expect(help(page)).toBeVisible();await expect(help(page)).toHaveJSProperty('open',true);
  expect(await help(page).evaluate(node=>node.matches(':modal'))).toBe(true);
  expect(await help(page).evaluate(node=>node.parentElement?.id==='app'&&!node.closest('.game-shell'))).toBe(true);
  await expect(page.locator('#help')).toHaveCount(1);
}
async function tabLoop(page:Page){
  for(const key of ['Tab','Tab','Shift+Tab','Shift+Tab']){
    await page.keyboard.press(key);expect(await help(page).evaluate(node=>node.contains(document.activeElement))).toBe(true);
  }
}

test('V341 initial help works before any colony and restores the home controls',async({page},info)=>{
  test.skip(process.env.V341_HELP!=='1','Opt-in native help pilot; ROOT owns execution.');test.setTimeout(90000);
  const errors=observeErrors(page);await page.goto('/?e2e');await expect(front(page)).toBeVisible();await noColony(page);
  await expect(front(page)).toHaveAttribute('data-page','home');const trigger=frontButton(page,'Aide');await expect(trigger).toBeEnabled();
  const original=await help(page).elementHandle(),content=await help(page).textContent();expect(original).not.toBeNull();
  for(const method of ['click','Enter','Space'] as const){
    if(method==='click')await trigger.click();else{await trigger.focus();await trigger.press(method);}
    await modal(page);expect(await help(page).evaluate((node,original)=>node===original,original)).toBe(true);
    expect(await help(page).textContent()).toBe(content);await tabLoop(page);await noColony(page);
    if(method==='click')await page.screenshot({path:info.outputPath('initial-help.png')});
    if(method==='Enter')await close(page).click();else await page.keyboard.press('Escape');
    await expect(help(page)).not.toBeVisible();await expect(trigger).toBeFocused();await expect(front(page)).toBeVisible();
    await expect(front(page)).toHaveAttribute('data-page','home');await noColony(page);
  }
  expect(errors).toEqual([]);await info.attach('initial-help-summary',{contentType:'application/json',body:JSON.stringify({methods:['click','Enter','Space'],modal:true,focusRestored:true,worldCreated:false,errors})});
});

test('V341 same help survives actual 250 colony creation and exact save reload',async({page},info)=>{
  test.skip(process.env.V341_HELP!=='1','Opt-in actual five-page creation, no prepared World.');test.setTimeout(240000);
  const errors=observeErrors(page);await page.goto('/?e2e');await expect(front(page)).toBeVisible();await noColony(page);
  await frontButton(page,'Aide').click();await modal(page);const original=await help(page).elementHandle(),content=await help(page).textContent();
  await page.keyboard.press('Escape');await expect(frontButton(page,'Aide')).toBeFocused();
  // Same public five-page route as first-day-guide.spec.ts, with real arrival.
  await frontButton(page,'Nouvelle partie').click();await frontButton(page,'Suivant').click();
  await front(page).getByRole('radio',{name:'Récit d’aventure',exact:true}).check();
  await front(page).getByRole('radio',{name:'Rechargeable à tout moment',exact:true}).check();
  await frontButton(page,'Suivant').click();await page.locator('#front-seed').fill('42');await frontButton(page,'Générer').click();
  await expect(page.locator('#front-site-facts')).toContainText('250 × 250');await frontButton(page,'Suivant').click();
  await front(page).locator('dialog').getByRole('button',{name:'Confirmer',exact:true}).click();await frontButton(page,'Démarrer').click();
  await expect(front(page)).toBeHidden({timeout:90000});await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:90000});
  const incoming=await world(page);expect([incoming.width,incoming.height,incoming.tick]).toEqual([250,250,0]);
  expect(incoming.startingArrival?.phase).toBe('incoming');
  if(!incoming.startingArrival||incoming.startingArrival.phase==='opened')throw Error('Actual starting custody is missing.');
  const originalIDs=incoming.startingArrival!.pods.map(pod=>pod.pawn.id).sort((a,b)=>a-b);expect(originalIDs).toHaveLength(3);
  await page.locator('.starting-arrival').getByRole('button',{name:'Reprendre',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.__lisiere.world.startingArrival?.phase)).toBe('opened');await pause(page);
  const created=await world(page);expect(validateWorld(created)).toEqual([]);expect(created.tick).toBeGreaterThanOrEqual(27);
  expect(created.pawns.map(p=>p.id).sort((a,b)=>a-b)).toEqual(originalIDs);expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
  const trigger=page.locator('#help-open');await trigger.click();await modal(page);
  expect(await help(page).evaluate((node,original)=>node===original,original)).toBe(true);expect(await help(page).textContent()).toBe(content);
  await tabLoop(page);for(const key of ['1','2','3','F1','F2'])await page.keyboard.press(key);
  await expect(page.locator('[data-speed="0"]')).toHaveAttribute('aria-pressed','true');await expectWorld(page,created);
  await page.screenshot({path:info.outputPath('ingame-help.png')});await page.keyboard.press('Escape');
  await expect(help(page)).not.toBeVisible();await expect(trigger).toBeFocused();await expectWorld(page,created);
  await trigger.press('Enter');await modal(page);await close(page).focus();await close(page).press('Space');
  await expect(help(page)).not.toBeVisible();await expect(trigger).toBeFocused();
  await expect(page.locator('[data-speed="0"]')).toHaveAttribute('aria-pressed','true');await expectWorld(page,created);
  await panel(page,'menu');const manager=page.locator('[data-save-manager]'),label='Aide V341';
  await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();
  await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
  const path=info.outputPath('help-v341.json');await(await download).saveAs(path);const raw=await readFile(path,'utf8');expect(deserializeWorld(raw)).toEqual(created);
  await page.locator('#browse-saves').click();const row=front(page).locator('label').filter({has:page.locator('strong').filter({hasText:label})});
  await row.locator('input[name="front-save"]').check();await frontButton(page,'Charger').click();await expectWorld(page,created);
  expect(await help(page).evaluate((node,original)=>node===original,original)).toBe(true);
  await expect(help(page)).not.toBeVisible();await expect(page.locator('[data-speed="0"]')).toHaveAttribute('aria-pressed','true');expect(errors).toEqual([]);
  await info.attach('help-campaign-summary',{contentType:'application/json',body:JSON.stringify({size:[250,250],tick:created.tick,people:originalIDs,
    sameHelpNode:true,sameContent:true,modalShortcutsPreserveWorld:true,exactReload:true,exportSha256:createHash('sha256').update(raw).digest('hex'),errors})});
});