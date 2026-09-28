import { testOutputPath } from '../test-output.ts';
import {expect,test} from '@playwright/test';
import {createWorld} from '../../src/sim/engine';
import {newDoorState} from '../../src/sim/door-rules';
import {refreshStock} from '../../src/sim/materials';
import {serializeWorld,validateWorld} from '../../src/sim/serialization';
import type {Structure} from '../../src/sim/types';
import {cell,expectWorld,observeErrors,panel,pause,saveKey,world} from './helpers';
import {revealCells} from './player-actions';

test('enclos V119 : marqueur, filtre réel, sauvegarde et rendu WebGPU',async({playwright})=>{
  test.setTimeout(60000);
  const prepared=createWorld(731,32,32);
  prepared.tiles=prepared.tiles.map(()=>({terrain:'grass'}));
  prepared.resources=[];prepared.jobs=[];prepared.structures=[];
  const add=(kind:Structure['kind'],x:number,z:number)=>{
    const s:Structure={id:prepared.nextId++,kind,x,z,orientation:0,footprint:'standard',material:'wood'};
    if(kind==='fence-gate')s.door=newDoorState(prepared.tick);
    if(kind==='pen-marker')s.pen={accepted:['deer','gazelle','muffalo','dromedary']};
    prepared.structures.push(s);return s;
  };
  for(let x=21;x<=25;x++){add('fence',x,21);add('fence',x,25);}
  for(let z=22;z<25;z++){add(z===23?'fence-gate':'fence',21,z);add('fence',25,z);}
  const marker=add('pen-marker',23,23);refreshStock(prepared);
  expect(validateWorld(prepared)).toEqual([]);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page);page.setDefaultTimeout(15000);
  try{
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(prepared)});
    await page.goto('/?scenario=camp&size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await pause(page);
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,prepared);
    await revealCells(page,[{x:23,z:23}]);await cell(page,23,23);
    await expect(page.locator('#pen-controls')).toBeVisible();
    await expect(page.locator('#pen-controls [data-pen-state]')).toContainText('fermé et accessible');
    await expect(page.locator('#pen-controls [data-pen-species="muffalo"]')).toBeChecked();
    await page.locator('#pen-controls [data-pen-species="muffalo"]').uncheck();
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===marker.id)?.pen?.accepted.includes('muffalo')).toBe(false);
    const changed=await world(page);expect(validateWorld(changed)).toEqual([]);
    await page.screenshot({path:testOutputPath('artifacts/husbandry-v119.png')});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,changed);
    expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.backend)).toContain('WebGPU');
  }finally{await browser.close();}
});
