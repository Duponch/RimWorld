import { expect, type Page } from '@playwright/test';
import type { Decision } from '../scenarios/colony-player';
import type { BillSettings } from '../../src/sim/cooking-types';
import { world, panel, tool, cell, dragRectangle } from './helpers';

async function revealCells(page:Page,cells:{x:number;z:number}[]):Promise<void> {
  const visible=()=>page.evaluate(cells=>{
    const bounds=document.querySelector('#viewport canvas')!.getBoundingClientRect();
    return cells.every(c=>{const p=window.__lisiere.projectCell(c.x,c.z);return document.elementFromPoint(bounds.x+p.x,bounds.y+p.y)?.tagName==='CANVAS';});
  },cells);
  for(let attempt=0;attempt<6&&!await visible();attempt++) {
    await page.mouse.move(900,350);await page.mouse.wheel(0,300);
    // Let the camera's damped wheel movement settle before projecting again.
    await page.waitForTimeout(200);
  }
  await expect.poll(visible,{message:`Le joueur doit voir les cases visées : ${JSON.stringify(cells)}`}).toBe(true);
}

export async function editBill(page:Page,id:number,settings:BillSettings):Promise<void> {
  const form=page.locator(`[data-bill="${id}"]`);
  await form.locator('[data-field="mode"]').selectOption(settings.mode);
  await form.locator('[data-field="target"]').fill(String(settings.target));
  await form.locator('[data-field="suspended"]').setChecked(settings.suspended);
  if(await form.locator('details').getAttribute('open')===null)await form.locator('summary').click();
  await form.locator('[data-field="rice"]').setChecked(settings.filters.rice);
  await form.locator('[data-field="berries"]').setChecked(settings.filters.berries);
  await form.locator('[data-field="radius"]').fill(String(settings.radius));
  await form.locator('[data-field="destination"]').selectOption(settings.destination);
  await form.locator(`[data-apply-bill="${id}"]`).click();
}

export async function perform(page: Page, decision: Decision, rotation: { value: number }): Promise<void> {
  const c=decision.command;
  if(c.type==='order-job') {
    await page.keyboard.press('Escape');await page.locator(`[data-pawn="${c.pawnId}"]`).click();
    const job=(await world(page)).jobs.find(j=>j.id===c.jobId);if(!job)throw new Error('Travail direct absent.');
    await revealCells(page,[job]);
    const point=await page.evaluate(({x,z})=>window.__lisiere.projectCell(x,z),job);
    const bounds=(await page.locator('#viewport canvas').boundingBox())!;
    if(c.queue)await page.keyboard.down('Shift');
    await page.mouse.click(bounds.x+point.x,bounds.y+point.y,{button:'right'});
    await page.locator(`[data-order-job="${c.jobId}"]`).click();
    if(c.queue)await page.keyboard.up('Shift');
    await expect.poll(async()=>{const pawn=(await world(page)).pawns.find(p=>p.id===c.pawnId)!;return pawn.orders.active===c.jobId||pawn.orders.queue.includes(c.jobId);}).toBe(true);
  } else if(c.type==='food-policy-assign') {
    await panel(page,'assign'); await page.locator(`[data-food-policy-pawn="${c.pawnId}"]`).selectOption(String(c.policyId));
  } else if(c.type==='schedule-paint') {
    await panel(page,'schedule'); await page.locator(`[data-schedule-brush="${c.assignment}"]`).click();
    for(const hour of c.hours) await page.locator(`[data-schedule-pawn="${c.pawnId}"][data-schedule-hour="${hour}"]`).click();
  } else if(c.type==='priority') {
    await panel(page,'work');await page.locator(`select[data-owner="${c.pawnId}"][data-work="${c.work}"]`).selectOption(String(c.value));
  } else if(c.type==='stockpile') {
    await tool(page,'stockpile');
    await page.locator('#stockpile-wood').setChecked(c.filters!.wood);await page.locator('#stockpile-food').setChecked(c.filters!.food);
    await revealCells(page,[c]);
    await cell(page,c.x,c.z);
  } else if(c.type==='area') {
    await tool(page,c.action);
    await revealCells(page,[c.from,c.to]);
    await dragRectangle(page,c.from,c.to);
  } else if(c.type==='designate' && c.kind !== 'sow') {
    await tool(page,c.kind);
    if(c.kind==='bed'||c.kind==='table'||c.kind==='campfire') {
      while(rotation.value!==(c.orientation??0)){await page.keyboard.press('e');rotation.value=(rotation.value+1)%4;}
    }
    await revealCells(page,[c]);
    await cell(page,c.x,c.z);
  } else if(c.type==='bill-add'||c.type==='bill-update') {
    const station=(await world(page)).structures.find(s=>s.id===c.structureId)!;
    await page.keyboard.press('Escape');await revealCells(page,[station]);await cell(page,station.x,station.z);
    await expect(page.locator('#add-cooking-bill')).toBeVisible();
    if(c.type==='bill-add')await page.locator('#add-cooking-bill').click();
    else await editBill(page,c.billId,c.settings);
  } else throw new Error(`Player UI action not supported: ${c.type}`);
  await page.waitForFunction(c=>{
    const w=window.__lisiere.world;
    if(c.type==='order-job'){const pawn=w.pawns.find(p=>p.id===c.pawnId);return pawn?.orders.active===c.jobId||pawn?.orders.queue.includes(c.jobId);}
    if(c.type==='food-policy-assign')return w.pawns.find(p=>p.id===c.pawnId)?.foodPolicyId===c.policyId;
    if(c.type==='schedule-paint')return c.hours.every(h=>w.pawns.find(p=>p.id===c.pawnId)?.schedule[h]===c.assignment);
    if(c.type==='priority')return w.pawns.find(p=>p.id===c.pawnId)?.priorities[c.work]===c.value;
    if(c.type==='bill-add')return !!w.structures.find(s=>s.id===c.structureId)?.bills?.length;
    if(c.type==='bill-update') {const b=w.structures.find(s=>s.id===c.structureId)?.bills?.find(b=>b.id===c.billId);return !!b&&b.mode===c.settings.mode&&b.target===c.settings.target&&b.suspended===c.settings.suspended;}
    if(c.type==='area')return w.growingZones.length>0;
    if(c.type==='stockpile')return w.stockpiles.some(s=>s.x===c.x&&s.z===c.z);
    return c.type==='designate' && w.jobs.some(j=>j.x===c.x&&j.z===c.z&&j.kind===c.kind);
  },c,{polling:100,timeout:5000});
}
