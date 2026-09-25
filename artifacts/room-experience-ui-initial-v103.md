# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: room-experience.spec.ts >> pièces vécues : inspection, repas physique, souvenir dans Besoins et reprise worker
- Location: tests\integration\room-experience.spec.ts:8:1

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('#mood-inspection summary')
    - locator resolved to <summary>Pensées et humeur</summary>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    29 × waiting for element to be visible, enabled and stable
       - element is not visible
     - retrying click action
       - waiting 500ms

```

# Test source

```ts
  1  | import {expect,test} from '@playwright/test';
  2  | import {readFileSync} from 'node:fs';
  3  | import {deserializeWorld,serializeWorld,validateWorld} from '../../src/sim/serialization';
  4  | import {captureRoomQuality} from '../../src/sim/room-quality';
  5  | import {observeErrors,world,panel,cell,saveKey,expectWorld,pause,pawnTab} from './helpers';
  6  | import {revealCells} from './player-actions';
  7  | 
  8  | test('pièces vécues : inspection, repas physique, souvenir dans Besoins et reprise worker',async({playwright},testInfo)=>{
  9  |   test.setTimeout(90000);
  10 |   const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  11 |   const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  12 |   const errors=observeErrors(page);page.setDefaultTimeout(15000);
  13 |   try{
  14 |     const w=deserializeWorld(readFileSync('public/test-saves/v103/salles.json','utf8')),p=w.pawns[0]!;
  15 |     expect(validateWorld(w)).toEqual([]);expect(p.roomMemories).toBeUndefined();
  16 |     await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(w)});
  17 |     await page.goto('/?scenario=camp&size=32&e2e');await expect(page.locator('[data-speed="0"]')).toBeVisible();await expect(page.locator('#loading')).toHaveCount(0);
  18 |     await pause(page);await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,w);await page.keyboard.press('Escape');
  19 |     await revealCells(page,[{x:14,z:14}]);await cell(page,14,14);
  20 |     await page.locator('.cell-environment summary').click();
  21 |     const quality=captureRoomQuality(w).room({x:14,z:14})!;
  22 |     await expect(page.locator('#room-description')).toContainText(`Impression : ${quality.impressiveness.toFixed(1)}`);
  23 |     await expect(page.locator('#room-description')).toContainText(`Richesse : ${quality.wealth.toFixed(1)}`);
  24 |     await expect(page.locator('#room-description')).toContainText(`Espace : ${quality.space.toFixed(1)}`);
  25 |     await page.screenshot({path:'artifacts/room-quality-ui-v103.png'});
  26 |     await page.locator(`[data-pawn="${p.id}"]`).click();await pawnTab(page,'needs');
> 27 |     await page.locator('#mood-inspection summary').click();await expect(page.locator('[data-thought="room-dining"]')).toHaveCount(0);
     |                                                    ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  28 |     await page.locator('[data-speed="6"]').click();
  29 |     await expect.poll(async()=>(await world(page)).pawns[0]!.roomMemories?.some(m=>m.kind==='dining')??false,{timeout:20000}).toBe(true);
  30 |     await pause(page);const finished=await world(page);expect(validateWorld(finished)).toEqual([]);
  31 |     await expect(page.locator('[data-thought="room-dining"]')).toBeVisible();
  32 |     await expect(page.locator('[data-thought="room-dining"]')).toContainText('Salle du dernier repas');
  33 |     expect(finished.pawns[0]!.hunger).toBeGreaterThan(50);
  34 |     await page.screenshot({path:'artifacts/room-memory-ui-v103.png'});
  35 |     await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,finished);
  36 |     await page.keyboard.press('Escape');await page.locator(`[data-pawn="${p.id}"]`).click();await pawnTab(page,'needs');
  37 |     await expect(page.locator('[data-thought="room-dining"]')).toContainText('Salle du dernier repas');
  38 |     const backend=await page.evaluate(()=>window.__lisiere.backend);expect(backend).toContain('WebGPU');expect(errors).toEqual([]);
  39 |     await testInfo.attach('room-experience',{contentType:'application/json',body:JSON.stringify({backend,tick:finished.tick,memories:finished.pawns[0]!.roomMemories,quality,errors},(_key,value)=>value instanceof Set?[...value]:value)});
  40 |   }finally{await browser.close();}
  41 | });
  42 | 
```