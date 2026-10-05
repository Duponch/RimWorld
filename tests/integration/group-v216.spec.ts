import {expect,test,type Page} from '@playwright/test';
import {prepareGroupScenario} from '../../src/sim/group-scenario.ts';
import {groupTradeQuote} from '../../src/sim/group-authority.ts';
import type {GroupState} from '../../src/sim/group-state.ts';
import type {World} from '../../src/sim/types.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {writeTestFileSync} from '../test-output.ts';
import {expectWorld,observeErrors,panel,pause,saveKey,world} from './helpers.ts';
import {inspectPerson} from './player-actions.ts';

type AwayGroup=Extract<GroupState,{members:unknown}>;
function away(w:World):AwayGroup {
  if(!w.group||!('members' in w.group))throw Error('Le groupe hors carte attendu est absent.');
  return w.group;
}
function itemTotal(w:World,item:string):number {
  return [...w.piles,...(w.group&&'items' in w.group?w.group.items:[]),...(w.civilianPost?.stock??[])]
    .filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
}
async function groupPanel(page:Page):Promise<void> {
  await panel(page,'world');await page.locator('#world-tab-group').click();
  await expect(page.locator('[data-group-panel]')).toBeVisible();
}
async function action(page:Page,name:string):Promise<void> {
  const button=page.locator(`[data-group-action="${name}"]`);
  await expect(button).toHaveAttribute('aria-disabled','false');await button.click();
}
async function paint(page:Page):Promise<void> {
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
}
/** Real SVG hit-testing and pointer selection. Rotations change only the view;
 * no hidden selection, forced click or model mutation bypasses the globe. */
async function selectTile(page:Page,id:number):Promise<void> {
  const svg=page.locator('.planet-view svg');await svg.scrollIntoViewIfNeeded();await svg.focus();
  for(let turn=0;turn<54;turn++){
    await paint(page);
    const point=await page.locator(`[data-planet-tile="${id}"]`).evaluate(el=>{
      const path=el as SVGPathElement,d=path.getAttribute('d');if(!d||getComputedStyle(path).display==='none')return null;
      const values=d.match(/-?\d+(?:\.\d+)?/g)?.map(Number);if(!values||values.length<6)return null;
      let x=0,y=0;for(let i=0;i<values.length;i+=2){x+=values[i]!;y+=values[i+1]!;}
      const matrix=path.getScreenCTM();if(!matrix)return null;
      const p=new DOMPoint(x/(values.length/2),y/(values.length/2)).matrixTransform(matrix);
      return document.elementFromPoint(p.x,p.y)?.closest('[data-planet-tile]')===path?{x:p.x,y:p.y}:null;
    });
    if(point){await page.mouse.click(point.x,point.y);await expect(page.locator('[data-planet-selection]')).toHaveValue(String(id));return;}
    await page.keyboard.press('ArrowRight');
  }
  throw Error(`La case ${id} n'a pas offert de surface SVG accessible après une rotation complète.`);
}
async function saveAndReload(page:Page):Promise<World> {
  await pause(page);const before=await world(page),raw=serializeWorld(before);
  // Ctrl+S remains usable while the geographic keyboard scope owns focus.
  await groupPanel(page);await page.locator('.planet-view svg').focus();await page.keyboard.press('Control+s');
  await expect.poll(()=>page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey)).toBe(raw);
  const saved=await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey);
  expect(deserializeWorld(saved!)).toEqual(before);
  await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,before);await page.keyboard.press('Escape');
  return before;
}
async function twoCameras(page:Page,w:World,prefix:string,output:(name:string)=>string):Promise<void> {
  await page.keyboard.press('Escape');await inspectPerson(page,w.pawns[0]!.id,'gear');
  await page.screenshot({path:output(`${prefix}-perspective.png`)});
  await page.locator('#camera-mode').click();await expectWorld(page,w);
  await page.screenshot({path:output(`${prefix}-isometric.png`)});
  await page.locator('#camera-mode').click();await expectWorld(page,w);await page.keyboard.press('Escape');
}

test('V216 native globe, two original travellers, physical loading, saved segment, finite sale and purchase, collective return',async({playwright},info)=>{
  // Full real travel includes its night and terrain costs. The producer probe
  // must certify this scene before root runs the native case; no elapsed-time
  // oracle replaces the confirmed formation/route/return boundaries below.
  test.setTimeout(480_000);
  const initial=prepareGroupScenario(),memberIds=initial.pawns.slice(0,2).map(p=>p.id),residentId=initial.pawns[2]!.id;
  expect(validateWorld(initial)).toEqual([]);expect(initial.planet).toBeUndefined();expect(initial.group).toBeUndefined();expect(initial.civilianPost).toBeUndefined();
  const sources:{pileId:number;quantity:number}[]=[];let food=12;
  for(const pile of initial.piles.filter(p=>p.item==='survival-meal'&&p.owner.type==='ground').sort((a,b)=>a.id-b.id)){
    // Match the certified producer protocol: three distinct real sources,
    // four rations at each contact, never a prepared inventory transfer.
    const quantity=Math.min(food,4,pile.quantity);if(quantity)sources.push({pileId:pile.id,quantity});food-=quantity;
  }
  expect(food).toBe(0);expect(sources.map(line=>line.quantity)).toEqual([4,4,4]);
  for(const item of ['silver','cloth'] as const)for(const pile of initial.piles.filter(p=>p.item===item&&p.owner.type==='ground'))sources.push({pileId:pile.id,quantity:pile.quantity});
  const originalApparel=initial.piles.filter(p=>p.owner.type==='apparel'&&memberIds.includes(p.owner.pawnId));
  const browser=await playwright.chromium.launch({channel:'chromium',headless:true,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  page.setDefaultTimeout(15_000);const proof:Record<string,unknown>={complete:false,prepared:{tick:initial.tick,memberIds,residentId,sources,notice:'No planet, loading, journey or transaction was played in the preparation.'}};
  try{
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await pause(page);
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    const hardware=await page.evaluate(async()=>{const a=await navigator.gpu?.requestAdapter(),i=a?.info;return {vendor:i?.vendor,architecture:i?.architecture,device:i?.device,description:i?.description,fallback:(i as unknown as {isFallbackAdapter?:boolean}|undefined)?.isFallbackAdapter??(a as unknown as {isFallbackAdapter?:boolean}|null)?.isFallbackAdapter??null};});
    expect(hardware.fallback).not.toBe(true);expect(JSON.stringify(hardware)).not.toMatch(/swiftshader|llvmpipe|lavapipe|software adapter|basic render driver/i);proof.hardware=hardware;
    await twoCameras(page,initial,'before-departure',name=>info.outputPath(name));
    await groupPanel(page);await expectWorld(page,initial);await action(page,'adopt');
    await page.waitForFunction(()=>!!window.__lisiere.world.planet);const adopted=await world(page),planet=adopted.planet!;
    expect(adopted.tick).toBe(initial.tick);expect(adopted.rng).toBe(initial.rng);expect(adopted.nextId).toBe(initial.nextId);expect(adopted.pawns).toEqual(initial.pawns);expect(adopted.piles).toEqual(initial.piles);
    expect(planet.tiles).toHaveLength(162);expect(await page.locator('.planet-view svg *').count()).toBeLessThan(512);
    expect(await page.locator('#viewport canvas').count()).toBe(1);
    const geography=JSON.stringify(planet.tiles);
    await page.locator('#world-tab-individual').click();await expect(page.locator('#scout-content')).toBeVisible();await expect(page.locator('#commercial-content')).toBeVisible();await page.locator('#world-tab-group').click();
    await page.locator('.planet-view svg').focus();await page.keyboard.press('ArrowRight');await paint(page);await expectWorld(page,adopted);
    // Native Tab/Space stays within the DOM work surface, preserving the
    // paused simulation instead of invoking global speed/pawn shortcuts.
    const first=page.locator(`[data-group-member="${memberIds[0]}"] input[type="checkbox"]`);
    await first.focus();await page.keyboard.press('Space');await expect(first).toBeChecked();await page.keyboard.press('Tab');
    await expect(page.locator(`[data-group-member="${memberIds[0]}"] button`)).toBeFocused();
    await page.locator(`[data-group-member="${memberIds[1]}"] input[type="checkbox"]`).check();
    await expect(page.locator(`[data-group-member="${residentId}"] input[type="checkbox"]`)).not.toBeChecked();
    for(const line of sources)await page.locator(`[data-group-pile="${line.pileId}"] input[aria-label^="Charger "]`).fill(String(line.quantity));
    await selectTile(page,planet.civilianTile);await expectWorld(page,adopted);
    await page.locator('[data-group-preview="formation"]').click();await expect(page.locator('[data-group-route]')).toContainText('Route proposée');await expectWorld(page,adopted);
    await page.setViewportSize({width:1280,height:768});
    for(const speed of [0,1,3,6])expect(await page.locator(`[data-speed="${speed}"]`).evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===el;})).toBe(true);
    await page.setViewportSize({width:1440,height:1000});await action(page,'start');
    await page.waitForFunction(()=>window.__lisiere.world.group?.phase==='gathering');const formed=await world(page);
    expect(formed.group).toMatchObject({memberIds,destination:planet.civilianTile,ledger:{foodLoaded:0,silverLoaded:0,cargoLoaded:{cloth:0}}});expect(formed.pawns).toHaveLength(3);expect(formed.piles).toEqual(initial.piles);proof.formed={tick:formed.tick,group:formed.group};
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(()=>{const g=window.__lisiere.world.group;return !!g&&'manifest' in g&&g.manifest.some(line=>line.carriedPileId!==undefined);},undefined,{timeout:45_000});await pause(page);
    const pickup=await world(page);if(!pickup.group||!('manifest' in pickup.group))throw Error('La prise réelle a été dépassée sans son reçu de formation.');
    expect(pickup.group.manifest.some(line=>line.carriedPileId!==undefined)).toBe(true);await expect(page.locator('[data-group-manifest]')).toContainText('Pile prise #');proof.pickup={tick:pickup.tick,manifest:pickup.group.manifest};
    await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>{const g=window.__lisiere.world.group;return g?.phase==='travelling'&&!!g.segment;},undefined,{timeout:60_000});await pause(page);
    const departed=await world(page),departedGroup=away(departed);
    expect(departedGroup.members.map(p=>p.id)).toEqual(memberIds);expect(departed.pawns.map(p=>p.id)).toEqual([residentId]);
    expect(departedGroup.ledger).toMatchObject({foodLoaded:12,silverLoaded:500,cargoLoaded:{cloth:60}});
    for(const shirt of originalApparel)expect(departedGroup.items.find(p=>p.id===shirt.id)).toMatchObject({id:shirt.id,item:shirt.item,quantity:shirt.quantity,owner:shirt.owner});
    expect(new Set([...departed.piles,...departedGroup.items].map(p=>p.id)).size).toBe(departed.piles.length+departedGroup.items.length);
    proof.departed={tick:departed.tick,group:departedGroup};
    const resumed=await saveAndReload(page);expect(away(resumed).segment).toEqual(departedGroup.segment);expect(JSON.stringify(resumed.planet!.tiles)).toBe(geography);proof.midSegmentSaveExact=true;
    await groupPanel(page);await action(page,'pause');await page.waitForFunction(()=>{const g=window.__lisiere.world.group;return !!g&&'paused' in g&&g.paused;});
    const stopped=await world(page),stoppedGroup=away(stopped);
    await page.locator('[data-speed="3"]').click();await page.waitForFunction(tick=>window.__lisiere.world.tick>=tick+25,stopped.tick);await pause(page);
    const rested=await world(page),restedGroup=away(rested);expect(restedGroup.segment).toEqual(stoppedGroup.segment);expect(restedGroup.lastPersonalTick).toBe(rested.tick);expect(restedGroup.lastPersonalTick).toBeGreaterThan(stoppedGroup.lastPersonalTick);
    expect(restedGroup.members.some((p,i)=>p.hunger!==stoppedGroup.members[i]!.hunger||p.rest!==stoppedGroup.members[i]!.rest)).toBe(true);await expect(page.locator('[data-group-stop]')).toContainText('besoins continuent');
    // Redirection pays the existing segment. Returning to the intended post
    // is another actual command; neither preview moves the group.
    for(const destination of [planet.homeTile,planet.civilianTile]){
      const before=await world(page),segment=away(before).segment;
      await selectTile(page,destination);await page.locator('[data-group-preview="route"]').click();await expectWorld(page,before);await action(page,'route');
      await page.waitForFunction(id=>window.__lisiere.world.group?.destination===id,destination);const changed=await world(page);
      expect(away(changed).segment).toEqual(segment);expect(away(changed).paused).toBe(true);
    }
    proof.pauseAndRoute={tick:rested.tick,segment:restedGroup.segment,personalClockContinues:true};await action(page,'pause');
    await page.waitForFunction(()=>{const g=window.__lisiere.world.group;return !!g&&'paused' in g&&!g.paused;});await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>{const w=window.__lisiere.world;return w.group?.phase==='at-site'&&w.group.tile===w.planet?.civilianTile;},undefined,{timeout:180_000});await pause(page);
    const visited=await world(page),at=away(visited);expect(at.members.map(p=>p.id)).toEqual(memberIds);expect(visited.pawns.map(p=>p.id)).toEqual([residentId]);
    await expect(page.locator('[data-group-status]')).toContainText('comptoir civil');
    const money=itemTotal(visited,'silver'),textile=itemTotal(visited,'cloth'),cloth=at.items.find(p=>p.item==='cloth')!,sale=[{pileId:cloth.id,quantity:5}],saleQuote=groupTradeQuote(visited,'sell',sale);
    if(!saleQuote.ok)throw Error(saleQuote.reason);
    await page.locator(`[data-group-pile="${cloth.id}"] input[aria-label^="Vendre "]`).fill('5');await expect(page.locator('[data-group-panel]')).toContainText(`À recevoir : ${saleQuote.totalSilver} argent`);await action(page,'sell');
    await page.waitForFunction(value=>{const g=window.__lisiere.world.group;return g?.ledger.silverEarned===value;},at.ledger.silverEarned+saleQuote.totalSilver);
    const sold=await world(page);expect(away(sold).ledger.sold.cloth).toBe(at.ledger.sold.cloth+5);expect(itemTotal(sold,'cloth')).toBe(textile);expect(itemTotal(sold,'silver')).toBe(money);
    const medicine=sold.civilianPost!.stock.find(p=>p.item==='medicine')!,buy=[{pileId:medicine.id,quantity:2}],buyQuote=groupTradeQuote(sold,'buy',buy);if(!buyQuote.ok)throw Error(buyQuote.reason);
    await page.locator(`[data-group-pile="${medicine.id}"] input[aria-label^="Acheter "]`).fill('2');await expect(page.locator('[data-group-panel]')).toContainText(`À payer : ${buyQuote.totalSilver} argent`);await action(page,'buy');
    await page.waitForFunction(value=>window.__lisiere.world.group?.ledger.silverPaid===value,away(sold).ledger.silverPaid+buyQuote.totalSilver);
    const traded=await world(page),tradedGroup=away(traded);expect(tradedGroup.ledger.bought.medicine).toBe(at.ledger.bought.medicine+2);expect(itemTotal(traded,'silver')).toBe(money);expect(itemTotal(traded,'cloth')).toBe(textile);expect(validateWorld(traded)).toEqual([]);
    proof.trade={tick:traded.tick,saleQuote,buyQuote,ledger:tradedGroup.ledger,post:traded.civilianPost};
    await action(page,'return');await page.waitForFunction(id=>window.__lisiere.world.group?.destination===id,planet.homeTile);await page.locator('[data-speed="6"]').click();
    await page.waitForFunction(()=>!window.__lisiere.world.group,undefined,{timeout:180_000});await pause(page);
    const returned=await world(page);expect(returned.pawns.map(p=>p.id).sort((a,b)=>a-b)).toEqual(initial.pawns.map(p=>p.id).sort((a,b)=>a-b));expect(returned.pawns.every(p=>p.state!=='dead'&&p.state!=='downed')).toBe(true);expect(returned.groupLosses??[]).toEqual([]);
    expect(returned.piles.some(p=>p.owner.type==='inventory'&&memberIds.includes(p.owner.pawnId))).toBe(false);
    expect(itemTotal(returned,'silver')).toBe(money);expect(itemTotal(returned,'cloth')).toBe(textile);expect(JSON.stringify(returned.planet!.tiles)).toBe(geography);
    expect(returned.piles.filter(p=>p.item==='medicine'&&p.owner.type==='ground').reduce((n,p)=>n+p.quantity,0)).toBe(initial.piles.filter(p=>p.item==='medicine').reduce((n,p)=>n+p.quantity,0)+2);
    await twoCameras(page,returned,'after-return',name=>info.outputPath(name));await saveAndReload(page);await expectWorld(page,returned);
    expect(validateWorld(returned)).toEqual([]);expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false,waiting:0});
    proof.returned={tick:returned.tick,members:returned.pawns.map(p=>({id:p.id,state:p.state,hunger:p.hunger,rest:p.rest})),ground:returned.piles.filter(p=>p.owner.type==='ground')};proof.twoCameras=true;proof.compactControls=true;proof.finalSaveExact=true;proof.complete=true;
  }catch(error){proof.error=error instanceof Error?error.message:String(error);proof.incident=await page.evaluate(()=>window.__lisiere.incident).catch(()=>null);
    const last=await page.evaluate(()=>JSON.stringify(window.__lisiere.world)).catch(()=>null);if(last)writeTestFileSync(info.outputPath('last-world.json'),last);throw error;
  }finally{proof.errors=errors;writeTestFileSync(info.outputPath('proof.json'),JSON.stringify(proof,null,2));await info.attach('proof',{path:info.outputPath('proof.json'),contentType:'application/json'});await browser.close();}
});
