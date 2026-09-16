import { expect, type Page } from '@playwright/test';
import type { Decision } from '../scenarios/colony-player';
import type { BillSettings } from '../../src/sim/cooking-types';
import { world, panel, tool, cell, dragRectangle } from './helpers';

export async function revealCells(page:Page,cells:{x:number;z:number}[]):Promise<void> {
  const visible=()=>page.evaluate(cells=>{
    const bounds=document.querySelector('#viewport canvas')!.getBoundingClientRect();
    return cells.every(c=>{const p=window.__lisiere.projectCell(c.x,c.z);return document.elementFromPoint(bounds.x+p.x,bounds.y+p.y)?.tagName==='CANVAS';});
  },cells);
  for(let attempt=0;attempt<6&&!await visible();attempt++) {
    await page.mouse.move(900,350);await page.mouse.wheel(0,300);
    // Let the camera's damped wheel movement settle before projecting again.
    await page.waitForTimeout(200);
  }
  // A player pans when the next outcrop lies outside the maximum zoom span.
  // Use the actual middle-button gesture and screen feedback, not a camera API.
  for(let attempt=0;attempt<6&&!await visible();attempt++) {
    const center=await page.evaluate(cells=>{
      const b=document.querySelector('#viewport canvas')!.getBoundingClientRect();
      const points=cells.map(c=>window.__lisiere.projectCell(c.x,c.z));
      return {x:b.x+points.reduce((n,p)=>n+p.x,0)/points.length,y:b.y+points.reduce((n,p)=>n+p.y,0)/points.length};
    },cells);
    const dx=Math.max(-300,Math.min(300,900-center.x)),dy=Math.max(-200,Math.min(200,350-center.y));
    await page.mouse.move(900,350);await page.mouse.down({button:'middle'});
    await page.mouse.move(900+dx,350+dy,{steps:8});await page.mouse.up({button:'middle'});await page.waitForTimeout(200);
  }
  await expect.poll(visible,{message:`Le joueur doit voir les cases visées : ${JSON.stringify(cells)}`}).toBe(true);
}

export async function editBill(page:Page,id:number,settings:BillSettings):Promise<void> {
  const form=page.locator(`[data-bill="${id}"]`);
  await form.locator('[data-field="mode"]').selectOption(settings.mode);
  await form.locator('[data-field="target"]').fill(String(settings.target));
  await form.locator('[data-field="suspended"]').setChecked(settings.suspended);
  if(await form.locator('details').getAttribute('open')===null)await form.locator('summary').click();
  for(const [item,allowed] of Object.entries(settings.filters))await form.locator(`[data-field="${item}"]`).setChecked(allowed===true);
  await form.locator('[data-field="radius"]').fill(String(settings.radius));
  await form.locator('[data-field="destination"]').selectOption(settings.destination);
  await form.locator(`[data-apply-bill="${id}"]`).click();
}

export async function perform(page: Page, decision: Decision, rotation: { value: number }): Promise<void> {
  const c=decision.command;
  if(c.type==='order-rescue'||c.type==='order-job'||c.type==='order-haul'||c.type==='order-cook') {
    await page.keyboard.press('Escape');await page.locator(`[data-pawn="${c.pawnId}"]`).click();
    const current=await world(page);
    const job=c.type==='order-rescue'?current.pawns.find(p=>p.id===c.patientId):c.type==='order-cook'?current.structures.find(s=>s.id===c.structureId):c.type==='order-job'?current.jobs.find(j=>j.id===c.jobId):c.target.type==='furniture'?current.packed.find(p=>c.target.type==='furniture'&&p.building.id===c.target.structureId)?.owner:c.target.type==='fuel'?current.structures.find(s=>c.target.type==='fuel'&&s.id===c.target.structureId):c.target.type==='pile'?current.piles.find(p=>c.target.type==='pile'&&p.id===c.target.pileId)?.owner:current.jobs.find(j=>(c.target.type==='job'||c.target.type==='clear'||c.target.type==='clear-sow')&&j.id===c.target.jobId);
    if(!job||!('x' in job))throw new Error('Cible directe absente.');
    await revealCells(page,[job]);
    const point=await page.evaluate(({x,z})=>window.__lisiere.projectCell(x,z),job);
    const bounds=(await page.locator('#viewport canvas').boundingBox())!;
    if(c.queue)await page.keyboard.down('Shift');
    await page.mouse.click(bounds.x+point.x,bounds.y+point.y,{button:'right'});
    await page.locator(c.type==='order-rescue'?`[data-order-rescue="${c.patientId}"]`:c.type==='order-cook'?`[data-order-cook="${c.structureId}"]`:c.type==='order-job'?`[data-order-job="${c.jobId}"]:not([data-order-haul])`:`[data-order-haul="${c.target.type}"]`).click();
    if(c.queue)await page.keyboard.up('Shift');
  } else if(c.type==='food-policy-assign') {
    await panel(page,'assign'); await page.locator(`[data-food-policy-pawn="${c.pawnId}"]`).selectOption(String(c.policyId));
  } else if(c.type==='schedule-paint') {
    await panel(page,'schedule'); await page.locator(`[data-schedule-brush="${c.assignment}"]`).click();
    for(const hour of c.hours) await page.locator(`[data-schedule-pawn="${c.pawnId}"][data-schedule-hour="${hour}"]`).click();
  } else if(c.type==='priority') {
    await panel(page,'work');await page.locator(`select[data-owner="${c.pawnId}"][data-work="${c.work}"]`).selectOption(String(c.value));
  } else if(c.type==='stockpile') {
    await tool(page,'stockpile');
    await page.locator('#stockpile-component').setChecked(c.filters!.component??false);await page.locator('#stockpile-blocks').setChecked(c.filters!.blocks??false);await page.locator('#stockpile-steel').setChecked(c.filters!.steel??false);await page.locator('#stockpile-chunk').setChecked(c.filters!.chunk??false);await page.locator('#stockpile-wood').setChecked(c.filters!.wood);await page.locator('#stockpile-food').setChecked(c.filters!.food);await page.locator('#stockpile-furniture').setChecked(c.filters!.furniture??false);
    await page.locator('#stockpile-priority').selectOption(String(c.priority??2));await page.locator('#stockpile-capacity').fill(String(c.capacity??75));
    await revealCells(page,[c]);
    await cell(page,c.x,c.z);
  } else if(c.type==='area') {
    await tool(page,c.action);
    await revealCells(page,[c.from,c.to]);
    await dragRectangle(page,c.from,c.to);
  } else if(c.type==='install') {
    const w=await world(page),object=w.structures.find(s=>s.id===c.structureId),pack=w.packed.find(p=>p.building.id===c.structureId);
    const source=object??(pack?.owner.type==='ground'?pack.owner:undefined);if(!source)throw new Error('Furniture source not on map');
    await page.keyboard.press('Escape');await revealCells(page,[source]);
    // An overlapping colonist can be the first selection; cycle like a player.
    for(let i=0;i<=w.pawns.length;i++){await cell(page,source.x,source.z);if(await page.locator('#cell-install').isVisible())break;}
    await page.locator('#cell-install').click({timeout:5000});rotation.value=(object??pack!.building).orientation;
    while(rotation.value!==c.orientation){await page.keyboard.press('e');rotation.value=(rotation.value+1)%4;}
    await revealCells(page,[c]);await cell(page,c.x,c.z);
  } else if(c.type==='designate' && c.kind !== 'sow' && c.kind !== 'install') {
    await tool(page,c.kind);
    if(['door','wall','bed','table','stool','horseshoes','stonecutter'].includes(c.kind))await page.locator('#construction-material').selectOption(c.material??'wood');
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
    if(c.type==='order-rescue')return w.pawns.find(p=>p.id===c.pawnId)?.rescue?.patientId===c.patientId;
    if(c.type==='install')return w.jobs.some(j=>j.kind==='install'&&j.furniture?.structureId===c.structureId&&j.x===c.x&&j.z===c.z);
    if(c.type==='order-job'){const pawn=w.pawns.find(p=>p.id===c.pawnId);return pawn?.orders.active===c.jobId||pawn?.orders.queue.includes(c.jobId);}
    if(c.type==='order-cook') {const pawn=w.pawns.find(p=>p.id===c.pawnId);return pawn?.orders.active==='cook'&&pawn.cooking?.stationId===c.structureId||pawn?.orders.active==='haul'&&pawn.haul?.destination.type==='fuel'&&pawn.haul.destination.structureId===c.structureId||pawn?.orders.queue.some(o=>typeof o!=='number'&&('cooking' in o?o.cooking.stationId===c.structureId:o.destination.type==='fuel'&&o.destination.structureId===c.structureId));}
    if(c.type==='order-haul') {
      const pawn=w.pawns.find(p=>p.id===c.pawnId);if(!pawn)return false;
      const matches=(t:typeof pawn.haul)=>!!t&&(c.target.type==='furniture'?t.whole&&t.sourcePileId===c.target.structureId:c.target.type==='pile'?t.sourcePileId===c.target.pileId:c.target.type==='fuel'?t.destination.type==='fuel'&&t.destination.structureId===c.target.structureId:c.target.type==='clear-sow'?t.destination.type==='aside'&&t.destination.sowCell?.x===w.jobs.find(j=>c.target.type==='clear-sow'&&j.id===c.target.jobId)?.x:c.target.type==='clear'?t.destination.type==='aside'&&t.destination.constructionId===c.target.jobId:t.destination.type==='job'&&t.destination.jobId===c.target.jobId);
      return pawn.orders.active==='haul'&&matches(pawn.haul)||pawn.orders.queue.some(o=>typeof o!=='number'&&!('cooking' in o)&&matches(o));
    }
    if(c.type==='food-policy-assign')return w.pawns.find(p=>p.id===c.pawnId)?.foodPolicyId===c.policyId;
    if(c.type==='schedule-paint')return c.hours.every(h=>w.pawns.find(p=>p.id===c.pawnId)?.schedule[h]===c.assignment);
    if(c.type==='priority')return w.pawns.find(p=>p.id===c.pawnId)?.priorities[c.work]===c.value;
    if(c.type==='bill-add')return !!w.structures.find(s=>s.id===c.structureId)?.bills?.length;
    if(c.type==='bill-update') {const b=w.structures.find(s=>s.id===c.structureId)?.bills?.find(b=>b.id===c.billId);return !!b&&b.mode===c.settings.mode&&b.target===c.settings.target&&b.suspended===c.settings.suspended;}
    if(c.type==='area') {
      if(c.action==='deconstruct')return w.jobs.some(j=>j.kind==='deconstruct');
      if(c.action==='haul-chunks')return w.piles.some(p=>p.kind==='chunk'&&p.haulRequested&&p.owner.type==='ground'&&p.owner.x>=Math.min(c.from.x,c.to.x)&&p.owner.x<=Math.max(c.from.x,c.to.x)&&p.owner.z>=Math.min(c.from.z,c.to.z)&&p.owner.z<=Math.max(c.from.z,c.to.z));
      if(c.action==='mine')return w.jobs.some(j=>j.kind==='mine'&&j.x>=Math.min(c.from.x,c.to.x)&&j.x<=Math.max(c.from.x,c.to.x)&&j.z>=Math.min(c.from.z,c.to.z)&&j.z<=Math.max(c.from.z,c.to.z));
      return w.growingZones.length>0;
    }
    if(c.type==='stockpile')return w.stockpiles.some(s=>s.x===c.x&&s.z===c.z);
    return c.type==='designate' && w.jobs.some(j=>j.x===c.x&&j.z===c.z&&j.kind===c.kind&&(!c.material||j.material===c.material));
  },c,{polling:100,timeout:5000});
}
