import { testOutputPath } from '../test-output.ts';
import {test,expect} from '@playwright/test';
import {serializeWorld,validateWorld} from '../../src/sim/index';
import {medicalCamp} from '../scenarios/health';
import {createMedicalRecord,reconcileMedicalDeath} from '../../src/sim/injury-state';
import {reconcilePawnHealth} from '../../src/sim/health';
import {advanceHumanCorpses} from '../../src/sim/human-corpses';
import {CORPSE_DESSICATION_TICKS,CORPSE_ROT_TICKS,corpseStage} from '../../src/sim/corpses';
import {BLOOD_UNIT} from '../../src/sim/injury-rules';
import {addMaterial,refreshStock} from '../../src/sim/materials';
import {cell,expectWorld,observeErrors,panel,saveKey} from './helpers';
import {revealCells} from './player-actions';

test('three corpse appearances, centred shirt and thick object corners render in Chromium WebGPU',async({playwright})=>{
  test.setTimeout(90_000);
  const world=medicalCamp(4),spots=[{x:14,z:16},{x:16,z:16},{x:18,z:16}],shirt={x:16,z:19};
  world.pawns[3]!.x=25;world.pawns[3]!.z=25;
  for(const [index,pawn] of world.pawns.slice(0,3).entries()){
    Object.assign(pawn,spots[index]);
    pawn.health=createMedicalRecord(world.tick);pawn.health.bloodLoss=BLOOD_UNIT;
    reconcileMedicalDeath(pawn.health);reconcilePawnHealth(world,pawn);
  }
  advanceHumanCorpses(world);
  world.tick+=CORPSE_DESSICATION_TICKS+1;
  for(const [index,pawn] of world.pawns.slice(0,3).entries()){
    const pile=world.piles.find(p=>p.humanCorpse?.pawnId===pawn.id)!;
    pile.rot={progress:[0,CORPSE_ROT_TICKS,CORPSE_DESSICATION_TICKS][index]!,atTick:world.tick};
  }
  addMaterial(world,'apparel',1,{type:'ground',...shirt},'cloth-shirt');refreshStock(world);
  expect(world.pawns.slice(0,3).map(p=>corpseStage(world.piles.find(i=>i.humanCorpse?.pawnId===p.id)!,world.tick))).toEqual(['fresh','rotting','desiccated']);
  expect(validateWorld(world)).toEqual([]);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try{
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(world)});
    await page.goto('/?scenario=camp&size=32&seed=132&e2e');await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,world);
    await revealCells(page,[...spots,shirt]);
    // Bring the staged bodies close enough to judge the palette and silhouette.
    for(let attempt=0;attempt<4;attempt++){
      const distance=await page.evaluate(()=>{const a=window.__lisiere.projectCell(14,16),b=window.__lisiere.projectCell(18,16);return Math.hypot(a.x-b.x,a.y-b.y);});
      if(distance>330)break;
      const canvas=(await page.locator('#viewport canvas').boundingBox())!,focus=await page.evaluate(()=>window.__lisiere.projectCell(16,17));
      await page.mouse.move(canvas.x+focus.x,canvas.y+focus.y);await page.mouse.wheel(0,-420);await page.waitForTimeout(250);
    }
    await revealCells(page,[...spots,shirt]);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toMatch(/webgpu/i);
    await page.screenshot({path:testOutputPath('artifacts/corpse-ground-v132.png')});
    await cell(page,shirt.x,shirt.z);await expect(page.locator('#cell-title')).toHaveText('Chemise en tissu');
    await page.screenshot({path:testOutputPath('artifacts/corpse-ground-selection-v132.png')});
    expect(errors).toEqual([]);
  }finally{await browser.close();}
});
