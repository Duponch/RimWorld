import {readFileSync} from 'node:fs';
import {expect,test} from '@playwright/test';
import {deserializeWorld,serializeWorld,validateWorld} from '../../src/sim/serialization';
import {expectWorld,observeErrors,panel,pawnTab,pause,saveKey,world} from './helpers';

test('V127: inspecter la grippe, soigner avec une dose physique et reprendre',async({playwright})=>{
  test.setTimeout(120_000);
  const initial=deserializeWorld(readFileSync(new URL('../../public/test-saves/v127/grippe.json',import.meta.url),'utf8'));
  const patient=initial.pawns[1]!,doctor=initial.pawns[2]!;
  const before=initial.piles.filter(p=>p.item==='medicine').reduce((n,p)=>n+p.quantity,0);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page);
  try {
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page);
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    await page.locator(`[data-pawn="${patient.id}"]`).click();await pawnTab(page,'health');
    await expect(page.locator('[data-health="flu"]')).toContainText('Grippe majeure');
    await expect(page.locator('[data-health="flu"]')).toContainText('immunité');
    await expect(page.locator('[data-health="flu"]')).toContainText('Nouveau soin possible');
    // Le médecin attend que les deux patients rejoignent les lits réels.
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===patient.id)?.health?.flu?.tend,{timeout:30000}).toBeDefined();
    await pause(page);
    const treated=await world(page);
    expect(validateWorld(treated)).toEqual([]);
    const treatedCases=treated.pawns.slice(0,2).filter(p=>p.health?.flu?.tend).length;
    expect(treated.piles.filter(p=>p.item==='medicine').reduce((n,p)=>n+p.quantity,0)).toBe(before-treatedCases);
    expect(treated.pawns.find(p=>p.id===patient.id)?.health?.flu?.tend?.quality).toBeGreaterThan(0);
    expect(treated.pawns.find(p=>p.id===doctor.id)?.skills.medicine.xp).toBeGreaterThan(doctor.skills.medicine.xp);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,treated);await page.keyboard.press('Escape');
    await page.locator(`[data-pawn="${patient.id}"]`).click();await pawnTab(page,'health');
    await expect(page.locator('[data-health="flu"]')).toContainText('Soin actif');
    expect(errors).toEqual([]);
    await page.screenshot({path:test.info().outputPath('flu-v127-treated.png')});
  } finally {await browser.close();}
});
