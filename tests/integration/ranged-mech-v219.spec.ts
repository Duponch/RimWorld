import { expect,test,type Page } from '@playwright/test';
import { prepareRangedMechDemo } from '../../scripts/create-ranged-mech-v219-test-save.ts';
import { backgroundWorkRefusal } from '../../src/sim/colonist-backgrounds.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../../src/sim/serialization.ts';
import { writeTestFileSync } from '../test-output.ts';
import { cell,expectWorld,observeErrors,panel,pause,saveKey,tool,world } from './helpers.ts';
import { inspectPerson,perform,revealCells } from './player-actions.ts';

async function inspectMech(page:Page,id:number){
  await page.keyboard.press('Escape');
  const close=page.locator('#inspect-close');if(await close.isVisible())await close.click();
  await tool(page,'select');const w=await world(page),actor=w.mechanoids?.find(m=>m.id===id)!;
  // Keep room around the body proxy, which sits above its floor cell. At the
  // map edge the cell alone can be visible while the body is behind the HUD.
  await revealCells(page,[actor,{x:actor.x-2,z:actor.z-2},{x:actor.x+2,z:actor.z+2}]);
  for(let i=0;i<=w.pawns.length+(w.mechanoids?.length??0);i++){
    let point=await page.evaluate(id=>window.__lisiere.projectPawn(id),id);expect(point).toBeTruthy();
    // Overlap cycling can open the other race's dossier over the next body.
    // Pan with the actual middle-button gesture, retaining the selected actor
    // so the next ordinary click continues the player's overlap cycle.
    for(let pan=0;pan<8&&await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,point!)!=='CANVAS';pan++){
      const anchor=await page.evaluate(()=>{
        const canvas=document.querySelector('#viewport canvas')!,b=canvas.getBoundingClientRect();
        for(let y=b.top+120;y<b.bottom-120;y+=40)for(let x=b.right-150;x>b.left+120;x-=40)
          if(document.elementFromPoint(x,y)===canvas)return {x,y};
        throw Error('No visible canvas surface for body framing.');
      });
      await page.mouse.move(anchor.x,anchor.y);await page.mouse.down({button:'middle'});
      await page.mouse.move(anchor.x+Math.max(-300,Math.min(300,anchor.x-point!.x)),anchor.y+Math.max(-200,Math.min(200,anchor.y-point!.y)),{steps:8});
      await page.mouse.up({button:'middle'});await page.waitForTimeout(200);
      point=await page.evaluate(id=>window.__lisiere.projectPawn(id),id);expect(point).toBeTruthy();
    }
    expect(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,point!)).toBe('CANVAS');await page.mouse.click(point!.x,point!.y);
    await expect(page.locator('#inspector')).toHaveAttribute('data-mechanoid-id',/\d+/);
    if(await page.locator('#inspector').getAttribute('data-mechanoid-id')===String(id))return;
  }throw Error('Pointer selection missed the mechanical owner.');
}
async function saveReload(page:Page){
  await pause(page);const before=await world(page);expect(validateWorld(before)).toEqual([]);
  await panel(page,'menu');await page.locator('#save').click();
  await expect.poll(()=>page.evaluate(key=>{const s=window.__lisiere.saveRepository.peekItem(key);return s?JSON.parse(s).tick:null;},saveKey)).toBe(before.tick);
  const saved=await page.evaluate(key=>window.__lisiere.saveRepository.peekItem(key),saveKey);expect(deserializeWorld(saved!)).toEqual(before);
  await page.locator('#load').click();await expectWorld(page,before);await page.keyboard.press('Escape');return before;
}

test('V219 native existing-policy adoption, both real races, combat checkpoint and physical carcass recovery',async({playwright},info)=>{
  test.setTimeout(180_000);const initial=prepareRangedMechDemo();delete initial.raids!.mechanoid!.ranged;
  const browser=await playwright.chromium.launch({channel:'chromium',headless:true,args:[]}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  page.setDefaultTimeout(15_000);const proof:Record<string,unknown>={complete:false,initial:{tick:initial.tick,policy:initial.raids!.mechanoid,notice:'Prepared future opportunity only; no combat result preplayed.'}};
  try{
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
    await page.goto('http://127.0.0.1:5173/?scenario=camp&e2e&size=32');await expect(page.locator('#loading')).toHaveCount(0);await pause(page);
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);
    await perform(page,{reason:'Maintenir les civils dans l’abri préparé avant l’occasion hostile.',command:{type:'draft',pawnIds:initial.pawns.map(p=>p.id),enabled:true}},{value:0});
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    const hardware=await page.evaluate(async()=>{const a=await navigator.gpu?.requestAdapter(),i=a?.info;return {vendor:i?.vendor,architecture:i?.architecture,device:i?.device,description:i?.description,fallback:(i as unknown as {isFallbackAdapter?:boolean}|undefined)?.isFallbackAdapter??(a as unknown as {isFallbackAdapter?:boolean}|null)?.isFallbackAdapter??null};});
    expect(hardware.fallback).not.toBe(true);expect(JSON.stringify(hardware)).not.toMatch(/swiftshader|llvmpipe|lavapipe|software adapter|basic render driver/i);proof.hardware=hardware;
    await panel(page,'menu');await page.locator('.legacy-scenario-settings summary').click();await expect(page.locator('#enable-mech-raids')).toBeVisible();await page.locator('#enable-mech-raids').click();
    await expect.poll(async()=>(await world(page)).raids?.mechanoid?.ranged).toEqual({adoptedAt:initial.tick});
    const adopted=await world(page);expect(adopted.raids!.mechanoid!.rng).toBe(initial.raids!.mechanoid!.rng);expect(adopted.mechanoids).toBeUndefined();proof.adoption=adopted.raids!.mechanoid;
    await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(()=>window.__lisiere.world.raids?.mechActive?.phase==='staging');await pause(page);
    const arrived=await world(page);expect(arrived.mechanoids?.some(m=>m.mechKind==='lancer')).toBe(true);expect(arrived.mechanoids?.some(m=>m.mechKind==='pikeman')).toBe(true);proof.arrival={tick:arrived.tick,group:arrived.raids!.mechActive};
    for(const [kind,count,label] of [['lancer',30,'Lancier'],['pikeman',20,'Piquier']] as const){
      const actor=arrived.mechanoids!.find(m=>m.mechKind===kind)!;await inspectMech(page,actor.id);
      await expect(page.locator('[data-mech-title]')).toContainText(label);await expect(page.locator('[data-mech-part]')).toHaveCount(count);await expect(page.locator('[data-mech-cannon]')).toBeVisible();
      await page.locator('[data-mech-phase]').focus();await expect(page.locator('#game-tooltip')).toBeVisible();await page.keyboard.press('Escape');
    }
    await page.locator('#inspect-close').click();await page.locator('#inspect-threat').click();await page.locator('#inspect-close').click();
    await revealCells(page,arrived.mechanoids!);
    const focus=await page.evaluate(id=>window.__lisiere.projectPawn(id),arrived.mechanoids![0]!.id);expect(focus).toBeTruthy();
    await page.mouse.move(focus!.x,focus!.y);await page.mouse.wheel(0,-400);await page.waitForTimeout(200);
    await revealCells(page,arrived.mechanoids!);const paused=await world(page),firstCamera=await page.locator('#camera-mode').textContent();
    await page.screenshot({path:info.outputPath('races-camera-1.png')});
    await page.locator('#camera-mode').click();await expectWorld(page,paused);const secondCamera=await page.locator('#camera-mode').textContent();
    await page.screenshot({path:info.outputPath('races-camera-2.png')});proof.cameras=[{label:firstCamera,file:'races-camera-1.png'},{label:secondCamera,file:'races-camera-2.png'}];
    await page.locator('#camera-mode').click();await expectWorld(page,paused);
    for(const gun of arrived.structures.filter(s=>s.turret)){
      await tool(page,'select');await revealCells(page,[gun]);
      for(let i=0;i<=arrived.pawns.length+arrived.mechanoids!.length;i++){await cell(page,gun.x,gun.z);if(await page.locator(`[data-turret-id="${gun.id}"]`).isVisible())break;}
      await page.locator('[data-turret-hold-fire]').click();await expect(page.locator('[data-turret-hold-fire]')).toHaveAttribute('aria-pressed','false');
    }
    const defender=initial.pawns[0]!;
    await perform(page,{reason:'Faire sortir un défenseur par la vraie porte pour observer une attaque à distance.',command:{type:'draft-move',pawnIds:[defender.id],target:{x:22,z:20},queue:false}},{value:0});
    await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(()=>window.__lisiere.world.mechanoids?.some(m=>m.ranged?.stance));await pause(page);
    const stance=await saveReload(page);proof.stance={tick:stance.tick,actors:stance.mechanoids?.filter(m=>m.ranged).map(m=>({id:m.id,kind:m.mechKind,ranged:m.ranged}))};
    await page.locator('[data-speed="1"]').click();await page.waitForFunction(()=>window.__lisiere.world.projectiles?.some(p=>(p.weaponItem==='lancer-gun'||p.weaponItem==='pikeman-gun')&&!p.arrival&&!p.flight.completed));await pause(page);
    const flight=await saveReload(page);proof.flight={tick:flight.tick,projectiles:flight.projectiles};
    expect(flight.projectiles?.some(p=>(p.weaponItem==='lancer-gun'||p.weaponItem==='pikeman-gun')&&!p.arrival&&!p.flight.completed)).toBe(true);
    const exposed=flight.pawns.find(p=>p.id===defender.id)!;proof.exposedDefender={id:defender.id,state:exposed.state,health:exposed.health};
    if(!['dead','downed'].includes(exposed.state))await perform(page,{reason:'Replier le défenseur vers l’abri par un déplacement physique.',command:{type:'draft-move',pawnIds:[defender.id],target:{x:24,z:19},queue:false}},{value:0});
    await page.locator('[data-speed="6"]').click();await page.waitForFunction(()=>window.__lisiere.world.raids?.last?.mechanoid===true&&!window.__lisiere.world.mechanoids?.length,null,{timeout:70_000});await pause(page);
    const defeated=await saveReload(page);proof.defense={tick:defeated.tick,last:defeated.raids!.last,corpses:defeated.piles.filter(p=>p.mechCorpse).map(p=>({id:p.id,item:p.item,owner:p.owner}))};
    expect(defeated.piles.some(p=>p.item==='lancer-corpse')).toBe(true);expect(defeated.piles.some(p=>p.item==='pikeman-corpse')).toBe(true);
    const worker=defeated.pawns.find(p=>!['dead','downed'].includes(p.state)&&!backgroundWorkRefusal(p,'craft')&&!backgroundWorkRefusal(p,'haul'))!;expect(worker).toBeTruthy();
    await perform(page,{reason:'Libérer un artisan réellement capable après la défense.',command:{type:'draft',pawnIds:[worker.id],enabled:false}},{value:0});
    for(const pawn of defeated.pawns)if(pawn.id!==worker.id&&pawn.state!=='dead')await perform(page,{reason:'Réserver cette observation de récupération à un seul artisan.',command:{type:'priority',pawnId:pawn.id,work:'craft',value:0}},{value:0});
    const table=defeated.structures.find(s=>s.kind==='machining-table')!;await tool(page,'select');await revealCells(page,[table]);await cell(page,table.x,table.z);await page.locator('[data-add-recipe="shred-mechanoid"]').click();
    await expect.poll(async()=>(await world(page)).structures.find(s=>s.id===table.id)!.bills!.some(b=>b.recipe==='shred-mechanoid')).toBe(true);
    await inspectPerson(page,worker.id);await perform(page,{reason:'Récupérer une vraie carcasse après la défense.',command:{type:'order-cook',pawnId:worker.id,structureId:table.id,queue:false}},{value:0});
    await page.locator('[data-speed="3"]').click();await page.waitForFunction(id=>window.__lisiere.world.piles.some(p=>p.mechCorpse&&p.owner.type==='pawn'&&p.owner.pawnId===id),worker.id,{timeout:40_000});await pause(page);
    const carried=await saveReload(page),corpse=carried.piles.find(p=>p.mechCorpse&&p.owner.type==='pawn'&&p.owner.pawnId===worker.id)!;proof.carried={tick:carried.tick,id:corpse.id,item:corpse.item};
    const steelBefore=carried.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0);
    await page.locator('[data-speed="3"]').click();await page.waitForFunction(()=>!!window.__lisiere.world.mechSalvage?.completed,null,{timeout:45_000});await pause(page);
    const final=await saveReload(page);expect(final.piles.some(p=>p.id===corpse.id)).toBe(false);expect(final.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0)).toBe(steelBefore+final.mechSalvage!.steel);proof.salvage={tick:final.tick,ledger:final.mechSalvage};
    expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false,waiting:0});proof.complete=true;
  }catch(error){proof.error=String(error);await page.screenshot({path:info.outputPath('failure.png')}).catch(()=>{});writeTestFileSync(info.outputPath('last-world.json'),JSON.stringify(await world(page).catch(()=>null)));throw error;}
  finally{proof.errors=errors;writeTestFileSync(info.outputPath('proof.json'),JSON.stringify(proof,null,2));await info.attach('proof',{path:info.outputPath('proof.json'),contentType:'application/json'});await browser.close();}
});
