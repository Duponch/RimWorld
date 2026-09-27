import { expect,test } from '@playwright/test';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { HUMAN_YEAR_TICKS } from '../../src/sim/human-age';
import { createMedicalRecord } from '../../src/sim/injury-state';
import { medicalCamp } from '../scenarios/health';
import { observeErrors,panel,pawnTab,saveKey } from './helpers';

test('Bio and Santé show the same persisted biological age and chronic conditions',async({playwright})=>{
  test.setTimeout(70_000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page);
  try{
    const world=medicalCamp(1),pawn=world.pawns[0]!;
    pawn.age={biologicalTicks:76*HUMAN_YEAR_TICKS,chronologicalTicks:88*HUMAN_YEAR_TICKS};
    pawn.health=createMedicalRecord(world.tick);
    pawn.health.ageAilments=['bad-back','frail'];
    expect(validateWorld(world)).toEqual([]);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(world)});
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();
    await panel(page,'menu');await page.locator('#load').click();await page.keyboard.press('Escape');
    await page.locator(`[data-pawn="${pawn.id}"]`).click();
    await pawnTab(page,'bio');
    await expect(page.locator('[data-pawn-age]')).toHaveText('Âge : 76 ans (88 chronologiques)');
    await pawnTab(page,'health');
    await expect(page.locator('[data-health="injuries"]')).toContainText('Lumbago');
    await expect(page.locator('[data-health="injuries"]')).toContainText('Frêle');
    await expect(page.locator('[data-health="capacities"]')).toContainText('Mouvement');
    expect(errors).toEqual([]);
  }finally{await browser.close();}
});
