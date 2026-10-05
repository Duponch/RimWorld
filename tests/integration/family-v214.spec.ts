import { expect,test } from '@playwright/test';
import { familyDemoCouple,FAMILY_BED_CELLS,prepareFamilyDemo } from '../../scripts/create-family-v214-test-save.ts';
import { relationshipHousingThought } from '../../src/sim/relationship-housing.ts';
import { relationshipIndex } from '../../src/sim/relationship-runtime.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../../src/sim/serialization.ts';
import { writeTestFileSync } from '../test-output.ts';
import { cell,expectWorld,observeErrors,panel,pause,saveKey,tool,world } from './helpers.ts';
import { inspectPerson,revealCells } from './player-actions.ts';

const RELATIONSHIP_LABELS={parent:'Parent',child:'Enfant',sibling:'Fratrie'} as const;

test('V214 native future related offer, real admission, directed opinions, owned shared room and exact saved continuation',async({playwright},info)=>{
  test.setTimeout(100_000);const initial=prepareFamilyDemo(),browser=await playwright.chromium.launch({channel:'chromium',headless:true,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  page.setDefaultTimeout(15_000);const proof:Record<string,unknown>={complete:false,prepared:{tick:initial.tick,offer:initial.arrivals?.pending??null,couple:initial.relationships,bedOwners:initial.pawns.map(p=>p.bedId)}};
  try{
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await pause(page);
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    const hardware=await page.evaluate(async()=>{const a=await navigator.gpu?.requestAdapter(),i=a?.info;return {vendor:i?.vendor,architecture:i?.architecture,device:i?.device,description:i?.description,fallback:(i as unknown as {isFallbackAdapter?:boolean}|undefined)?.isFallbackAdapter??(a as unknown as {isFallbackAdapter?:boolean}|null)?.isFallbackAdapter??null};});
    expect(hardware.fallback).not.toBe(true);expect(JSON.stringify(hardware)).not.toMatch(/swiftshader|llvmpipe|lavapipe|software adapter|basic render driver/i);proof.hardware=hardware;
    await page.locator('[data-speed="1"]').click();await page.waitForFunction(()=>!!window.__lisiere.world.arrivals?.pending);await pause(page);
    const offered=await world(page),offer=offered.arrivals!.pending!,relative=offered.pawns.find(p=>p.id===offer.relationship!.otherId)!;
    expect(offer.relationship).toBeDefined();expect(offered.pawns).toHaveLength(3);expect(offered.relationships).toEqual(initial.relationships);proof.offer=offer;
    await page.locator('#arrival-letter').focus();await page.keyboard.press('Enter');const announcement=page.locator('[data-arrival-relationship]');
    await expect(announcement).toContainText(relative.name);await expect(announcement).toContainText(RELATIONSHIP_LABELS[offer.relationship!.kind]);
    await announcement.focus();await expect(page.locator('#game-tooltip')).toBeVisible();await expect(page.locator('#game-tooltip')).toContainText('entrée réelle');
    await page.keyboard.press('Escape');await expect(page.locator('#arrival-dialog')).toBeVisible();
    await page.locator('#accept-arrival').focus();await page.keyboard.press('Enter');await expect.poll(async()=>(await world(page)).pawns.length).toBe(4);
    const admitted=await world(page),joined=admitted.pawns.at(-1)!;expect(joined.id).toBe(initial.nextId);expect(joined.name).toBe(offer.name);
    expect(relationshipIndex(admitted).kinds(joined.id,relative.id)).toContain(offer.relationship!.kind);expect(joined.familyBereavement).toBeUndefined();proof.admitted={id:joined.id,links:admitted.relationships};
    await inspectPerson(page,joined.id,'social');const ownRow=page.locator(`#social-opinions [data-social-pawn="${relative.id}"]`);
    await expect(ownRow).toContainText(RELATIONSHIP_LABELS[offer.relationship!.kind]);await ownRow.locator('td').first().focus();await expect(page.locator('#game-tooltip')).toBeVisible();await expect(page.locator('#game-tooltip')).toContainText(RELATIONSHIP_LABELS[offer.relationship!.kind]);await page.keyboard.press('Escape');
    await inspectPerson(page,relative.id,'social');await expect(page.locator(`#social-opinions [data-social-pawn="${joined.id}"]`)).toContainText(joined.name);
    const [a,b]=familyDemoCouple(admitted);await inspectPerson(page,a.id,'needs');await expect(page.locator('[data-thought="want-shared-room"]')).toBeVisible();
    for(const [i,pawn] of [a,b].entries()){
      await page.keyboard.press('Escape');await tool(page,'select');const target=FAMILY_BED_CELLS[i]!;await revealCells(page,[target]);await cell(page,target.x,target.z);
      for(let attempt=0;attempt<=admitted.pawns.length&&!await page.locator('#bed-owner').isVisible();attempt++)await cell(page,target.x,target.z);
      await expect(page.locator('#bed-owner')).toBeVisible();await page.locator('#bed-owner').selectOption(String(pawn.id));
      await expect.poll(async()=>(await world(page)).pawns.find(p=>p.id===pawn.id)!.bedId).toBe(admitted.structures.find(s=>s.kind==='bed'&&s.x===target.x&&s.z===target.z)!.id);
    }
    const housed=await world(page);expect(relationshipHousingThought(housed,housed.pawns.find(p=>p.id===a.id)!)).toBeUndefined();expect(relationshipHousingThought(housed,housed.pawns.find(p=>p.id===b.id)!)).toBeUndefined();
    await inspectPerson(page,a.id,'needs');await expect(page.locator('[data-thought="want-shared-room"]')).toHaveCount(0);
    await inspectPerson(page,joined.id,'bio');await expect(page.locator('[data-relationship-list]')).toContainText(relative.name);
    await page.screenshot({path:info.outputPath('family-perspective.png')});await page.locator('#camera-mode').click();await expectWorld(page,housed);await page.screenshot({path:info.outputPath('family-isometric.png')});await page.locator('#camera-mode').click();
    await page.setViewportSize({width:1280,height:768});await inspectPerson(page,joined.id,'social');
    for(const speed of [0,1,3,6])expect(await page.locator(`[data-speed="${speed}"]`).evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===el;})).toBe(true);
    await panel(page,'menu');await page.locator('#save').click();await expect.poll(()=>page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey)).toBe(serializeWorld(housed));
    const raw=await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey);expect(deserializeWorld(raw!)).toEqual(housed);
    await page.locator('#load').click();await expectWorld(page,housed);await page.keyboard.press('Escape');
    expect(validateWorld(await world(page))).toEqual([]);expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false,waiting:0});
    proof.housing=[a,b].map(p=>({id:p.id,bedId:housed.pawns.find(x=>x.id===p.id)!.bedId}));proof.savedExact=true;proof.twoViews=true;proof.compact=true;proof.complete=true;
  }catch(error){proof.error=error instanceof Error?error.message:String(error);proof.incident=await page.evaluate(()=>window.__lisiere.incident).catch(()=>null);
    const last=await page.evaluate(()=>JSON.stringify(window.__lisiere.world)).catch(()=>null);if(last)writeTestFileSync(info.outputPath('last-world.json'),last);throw error;
  }finally{proof.errors=errors;writeTestFileSync(info.outputPath('proof.json'),JSON.stringify(proof,null,2));await info.attach('proof',{path:info.outputPath('proof.json'),contentType:'application/json'});await browser.close();}
});
