import { expect, type Page } from '@playwright/test';
import type { Decision } from '../scenarios/colony-player';
import type { BillSettings } from '../../src/sim/cooking-types';
import { world, panel, tool, cell, dragRectangle, settledCells } from './helpers';

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
  await settledCells(page,cells);
  await expect.poll(visible,{message:`Le joueur doit voir les cases visées : ${JSON.stringify(cells)}`}).toBe(true);
}

/** Inspect a visitor/captive using the same overlap cycling as the player. */
export async function inspectPerson(page:Page,id:number):Promise<void> {
  await page.keyboard.press('Escape');
  const w=await world(page),pawn=w.pawns.find(p=>p.id===id);if(!pawn)throw new Error('Personne à inspecter absente.');
  const portrait=page.locator(`[data-pawn="${id}"]`);
  if(await portrait.count()){await portrait.click();return;}
  await revealCells(page,[pawn]);
  for(let i=0;i<=w.pawns.length;i++) {
    // A person standing on a bed is above the floor click. Read the same
    // rendered body proxy used by pointer selection, then make a real click.
    const point=await page.evaluate(id=>window.__lisiere.projectPawn(id),id);
    if(!point)throw new Error(`La projection de ${pawn.name} est hors champ.`);
    expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,point),'Person click must reach the visible canvas.').toBe('CANVAS');
    await page.mouse.click(point.x,point.y);
    if(pawn.prisoner){if(await page.locator(`[data-prisoner-id="${id}"]`).isVisible())return;}
    else {const name=page.locator('#selected-name');if(await name.count()&&await name.textContent()===pawn.name)return;}
  }
  throw new Error(`La sélection corporelle de ${pawn.name} n’a pas atteint son inspection.`);
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
  let heaterTarget:number|undefined;
  if(c.type==='answer-arrival'){await page.locator('#arrival-letter').click();await page.locator(c.accept?'#accept-arrival':'#reject-arrival').click();await expect(page.locator('#arrival-dialog')).not.toBeVisible();await expect(page.locator('#arrival-letter')).toHaveCount(0);return;}
  if(c.type==='enable-arrivals'){await page.locator('#enable-arrivals').click();await expect(page.locator('#enable-arrivals')).toBeHidden();return;}
  if(c.type==='draft'||c.type==='draft-move'||c.type==='draft-stop') {
    await page.keyboard.press('Escape');
    for(const [i,id] of c.pawnIds.entries())await page.locator(`[data-pawn="${id}"]`).click({modifiers:i?['Shift']:[]});
    if(c.type==='draft') {
      const current=await world(page);if(c.pawnIds.some(id=>!!current.pawns.find(p=>p.id===id)?.draft!==c.enabled))await page.locator('#toggle-draft').click();
    } else if(c.type==='draft-stop')await page.locator('#stop-draft').click();
    else {
      await revealCells(page,[c.target]);const point=await page.evaluate(t=>window.__lisiere.projectCell(t.x,t.z),c.target),bounds=(await page.locator('#viewport canvas').boundingBox())!;
      if(c.queue)await page.keyboard.down('Shift');await page.mouse.click(bounds.x+point.x,bounds.y+point.y,{button:'right'});if(c.queue)await page.keyboard.up('Shift');
    }
  } else if(c.type==='hunt') {
    await panel(page,'wildlife');await page.locator(`[data-animal-hunt="${c.animalId}"]`).setChecked(c.enabled);
  } else if((c.type==='shoot'||c.type==='melee'&&!c.structure)&&(await world(page)).wildlife?.animals.some(a=>a.id===c.targetId)) {
    await page.keyboard.press('Escape');
    for(const [i,id] of c.pawnIds.entries())await page.locator(`[data-pawn="${id}"]`).click({modifiers:i?['Shift']:[]});
    await panel(page,'wildlife');await page.locator(`[data-animal-${c.type==='shoot'?'shoot':'melee'}="${c.targetId}"]`).click();
  } else if(c.type==='order-capture'||c.type==='order-equipment'||c.type==='order-feed'||c.type==='order-tend'||c.type==='order-rescue'||c.type==='order-job'||c.type==='order-haul'||c.type==='order-cook') {
    await page.keyboard.press('Escape');await page.locator(`[data-pawn="${c.pawnId}"]`).click();
    if(c.type==='order-equipment'&&c.action==='remove'){if(await page.locator('#equipment-details').getAttribute('open')===null)await page.locator('#equipment-details summary').click();await page.locator(`[data-remove-apparel="${c.itemId}"]`).click();return;}
    const current=await world(page);
    const job=c.type==='order-equipment'?((c.action==='equip'||c.action==='wear')?current.piles.find(p=>p.id===c.itemId)?.owner:current.pawns.find(p=>p.id===c.pawnId)):c.type==='order-capture'||c.type==='order-feed'||c.type==='order-tend'||c.type==='order-rescue'?current.pawns.find(p=>p.id===c.patientId):c.type==='order-cook'?current.structures.find(s=>s.id===c.structureId):c.type==='order-job'?current.jobs.find(j=>j.id===c.jobId):c.target.type==='furniture'?current.packed.find(p=>c.target.type==='furniture'&&p.building.id===c.target.structureId)?.owner:c.target.type==='fuel'?current.structures.find(s=>c.target.type==='fuel'&&s.id===c.target.structureId):c.target.type==='pile'?current.piles.find(p=>c.target.type==='pile'&&p.id===c.target.pileId)?.owner:current.jobs.find(j=>(c.target.type==='job'||c.target.type==='clear'||c.target.type==='clear-sow')&&j.id===c.target.jobId);
    if(!job||!('x' in job))throw new Error('Cible directe absente.');
    await revealCells(page,[job]);
    const point=await page.evaluate(({x,z})=>window.__lisiere.projectCell(x,z),job);
    const bounds=(await page.locator('#viewport canvas').boundingBox())!;
    if(c.queue)await page.keyboard.down('Shift');
    await page.mouse.click(bounds.x+point.x,bounds.y+point.y,{button:'right'});
    await page.locator(c.type==='order-capture'?`[data-order-capture="${c.patientId}"]`:c.type==='order-equipment'?`[data-order-equipment="${c.itemId}"]`:c.type==='order-feed'?`[data-order-feed="${c.patientId}"]`:c.type==='order-tend'?`[data-order-tend="${c.patientId}"]`:c.type==='order-rescue'?`[data-order-rescue="${c.patientId}"]`:c.type==='order-cook'?`[data-order-cook="${c.structureId}"]`:c.type==='order-job'?`[data-order-job="${c.jobId}"]:not([data-order-haul])`:`[data-order-haul="${c.target.type}"]`).click();
    if(c.queue)await page.keyboard.up('Shift');
  } else if(c.type==='growing-policy') {
    const w=await world(page),zone=w.growingZones.find(z=>z.id===c.zoneId);
    if(!zone?.cells.length)throw new Error('Zone de culture absente.');
    const target={x:zone.cells[0]!%w.width,z:Math.floor(zone.cells[0]!/w.width)};
    await tool(page,'select');await page.keyboard.press('Escape');await revealCells(page,[target]);
    for(let i=0;i<=w.pawns.length;i++){await cell(page,target.x,target.z);if(await page.locator('#growing-plant').isVisible())break;}
    if(c.plant)await page.locator('#growing-plant').selectOption(c.plant);
    await page.locator('#growing-allowSow').setChecked(c.allowSow);await page.locator('#growing-allowCut').setChecked(c.allowCut);
    await page.getByRole('button',{name:'Appliquer les réglages de culture'}).click();
  } else if(c.type==='prison-bed'||c.type==='medical-bed') {
    const w=await world(page),bed=w.structures.find(s=>s.id===c.bedId);if(!bed)throw new Error('Lit à configurer absent.');
    await page.keyboard.press('Escape');await revealCells(page,[bed]);
    for(let i=0;i<=w.pawns.length;i++){await cell(page,bed.x,bed.z);if(await page.locator('#cell-bed').isVisible())break;}
    await page.locator(c.type==='prison-bed'?'#bed-prisoner':'#bed-medical').setChecked(c.enabled);
  } else if(c.type==='prisoner-mode') {
    await inspectPerson(page,c.patientId);await page.locator('#prisoner-mode').selectOption(c.mode);
  } else if(c.type==='food-policy-assign') {
    if((await world(page)).pawns.find(p=>p.id===c.pawnId)?.prisoner){await inspectPerson(page,c.pawnId);await page.locator('#prisoner-food-policy').selectOption(String(c.policyId));}
    else {await panel(page,'assign'); await page.locator(`[data-food-policy-pawn="${c.pawnId}"]`).selectOption(String(c.policyId));}
  } else if(c.type==='schedule-paint') {
    await panel(page,'schedule'); await page.locator(`[data-schedule-brush="${c.assignment}"]`).click();
    for(const hour of c.hours) await page.locator(`[data-schedule-pawn="${c.pawnId}"][data-schedule-hour="${hour}"]`).click();
  } else if(c.type==='research-project') {
    await panel(page,'research');
    const prefix=c.project==='batteries'?'battery':c.project==='solar-power'?'solar':c.project==='air-conditioning'?'air':'research';
    await page.locator(c.project===null?'[data-research-pause]':`[data-${prefix}-start]`).click();
  } else if(c.type==='power-flick') {
    const w=await world(page),s=w.structures.find(s=>s.id===c.structureId)!;
    if((w.jobs.find(j=>j.flick?.structureId===s.id)?.flick?.on??(s.power?.switchOn!==false))===c.on)return;
    await page.keyboard.press('Escape');await revealCells(page,[s]);
    for(let i=0;i<=w.pawns.length;i++){await cell(page,s.x,s.z);if(await page.locator(`[data-power-id="${s.id}"]`).isVisible())break;}
    await page.locator(`[data-power-id="${s.id}"] [data-power-flick]`).click();
  } else if(c.type==='heater-adjust'||c.type==='wind-auto-cut') {
    const w=await world(page),s=w.structures.find(s=>s.id===c.structureId);if(!s)throw Error('Ouvrage électrique absent.');
    await page.keyboard.press('Escape');await revealCells(page,[s]);
    for(let i=0;i<=w.pawns.length;i++){await cell(page,s.x,s.z);if(await page.locator(`[data-power-id="${s.id}"]`).isVisible())break;}
    const card=page.locator(`[data-power-id="${s.id}"]`);
    if(c.type==='heater-adjust'){
      heaterTarget=c.offset===null?21:Math.max(-273.15,Math.min(1000,s.heater!.target+c.offset));
      await card.locator(`[data-heater-offset="${String(c.offset)}"]`).click();
    } else await card.locator('[data-wind-auto-cut]').setChecked(c.enabled);
  } else if(c.type==='order-extinguish') {
    const w=await world(page),fire=w.fires?.items.find(f=>f.id===c.fireId);if(!fire)throw Error('Incendie absent.');
    await page.keyboard.press('Escape');await page.locator(`[data-pawn="${c.pawnId}"]`).click();await revealCells(page,[fire]);
    const point=await page.evaluate(f=>window.__lisiere.projectCell(f.x,f.z),fire),bounds=(await page.locator('#viewport canvas').boundingBox())!;
    await page.mouse.click(bounds.x+point.x,bounds.y+point.y,{button:'right'});await page.locator(`[data-order-fire="${c.fireId}"]`).click();
  } else if(c.type==='priority') {
    await panel(page,'work');await page.locator(`select[data-owner="${c.pawnId}"][data-work="${c.work}"]`).selectOption(String(c.value));
  } else if(c.type==='stockpile') {
    await tool(page,'stockpile');
    await storageSettings(page,c);
    await revealCells(page,[c]);
    await cell(page,c.x,c.z);
  } else if(c.type==='area') {
    await tool(page,c.action);
    if(c.action==='stockpile'&&c.filters)await storageSettings(page,c);
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
  } else if(c.type==='designate' && (c.kind==='deconstruct'||c.kind==='uninstall') && c.targetId!==undefined) {
    const w=await world(page),target=w.structures.find(s=>s.id===c.targetId)!;
    await page.keyboard.press('Escape');await revealCells(page,[target]);
    const button=target.kind==='power-conduit'?`[data-power-id="${target.id}"] [data-power-remove]`:c.kind==='uninstall'?'#cell-uninstall':'#cell-deconstruct';
    for(let i=0;i<=w.pawns.length;i++){await cell(page,target.x,target.z);if(await page.locator(button).isVisible())break;}
    await page.locator(button).click();
  } else if(c.type==='designate' && c.kind !== 'flick' && c.kind !== 'sow' && c.kind !== 'install') {
    if(c.kind==='repair')throw Error('Repair uses the home area');await tool(page,c.kind);
    if(['door','wall','bed','table','stool','horseshoes','stonecutter','research-bench','tailor-bench'].includes(c.kind))await page.locator('#construction-material').selectOption(c.material??'wood');
    if(c.kind==='wind-turbine'||c.kind==='battery'||c.kind==='fueled-stove'||c.kind==='electric-stove'||c.kind==='butcher-table'||c.kind==='cooler'||c.kind==='bed'||c.kind==='table'||c.kind==='campfire'||(c.kind==='butcher-spot'||c.kind==='crafting-spot')||c.kind==='stonecutter'||c.kind==='research-bench'||c.kind==='tailor-bench') {
      while(rotation.value!==(c.orientation??0)){await page.keyboard.press('e');rotation.value=(rotation.value+1)%4;}
    }
    await revealCells(page,[c]);
    await cell(page,c.x,c.z);
  } else if(c.type==='bill-add'||c.type==='bill-update') {
    const w=await world(page),station=w.structures.find(s=>s.id===c.structureId)!;
    await page.keyboard.press('Escape');await revealCells(page,[station]);
    // As for furniture installation, an overlapping pawn can be selected first.
    // Cycle the real pointer selection until the station is inspected.
    for(let i=0;i<=w.pawns.length;i++){await cell(page,station.x,station.z);if(await page.locator('#add-cooking-bill').isVisible())break;}
    await expect(page.locator('#add-cooking-bill')).toBeVisible();
    if(c.type==='bill-add')await page.locator('#add-cooking-bill').click();
    else await editBill(page,c.billId,c.settings);
  } else throw new Error(`Player UI action not supported: ${c.type}`);
  try { await page.waitForFunction(({command:c,heaterTarget})=>{
    const w=window.__lisiere.world;
    if(c.type==='growing-policy'){const z=w.growingZones.find(z=>z.id===c.zoneId);return !!z&&(!c.plant||z.plant===c.plant)&&z.allowSow===c.allowSow&&z.allowCut===c.allowCut;}
    if(c.type==='hunt')return !!w.hunting?.targets.includes(c.animalId)===c.enabled;
    if(c.type==='melee')return c.pawnIds.every(id=>w.pawns.find(p=>p.id===id)?.melee?.order?.targetId===c.targetId);
    if(c.type==='shoot')return c.pawnIds.every(id=>w.pawns.find(p=>p.id===id)?.shooting?.order?.targetId===c.targetId);
    if(c.type==='draft')return c.pawnIds.every(id=>!!w.pawns.find(p=>p.id===id)?.draft===c.enabled);
    if(c.type==='draft-stop')return c.pawnIds.every(id=>w.pawns.find(p=>p.id===id)?.draft?.target===null);
    if(c.type==='draft-move')return c.pawnIds.every(id=>{const d=w.pawns.find(p=>p.id===id)?.draft;return c.queue?!!d?.queue.length:!!d?.target;});
    if(c.type==='order-equipment')return w.pawns.some(p=>p.id===c.pawnId&&p.equipmentTask?.itemId===c.itemId)||w.piles.some(p=>p.id===c.itemId&&(c.action==='equip'?p.owner.type==='equipment'&&p.owner.pawnId===c.pawnId:p.owner.type==='ground'));
    if(c.type==='order-feed')return w.pawns.some(p=>p.id===c.pawnId&&p.feed?.patientId===c.patientId);
    if(c.type==='order-tend')return w.pawns.some(p=>p.id===c.pawnId&&p.tend?.patientId===c.patientId);
    if(c.type==='order-rescue')return w.pawns.find(p=>p.id===c.pawnId)?.rescue?.patientId===c.patientId;
    if(c.type==='order-capture')return w.pawns.find(p=>p.id===c.pawnId)?.rescue?.patientId===c.patientId;
    if(c.type==='prison-bed')return !!w.structures.find(s=>s.id===c.bedId)?.prisoner===c.enabled;
    if(c.type==='medical-bed')return !!w.structures.find(s=>s.id===c.bedId)?.medical===c.enabled;
    if(c.type==='prisoner-mode')return w.pawns.find(p=>p.id===c.patientId)?.prisoner?.mode===c.mode;
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
    if(c.type==='research-project')return w.research?.project===c.project;
    if(c.type==='power-flick'){const s=w.structures.find(s=>s.id===c.structureId);return !!s&&(w.jobs.find(j=>j.flick?.structureId===s.id)?.flick?.on??(s.power?.switchOn!==false))===c.on;}
    if(c.type==='heater-adjust')return w.structures.find(s=>s.id===c.structureId)?.heater?.target===heaterTarget;
    if(c.type==='wind-auto-cut')return w.structures.find(s=>s.id===c.structureId)?.wind?.autoCut===c.enabled;
    if(c.type==='order-extinguish')return w.pawns.find(p=>p.id===c.pawnId)?.firefighting?.fireId===c.fireId;
    if(c.type==='priority')return w.pawns.find(p=>p.id===c.pawnId)?.priorities[c.work]===c.value;
    if(c.type==='bill-add')return !!w.structures.find(s=>s.id===c.structureId)?.bills?.length;
    if(c.type==='bill-update') {const b=w.structures.find(s=>s.id===c.structureId)?.bills?.find(b=>b.id===c.billId);return !!b&&b.mode===c.settings.mode&&b.target===c.settings.target&&b.suspended===c.settings.suspended;}
    if(c.type==='area') {
      if(c.action==='build-roof'||c.action==='remove-roof'||c.action==='ignore-roof') {
        for(let z=Math.min(c.from.z,c.to.z);z<=Math.max(c.from.z,c.to.z);z++)for(let x=Math.min(c.from.x,c.to.x);x<=Math.max(c.from.x,c.to.x);x++) {
          const index=z*w.width+x,build=w.roofing?.build.includes(index)??false,remove=w.roofing?.remove.includes(index)??false;
          if(c.action==='build-roof'?!build||remove:c.action==='remove-roof'?!remove||build:build||remove)return false;
        }
        return true;
      }
      if(c.action==='stockpile'){for(let z=Math.min(c.from.z,c.to.z);z<=Math.max(c.from.z,c.to.z);z++)for(let x=Math.min(c.from.x,c.to.x);x<=Math.max(c.from.x,c.to.x);x++){const s=w.stockpiles.find(s=>s.x===x&&s.z===z);if(!s||c.filters&&Object.entries(s.filters).some(([k,v])=>!!v!==!!c.filters![k as keyof typeof c.filters]))return false;}return true;}
      if(c.action==='deconstruct')return w.jobs.some(j=>j.kind==='deconstruct');
      if(c.action==='haul-chunks')return w.piles.some(p=>p.kind==='chunk'&&p.haulRequested&&p.owner.type==='ground'&&p.owner.x>=Math.min(c.from.x,c.to.x)&&p.owner.x<=Math.max(c.from.x,c.to.x)&&p.owner.z>=Math.min(c.from.z,c.to.z)&&p.owner.z<=Math.max(c.from.z,c.to.z));
      if(c.action==='mine')return w.jobs.some(j=>j.kind==='mine'&&j.x>=Math.min(c.from.x,c.to.x)&&j.x<=Math.max(c.from.x,c.to.x)&&j.z>=Math.min(c.from.z,c.to.z)&&j.z<=Math.max(c.from.z,c.to.z));
      return w.growingZones.length>0;
    }
    if(c.type==='stockpile')return w.stockpiles.some(s=>s.x===c.x&&s.z===c.z);
    if(c.type==='designate'&&(c.kind==='butcher-spot'||c.kind==='crafting-spot'))return w.structures.some(s=>s.kind===c.kind&&s.x===c.x&&s.z===c.z);
    return c.type==='designate' && w.jobs.some(j=>j.x===c.x&&j.z===c.z&&j.kind===c.kind&&(!c.material||j.material===c.material)&&(!c.targetId||(j.deconstruction??j.furniture)?.structureId===c.targetId));
  },{command:c,heaterTarget},{polling:100,timeout:5000});
  } catch(error) {
    const diagnostic=await page.evaluate(()=>({tick:window.__lisiere.tick,notice:document.querySelector('#notice')?.textContent,stockpiles:window.__lisiere.world.stockpiles,events:window.__lisiere.world.events.slice(-5),tool:document.querySelector('[data-tool].active')?.getAttribute('data-tool')}));
    await page.screenshot({path:'artifacts/player-action-failure.png'});
    throw new Error(`Player command did not produce its expected result: ${JSON.stringify({command:c,diagnostic})}; ${String(error)}`);
  }
}

async function storageSettings(page:Page,c:import('../../src/sim/types').StorageSettings):Promise<void>{
    await page.locator('#stockpile-corpse').setChecked(c.filters!.corpse??false);await page.locator('#stockpile-textile').setChecked(c.filters!.textile??false);await page.locator('#stockpile-unfinished').setChecked(c.filters!.unfinished??false);await page.locator('#stockpile-apparel').setChecked(c.filters!.apparel??false);await page.locator('#stockpile-weapon').setChecked(c.filters!.weapon??false);await page.locator('#stockpile-medicine').setChecked(c.filters!.medicine??false);await page.locator('#stockpile-component').setChecked(c.filters!.component??false);await page.locator('#stockpile-blocks').setChecked(c.filters!.blocks??false);await page.locator('#stockpile-steel').setChecked(c.filters!.steel??false);await page.locator('#stockpile-chunk').setChecked(c.filters!.chunk??false);await page.locator('#stockpile-wood').setChecked(c.filters!.wood);await page.locator('#stockpile-food').setChecked(c.filters!.food);await page.locator('#stockpile-furniture').setChecked(c.filters!.furniture??false);
    await page.locator('#stockpile-priority').selectOption(String(c.priority??2));await page.locator('#stockpile-capacity').fill(String(c.capacity??75));
}
