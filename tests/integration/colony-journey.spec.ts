import { expect, test, type Page } from '@playwright/test';
import type { Decision } from '../scenarios/colony-player';
import { playerDecisions, colonySummary, woodAccount, foodAccount } from '../scenarios/colony-player';
import { validateWorld } from '../../src/sim/index';
import { world, observeErrors, panel, tool, cell, dragRectangle, expectWorld } from './helpers';

// Full tracing recorded ~500 MB during a stalled run. Keep compact checkpoints
// and an explicit final screenshot here; the short journeys retain full traces.
test.use({trace:'off'});
async function waitForTick(page:Page,tick:number):Promise<void> {
  let timer:ReturnType<typeof setTimeout>|undefined;
  try {
    await Promise.race([
      page.waitForFunction(t=>window.__lisiere.tick>=t,tick,{polling:1000,timeout:30000}),
      new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error(`Browser stopped responding while advancing to tick ${tick}; inspect hourly-world attachments.`)),35000);}),
    ]);
  } finally {clearTimeout(timer);}
}

async function perform(page: Page, decision: Decision, rotation: { value: number }): Promise<void> {
  const c=decision.command;
  if(c.type==='priority') {
    await panel(page,'work');await page.locator(`select[data-owner="${c.pawnId}"][data-work="${c.work}"]`).selectOption(String(c.value));
  } else if(c.type==='stockpile') {
    await tool(page,'stockpile');
    await page.locator('#stockpile-wood').setChecked(c.filters!.wood);await page.locator('#stockpile-food').setChecked(c.filters!.food);
    await cell(page,c.x,c.z);
  } else if(c.type==='area') {
    await tool(page,c.action);
    // Like a player, zoom out so the new field clears the Architect panel.
    await page.mouse.move(900,400);await page.mouse.wheel(0,400);
    await expect.poll(async()=>page.evaluate(({from,to})=>[from,to].every(c=>{const p=window.__lisiere.projectCell(c.x,c.z),b=document.querySelector('#viewport canvas')!.getBoundingClientRect();return document.elementFromPoint(b.x+p.x,b.y+p.y)?.tagName==='CANVAS';}),c)).toBe(true);
    await dragRectangle(page,c.from,c.to);
  } else if(c.type==='designate' && c.kind !== 'sow') {
    await tool(page,c.kind);
    if(c.kind==='bed'||c.kind==='table') {
      while(rotation.value!==(c.orientation??0)){await page.keyboard.press('e');rotation.value=(rotation.value+1)%4;}
    }
    await cell(page,c.x,c.z);
  } else throw new Error(`Player UI action not supported: ${c.type}`);
  await page.waitForFunction(c=>{
    const w=window.__lisiere.world;
    if(c.type==='priority')return w.pawns.find(p=>p.id===c.pawnId)?.priorities[c.work]===c.value;
    if(c.type==='area')return w.growingZones.length>0;
    if(c.type==='stockpile')return w.stockpiles.some(s=>s.x===c.x&&s.z===c.z);
    return c.type==='designate' && w.jobs.some(j=>j.x===c.x&&j.z===c.z&&j.kind===c.kind);
  },c,{polling:100,timeout:5000});
}

test('partie de trois jours : un joueur équipe son camp et entretient ses stocks par la vraie interface', async ({playwright},testInfo)=>{
  test.setTimeout(480000);
  // Hardware WebGPU; the dedicated boundary journey still covers software fallback.
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page), decisions:{tick:number;reason:string;command:unknown}[]=[], days:ReturnType<typeof colonySummary>[]=[];
  const harvests=new Map<string,number>(), meals=new Map<string,number>(), sleepers=new Set<number>();let finalReport:unknown;
  try {
    // No injected fixture, inventory, clocks or simulation speed outside the UI.
    await page.goto('/?e2e&seed=42');await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();await expect(page.locator('#pause-banner')).toBeVisible();
    const initial=await world(page);expect(initial.width).toBe(250);expect(initial.stock).toEqual({wood:12,food:18});
    expect(initial.foodRules).toBe('adult');
    expect(initial.piles.filter(p=>p.kind==='food').map(p=>[p.item,p.quantity])).toEqual([['survival-meal',10],['survival-meal',8]]);
    await expect(page.locator('#food-items [data-item="survival-meal"] strong')).toHaveText('18');
    await expect(page.locator('#food-items [data-item="legacy-portion"]')).toBeHidden();
    const initialWood=woodAccount(initial), initialFood=foodAccount(initial);const rotation={value:0};
    for(let hour=0;hour<=72;hour+=4) {
      if(hour) {
        await page.locator('[data-speed="6"]').click();
        await waitForTick(page,initial.tick+hour*250);
        await page.locator('[data-speed="0"]').click();await expect(page.locator('#pause-banner')).toBeVisible();
      }
      const current=await world(page), summary=colonySummary(current), context=JSON.stringify(summary);
      await testInfo.attach(`hourly-world-${hour}`,{contentType:'application/json',body:JSON.stringify(current)});
      expect(validateWorld(current),context).toEqual([]);expect(woodAccount(current),context).toBe(initialWood);
      expect(current.pawns.every(p=>p.hunger>0&&p.rest>0),context).toBe(true);
      for(const e of current.events)if(e.type==='need'&&e.message.includes('a mangé une portion'))meals.set(`${e.tick}:${e.message}`,Number(e.message.match(/portion \((\d+) /)?.[1] ?? 0));
      for(const e of current.events) {const match=e.message.match(/a récolté (\d+) (?:baies|riz)/);if(match)harvests.set(`${e.tick}:${e.message}`,Number(match[1]));}
      for(const p of current.pawns)if(p.state==='sleeping'&&p.need?.kind==='sleep'&&p.need.bedId!==null)sleepers.add(p.id);
      if(hour && hour%24===0) {
        days.push(summary);
        await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,current);
      }
      if(hour===72) {
        expect(summary.structures,context).toEqual({bed:3,table:1,stool:3,wall:6});expect(current.jobs.filter(j=>j.growingZoneId===undefined),context).toEqual([]);expect(current.resources.filter(r=>r.kind==='rice').length,context).toBeGreaterThan(5);
        expect(current.stock.food,context).toBeGreaterThan(0);expect(sleepers.size,context).toBe(3);
        expect(meals.size,context).toBeGreaterThanOrEqual(18);expect(foodAccount(current)+[...meals.values()].reduce((a,b)=>a+b,0),context).toBe(initialFood+[...harvests.values()].reduce((a,b)=>a+b,0));
        expect(current.piles.filter(p=>p.kind==='food').every(p=>p.item==='berries'||p.item==='survival-meal')).toBe(true);
        finalReport={backend:await page.evaluate(()=>window.__lisiere.backend),days,meals:meals.size,sleepers:sleepers.size,woodConserved:true,foodReconciled:true,decisions,errors};
        break;
      }
      for(const decision of playerDecisions(current)) {
        await test.step(`${decision.reason} ${JSON.stringify(decision.command)}`,()=>perform(page,decision,rotation));
        decisions.push({tick:current.tick,...decision});
      }
    }
    await page.keyboard.press('Escape');await page.screenshot({path:'artifacts/colony-three-days.png'});
    expect(errors).toEqual([]);
    await testInfo.attach('colony-journey',{contentType:'application/json',body:JSON.stringify(finalReport)});
  } finally {
    if(!finalReport)await testInfo.attach('colony-journey-incomplete',{contentType:'application/json',body:JSON.stringify({days,decisions,meals:[...meals],errors})});
    // A frozen renderer must not hold the test worker indefinitely in teardown.
    let timer:ReturnType<typeof setTimeout>|undefined;
    try {await Promise.race([browser.close(),new Promise<void>(resolve=>{timer=setTimeout(resolve,5000);})]);}
    finally {clearTimeout(timer);}
  }
});
