import {readFileSync} from 'node:fs';
import {expect,test} from '@playwright/test';
import {scoutDemoActors} from '../../scripts/generate-scout-demo-v182.ts';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {testOutputPath,writeTestFile} from '../test-output.ts';
import {expectWorld,observeErrors,panel,pause,world} from './helpers.ts';

test('V182 native menus load a prepared scout, play the physical roundtrip and resume the off-map owner',async({playwright})=>{
  test.setTimeout(180_000);
  const expected=deserializeWorld(readFileSync('public/test-saves/v182/reconnaissance-et-retour.json','utf8'));
  const actors=scoutDemoActors(expected);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page);
  try{
    await page.goto('/?e2e');
    const front=page.locator('.front-menu');
    await front.getByRole('button',{name:'Charger une partie',exact:true}).click();
    await front.getByRole('button',{name:'Colonies de test'}).click();
    await expect(front.locator('input[name="test-colony"]')).toHaveCount(36);
    await front.locator('input[name="test-colony"][value="reconnaissance-et-retour-v182"]').check();
    await front.getByRole('button',{name:'Charger cette colonie'}).click();
    await expectWorld(page,expected);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    await panel(page,'world');
    await page.locator('#scout-pawn').selectOption(String(actors.pawn.id));
    await page.locator('#scout-pile').selectOption(String(actors.pile.id));
    await page.locator('#scout-quantity').selectOption('3');
    await page.screenshot({path:testOutputPath('artifacts/scout-v182-ready.png')});
    await page.locator('#scout-start').click();
    await expect(page.locator('#scout-status')).toContainText('pour charger 3 repas au contact');
    const loading=await world(page);expect(loading.scout?.phase).toBe('loading');
    expect(loading.piles.find(p=>p.id===actors.pile.id)?.quantity).toBe(4);
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(()=>{
      if(window.__lisiere.world.scout?.phase!=='travelling')return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
    },undefined,{polling:50,timeout:20_000});
    await pause(page);
    const trip=await world(page);expect(trip.scout?.phase).toBe('travelling');
    if(!trip.scout||trip.scout.phase!=='travelling')throw Error('Trip not observed');
    expect(trip.pawns.some(p=>p.id===actors.pawn.id)).toBe(false);
    expect(trip.scout.pawn.id).toBe(actors.pawn.id);
    expect(validateWorld(trip)).toEqual([]);
    await expect(page.locator('#scout-status')).toContainText('hors carte');
    await page.screenshot({path:testOutputPath('artifacts/scout-v182-travelling.png')});
    await panel(page,'menu');await page.locator('#save').click();
    await page.locator('#load').click();await expectWorld(page,trip);
    await panel(page,'world');
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(id=>{
      const w=window.__lisiere.world;
      if(w.scout||!w.pawns.some(p=>p.id===id))return false;
      document.querySelector<HTMLButtonElement>('[data-speed="0"]')!.click();return true;
    },actors.pawn.id,{polling:50,timeout:80_000});
    await pause(page);
    const returned=await world(page);
    expect(validateWorld(returned)).toEqual([]);
    expect(returned.pawns.filter(p=>p.id===actors.pawn.id)).toHaveLength(1);
    const meals=returned.piles.filter(p=>p.item==='survival-meal').reduce((n,p)=>n+p.quantity,0);
    expect(meals).toBe(expected.piles.filter(p=>p.item==='survival-meal').reduce((n,p)=>n+p.quantity,0)-1);
    expect(returned.events.some(e=>e.message.includes('revient au bord'))).toBe(true);
    await page.screenshot({path:testOutputPath('artifacts/scout-v182-returned.png')});
    expect(errors).toEqual([]);
    writeTestFile(testOutputPath('artifacts/scout-v182-ui-proof.json'),JSON.stringify({backend:'native WebGPU',prepared:true,seed:expected.seed,map:[250,250],loaded:0,departedAt:trip.scout.departedAt,pausedTrip:trip.tick,returned:returned.tick,pawnId:actors.pawn.id,initialMeals:meals+1,remainingMeals:meals,errors},null,2));
  }finally{await browser.close();}
});
