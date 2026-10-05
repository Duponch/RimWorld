import { expect,test,type Browser,type Page,type TestInfo } from '@playwright/test';
import { prepareScytherDemo } from '../../scripts/create-scyther-v213-test-save.ts';
import { producedScytherArrival,producedScytherNeutralization } from '../helpers/scyther-v213.ts';
import { backgroundWorkRefusal } from '../../src/sim/colonist-backgrounds.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../../src/sim/serialization.ts';
import type { World } from '../../src/sim/types.ts';
import { writeTestFileSync } from '../test-output.ts';
import { cell,expectWorld,observeErrors,panel,pause,saveKey,tool,world } from './helpers.ts';
import { inspectPerson,perform,revealCells } from './player-actions.ts';

async function execute(browser:Browser,initial:World,label:string,info:TestInfo,run:(page:Page,proof:Record<string,unknown>)=>Promise<void>){
  expect(validateWorld(initial)).toEqual([]);
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  page.setDefaultTimeout(15_000);const proof:Record<string,unknown>={label,complete:false,initial:{tick:initial.tick,mechanical:initial.mechanoids?.map(m=>({id:m.id,state:m.state,health:m.health})),notice:'Initial future preparation or explicit producer checkpoint, never a substituted defense result.'}};
  try{
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await pause(page);
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    const hardware=await page.evaluate(async()=>{const a=await navigator.gpu?.requestAdapter(),i=a?.info;return {vendor:i?.vendor,architecture:i?.architecture,device:i?.device,description:i?.description,fallback:(i as unknown as {isFallbackAdapter?:boolean}|undefined)?.isFallbackAdapter??(a as unknown as {isFallbackAdapter?:boolean}|null)?.isFallbackAdapter??null};});
    expect(hardware.fallback).not.toBe(true);expect(JSON.stringify(hardware)).not.toMatch(/swiftshader|llvmpipe|lavapipe|software adapter|basic render driver/i);proof.hardware=hardware;
    await run(page,proof);await pause(page);expect(validateWorld(await world(page))).toEqual([]);expect(errors).toEqual([]);
    expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false,waiting:0});proof.complete=true;
    await page.screenshot({path:info.outputPath('native.png')});
  }catch(error){proof.error=error instanceof Error?error.message:String(error);proof.incident=await page.evaluate(()=>window.__lisiere.incident).catch(()=>null);
    const last=await page.evaluate(()=>JSON.stringify(window.__lisiere.world)).catch(()=>null);if(last)writeTestFileSync(info.outputPath('last-world.json'),last);throw error;
  }finally{proof.errors=errors;writeTestFileSync(info.outputPath('proof.json'),JSON.stringify(proof,null,2));await info.attach('proof',{path:info.outputPath('proof.json'),contentType:'application/json'});await browser.close();}
}
async function inspectMech(page:Page,id:number){
  await page.keyboard.press('Escape');await tool(page,'select');const w=await world(page),actor=w.mechanoids?.find(m=>m.id===id);if(!actor)throw Error('Mechanical owner is absent.');
  await revealCells(page,[actor]);
  for(let attempt=0;attempt<=w.pawns.length+(w.mechanoids?.length??0);attempt++){
    const point=await page.evaluate(id=>window.__lisiere.projectPawn(id),id);if(!point)throw Error('Mechanical body is outside the view.');
    expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,point)).toBe('CANVAS');await page.mouse.click(point.x,point.y);
    if(await page.locator('#inspector').getAttribute('data-mechanoid-id')===String(id))return;
  }throw Error('Pointer selection did not reach the mechanical dossier.');
}
async function inspectGun(page:Page,id:number){
  await page.keyboard.press('Escape');await tool(page,'select');const w=await world(page),s=w.structures.find(s=>s.id===id)!;await revealCells(page,[s]);
  for(let i=0;i<=w.pawns.length+(w.mechanoids?.length??0);i++){await cell(page,s.x,s.z);if(await page.locator(`[data-turret-id="${id}"]`).isVisible())return;}
  throw Error('The visible cell did not reveal the installed gun.');
}
async function saveAndReload(page:Page):Promise<World>{
  await pause(page);const before=await world(page);await panel(page,'menu');await page.locator('#save').click();
  await expect.poll(()=>page.evaluate(key=>{const raw=window.__lisiere.saveRepository.peekItem(key);return raw?JSON.parse(raw).tick:null;},saveKey)).toBe(before.tick);
  const raw=await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey);expect(deserializeWorld(raw!)).toEqual(before);
  await page.locator('#load').click();await expectWorld(page,before);await page.keyboard.press('Escape');return before;
}

test('V213 native prospective activation, real future staging and mechanical dossier with keyboard and both cameras',async({playwright},info)=>{
  test.setTimeout(90_000);const initial=prepareScytherDemo();delete initial.raids!.mechanoid;
  const browser=await playwright.chromium.launch({channel:'chromium',headless:true,args:[]});
  await execute(browser,initial,'prospective-arrival',info,async(page,proof)=>{
    await panel(page,'menu');await page.locator('.legacy-scenario-settings summary').click();await page.locator('#enable-mech-raids').click();
    await expect.poll(async()=>!!(await world(page)).raids?.mechanoid).toBe(true);const adopted=await world(page);expect(adopted.mechanoids).toBeUndefined();expect(adopted.raids!.mechanoid!.adoptedAt).toBe(initial.tick);
    // Activation seeds its real private stream. The prepared ticket was not
    // retained in the historical exposure; this case observes adoption only.
    proof.adoption=adopted.raids!.mechanoid;await page.keyboard.press('Escape');await saveAndReload(page);
    // Load the prospectively prepared catalogue exposure by ordinary import,
    // to exercise its certified future ticket through the actual producer.
    await panel(page,'menu');await page.locator('#browse-saves').click();await page.locator('.front-menu input[type="file"]').setInputFiles({name:'scyther-prepared.json',mimeType:'application/json',buffer:Buffer.from(serializeWorld(prepareScytherDemo()))});
    await expectWorld(page,prepareScytherDemo());await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(()=>window.__lisiere.world.raids?.mechActive?.phase==='staging');await pause(page);const arrived=await world(page),id=arrived.mechanoids![0]!.id;
    expect(arrived.mechanoids!.every(m=>m.health===undefined)).toBe(true);proof.arrived={tick:arrived.tick,group:arrived.raids!.mechActive};await inspectMech(page,id);
    const card=page.locator('#inspector');await expect(card.locator('[data-mech-authority]')).toContainText('aucune commande coloniale');await expect(card.locator('[data-mech-part]')).toHaveCount(32);
    const target=card.locator('[data-mech-target]');await target.focus();await expect(page.locator('#game-tooltip')).toBeVisible();await expect(page.locator('#game-tooltip')).toContainText('Cible confirmée');await page.keyboard.press('Escape');
    const before=await world(page);await page.screenshot({path:info.outputPath('mechanical-perspective.png')});await page.locator('#camera-mode').click();await expectWorld(page,before);await page.screenshot({path:info.outputPath('mechanical-isometric.png')});await page.locator('#camera-mode').click();await expectWorld(page,before);
    await page.setViewportSize({width:1280,height:768});for(const speed of [0,1,3,6])expect(await page.locator(`[data-speed="${speed}"]`).evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===el;})).toBe(true);
    proof.twoViews=true;proof.compact=true;await saveAndReload(page);
  });
});

test('V213 native real mechanical Bullet impact, retained flight checkpoint and neutralization without colonial control',async({playwright},info)=>{
  test.setTimeout(140_000);const initial=producedScytherArrival(),browser=await playwright.chromium.launch({channel:'chromium',headless:true,args:[]});
  await execute(browser,initial,'defense',info,async(page,proof)=>{
    for(const gun of initial.structures.filter(s=>s.turret)){await inspectGun(page,gun.id);await page.locator('[data-turret-hold-fire]').click();await expect(page.locator('[data-turret-hold-fire]')).toHaveAttribute('aria-pressed','false');}
    await page.locator('[data-speed="1"]').click();await page.waitForFunction(()=>window.__lisiere.world.projectiles?.some(p=>p.weaponItem==='mini-turret-gun'));await pause(page);
    const flight=await saveAndReload(page);proof.flight={tick:flight.tick,projectiles:flight.projectiles};expect(flight.projectiles!.some(p=>p.flight.intendedKey?.startsWith('mech:'))).toBe(true);
    await page.locator('[data-speed="3"]').click();await page.waitForFunction(()=>{const w=window.__lisiere.world;return w.mechanoids?.some(m=>m.health)||w.piles.some(p=>p.mechCorpse);},null,{timeout:45_000});await pause(page);
    const hit=await world(page);proof.impact={tick:hit.tick,mechanical:hit.mechanoids?.map(m=>({id:m.id,state:m.state,health:m.health})),corpses:hit.piles.filter(p=>p.mechCorpse)};
    const alive=hit.mechanoids?.find(m=>m.state!=='dead');if(alive){await inspectMech(page,alive.id);await expect(page.locator('#inspector')).toContainText('Dossier mécanique');}
    await page.locator('[data-speed="3"]').click();await page.waitForFunction(()=>window.__lisiere.world.raids?.last?.mechanoid===true&&!!window.__lisiere.world.piles.some(p=>p.mechCorpse),null,{timeout:60_000});await pause(page);
    const neutral=await saveAndReload(page);expect(neutral.raids!.last).toMatchObject({mechanoid:true,downed:0,escaped:0});expect(neutral.piles.filter(p=>p.mechCorpse).every(p=>initial.raids!.mechActive!.members.includes(p.id)&&p.quantity===1&&p.mechCorpse!.health.death)).toBe(true);
    proof.result={tick:neutral.tick,last:neutral.raids!.last,corpses:neutral.piles.filter(p=>p.mechCorpse).map(p=>({id:p.id,owner:p.owner,body:p.mechCorpse}))};
  });
});

test('V213 native whole carcass pickup, produced salvage checkpoint and physical steel output',async({playwright},info)=>{
  test.setTimeout(150_000);const initial=producedScytherNeutralization(),browser=await playwright.chromium.launch({channel:'chromium',headless:true,args:[]});
  await execute(browser,initial,'salvage',info,async(page,proof)=>{
    const corpse=initial.piles.find(p=>p.mechCorpse&&p.owner.type==='ground')!,station=initial.structures.find(s=>s.kind==='machining-table')!;
    const worker=initial.pawns.find(p=>p.state!=='dead'&&p.state!=='downed'&&!backgroundWorkRefusal(p,'craft')&&!backgroundWorkRefusal(p,'haul'));if(!worker)throw Error('No surviving physical salvage artisan.');
    for(const p of initial.pawns)if(p.id!==worker.id&&p.state!=='dead')await perform(page,{reason:'Réserver cette observation physique à un seul artisan.',command:{type:'priority',pawnId:p.id,work:'craft',value:0}},{value:0});
    if(corpse.owner.type!=='ground')throw Error('Physical corpse is not on the ground.');await tool(page,'select');await revealCells(page,[corpse.owner]);await cell(page,corpse.owner.x,corpse.owner.z);await expect(page.locator('#cell-title')).toContainText('Carcasse');
    await page.locator('#cell-information').click();await expect(page.locator('#object-information')).toContainText('Masse restante');await expect(page.locator('#object-information')).not.toContainText('Nutrition');await page.keyboard.press('Escape');
    await tool(page,'select');await revealCells(page,[station]);await cell(page,station.x,station.z);await page.locator('[data-add-recipe="shred-mechanoid"]').click();
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===station.id)!.bills?.some(b=>b.recipe==='shred-mechanoid')).toBe(true);
    await inspectPerson(page,worker.id);await perform(page,{reason:'Prioriser une vraie récupération entière au poste alimenté.',command:{type:'order-cook',pawnId:worker.id,structureId:station.id,queue:false}},{value:0});
    await page.locator('[data-speed="3"]').click();await page.waitForFunction(id=>window.__lisiere.world.piles.some(p=>p.mechCorpse&&p.owner.type==='pawn'&&p.owner.pawnId===id),worker.id,{timeout:45_000});await pause(page);
    const carried=await saveAndReload(page),held=carried.piles.find(p=>p.mechCorpse&&p.owner.type==='pawn'&&p.owner.pawnId===worker.id)!;expect(held.quantity).toBe(1);proof.carried={tick:carried.tick,id:held.id,owner:held.owner,body:held.mechCorpse};
    await page.locator('[data-speed="3"]').click();await page.waitForFunction(id=>window.__lisiere.world.pawns.some(p=>p.id===id&&p.cooking?.recipe==='shred-mechanoid'&&p.cooking.phase==='work'&&p.cooking.progress>0),worker.id,{timeout:45_000});await pause(page);
    const working=await saveAndReload(page),artisan=working.pawns.find(p=>p.id===worker.id)!;proof.work={tick:working.tick,pawnId:artisan.id,task:artisan.cooking};expect(working.piles.some(p=>p.id===held.id&&p.owner.type==='ground')).toBe(true);
    const beforeSteel=working.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0);await page.locator('[data-speed="3"]').click();await page.waitForFunction(()=>!!window.__lisiere.world.mechSalvage?.completed,null,{timeout:45_000});await pause(page);
    const finished=await saveAndReload(page);expect(finished.piles.some(p=>p.id===held.id)).toBe(false);expect(finished.mechSalvage!.completed).toBeGreaterThan(0);expect(finished.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0)).toBe(beforeSteel+finished.mechSalvage!.steel);proof.output={tick:finished.tick,ledger:finished.mechSalvage};
  });
});
