import {readFileSync} from 'node:fs';
import {expect,test} from '@playwright/test';
import {isColonist} from '../../src/sim/affiliation.ts';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import type {World} from '../../src/sim/types.ts';
import {mapObjectsAt} from '../../src/ui/map-object-selection.ts';
import {decodeStoredSave,storedSaveMetadata} from '../../src/ui/save-storage-codec.ts';
import {TEST_COLONY_COUNT} from '../test-colony-count.ts';
import {writeTestFileSync} from '../test-output.ts';
import {cell,expectWorld,observeErrors,panel,pause,pawnTab,saveKey,settledCells,world} from './helpers.ts';
import {inspectPerson,revealCells} from './player-actions.ts';

const residents=(w:World)=>w.pawns.filter(p=>isColonist(p)&&!p.prisoner&&!p.visitor);

test('Les Aulnes on the standard map exposes an advanced colony and saves a real exact continuation',async({playwright},info)=>{
  test.setTimeout(180_000);
  const initial=deserializeWorld(await decodeStoredSave(readFileSync('public/test-saves/v223/les-aulnes-250.json','utf8')));
  expect([initial.width,initial.height]).toEqual([250,250]);expect(validateWorld(initial)).toEqual([]);
  expect(residents(initial)).toHaveLength(14);
  expect(initial.structures.filter(s=>s.kind==='mini-turret')).toHaveLength(4);
  const prisoner=initial.pawns.find(p=>!!p.prisoner)!;
  expect(prisoner).toBeDefined();
  const browser=await playwright.chromium.launch({channel:'chromium',headless:true,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1600,height:1000}}),errors=observeErrors(page);
  const proof:Record<string,unknown>={complete:false,initialTick:initial.tick,map:{width:initial.width,height:initial.height},scope:'Bounded native continuation; no general CPU/GPU performance certification.'};
  try{
    await page.goto('/?e2e');const front=page.locator('.front-menu');
    if(await front.isHidden()){await panel(page,'menu');await page.locator('#browse-saves').click();}
    else await front.getByRole('button',{name:'Charger une partie',exact:true}).click();
    await front.getByRole('button',{name:'Colonies de test'}).click();
    await expect(front.locator('input[name="test-colony"]')).toHaveCount(TEST_COLONY_COUNT);
    await front.locator('input[name="test-colony"][value="advanced-colony-v223"]').check();
    await page.screenshot({path:info.outputPath('catalogue.png')});
    await front.getByRole('button',{name:'Charger cette colonie'}).click();await expectWorld(page,initial);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    const hardware=await page.evaluate(async()=>{
      const adapter=await navigator.gpu?.requestAdapter(),details=adapter?.info;
      return {present:!!adapter,vendor:details?.vendor,architecture:details?.architecture,description:details?.description,
        fallback:(details as unknown as {isFallbackAdapter?:boolean}|undefined)?.isFallbackAdapter??(adapter as unknown as {isFallbackAdapter?:boolean}|null)?.isFallbackAdapter??null};
    });
    proof.hardware=hardware;expect(hardware.present).toBe(true);expect(hardware.fallback).not.toBe(true);
    expect(JSON.stringify(hardware)).not.toMatch(/swiftshader|llvmpipe|lavapipe|software adapter|basic render driver/i);
    // The portrait performs the actual camera focus; no renderer/World setter.
    const resident=[...residents(initial)].sort((a,b)=>(a.x-129)**2+(a.z-122)**2-((b.x-129)**2+(b.z-122)**2))[0]!;
    await page.locator(`[data-pawn="${resident.id}"]`).click();await page.keyboard.press('Escape');
    await page.locator('#wall-cutaway').click();
    const overview=initial.structures.filter(s=>['pen-marker','sun-lamp','fabrication-bench','hospital-bed'].includes(s.kind));
    await revealCells(page,overview);await settledCells(page,[resident]);
    proof.overviewBuildings=overview.map(s=>({id:s.id,kind:s.kind,x:s.x,z:s.z}));
    await page.screenshot({path:info.outputPath('advanced-colony-isometric.png')});
    await page.locator('#camera-mode').click();await settledCells(page,[resident]);
    await expectWorld(page,initial);await page.screenshot({path:info.outputPath('advanced-colony-perspective.png')});
    await inspectPerson(page,resident.id,'bio');await expect(page.locator('#selected-name')).toHaveText(resident.name);
    await page.screenshot({path:info.outputPath('resident-bio.png')});await pawnTab(page,'social');
    await page.screenshot({path:info.outputPath('resident-social.png')});await pawnTab(page,'gear');
    await page.screenshot({path:info.outputPath('resident-gear.png')});await page.keyboard.press('Escape');
    await inspectPerson(page,prisoner.id,'prisoner');
    await expect(page.locator('#prisoner-mode')).toHaveValue(prisoner.prisoner!.mode);
    await page.screenshot({path:info.outputPath('prisoner.png')});await page.keyboard.press('Escape');
    const bench=initial.structures.find(s=>s.kind==='fabrication-bench')!;expect(bench).toBeDefined();
    const advancedBill=bench.bills?.find(b=>b.recipe==='make-advanced-component');expect(advancedBill).toBeDefined();
    for(let attempt=0;attempt<initial.pawns.length+mapObjectsAt(initial,bench).length+1;attempt++){
      await revealCells(page,[bench]);await cell(page,bench.x,bench.z);
      if(await page.locator(`[data-bill="${advancedBill!.id}"]`).isVisible())break;
    }
    await expect(page.locator(`[data-bill="${advancedBill!.id}"]`)).toBeVisible();
    await expect(page.locator('[data-add-recipe="make-advanced-component"]')).toBeEnabled();
    await page.screenshot({path:info.outputPath('advanced-industry.png')});await page.keyboard.press('Escape');
    await panel(page,'research');await page.screenshot({path:info.outputPath('research.png')});await page.keyboard.press('Escape');
    await panel(page,'world');await page.screenshot({path:info.outputPath('world.png')});await page.keyboard.press('Escape');
    await expectWorld(page,initial);
    for(const [speed,ticks] of [[1,80],[6,600]] as const){
      const before=await world(page);await page.locator(`[data-speed="${speed}"]`).click();
      await page.waitForFunction(target=>window.__lisiere.world.tick>=target,before.tick+ticks,{timeout:speed===6?60_000:45_000});await pause(page);
      const after=await world(page);expect(validateWorld(after)).toEqual([]);
      expect(residents(after).map(p=>p.id)).toEqual(residents(initial).map(p=>p.id));
      expect(residents(after).every(p=>p.state!=='dead')).toBe(true);
      expect(after.pawns.filter(p=>!!p.prisoner)).toHaveLength(1);
      expect(after.structures.filter(s=>s.kind==='mini-turret').every(s=>s.turret?.holdFire===false&&s.power?.on===true)).toBe(true);
      proof[`speed${speed}`]={before:before.tick,after:after.tick,jobs:after.jobs.length,people:residents(after).map(p=>({id:p.id,state:p.state}))};
    }
    const confirmed=await world(page);await panel(page,'menu');await page.locator('#save').click();
    await expect.poll(async()=>{
      const raw=await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey);
      return raw?storedSaveMetadata(raw)?.tick:null;
    }).toBe(confirmed.tick);
    const saved=await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey);
    expect(deserializeWorld(await decodeStoredSave(saved!))).toEqual(confirmed);
    await page.locator('#load').click();await expectWorld(page,confirmed);await page.keyboard.press('Escape');
    proof.savedTick=confirmed.tick;
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(target=>window.__lisiere.world.tick>=target,confirmed.tick+200,{timeout:30_000});await pause(page);
    const resumed=await world(page);expect(validateWorld(resumed)).toEqual([]);proof.finalTick=resumed.tick;
    expect(residents(resumed).every(p=>p.state!=='dead')).toBe(true);
    expect(await page.evaluate(()=>window.__lisiere.incident)).toEqual({simulationStopped:false,graphicsFault:false,waiting:0});
    expect(errors).toEqual([]);proof.complete=true;
  }catch(error){
    proof.failure=error instanceof Error?error.message:String(error);
    const last=await world(page).catch(()=>undefined);if(last)writeTestFileSync(info.outputPath('failure-world.json'),JSON.stringify(last));
    throw error;
  }finally{
    proof.errors=errors;proof.incident=await page.evaluate(()=>window.__lisiere.incident).catch(()=>undefined);
    await page.screenshot({path:info.outputPath('final-state.png')}).catch(()=>undefined);
    const proofPath=info.outputPath('proof.json');writeTestFileSync(proofPath,JSON.stringify(proof,null,2));
    await info.attach('advanced-colony-native-proof',{path:proofPath,contentType:'application/json'});
    await browser.close();
  }
});
