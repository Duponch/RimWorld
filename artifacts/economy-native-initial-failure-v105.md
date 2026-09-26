# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: economy.spec.ts >> économie V105 : adoption historique, contact réel, vente de sculpture, argent et reprise exacte
- Location: tests\integration\economy.spec.ts:18:1

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('[data-speed="0"]')
    - locator resolved to <button data-speed="0" class="active" aria-label="Pause" aria-pressed="true" title="Pause · Espace">Ⅱ</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <dialog open="" id="trade-dialog" class="trade-dialog">…</dialog> intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <dialog open="" id="trade-dialog" class="trade-dialog">…</dialog> intercepts pointer events
    - retrying click action
      - waiting 100ms
    29 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <dialog open="" id="trade-dialog" class="trade-dialog">…</dialog> intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Test source

```ts
  1   | import { isBuildableFloor,type BuildableFloorKind } from '../../src/sim/flooring';
  2   | import { expect, test, type Page } from '@playwright/test';
  3   | import { isDeepStrictEqual } from 'node:util';
  4   | import { writeFile } from 'node:fs/promises';
  5   | import type { World } from '../../src/sim/types';
  6   | 
  7   | declare global {
  8   |   interface Window {
  9   |     __lisiere: { world: World; tick: number; backend: string; projectCell(x: number, z: number): { x: number; y: number }; projectPawn(id:number):{x:number;y:number;radius:number;depth:number}|undefined };
  10  |   }
  11  | }
  12  | 
  13  | // Transport one JSON string: tracing every tile as a remote object can dominate large maps.
  14  | export const serializedWorld = (page: Page): Promise<string> => page.evaluate(() => JSON.stringify(window.__lisiere.world));
  15  | export const world = async (page: Page): Promise<World> => JSON.parse(await serializedWorld(page)) as World;
  16  | /** Pause is an ordered worker command. A click alone does not prove that the
  17  |  * final snapshot is adopted; never capture a save oracle before this returns. */
  18  | export async function pause(page: Page): Promise<void> {
  19  |   const button=page.locator('[data-speed="0"]');
> 20  |   await button.click();await expect(button).toHaveAttribute('aria-pressed','true');
      |                ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  21  | }
  22  | export async function expectWorld(page: Page, expected: World) {
  23  |   // The pre-load snapshot can already equal expected: wait for replacement and
  24  |   // presentation to finish before comparing, otherwise the assertion is vacuous.
  25  |   await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false);
  26  |   const serialized = JSON.stringify(expected);
  27  |   // Preserve all values and array order. Object insertion order can differ
  28  |   // between a sparse delta and a checkpoint; it is not simulation state.
  29  |   let actual = serialized;
  30  |   try {
  31  |     await expect.poll(async () => {
  32  |       actual = await serializedWorld(page);
  33  |       return actual === serialized || isDeepStrictEqual(JSON.parse(actual), expected);
  34  |     }, {message: `État exact : graine ${expected.seed}, carte ${expected.width}×${expected.height}, tick ${expected.tick}, ${expected.jobs.length} ordre(s)`}).toBe(true);
  35  |     if(actual!==serialized)await test.info().attach('save-object-key-order',{contentType:'application/json',body:JSON.stringify({tick:expected.tick,semanticEquality:true})});
  36  |   } catch(error) {
  37  |     const path=test.info().outputPath('save-mismatch.json');
  38  |     await writeFile(path,JSON.stringify({expected,actual:JSON.parse(actual),notice:await page.locator('#notice').textContent()}));
  39  |     await test.info().attach('save-mismatch',{contentType:'application/json',path});
  40  |     throw error;
  41  |   }
  42  | }
  43  | export const saveKey = 'lisiere.save.v1';
  44  | 
  45  | export function observeErrors(page: Page): string[] {
  46  |   const errors: string[] = [];
  47  |   page.on('pageerror', error => errors.push(error.message));
  48  |   page.on('console', message => {
  49  |     if (message.type() === 'error' || /GPUValidationError|Error while parsing|invalid pipeline/i.test(message.text())) errors.push(message.text());
  50  |   });
  51  |   return errors;
  52  | }
  53  | 
  54  | export async function panel(page: Page, name: 'wildlife' | 'research' | 'architect' | 'work' | 'schedule' | 'assign' | 'menu') {
  55  |     // Snapshot adoption precedes GPU preparation and the closing of old panels.
  56  |     // Wait for the same interactive state a player needs, not just visibility.
  57  |     await expect(page.locator('.game-shell')).toHaveJSProperty('inert', false);
  58  |   if (!await page.locator(`#${name}-panel`).isVisible()) await page.locator(`[data-panel="${name}"]`).click();
  59  |   await expect(page.locator(`#${name}-panel`)).toBeVisible();
  60  | }
  61  | 
  62  | export type PawnInspectorTab = 'bio' | 'needs' | 'health' | 'gear' | 'social' | 'prisoner';
  63  | 
  64  | /** Open one real pawn-inspector tab and wait for its associated panel. */
  65  | export async function pawnTab(page: Page, tab: PawnInspectorTab): Promise<void> {
  66  |   const button = page.locator(`[data-colonist-tab="${tab}"]`);
  67  |   await expect(button).toBeVisible();
  68  |   if (await button.getAttribute('aria-selected') !== 'true') await button.click();
  69  |   await expect(button).toHaveAttribute('aria-selected', 'true');
  70  |   await expect(page.locator(`[data-colonist-panel="${tab}"]`)).toBeVisible();
  71  | }
  72  | 
  73  | export async function tool(page: Page, name: BuildableFloorKind|'remove-floor'|'grave'|'heater'|'wind-turbine'|'solar-generator'|'battery'|'power-conduit'|'power-switch'|'fueled-stove'|'electric-stove'|'butcher-table'|'butcher-spot'|'cooler'|'research-bench'|'tailor-bench'|'crafting-spot'|'home'|'remove-home'|'wood-generator'|'standing-lamp'|'passive-cooler'|'build-roof'|'remove-roof'|'ignore-roof'|'door' | 'stonecutter' | 'mine' | 'haul-chunks' | 'uninstall' | 'deconstruct' | 'select' | 'chop' | 'harvest' | 'cut' | 'cancel' | 'wall' | 'bed' | 'table' | 'horseshoes' | 'stool' | 'campfire' | 'stockpile' | 'remove-stockpile' | 'growing' | 'remove-growing') {
  74  |   await panel(page, 'architect');
  75  |   const category = isBuildableFloor(name)||name==='remove-floor'?'floors':name==='grave'?'furniture':name === 'wind-turbine' || name === 'solar-generator' || name === 'battery' || name === 'power-conduit' || name === 'power-switch' || name === 'wood-generator' ? 'power' : name === 'standing-lamp' ? 'furniture' : name === 'fueled-stove' || name === 'electric-stove' || name === 'butcher-table' || name === 'butcher-spot' || name === 'research-bench' || name === 'tailor-bench' || name === 'stonecutter' || name === 'crafting-spot' ? 'production' : name === 'horseshoes' ? 'recreation' : name === 'heater' || name === 'cooler' || name === 'campfire' || name === 'passive-cooler' ? 'temperature' : name === 'door' || name === 'wall' ? 'structure' : name === 'bed' || name === 'table' || name === 'stool' ? 'furniture' : name==='home'||name==='remove-home'||name === 'build-roof' || name === 'remove-roof' || name === 'ignore-roof' || name === 'stockpile' || name === 'remove-stockpile' || name === 'growing' || name === 'remove-growing' ? 'zones' : 'orders';
  76  |   await page.locator(`[data-category="${category}"]`).click();
  77  |   await page.locator(`[data-tool="${name}"]`).click();
  78  | }
  79  | 
  80  | /** Wheel/pan damping can continue after the target becomes visible. At map
  81  |  * overview a few screen pixels are a different cell. Observe stability before
  82  |  * acting, as a player does; do not disable damping or bypass the pointer path. */
  83  | export async function settledCells(page:Page,cells:{x:number;z:number}[]) {
  84  |   const sample=await page.evaluate(cells=>new Promise<{points:{x:number;y:number}[];shift:number;milliseconds:number}>((resolve,reject)=>{
  85  |     const project=()=>cells.map(c=>window.__lisiere.projectCell(c.x,c.z));
  86  |     const first=project(),start=performance.now();let previous=first,stable=0;
  87  |     const observe=()=>{const points=project(),now=performance.now();
  88  |       const delta=Math.max(...points.map((p,i)=>Math.hypot(p.x-previous[i]!.x,p.y-previous[i]!.y)));previous=points;
  89  |       stable=delta<.03?stable+1:0;
  90  |       if(stable>=3)resolve({points,shift:Math.max(...points.map((p,i)=>Math.hypot(p.x-first[i]!.x,p.y-first[i]!.y))),milliseconds:now-start});
  91  |       else if(now-start>2500)reject(new Error('Camera projection did not settle within 2500 ms.'));
  92  |       else requestAnimationFrame(observe);
  93  |     };requestAnimationFrame(observe);
  94  |   }),cells);
  95  |   if(process.env.CAMERA_TRACE==='1'&&sample.shift>.25)console.info(JSON.stringify({cameraSettlement:{cells,shift:sample.shift,milliseconds:sample.milliseconds}}));
  96  |   return sample.points;
  97  | }
  98  | export async function cell(page: Page, x: number, z: number) {
  99  |   const architect=page.locator('#architect-panel');
  100 |   if(await architect.isVisible())await architect.locator('[data-close-panel]').click();
  101 |   const [point] = await settledCells(page,[{x,z}]);
  102 |   const bounds = await page.locator('#viewport canvas').boundingBox();
  103 |   if (!bounds) throw new Error('Canvas absent');
  104 |   expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,{x:bounds.x+point!.x,y:bounds.y+point!.y}),'Cell click must reach the visible canvas.').toBe('CANVAS');
  105 |   await page.mouse.click(bounds.x + point!.x, bounds.y + point!.y);
  106 | }
  107 | export async function dragRectangle(page: Page, from: { x: number; z: number }, to: { x: number; z: number }, release = true) {
  108 |   const architect=page.locator('#architect-panel');
  109 |   if(await architect.isVisible())await architect.locator('[data-close-panel]').click();
  110 |   const points = await settledCells(page,[from,to]);
  111 |   const bounds = await page.locator('#viewport canvas').boundingBox();
  112 |   if (!bounds) throw new Error('Canvas absent');
  113 |   expect(await page.evaluate(({ points, bounds }) => points.map(point => document.elementFromPoint(bounds.x + point.x, bounds.y + point.y)?.tagName), { points, bounds }), 'Les extrémités du tracé doivent être sur la carte visible, hors panneaux.').toEqual(['CANVAS', 'CANVAS']);
  114 |   await page.mouse.move(bounds.x + points[0].x, bounds.y + points[0].y); await page.mouse.down();
  115 |   await page.mouse.move(bounds.x + points[1].x, bounds.y + points[1].y, { steps: 6 });
  116 |   if (release) await page.mouse.up();
  117 | }
  118 | 
  119 | export async function startPaused(page: Page) {
  120 |   await page.goto('/?scenario=camp&size=32&seed=42&e2e');
```