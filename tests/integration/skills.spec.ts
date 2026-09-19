import { expect,test } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { createWorld,serializeWorld,validateWorld } from '../../src/sim/index';
import { addGroundMaterial,refreshStock } from '../../src/sim/materials';
import { cell,expectWorld,observeErrors,panel,saveKey,tool,world } from './helpers';

test('skills: player chooses a builder, sees physical learning, pauses and reloads the exact profile',async({playwright})=>{
  test.setTimeout(70000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    const initial=createWorld(43,32,32);initial.tick=3000;initial.tiles=initial.tiles.map(()=>({terrain:'grass'}));initial.resources=[];initial.piles=[];initial.pawns=initial.pawns.slice(1,2);
    const p=initial.pawns[0]!;p.x=10;p.z=10;p.hunger=100;p.rest=100;p.recreation.level=100;p.schedule.fill('anything');
    addGroundMaterial(initial,'wood',45,{x:9,z:10},'wood');refreshStock(initial);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);
    await panel(page,'work');const control=page.locator(`[data-owner="${p.id}"][data-work="build"]`);await expect(control).toHaveAttribute('title',/Construction 10\/20/);
    await control.selectOption('1');await tool(page,'bed');await cell(page,11,10);
    await page.locator('[data-speed="1"]').click();await expect.poll(async()=>(await world(page)).pawns[0]!.skills.construction.xp).toBeGreaterThan(0);
    await page.locator('[data-speed="0"]').click();const working=await world(page);expect(working.jobs.some(j=>j.construction==='frame')).toBe(true);expect(validateWorld(working)).toEqual([]);
    await tool(page,'select');await page.locator(`[data-pawn="${p.id}"]`).click();await page.locator('.skills-inspection summary').click();
    await expect(page.locator('[data-skill="construction"]')).toContainText('Construction 10/20');await expect(page.locator('[data-skill-description]')).toContainText('Apprentissage 150 %');
    await expect(page.locator('#fps-counter')).toBeVisible();await page.screenshot({path:'artifacts/skills-construction.png'});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,working);
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).structures.some(s=>s.kind==='bed')).toBe(true);
    await page.locator('[data-speed="0"]').click();const final=await world(page);expect(final.pawns[0]!.skills.construction.xp).toBeGreaterThan(working.pawns[0]!.skills.construction.xp);expect(final.piles).toEqual([]);expect(validateWorld(final)).toEqual([]);expect(errors).toEqual([]);
    writeFileSync('artifacts/skills-ui-v43.json',JSON.stringify({date:new Date().toISOString(),backend:'native WebGPU',viewport:'1440x1000',checkpoint:working.pawns[0]!.skills,final:final.pawns[0]!.skills,bed:final.structures.find(s=>s.kind==='bed'),errors},null,2)+'\n');
  } finally {await browser.close();}
});
