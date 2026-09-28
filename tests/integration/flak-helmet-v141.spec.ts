import {expect,test} from '@playwright/test';
import {serializeWorld,validateWorld} from '../../src/sim/index';
import {addGroundMaterial,refreshStock} from '../../src/sim/materials';
import {newPowerState} from '../../src/sim/power-rules';
import {CLOTHING_RESEARCH_COST,FLAK_ARMOR_RESEARCH_COST,MACHINING_RESEARCH_COST,PLATE_ARMOR_RESEARCH_COST,SMITHING_RESEARCH_COST} from '../../src/sim/research';
import type {Structure} from '../../src/sim/types';
import {createMachiningFixture} from '../scenarios/machining-v101';
import {cell,expectWorld,observeErrors,panel,pause,saveKey,world} from './helpers';
import {perform,revealCells} from './player-actions';

test('casque V141 : facture visible et production réelle dans Chromium/WebGPU',async({playwright})=>{
  test.setTimeout(150000);
  const {world:initial,pawn}=createMachiningFixture();
  pawn.schedule.fill('work');pawn.hunger=100;pawn.rest=100;pawn.recreation.level=100;
  initial.research={project:null,points:CLOTHING_RESEARCH_COST,completedAt:1000,
    smithing:{points:SMITHING_RESEARCH_COST,completedAt:1001},machining:{points:MACHINING_RESEARCH_COST,completedAt:1002},
    plateArmor:{points:PLATE_ARMOR_RESEARCH_COST,completedAt:1003},flakArmor:{points:FLAK_ARMOR_RESEARCH_COST,completedAt:1004}};
  const station:Structure={id:initial.nextId++,kind:'machining-table',x:15,z:8,orientation:0,footprint:'standard',material:'steel',power:newPowerState('machining-table'),bills:[]};
  initial.structures.push(station);addGroundMaterial(initial,'plasteel',10,{x:9,z:13},'plasteel');refreshStock(initial);
  expect(validateWorld(initial)).toEqual([]);

  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  try{
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page);await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);
    await page.keyboard.press('Escape');await revealCells(page,[station]);await cell(page,station.x,station.z);
    await expect(page.locator('#add-bill-make-flak-helmet')).toBeEnabled();
    await page.locator('#add-bill-make-flak-helmet').click();
    await expect(page.locator('.bill-cost')).toContainText('40 acier · 2 composants · 10 plastacier');
    await page.keyboard.press('Escape');await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>window.__lisiere.world.piles.some(p=>p.item==='flak-helmet'&&p.owner.type==='ground'),undefined,{timeout:90000});
    await pause(page);
    const completed=await world(page),helmet=completed.piles.find(p=>p.item==='flak-helmet')!;
    expect(completed.piles.some(p=>p.item==='unfinished-flak-helmet')).toBe(false);
    expect(helmet.apparel?.hitPoints).toBe(120);
    expect(validateWorld(completed)).toEqual([]);
    await perform(page,{reason:'Enfiler le casque fabriqué.',command:{type:'order-equipment',pawnId:pawn.id,itemId:helmet.id,action:'wear',queue:false}},{value:0});
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).piles.find(p=>p.id===helmet.id)?.owner.type,{timeout:30000}).toBe('apparel');
    await pause(page);
    const worn=await world(page);expect(validateWorld(worn)).toEqual([]);
    await page.keyboard.press('Escape');await revealCells(page,[worn.pawns[0]!]);
    const point=await page.evaluate(id=>window.__lisiere.projectPawn(id),pawn.id);
    if(point){await page.mouse.move(point.x,point.y);await page.mouse.wheel(0,-1800);await page.waitForTimeout(600);}
    expect(await page.evaluate(()=>window.__lisiere.backend)).toContain('WebGPU');
    expect(errors).toEqual([]);
    await page.screenshot({path:test.info().outputPath('flak-helmet-v141.png')});
  }finally{await browser.close();}
});
