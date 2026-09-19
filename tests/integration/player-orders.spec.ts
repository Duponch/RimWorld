import { test, expect } from '@playwright/test';
import { createWorld, applyCommand, addGroundMaterial, serializeWorld, refreshStock, stepWorld, validateWorld } from '../../src/sim/index';
import { newCookingBill } from '../../src/sim/cooking-bills';
import { perform } from './player-actions';
import { world, panel, cell, saveKey, expectWorld, observeErrors } from './helpers';

test('la priorité de chantier traverse coupe, dégagement, livraison et finition sans étendre le travail au voisin',async({playwright},testInfo)=>{
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    const fixture=createWorld(42,32,32);fixture.tick=2000;fixture.tiles=fixture.tiles.map(()=>({terrain:'grass'}));fixture.resources=[];fixture.piles=[];fixture.jobs=[];fixture.structures=[];fixture.stockpiles=[];fixture.pawns=fixture.pawns.slice(0,1);
    const pawn=fixture.pawns[0]!;Object.assign(pawn,{x:12,z:16,hunger:100,rest:100});pawn.schedule.fill('anything');pawn.priorities={research:0, patient:0,bedrest:0,doctor:0,craft:2,mine:2,haul:0,build:1,gather:0,grow:0,cook:0};
    fixture.resources.push({id:fixture.nextId++,kind:'tree',amount:12,x:18,z:14});
    for(const x of [18,22])expect(applyCommand(fixture,{type:'designate',kind:'bed',x,z:14}).ok).toBe(true);
    await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:saveKey,value:serializeWorld(fixture)});
    await page.goto('/?size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,fixture);
    const rotation={value:0};await perform(page,{reason:'Achever ce lit en priorité.',command:{type:'order-job',pawnId:pawn.id,jobId:fixture.jobs[0]!.id,queue:false}},rotation);
    await expect(page.locator('#selected-orders')).toContainText('Priorité case 18, 14');await expect(page.locator('#clear-orders')).toBeEnabled();
    await page.locator('#clear-orders').click();await expect.poll(async()=>(await world(page)).pawns[0]!.priorityWork).toBeUndefined();
    await perform(page,{reason:'Reprendre le lit après annulation.',command:{type:'order-job',pawnId:pawn.id,jobId:fixture.jobs[0]!.id,queue:false}},rotation);
    await perform(page,{reason:'Conserver seulement le travail déjà imposé.',command:{type:'priority',pawnId:pawn.id,work:'build',value:0}},rotation);
    const accepted=await world(page);await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,accepted);
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>{const w=await world(page);return w.structures.length===1&&!w.pawns[0]!.priorityWork;},{timeout:20000}).toBe(true);await page.locator('[data-speed="0"]').click();
    const final=await world(page);expect(final.structures[0]).toMatchObject({kind:'bed',x:18,z:14});expect(final.jobs).toHaveLength(1);expect(final.jobs[0]).toMatchObject({x:22,escrow:{wood:0}});expect(final.stock.wood).toBe(4);expect(validateWorld(final)).toEqual([]);expect(errors).toEqual([]);
    await page.locator(`[data-pawn="${pawn.id}"]`).click();await expect(page.locator('#clear-orders')).toBeDisabled();await expect(page.locator('#fps-counter')).toBeVisible();await page.screenshot({path:'artifacts/priority-work.png'});
    await testInfo.attach('priority-work',{contentType:'application/json',body:JSON.stringify({tick:final.tick,stock:final.stock,structures:final.structures,orders:final.pawns[0]!.orders,priority:final.pawns[0]!.priorityWork??null,errors})});
  } finally {await browser.close();}
});

test('dégager un semis puis cuisiner par les menus, réserver ingrédients et poste en file et reprendre la sauvegarde',async({playwright},testInfo)=>{
  test.setTimeout(60000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    const fixture=createWorld(42,32,32);fixture.tick=2000;fixture.tiles=fixture.tiles.map(()=>({terrain:'grass'}));fixture.resources=[];fixture.piles=[];fixture.jobs=[];fixture.structures=[];fixture.stockpiles=[];fixture.pawns=fixture.pawns.slice(0,1);
    const pawn=fixture.pawns[0]!;Object.assign(pawn,{x:12,z:16,hunger:100,rest:100});pawn.schedule.fill('anything');pawn.priorities={research:0, patient:0,bedrest:0,doctor:0,craft:2,mine:2,haul:0,build:0,gather:0,grow:0,cook:0};
    addGroundMaterial(fixture,'wood',10,{x:18,z:15},'wood');addGroundMaterial(fixture,'food',16,{x:13,z:15},'rice');addGroundMaterial(fixture,'food',4,{x:14,z:15},'berries');
    expect(applyCommand(fixture,{type:'area',action:'growing',from:{x:18,z:15},to:{x:18,z:15}}).ok).toBe(true);stepWorld(fixture,10);const sow=fixture.jobs.find(j=>j.kind==='sow')!;expect(sow).toBeDefined();
    const bill=newCookingBill(fixture.nextId++);bill.target=2;bill.destination='drop';const station={id:fixture.nextId++,kind:'campfire' as const,x:16,z:12,orientation:0 as const,footprint:'standard' as const,bills:[bill],fuel:{ticks:6000,burned:0,autoRefuel:false}};fixture.structures.push(station);pawn.priorities.cook=1;pawn.priorities.grow=1;
    await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:saveKey,value:serializeWorld(fixture)});
    await page.goto('/?size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,fixture);
    const rotation={value:0};
    await perform(page,{reason:'Libérer le semis sans métier Transport.',command:{type:'order-haul',pawnId:pawn.id,target:{type:'clear-sow',jobId:sow.id},queue:false}},rotation);
    await perform(page,{reason:'Préparer un repas après le dégagement.',command:{type:'order-cook',pawnId:pawn.id,structureId:station.id,queue:true}},rotation);
    for(const work of ['cook','grow'] as const)await perform(page,{reason:'Vérifier les ordres déjà acceptés.',command:{type:'priority',pawnId:pawn.id,work,value:0}},rotation);
    const queued=await world(page);expect(validateWorld(queued)).toEqual([]);expect(queued.pawns[0]!.orders.queue).toHaveLength(1);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,queued);
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>{const w=await world(page);return w.structures[0]!.bills![0]!.target===0&&w.pawns[0]!.orders.active===null&&!w.pawns[0]!.orders.queue.length&&!w.pawns[0]!.priorityWork;},{timeout:15000}).toBe(true);await page.locator('[data-speed="0"]').click();
    const cooked=await world(page);expect(cooked.stock).toEqual({wood:10,food:2});expect(cooked.events.filter(e=>e.message.includes('a cuisiné'))).toHaveLength(2);expect(cooked.piles.some(p=>p.owner.type==='ground'&&p.owner.x===18&&p.owner.z===15)).toBe(false);expect(cooked.piles.find(p=>p.item==='simple-meal')?.owner.type).toBe('ground');
    await perform(page,{reason:'Semer la cellule maintenant dégagée.',command:{type:'priority',pawnId:pawn.id,work:'grow',value:1}},rotation);
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).resources.some(r=>r.kind==='rice'&&r.x===18&&r.z===15)).toBe(true);await page.locator('[data-speed="0"]').click();
    const final=await world(page);expect(validateWorld(final)).toEqual([]);expect(errors).toEqual([]);expect(await page.locator('#fps-counter').isVisible()).toBe(true);await page.screenshot({path:'artifacts/cooking-orders.png'});
    await testInfo.attach('cooking-orders',{contentType:'application/json',body:JSON.stringify({tick:final.tick,stock:final.stock,bill:final.structures[0]!.bills![0],orders:final.pawns[0]!.orders,errors})});
  } catch(error) {await testInfo.attach('cooking-orders-incomplete',{contentType:'application/json',body:JSON.stringify({world:await world(page),errors})});throw error;}
  finally {await browser.close();}
});

test('dégager une plante puis ravitailler un feu sans automatisme, reprendre la file et déplacer les matériaux du chantier',async({playwright},testInfo)=>{
  test.setTimeout(60000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    const fixture=createWorld(42,32,32);fixture.tick=2000;fixture.tiles=fixture.tiles.map(()=>({terrain:'grass'}));fixture.resources=[];fixture.piles=[];fixture.jobs=[];fixture.structures=[];fixture.stockpiles=[];fixture.pawns=fixture.pawns.slice(0,1);
    const pawn=fixture.pawns[0]!;Object.assign(pawn,{x:12,z:16,hunger:100,rest:100});pawn.schedule.fill('anything');pawn.priorities={research:0, patient:0,bedrest:0,doctor:0,craft:2,mine:2,haul:1,build:1,gather:0,grow:0,cook:0};
    fixture.resources.push({id:fixture.nextId++,kind:'tree',amount:12,x:18,z:14});
    expect(applyCommand(fixture,{type:'designate',kind:'wall',x:18,z:14}).ok).toBe(true);const job=fixture.jobs[0]!;
    const fire={id:fixture.nextId++,kind:'campfire' as const,x:16,z:12,orientation:0 as const,footprint:'standard' as const,bills:[],fuel:{ticks:9000,burned:0,autoRefuel:false}};fixture.structures.push(fire);
    addGroundMaterial(fixture,'wood',5,{x:13,z:16},'wood');
    await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:saveKey,value:serializeWorld(fixture)});
    await page.goto('/?size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,fixture);
    const rotation={value:0};
    await perform(page,{reason:'Couper la plante sur le futur mur.',command:{type:'order-job',pawnId:pawn.id,jobId:job.id,queue:false}},rotation);
    await perform(page,{reason:'Ravitailler ensuite le feu, automatisme désactivé.',command:{type:'order-haul',pawnId:pawn.id,target:{type:'fuel',structureId:fire.id},queue:true}},rotation);
    for(const work of ['build','haul'] as const)await perform(page,{reason:'Isoler la file déjà acceptée.',command:{type:'priority',pawnId:pawn.id,work,value:0}},rotation);
    const queued=await world(page);expect(validateWorld(queued)).toEqual([]);expect(queued.pawns[0]!.orders.queue).toHaveLength(1);
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,queued);
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>{const w=await world(page);return !w.resources.length&&w.pawns[0]!.orders.active===null&&!w.pawns[0]!.orders.queue.length;},{timeout:15000}).toBe(true);await page.locator('[data-speed="0"]').click();
    const fueled=await world(page);expect(fueled.stock.wood).toBe(12);expect(fueled.structures[0]!.fuel!.ticks+fueled.structures[0]!.fuel!.burned).toBe(12000);expect(fueled.structures[0]!.fuel!.autoRefuel).toBe(false);expect(fueled.jobs[0]!.construction).toBe('blueprint');
    await perform(page,{reason:'Autoriser le dégagement de construction.',command:{type:'priority',pawnId:pawn.id,work:'build',value:1}},rotation);
    await perform(page,{reason:'Déplacer le bois qui gêne le mur.',command:{type:'order-haul',pawnId:pawn.id,target:{type:'clear',jobId:job.id},queue:false}},rotation);
    await perform(page,{reason:'Isoler le trajet accepté.',command:{type:'priority',pawnId:pawn.id,work:'build',value:0}},rotation);
    const clearing=await world(page);await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,clearing);
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>{const w=await world(page);return w.structures.some(s=>s.kind==='wall')&&!w.pawns[0]!.priorityWork;},{timeout:10000}).toBe(true);await page.locator('[data-speed="0"]').click();
    const final=await world(page);expect(final.stock.wood).toBe(7);expect(final.piles.filter(p=>p.owner.type==='ground'&&p.owner.x===18&&p.owner.z===14).reduce((n,p)=>n+p.quantity,0)).toBe(0);expect(final.jobs).toEqual([]);expect(final.structures.find(s=>s.kind==='wall')).toMatchObject({x:18,z:14});expect(validateWorld(final)).toEqual([]);expect(errors).toEqual([]);expect(await page.locator('#fps-counter').isVisible()).toBe(true);
    await page.screenshot({path:'artifacts/context-services.png'});
    await testInfo.attach('context-services',{contentType:'application/json',body:JSON.stringify({tick:final.tick,stock:final.stock,fuel:final.structures[0]!.fuel,orders:final.pawns[0]!.orders,errors})});
  } finally {await browser.close();}
});

test('sélection de groupe, deux projections, menu et file de travail par la vraie interface, reprise exacte',async({playwright},testInfo)=>{
  test.setTimeout(90000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    const fixture=createWorld(42,32,32);fixture.tick=2000;fixture.tiles=fixture.tiles.map(()=>({terrain:'grass'}));fixture.resources=[];fixture.piles=[];fixture.jobs=[];fixture.structures=[];
    fixture.pawns.forEach((p,i)=>{Object.assign(p,{x:12+i*3,z:16,hunger:100,rest:100});p.schedule.fill('anything');p.priorities={research:0, patient:0,bedrest:0,doctor:0,craft:2,mine:2,gather:i===0?1:0,build:0,haul:0,grow:0,cook:0};});
    for(const x of [12,17,21]){fixture.resources.push({id:fixture.nextId++,kind:'tree',amount:12,x,z:12});expect(applyCommand(fixture,{type:'designate',kind:'chop',x,z:12}).ok).toBe(true);}
    refreshStock(fixture);
    await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:saveKey,value:serializeWorld(fixture)});
    await page.goto('/?size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,fixture);
    const ids=fixture.pawns.map(p=>p.id);
    await page.locator(`[data-pawn="${ids[0]}"]`).click();
    await page.locator(`[data-pawn="${ids[1]}"]`).click({modifiers:['Shift']});
    await expect(page.locator('.colonist.selected')).toHaveCount(2);await expect(page.locator('#group-title')).toHaveText('2 colons sélectionnés');
    const right=async(x:number,z:number,queue=false)=>{
      const point=await page.evaluate(({x,z})=>window.__lisiere.projectCell(x,z),{x,z});const bounds=(await page.locator('#viewport canvas').boundingBox())!;
      if(queue)await page.keyboard.down('Shift');await page.mouse.click(bounds.x+point.x,bounds.y+point.y,{button:'right'});if(queue)await page.keyboard.up('Shift');
      await expect(page.locator('#order-menu')).toBeVisible();
    };
    await right(17,12);await expect(page.locator('#order-menu')).toContainText('un seul colon');await page.keyboard.press('Escape');
    await expect(page.locator('.colonist.selected')).toHaveCount(2);
    await page.locator(`[data-pawn="${ids[1]}"]`).click({modifiers:['Shift']});await expect(page.locator('.colonist.selected')).toHaveCount(1);
    // Double-click a projected body/feet proxy; no camera recentring on map clicks.
    let point=await page.evaluate(()=>window.__lisiere.projectCell(12,16));const bounds=(await page.locator('#viewport canvas').boundingBox())!;
    await page.mouse.dblclick(bounds.x+point.x,bounds.y+point.y);await expect(page.locator('.colonist.selected')).toHaveCount(3);
    const beforeSelection=await world(page);expect(beforeSelection).toEqual(fixture);
    // Rectangle tests in each projection, plus Escape during an uncommitted drag.
    for(let mode=0;mode<2;mode++) {
      if(mode)await page.locator('#camera-mode').click();
      await page.keyboard.press('Escape');
      const points=await page.evaluate(()=>[12,15,18].map(x=>window.__lisiere.projectCell(x,16)));
      const left=Math.min(...points.map(p=>p.x))-22,top=Math.min(...points.map(p=>p.y))-45,right=Math.max(...points.map(p=>p.x))+22,bottom=Math.max(...points.map(p=>p.y))+10;
      await page.mouse.move(bounds.x+left,bounds.y+top);await page.mouse.down();await page.mouse.move(bounds.x+right,bounds.y+bottom,{steps:6});
      await expect(page.locator('.selection-rectangle')).toBeVisible();await page.mouse.up();await expect(page.locator('.colonist.selected')).toHaveCount(3);
      await page.mouse.move(bounds.x+left,bounds.y+top);await page.mouse.down();await page.mouse.move(bounds.x+right,bounds.y+bottom,{steps:3});await page.keyboard.press('Escape');await page.mouse.up();
      await expect(page.locator('.selection-rectangle')).toBeHidden();await expect(page.locator('.colonist.selected')).toHaveCount(3);
    }
    await page.locator(`[data-pawn="${ids[1]}"]`).click();await right(17,12);await expect(page.locator('#order-menu button')).toBeDisabled();await expect(page.locator('#order-menu')).toContainText('désactivé');
    await page.keyboard.press('Escape');await page.locator(`[data-pawn="${ids[0]}"]`).click();
    await right(17,12);await page.locator(`[data-order-job="${fixture.jobs[1]!.id}"]`).click();
    await right(21,12,true);await page.locator(`[data-order-job="${fixture.jobs[2]!.id}"]`).click();
    await expect(page.locator('#selected-orders')).toContainText('1 ordre(s) en file');
    const ordered=await world(page);expect(ordered.pawns[0]!.orders).toEqual({active:fixture.jobs[1]!.id,queue:[fixture.jobs[2]!.id]});expect(validateWorld(ordered)).toEqual([]);
    await page.screenshot({path:'artifacts/player-orders.png'});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,ordered);
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).jobs.length,{timeout:15000}).toBe(0);await page.locator('[data-speed="0"]').click();
    const final=await world(page);expect(final.stock.wood).toBe(36);expect(validateWorld(final)).toEqual([]);expect(final.pawns[0]!.orders).toEqual({active:null,queue:[]});
    expect(await page.locator('#fps-counter').isVisible()).toBe(true);expect(errors).toEqual([]);
    await testInfo.attach('orders',{contentType:'application/json',body:JSON.stringify({backend:await page.evaluate(()=>window.__lisiere.backend),tick:final.tick,wood:final.stock.wood,errors})});
  } finally {await browser.close();}
});

test('livrer un chantier puis ranger une pile via les menus, file réservée, reprise exacte et finition séparée',async({playwright},testInfo)=>{
  test.setTimeout(60000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    const fixture=createWorld(42,32,32);fixture.tick=2000;fixture.tiles=fixture.tiles.map(()=>({terrain:'grass'}));fixture.resources=[];fixture.piles=[];fixture.jobs=[];fixture.structures=[];fixture.stockpiles=[];fixture.pawns=fixture.pawns.slice(0,1);
    const pawn=fixture.pawns[0]!;Object.assign(pawn,{x:12,z:16,hunger:100,rest:100});pawn.schedule.fill('anything');pawn.priorities={research:0, patient:0,bedrest:0,doctor:0,craft:2,mine:2,haul:1,build:0,gather:0,grow:0,cook:0};
    expect(applyCommand(fixture,{type:'designate',kind:'wall',x:18,z:14}).ok).toBe(true);
    expect(applyCommand(fixture,{type:'stockpile',x:16,z:18,enabled:true,filters:{wood:false,food:true},priority:2,capacity:20}).ok).toBe(true);
    addGroundMaterial(fixture,'wood',5,{x:13,z:16},'wood');addGroundMaterial(fixture,'food',10,{x:14,z:16},'rice');const rice=fixture.piles.find(p=>p.item==='rice')!;
    await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:saveKey,value:serializeWorld(fixture)});
    await page.goto('/?size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,fixture);
    const rotation={value:0};
    await perform(page,{reason:'Approvisionner le mur.',command:{type:'order-haul',pawnId:pawn.id,target:{type:'job',jobId:fixture.jobs[0]!.id},queue:false}},rotation);
    await perform(page,{reason:'Ranger ensuite le riz.',command:{type:'order-haul',pawnId:pawn.id,target:{type:'pile',pileId:rice.id},queue:true}},rotation);
    await expect(page.locator('#selected-orders')).toContainText('1 ordre(s) en file');const ordered=await world(page);expect(validateWorld(ordered)).toEqual([]);
    await page.screenshot({path:'artifacts/forced-logistics.png'});
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,ordered);
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>{const w=await world(page);return !w.pawns[0]!.haul&&!w.pawns[0]!.orders.queue.length&&w.jobs[0]?.escrow.wood===5;},{timeout:15000}).toBe(true);await page.locator('[data-speed="0"]').click();
    const delivered=await world(page);expect(delivered.structures).toEqual([]);expect(delivered.jobs[0]?.construction).toBe('frame');expect(delivered.piles.find(p=>p.item==='rice')?.owner).toEqual({type:'ground',x:16,z:18});expect(delivered.stock).toEqual({wood:0,food:10});
    await perform(page,{reason:'Activer Construction.',command:{type:'priority',pawnId:pawn.id,work:'build',value:1}},rotation);
    await perform(page,{reason:'Finir le cadre approvisionné.',command:{type:'order-job',pawnId:pawn.id,jobId:fixture.jobs[0]!.id,queue:false}},rotation);
    await page.locator('[data-speed="6"]').click();await expect.poll(async()=>(await world(page)).structures.length).toBe(1);await page.locator('[data-speed="0"]').click();
    const final=await world(page);expect(final.structures[0]?.kind).toBe('wall');expect(validateWorld(final)).toEqual([]);expect(errors).toEqual([]);expect(await page.locator('#fps-counter').isVisible()).toBe(true);
    await testInfo.attach('forced-logistics',{contentType:'application/json',body:JSON.stringify({tick:final.tick,stock:final.stock,structures:final.structures,orders:final.pawns[0]!.orders,errors})});
  } finally {await browser.close();}
});
