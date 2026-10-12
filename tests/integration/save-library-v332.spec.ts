import { test,expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { deserializeWorld } from '../../src/sim/serialization';
import { NAMED_SAVE_KEYS,AUTO_SAVE_KEYS } from '../../src/ui/save-slots';
import { world,panel,expectWorld,observeErrors } from './helpers';

test('V332 native IndexedDB serializes competing slot selections and rejects a stale confirmation',async({page})=>{
  await page.route('**/repository-fixture',route=>route.fulfill({contentType:'text/html',body:'<main>Storage fixture</main>'}));
  await page.goto('/repository-fixture');
  const result=await page.evaluate(async()=>{
    const path='/src/ui/save-repository.ts',slotsPath='/src/ui/save-slots.ts';
    const {BrowserSaveRepository}=await import(path),{NAMED_SAVE_KEYS}=await import(slotsPath);
    const a=new BrowserSaveRepository(),b=new BrowserSaveRepository();
    await Promise.all([a.initialize(),b.initialize()]);
    const write=(repository:any,value:string)=>repository.selectAndSet(NAMED_SAVE_KEYS,(values:Map<string,string|null>)=>({key:NAMED_SAVE_KEYS.find((key:string)=>values.get(key)===null),value}));
    const keys=await Promise.all([write(a,'A'),write(b,'B'),write(a,'C')]);
    const original=await a.getItem(keys[0]);await b.setItem(keys[0],'other-tab');
    let refused=false;
    try{await a.selectAndSet([keys[0]],(values:Map<string,string|null>)=>{
      if(values.get(keys[0])!==original)throw Error('stale confirmation');return {key:keys[0],value:null};
    });}catch(error){refused=String(error).includes('stale confirmation');}
    const durable=await Promise.all(keys.map(key=>a.getItem(key)));a.close();b.close();
    const reloaded=new BrowserSaveRepository();await reloaded.initialize();
    const reopened=await Promise.all(keys.map(key=>reloaded.getItem(key)));reloaded.close();
    return {keys,durable,reopened,refused};
  });
  expect(new Set(result.keys).size).toBe(3);expect(result.refused).toBe(true);
  expect(result.durable).toEqual(['other-tab','B','C']);expect(result.reopened).toEqual(result.durable);
});

test('V332 named copies, confirmations, download/import and browser restart preserve exact worlds',async({page},info)=>{
  test.setTimeout(180_000);const errors=observeErrors(page);
  await page.goto('/?e2e&scenario=crashlanded&seed=332&size=32');
  await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false);
  await panel(page,'menu');const before=await world(page);
  const manager=page.locator('[data-save-manager]');
  await manager.locator('[data-save-manager-name]').fill('Camp & <Aulnes>');
  await manager.locator('[data-save-manager-action="create"]').click();
  await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const entry=manager.locator(`[data-save-manager-key="${NAMED_SAVE_KEYS[0]}"]`);
  await expect(entry).toContainText('Camp & <Aulnes>');expect(await entry.locator('b').count()).toBe(0);
  const record=await page.evaluate(key=>window.__lisiere.saveRepository.getItem(key),NAMED_SAVE_KEYS[0]!);
  await entry.click();await manager.locator('[data-save-manager-action="overwrite"]').click();
  await manager.locator('[data-save-manager-action="cancel"]').click();
  expect(await page.evaluate(key=>window.__lisiere.saveRepository.getItem(key),NAMED_SAVE_KEYS[0]!)).toBe(record);
  await manager.locator('[data-save-manager-action="overwrite"]').click();
  await manager.locator('[data-save-manager-action="confirm"]').click();
  await expect(manager.locator('[data-save-manager-status]')).toContainText('remplacée');
  await manager.locator('[data-save-manager-name]').fill('Copie à supprimer');
  await manager.locator('[data-save-manager-action="create"]').click();
  const extra=manager.locator(`[data-save-manager-key="${NAMED_SAVE_KEYS[1]}"]`);await expect(extra).toBeVisible();
  await extra.click();await manager.locator('[data-save-manager-action="delete"]').click();
  await manager.locator('[data-save-manager-action="cancel"]').click();await expect(extra).toBeVisible();
  await manager.locator('[data-save-manager-action="delete"]').click();await manager.locator('[data-save-manager-action="confirm"]').click();
  await expect(extra).toHaveCount(0);
  const downloadPromise=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
  const download=await downloadPromise,downloadPath=info.outputPath('colony-export.json');await download.saveAs(downloadPath);
  const exported=deserializeWorld(await readFile(downloadPath,'utf8'));expect(exported).toEqual(before);
  await manager.locator('[data-save-manager-autosave]').selectOption('3');
  expect(await page.evaluate(()=>localStorage.getItem('lisiere.autosave-minutes.v1'))).toBe('3');
  await page.screenshot({path:info.outputPath('save-manager-1440.png')});
  await page.setViewportSize({width:960,height:720});await page.screenshot({path:info.outputPath('save-manager-960.png')});
  const bounds=await manager.boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(960);
  await page.locator('#browse-saves').click();
  await page.locator(`input[name="front-save"][value="${NAMED_SAVE_KEYS[0]}"]`).check();
  await page.getByRole('button',{name:'Charger',exact:true}).click();await expectWorld(page,before);
  await page.goto('/?e2e');
  await page.getByRole('button',{name:'Charger une partie',exact:true}).click();
  await page.locator(`input[name="front-save"][value="${NAMED_SAVE_KEYS[0]}"]`).check();
  await page.getByRole('button',{name:'Charger',exact:true}).click();await expectWorld(page,before);
  await panel(page,'menu');await page.locator('#browse-saves').click();
  await page.locator('input[type=file]').setInputFiles(downloadPath);await expectWorld(page,before);
  await panel(page,'menu');await expect(manager.locator('[data-save-manager-autosave]')).toHaveValue('3');
  expect(errors).toEqual([]);
  await info.attach('exact-reprises',{body:JSON.stringify({tick:before.tick,seed:before.seed,export:true,named:true,restarted:true,import:true,errors}),contentType:'application/json'});
});

test('V332 Les Aulnes receive a real active-play autosave and reload it exactly',async({page},info)=>{
  test.setTimeout(240_000);const errors=observeErrors(page);
  await page.goto('/?e2e');await page.getByRole('button',{name:'Charger une partie',exact:true}).click();
  await page.locator('input[type=file]').setInputFiles(resolve('public/test-saves/v284/les-aulnes-integrees.json'));
  await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:90_000});
  const initial=await world(page);await panel(page,'menu');
  await page.locator('[data-save-manager-autosave]').selectOption('1');
  // Leave the paused menu and use the real player speed command. No fake clock,
  // artificial tick, world injection or autosave hook accelerates the minute.
  await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
  await expect(page.locator('[data-speed="6"]')).toHaveAttribute('aria-pressed','true');
  const started=Date.now();
  await expect.poll(async()=>page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),AUTO_SAVE_KEYS[0]!),{timeout:100_000,intervals:[1000]}).toBeTruthy();
  const elapsed=Date.now()-started;expect(elapsed).toBeGreaterThanOrEqual(58_000);
  const raw=await page.evaluate(async key=>{
    const slots='/src/ui/save-slots.ts',codec='/src/ui/save-storage-codec.ts';
    const {parseSaveSlot}=await import(slots),{decodeStoredSave}=await import(codec);
    return decodeStoredSave(parseSaveSlot((await window.__lisiere.saveRepository.getItem(key))!).data);
  },AUTO_SAVE_KEYS[0]!);
  const saved=deserializeWorld(raw);expect(saved.tick).toBeGreaterThan(initial.tick);
  await panel(page,'menu');await page.locator('#browse-saves').click();
  await page.locator(`input[name="front-save"][value="${AUTO_SAVE_KEYS[0]}"]`).check();
  await page.getByRole('button',{name:'Charger',exact:true}).click();await expectWorld(page,saved);
  expect(errors).toEqual([]);
  await info.attach('automatic-reprise',{body:JSON.stringify({initialTick:initial.tick,savedTick:saved.tick,elapsed,backend:await page.evaluate(()=>window.__lisiere.backend),errors}),contentType:'application/json'});
});
