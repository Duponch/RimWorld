import {readFileSync} from 'node:fs';
import {expect,test} from '@playwright/test';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {cell,expectWorld,observeErrors,panel,pause,pawnTab,saveKey,world} from './helpers';
import {revealCells} from './player-actions';

test('V124 : deux colons rejoignent la table, le point se désactive dans la fiche',async({playwright})=>{
  test.setTimeout(90_000);
  const raw=readFileSync(new URL('../../public/test-saves/v124/rencontre.json',import.meta.url),'utf8');
  const prepared=deserializeWorld(raw);
  expect(validateWorld(prepared)).toEqual([]);
  const table=prepared.structures.find(s=>s.kind==='table'&&s.x===18&&s.z===15)!;
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page);
  try{
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:raw});
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page);
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,prepared);
    await page.locator(`[data-pawn="${prepared.pawns[0]!.id}"]`).click();
    await pawnTab(page,'needs');
    await expect(page.locator('#recreation-tolerance')).toContainText('Loisirs sociaux');
    await revealCells(page,[table]);await cell(page,table.x,table.z);
    await expect(page.locator('#cell-gather-spot')).toBeVisible();
    await expect(page.locator('#cell-gather-spot')).toHaveAttribute('aria-pressed','true');
    await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>window.__lisiere.world.pawns.length===2
      &&window.__lisiere.world.pawns.every(p=>p.recreation.task?.activity==='social-relax'
        &&p.recreation.task.phase==='active'&&p.recreation.tolerance.social>0),undefined,{timeout:30_000});
    await pause(page);
    const playing=await world(page);
    expect(new Set(playing.pawns.map(p=>p.recreation.task?.seatId)).size).toBe(2);
    expect(validateWorld(playing)).toEqual([]);
    await cell(page,table.x,table.z);
    await page.locator('#cell-gather-spot').click();
    await expect(page.locator('#cell-gather-spot')).toHaveAttribute('aria-pressed','false');
    await page.waitForFunction(id=>window.__lisiere.world.structures.find(s=>s.id===id)?.gatherSpot===false
      &&window.__lisiere.world.pawns.every(p=>p.recreation.task===null),table.id);
    expect(validateWorld(await world(page))).toEqual([]);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toContain('WebGPU');
    expect(errors).toEqual([]);
    await page.screenshot({path:test.info().outputPath('social-v124.png')});
  }finally{await browser.close();}
});
