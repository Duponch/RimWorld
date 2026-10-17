import {expect,test,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {world,pause,panel,expectWorld,observeErrors} from './helpers';
import {perform,inspectPerson} from './player-actions';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {campaignPresentation} from '../../src/sim/secondary-site-presentation';
import {groupMemberChoices,previewGroupFormation} from '../../src/sim/group-authority';
import {candidateAccess} from '../../src/sim/candidate-access';
import {blockedCells,workNeighbours} from '../../src/sim/pathfinding';
import {choppable} from '../../src/sim/plants';
import {canDesignate} from '../../src/sim/engine';
import {constructionRecipe} from '../../src/sim/construction-materials';
import {apparelInsulation} from '../../src/sim/apparel-rules';
import {captureGroupMass} from '../../src/sim/group-capture';
import {findPlanetRoute,planetCostContext,PLANET_QUERY_NODES,PLANET_QUERY_ARCS} from '../../src/sim/planet-navigation';
import {installAulnesPerformanceProbe,captureAulnesPerformance,assertComparableAulnesView,type AulnesPerformanceCapture} from './aulnes-multimap-performance-v397';
import {captureHumanGoods,assertHumanGoodsPeople} from './aulnes-multimap-conservation-v397';
import type {Pawn,World} from '../../src/sim/types';

/** Historical basic-globe pilot; never reinterpret geographic revision3. */
function legacyPlanet(w:Pick<World,'planet'>){const planet=w.planet;if(!planet||planet.revision===3)throw Error('This historical pilot requires a literal revision1/2 planet');return planet;}

// One ROOT-only intervention; no scenario factory, stepWorld, favorable clone or RNG search.
test.skip(process.env.AULNES_MULTIMAP_V397!=='1','ROOT opt-in only after V396 is adopted, validated and frozen.');
const resumeNative01=process.env.AULNES_MULTIMAP_V397_RESUME_NATIVE01==='1';
const resumeNative02=process.env.AULNES_MULTIMAP_V397_RESUME_NATIVE02==='1';
const resumeExisting=resumeNative01||resumeNative02;
const resumeDirectory='tmp/aulnes-multimap-v397/'+(resumeNative02?'native-02':'native-01')+'/aulnes-multimap-v397-V397--6d968--two-map-reload-and-revisit/';
const parentProofSha=resumeNative02?'f7fad3005b1f54d2da64de0717f437fd279682ba095cfae41fdd96d610b70d9d':'8cd75994caaa6ce26c62b4b01d285cea71a9cb3cd94022f228602811715db58a';
const input=resumeExisting?resumeDirectory+'failure-true-complete.json':'public/test-saves/v394/les-aulnes-integrees.json';
const storedSha=resumeNative02?'8f665e33a4b182fb0bcf239dc85bafa99d2e8b71de153f6f7a4fd6ced98675fe':resumeNative01?'639dcd8ff8008572c891441d5413b7790e77ccaf34c4d29a314e5b2dc997d540':'da5c4e94508aa0d9df43e98bc3af1d6713d574dd0e906aa0ada91254344478c2';
const rawSha=resumeNative02?'8f665e33a4b182fb0bcf239dc85bafa99d2e8b71de153f6f7a4fd6ced98675fe':resumeNative01?'639dcd8ff8008572c891441d5413b7790e77ccaf34c4d29a314e5b2dc997d540':'19bd59c90dfbae4983d04cb6eae95a2eb728cd61b59b19172c37366e7704be47';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
declare global {interface Window {__aulnesV397Watch?:{memberIds:number[];danger?:{tick:number;reason:string}}}}

/** Test-only safety reader of the confirmed projection, 10 Hz; never changes a World.
 * This remains outside the perf interpretation: its overhead is present in each window. */
async function installSafety(page:Page){await page.addInitScript(()=>{
 window.__aulnesV397Watch={memberIds:[]};
 setInterval(()=>{const watch=window.__aulnesV397Watch;if(!watch||watch.danger)return;
  const audit=(window as unknown as {__performanceAudit?:{dangerFor(ids:number[]):{tick:number;reason:string}|null}}).__performanceAudit;
  const physical=audit?.dangerFor(watch.memberIds),fault=window.__lisiere?.incident;
  const danger=physical??(fault&&(fault.simulationStopped||fault.graphicsFault)?{tick:window.__lisiere.tick,reason:'Simulation ou rendu arrêté'}:null);
  if(danger){watch.danger=danger;document.querySelector<HTMLButtonElement>('[data-speed="0"]')?.click();}
 },100);
 });}
async function assertSafe(page:Page){const danger=await page.evaluate(()=>window.__aulnesV397Watch?.danger);if(danger)throw Error('Arrêt conservatoire, sans reroll: '+JSON.stringify(danger));}
async function run(page:Page,speed:'1'|'6'='6'){await assertSafe(page);await page.keyboard.press('Escape');await page.locator('[data-speed="'+speed+'"]').click();}

async function groupPanel(page:Page){await panel(page,'world');await page.locator('#world-tab-group').click();await expect(page.locator('[data-group-panel]')).toBeVisible();}
async function action(page:Page,name:string){const button=page.locator(`[data-group-action="${name}"]`);await expect(button).toHaveAttribute('aria-disabled','false');await button.click();}

/** Real visible destination selector. No forced click or world write. */
async function selectTile(page:Page,id:number){
  const select=page.locator('[data-planet-selection]');await expect(select).toBeVisible();
  await select.selectOption(String(id));await expect(select).toHaveValue(String(id));
}

/** User-authorized UI interruption is restricted to an observed ordinary leisure. */
async function interruptOnlyLeisure(page:Page,id:number){
 await pause(page);await assertSafe(page);const before=await world(page),p=before.pawns.find(p=>p.id===id)!;
 expect(p.state).toBe('recreating');expect(p.recreation.task).not.toBeNull();expect(p.jobId).toBeNull();expect(p.path).toEqual([]);expect(p.moveCooldown).toBe(0);expect(p.motion?.end??0).toBeLessThanOrEqual(before.tick);
 for(const key of ['haul','cooking','need','tend','feed','ward','rescue','surgery','surgeryRequest','animalCare','animalFeed','animalRescue','animalHandling','orbitalTrade','trade','equipmentTask','research','burial','cleaning','hunting','priorityWork','interruptedCargo','draft'])expect((p as unknown as Record<string,unknown>)[key]??null,'No protected task to interrupt: '+key).toBeNull();
 expect(p.orders).toEqual({active:null,queue:[]});expect(before.piles.some(i=>i.owner.type==='pawn'&&i.owner.pawnId===id)).toBe(false);expect(before.packed.some(i=>'pawnId' in i.owner&&i.owner.pawnId===id)).toBe(false);
 await page.waitForTimeout(250);expect(await world(page),'Confirmed pause before the sole leisure interruption').toEqual(before);
 await perform(page,{reason:'Interrompre ce seul loisir ordinaire, sans service/cargo/sommeil engagé',command:{type:'draft',pawnIds:[id],enabled:true}},{value:0});
 await perform(page,{reason:'Rendre le voyageur civil pour former la caravane',command:{type:'draft',pawnIds:[id],enabled:false}},{value:0});await pause(page);
 const after=await world(page),q=after.pawns.find(p=>p.id===id)!;expect(after.tick).toBe(before.tick);expect(q.priorities).toEqual(p.priorities);expect(q.schedule).toEqual(p.schedule);expect(q.foodPolicyId).toBe(p.foodPolicyId);
 expect(after.piles).toEqual(before.piles);expect(after.packed).toEqual(before.packed);expect(after.jobs).toEqual(before.jobs);expect(after.structures).toEqual(before.structures);expect(q.recreation.task).toBeNull();expect(q.draft).toBeUndefined();
 const actual=groupMemberChoices(after).find(c=>c.pawn.id===id);expect(actual,actual?.reason).toMatchObject({ok:true});
 return {tick:after.tick,id,before:{state:p.state,task:p.recreation.task,position:{x:p.x,z:p.z}},commands:['draft true','draft false'],after:{state:q.state,task:q.recreation.task,position:{x:q.x,z:q.z}},stockAndPrioritiesUnchanged:true};
}

async function ready(page:Page,ids:number[]){
  const available=async()=>ids.every(id=>groupMemberChoices(awaitedWorld!).some(c=>c.pawn.id===id&&c.ok));
  let awaitedWorld:World|undefined=await world(page);
  if(!await available()){
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>{awaitedWorld=await world(page);return available();},{timeout:75_000,message:'Membres réellement libres de leurs activités'}).toBe(true);
  }
  await pause(page);await assertSafe(page);
  for(const id of ids){let confirmed=await world(page),choice=groupMemberChoices(confirmed).find(c=>c.pawn.id===id);
    if(!choice?.ok&&confirmed.pawns.find(p=>p.id===id)?.recreation.task){await interruptOnlyLeisure(page,id);confirmed=await world(page);choice=groupMemberChoices(confirmed).find(c=>c.pawn.id===id);}
    expect(choice,choice?.reason??'Actual post-pause formation member').toMatchObject({ok:true});
  }
}

async function form(page:Page,ids:number[],destination:number,rations:number,info:TestInfo,label:string){
  await ready(page,ids);await groupPanel(page);
  const before=await world(page);expect(before.group).toBeUndefined();
  await page.locator('[data-group-draft-cleanup]').click();
  for(const input of await page.locator('[data-group-pile] input[aria-label^="Charger "]').all())await input.fill('');
  for(const id of ids)await page.locator(`[data-group-member="${id}"] input[type="checkbox"]`).check();
  let remaining=rations;const sources:{pileId:number;quantity:number}[]=[];
  for(const p of before.piles)if(remaining&&p.owner.type==='ground'&&p.item==='survival-meal'&&!p.foodPoison){
    const quantity=Math.min(remaining,4,p.quantity);sources.push({pileId:p.id,quantity});remaining-=quantity;
    await page.locator(`[data-group-pile="${p.id}"] input[aria-label^="Charger "]`).fill(String(quantity));
  }
  expect(remaining,'Provisions réelles présentes sur cette carte').toBe(0);
  await selectTile(page,destination);await page.locator('[data-group-preview="formation"]').click();
  await expect(page.locator('[data-group-route]')).toContainText('Route proposée');await action(page,'start');
  await page.waitForFunction(ids=>{const w=window.__lisiere.world,g=w.group;if(!g)return false;const members='members' in g?g.members.map(p=>p.id):g.memberIds;return members.length===ids.length&&ids.every(id=>members.includes(id));},ids,{polling:100,timeout:15_000});
  const forming=await world(page),formingGroup=forming.group!;expect(formingGroup.destination).toBe(destination);
  const formingIds='members' in formingGroup?formingGroup.members.map(p=>p.id):formingGroup.memberIds;expect([...formingIds].sort()).toEqual([...ids].sort());
  if('manifest' in formingGroup&&formingGroup.phase==='gathering'&&formingGroup.ledger.foodLoaded===0)expect(forming.piles).toEqual(before.piles);
  await page.screenshot({path:info.outputPath(label+'-formation.png')});
  await page.locator('[data-speed="1"]').click();
  const inventoryBefore=before.piles.filter(p=>p.item==='survival-meal'&&p.owner.type==='inventory'&&ids.includes(p.owner.pawnId)).reduce((n,p)=>n+p.quantity,0);
  await page.waitForFunction(({ids,rations,inventoryBefore})=>{
    const g=window.__lisiere.world.group;if(!g)return false;
    if('manifest' in g)return g.manifest.some(line=>line.carriedPileId!==undefined);
    if(!('members' in g)||g.members.length!==ids.length||g.members.some(p=>!ids.includes(p.id))
      ||g.ledger.foodLoaded!==rations||g.baseline.food!==inventoryBefore+rations)return false;
    const food=g.items.filter(p=>p.item==='survival-meal'&&p.owner.type==='inventory');
    return food.every(p=>p.owner.type==='inventory'&&ids.includes(p.owner.pawnId))
      &&food.reduce((n,p)=>n+p.quantity,0)===g.baseline.food-g.ledger.foodConsumed;
  },{ids,rations,inventoryBefore},{polling:100,timeout:75_000});
  await pause(page);await groupPanel(page);
  const picked=await world(page),g=picked.group;if(!g)throw Error('Le groupe attendu a quitté le checkpoint de prise.');
  let pickup:Record<string,unknown>;
  if('manifest' in g){
    expect(g.manifest.some(line=>line.carriedPileId!==undefined)).toBe(true);
    await expect(page.locator('[data-group-manifest]')).toContainText('Pile prise #');
    pickup={kind:'contact-receipt',tick:picked.tick,phase:g.phase,foodLoaded:g.ledger.foodLoaded,manifest:g.manifest.map(line=>({...line})),carried:picked.piles.filter(p=>p.owner.type==='inventory'&&ids.includes(p.owner.pawnId))};
  }else if('members' in g){
    expect(g.members.map(p=>p.id).sort()).toEqual([...ids].sort());expect(g.ledger.foodLoaded).toBe(rations);
    expect(g.baseline.food).toBe(inventoryBefore+rations);
    const food=g.items.filter(p=>p.item==='survival-meal'&&p.owner.type==='inventory');
    expect(food.every(p=>p.owner.type==='inventory'&&ids.includes(p.owner.pawnId))).toBe(true);
    expect(food.reduce((n,p)=>n+p.quantity,0)).toBe(g.baseline.food-g.ledger.foodConsumed);
    expect(new Set([...picked.piles,...g.items].map(p=>p.id)).size).toBe(picked.piles.length+g.items.length);
    const goods=page.locator('.group-details > section').filter({has:page.getByRole('heading',{name:'Biens portés',exact:true})});
    for(const pile of food){
      const row=goods.locator('tbody tr').filter({hasText:'#'+pile.id});await expect(row).toHaveCount(1);
      await expect(row.locator('td').nth(1)).toHaveText(String(pile.quantity));
      const owner=g.members.find(p=>pile.owner.type==='inventory'&&p.id===pile.owner.pawnId)!;
      await expect(row.locator('td').nth(2)).toHaveText(owner.name+' · Inventaire');
    }
    pickup={kind:'physical-travelling-inventory',tick:picked.tick,phase:g.phase,foodLoaded:g.ledger.foodLoaded,
      foodConsumed:g.ledger.foodConsumed,inventory:food.map(p=>({id:p.id,quantity:p.quantity,owner:p.owner}))};
  }else throw Error('Le groupe a déjà terminé sa phase de voyage ; conserver ce checkpoint pour diagnostic.');
  await page.screenshot({path:info.outputPath(label+'-pickup.png')});
  await page.locator('[data-speed="6"]').click();
  return {tick:forming.tick,sources,pickup};
}

async function enter(page:Page,tile:number,ids:number[],info:TestInfo,label:string){
  await page.waitForFunction(tile=>{const w=window.__lisiere.world,g=w.group;return g?.phase==='at-site'&&g.tile===tile;},tile,{polling:100,timeout:120_000});
  await pause(page);await assertSafe(page);
  await writeFile(info.outputPath(label+'-arrived-away.json'),JSON.stringify(await world(page)),'utf8');await groupPanel(page);
  const button=page.locator('[data-site-action="enter"]');await expect(button).toHaveAttribute('aria-disabled','false');await button.click();
  await page.waitForFunction(tile=>{const w=window.__lisiere.world;return w.expeditionSite?.tile===tile;},tile,{polling:100,timeout:15_000});
  await page.locator('[data-speed="6"]').click();await page.waitForFunction(()=>{const w=window.__lisiere.world;return !w.group;},undefined,{polling:100,timeout:15_000});await pause(page);
  const current=await world(page);expect((current.campaignMap?.revision===2?undefined:current.campaignMap?.active)).toBe('secondary');
  expect(current.pawns.map(p=>p.id).sort()).toEqual([...ids].sort());expect(Object.hasOwn(current,'secondarySite')).toBe(false);
  await page.keyboard.press('Escape');if(await page.locator('#world-panel').isVisible())await page.locator('#world-panel [data-close-panel]').click();await expect(page.locator('#world-panel')).toBeHidden();
  await inspectPerson(page,ids[0]!,'gear');await page.screenshot({path:info.outputPath(label+'-site.png')});
  return current;
}

async function exportCampaign(page:Page,info:TestInfo,name:string,requireTwoMaps=true){
  await pause(page);await page.keyboard.press('Escape');await panel(page,'menu');
  const manager=page.locator('[data-save-manager]');
  await manager.locator('[data-save-manager-name]').fill('Les Aulnes · voyage V397 · '+name);
  await manager.locator('[data-save-manager-action="create"]').click();
  await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const pending=page.waitForEvent('download');
  await manager.locator('[data-save-manager-action="export"]').click();
  const download=await pending,path=info.outputPath(name+'.json');await download.saveAs(path);
  const stored=await readFile(path,'utf8'),raw=await decodeStoredSave(stored),complete=deserializeWorld(raw),active=await world(page);
  expect(validateWorld(complete)).toEqual([]);if(requireTwoMaps)expect(complete.secondarySite,'L’export conserve les deux cartes').toBeDefined();
  expect(complete.tick).toBe(active.tick);
  expect(JSON.parse(JSON.stringify(campaignPresentation(complete)))).toEqual(active);
  await info.attach(name,{path,contentType:'application/json'});return {complete,active,raw,path};
}


async function restoreHomeView(page:Page,target:AulnesPerformanceCapture['start']['camera']){
 await pause(page);await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 const read=()=>page.evaluate(()=>((window as unknown as {__performanceAudit:{context():{camera:AulnesPerformanceCapture['start']['camera']}}}).__performanceAudit.context()).camera);
 if((await read()).mode!==target.mode)await page.locator('#camera-mode').click();
 const anchor=await page.evaluate(()=>{const c=document.querySelector<HTMLCanvasElement>('#viewport canvas')!,b=c.getBoundingClientRect();
  for(let y=b.top+90;y<b.bottom-120;y+=30)for(let x=b.left+b.width*.55;x<b.right-30;x+=30)if(document.elementFromPoint(x,y)===c)return {x,y};throw Error('Aucun point libre pour la caméra de référence.');});
 for(let n=0;n<4;n++){const current=await read(),ratio=target.span/current.span;if(Math.abs(ratio-1)<.00001)break;
  // Exact wheel scale from installed pinned OrbitControls, ordinary DOM event.
  await page.mouse.move(anchor.x,anchor.y);await page.mouse.wheel(0,Math.log(ratio)/-Math.log(.95)*100);await page.waitForTimeout(250);
 }
 for(let n=0;n<24;n++){
  const offset=await page.evaluate(target=>{const b=document.querySelector('#viewport canvas')!.getBoundingClientRect(),p=window.__lisiere.projectCell(target[0]!,target[2]!);return {dx:b.width/2-p.x,dy:b.height/2-p.y};},target.target);
  if(Math.hypot(offset.dx,offset.dy)<.005)break;
  await page.mouse.move(anchor.x,anchor.y);await page.mouse.down({button:'middle'});await page.mouse.move(anchor.x+Math.max(-300,Math.min(300,offset.dx)),anchor.y+Math.max(-180,Math.min(180,offset.dy)),{steps:8});await page.mouse.up({button:'middle'});await page.waitForTimeout(250);
 }
 await page.waitForTimeout(500);await assertSafe(page);
}

/** Wait for a genuine safe idle boundary; nobody is awakened, released or healed. */
async function chooseMember(page:Page,originalIds:number[]){
 await run(page);
 const handle=await page.waitForFunction(originalIds=>{
  const w=window.__lisiere.world;if(window.__aulnesV397Watch?.danger)return -1;
  const taskKeys=['animalHandling','animalCare','animalFeed','animalRescue','burial','cleaning','orbitalTrade','trade','firefighting','ward','heatRefuge','research','hunting','feed','tend','surgery','surgeryRequest','rescue','equipmentTask','priorityWork'];
  const eligible=w.pawns.filter(p=>{
   const h=p.health;
   return originalIds.includes(p.id)&&!p.prisoner&&!p.visitor&&!p.raid&&p.id!==20492&&p.state==='idle'&&p.rest>=60&&p.hunger>30
    &&!p.path.length&&p.moveCooldown<=0&&(p.motion?.end??0)<=w.tick&&p.jobId===null&&!p.haul&&!p.cooking&&!p.need&&!p.orders.active&&!p.orders.queue.length
    &&!p.recreation.task&&!p.draft&&!p.mental?.crisis&&!p.interruptedCargo&&!taskKeys.some(k=>!!(p as unknown as Record<string,unknown>)[k])
    &&(!h||!h.death&&!h.injuries.length&&!h.missing.length&&!h.bloodLoss&&!h.heatstroke&&!h.hypothermia&&!h.malnutrition&&!h.infections&&!h.flu&&!h.foodPoisoning&&!h.anesthetic)
    &&!w.piles.some(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)&&!w.packed.some(i=>'pawnId' in i.owner&&i.owner.pawnId===p.id);
  }).sort((a,b)=>b.rest-a.rest||a.id-b.id);
  return eligible[0]?.id??false;
 },originalIds,{polling:100,timeout:90_000});
 const id=await handle.jsonValue();await pause(page);await assertSafe(page);if(typeof id!=='number'||id<1)throw Error('Aucun voyageur sain libre au checkpoint conservé.');
 return id;
}
const wood=(w:World)=>w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0);

async function exactReload(page:Page,info:TestInfo,label:string){
 const before=await exportCampaign(page,info,label);
 await page.locator('#browse-saves').click();await page.locator('.front-menu input[type=file]').setInputFiles(before.path);
 await expect(page.locator('.front-menu')).toBeHidden({timeout:60_000});await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});await pause(page);
 await expectWorld(page,before.active);const after=await exportCampaign(page,info,label+'-reloaded');expect(after.complete).toEqual(before.complete);
 return after;
}

async function workOnSite(page:Page,info:TestInfo,id:number){
 const local=await world(page),blocked=blockedCells(local),pawn=local.pawns.find(p=>p.id===id)!,q=candidateAccess(local,pawn,blocked,new Set(),true);
 const tree=local.resources.filter(r=>r.kind==='tree'&&choppable(local,r)&&r.amount>5&&workNeighbours(r).some(c=>c.x>=0&&c.z>=0&&c.x<local.width&&c.z<local.height&&q.has(c.z*local.width+c.x)))
  .sort((a,b)=>Math.abs(a.x-pawn.x)+Math.abs(a.z-pawn.z)-Math.abs(b.x-pawn.x)-Math.abs(b.z-pawn.z)||a.id-b.id)[0];
 if(!tree)throw Error('Aucun arbre réellement accessible pour ce voyage ; conserver le site sans reroll.');
 const rotation={value:0};await perform(page,{reason:'Coupe réelle du second site depuis Les Aulnes',command:{type:'priority',pawnId:id,work:'gather',value:1}},rotation);
 await perform(page,{reason:'Première modification durable de ce site',command:{type:'designate',kind:'chop',x:tree.x,z:tree.z}},rotation);
 const job=(await world(page)).jobs.find(j=>j.kind==='chop'&&j.x===tree.x&&j.z===tree.z)!;
 await run(page,'1');const contact=await page.waitForFunction(({jobId,treeId,woodBefore})=>{const w=window.__lisiere.world,p=w.pawns.find(p=>p.jobId===jobId&&p.state==='working');
  if(p)return {tick:w.tick,phase:'contact',jobId,pawnId:p.id,position:{x:p.x,z:p.z},treePresent:w.resources.some(r=>r.id===treeId)};
  const total=w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0);
  return !w.resources.some(r=>r.id===treeId)&&!w.jobs.some(j=>j.id===jobId)&&total>woodBefore?{tick:w.tick,phase:'already-cut',jobId,wood:total}:false;
 },{jobId:job.id,treeId:tree.id,woodBefore:wood(local)},{polling:100,timeout:60_000});
 const chopReceipt=await contact.jsonValue();await pause(page);await assertSafe(page);
 await page.screenshot({path:info.outputPath('02-real-chop-contact-or-finished.png')});
 await run(page);await page.waitForFunction(treeId=>{const w=window.__lisiere.world;return !w.resources.some(r=>r.id===treeId);},tree.id,{polling:100,timeout:75_000});await pause(page);await assertSafe(page);
 await perform(page,{reason:'Une seule coupe, stock laissé sur place',command:{type:'priority',pawnId:id,work:'gather',value:0}},rotation);
 const cut=await world(page),beforeWood=wood(cut),recipe=constructionRecipe({kind:'wall',material:'wood'}),cost=recipe.ingredients.find(i=>i.item==='wood')!.quantity;
 expect(beforeWood).toBeGreaterThan(cost); // Need a genuinely surviving stock oracle as well as the paid wall.
 const cells=[];for(let z=Math.max(1,tree.z-5);z<=Math.min(cut.height-2,tree.z+5);z++)for(let x=Math.max(1,tree.x-5);x<=Math.min(cut.width-2,tree.x+5);x++)cells.push({x,z});
 const cell=cells.sort((a,b)=>Math.abs(a.x-tree.x)+Math.abs(a.z-tree.z)-Math.abs(b.x-tree.x)-Math.abs(b.z-tree.z)||a.z-b.z||a.x-b.x)
  .find(c=>canDesignate(cut,{type:'designate',kind:'wall',material:'wood',...c}).ok&&!cut.piles.some(p=>p.owner.type==='ground'&&p.owner.x===c.x&&p.owner.z===c.z));
 if(!cell)throw Error('Aucun chantier proche admissible sans déplacement préparatoire de biens.');
 await perform(page,{reason:'Construire réellement avec le bois acquis ici',command:{type:'priority',pawnId:id,work:'build',value:1}},rotation);
 await perform(page,{reason:'Première petite construction payée sur place',command:{type:'designate',kind:'wall',material:'wood',...cell}},rotation);
 const blueprint=(await world(page)).jobs.find(j=>j.kind==='wall'&&j.x===cell.x&&j.z===cell.z)!;
 await run(page,'1');const frameHit=await page.waitForFunction(({jobId,cell,woodBefore,cost})=>{const w=window.__lisiere.world,j=w.jobs.find(j=>j.id===jobId),p=w.pawns.find(p=>p.jobId===jobId&&p.state==='working');
  if(j?.construction==='frame'&&j.progress>0&&p)return {tick:w.tick,phase:'paid-frame-contact',jobId,progress:j.progress,pawnId:p.id,position:{x:p.x,z:p.z},jobWood:w.piles.filter(p=>p.owner.type==='job'&&p.owner.jobId===jobId&&p.item==='wood').reduce((n,p)=>n+p.quantity,0)};
  const wall=w.structures.find(s=>s.kind==='wall'&&s.x===cell.x&&s.z===cell.z),total=w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0);
  return wall&&!j&&total===woodBefore-cost?{tick:w.tick,phase:'already-built-paid',jobId,wallId:wall.id,wood:total}:false;
 },{jobId:blueprint.id,cell,woodBefore:beforeWood,cost},{polling:100,timeout:75_000});
 const frameReceipt=await frameHit.jsonValue();await pause(page);await assertSafe(page);
 const frame=await world(page);await writeFile(info.outputPath('paid-frame-or-finished.json'),JSON.stringify(frame),'utf8');
 if(frameReceipt&&frameReceipt.phase==='paid-frame-contact')expect(frameReceipt.jobWood).toBe(cost);
 await page.screenshot({path:info.outputPath('03-paid-frame-or-finished.png')});
 await run(page);await page.waitForFunction(c=>{const w=window.__lisiere.world;return w.structures.some(s=>s.kind==='wall'&&s.x===c.x&&s.z===c.z);},cell,{polling:100,timeout:75_000});await pause(page);await assertSafe(page);
 await perform(page,{reason:'Travail terminé avant préparation du retour',command:{type:'priority',pawnId:id,work:'build',value:0}},rotation);
 const built=await world(page),wall=built.structures.find(s=>s.kind==='wall'&&s.x===cell.x&&s.z===cell.z)!;
 expect(wood(built)).toBe(beforeWood-cost);expect(built.jobs.some(j=>j.id===blueprint.id)).toBe(false);
 const stock=built.piles.filter(p=>p.item==='wood'&&p.owner.type==='ground').map(p=>({id:p.id,item:p.item,quantity:p.quantity,owner:p.owner}));expect(stock.length).toBeGreaterThan(0);
 return {treeId:tree.id,chopJobId:job.id,chopReceipt,constructionJobId:blueprint.id,frameReceipt,wall:{id:wall.id,kind:wall.kind,x:wall.x,z:wall.z,material:wall.material},stock,woodBefore:beforeWood,woodPaid:cost,tick:built.tick};
}

test('V397 actual Aulnes250²: one real round trip, local paid work, exact two-map reload and revisit',async({page},info)=>{
 test.setTimeout(720_000);page.setDefaultTimeout(15_000);
 const proof:Record<string,any>={complete:false,boundSeconds:720,input,storedSha,rawSha,scope:'One continuous honest Aulnes intervention. No prepared favorable world, reroll, healing, teleport, RNG search or general wood freight.'};
 const errors=observeErrors(page);let initial:World|undefined,ids:number[]=[];
 await installAulnesPerformanceProbe(page);await installSafety(page);
 try{
  const stored=await readFile(resolve(input),'utf8'),raw=await decodeStoredSave(stored);expect(sha(stored)).toBe(storedSha);expect(sha(raw)).toBe(rawSha);
  let parentProof:Record<string,any>|undefined;
  if(resumeExisting){const parentRaw=await readFile(resolve(resumeDirectory+'proof.json'),'utf8');expect(sha(parentRaw)).toBe(parentProofSha);parentProof=JSON.parse(parentRaw);
   expect(parentProof!.complete).toBe(false);expect(parentProof!.selection).toMatchObject({id:20331,tick:12303,originalPolicy:5});expect(parentProof!.failureExport).toMatchObject({tick:resumeNative02?14500:12303,rawSha256:rawSha});
   expect(parentProof!.performance.map((p:AulnesPerformanceCapture)=>p.label)).toEqual(['home-before-x0','home-before-x1','home-before-x6']);
   proof.parent={checkpoint:input,checkpointRawSha256:rawSha,proof:resumeDirectory+'proof.json',proofSha256:parentProofSha,priorError:parentProof!.error,notice:resumeNative02?'Actual native02 reached site65 and unloaded at14500. Inherit outbound/preflight and home0/1/6; resume local work only, no formation/departure/entry replay.':'Actual native01 interval10733 to12303 is partial and retained. Inherit home0/1/6 and original census; no replay10733 or outbound claimed.'};
  }
  if(resumeNative02){proof.outbound=parentProof!.outbound;proof.preflight=parentProof!.preflight;proof.leisureInterruption=parentProof!.leisureInterruption;}
  const historical=JSON.parse(raw) as World;expect(historical.schemaVersion).toBe(resumeExisting?252:250);expect(historical.tick).toBe(resumeNative02?14500:resumeNative01?12303:10733);
  initial=deserializeWorld(raw);expect(initial.schemaVersion).toBe(252);expect(validateWorld(initial)).toEqual([]);expect([initial.width,initial.height]).toEqual([250,250]);
  expect(initial.pawns).toHaveLength(resumeNative02?14:15);expect(legacyPlanet(initial).tiles).toHaveLength(162);expect(initial.planet?.homeTile).toBe(0);expect(initial.planet?.civilianTile).toBe(70);expect(initial.group).toBeUndefined();if(resumeNative02){expect(initial.secondarySite).toMatchObject({tile:65,selected:true});expect(initial.secondarySite!.map.pawns.map(p=>p.id)).toEqual([20331]);expect(initial.secondarySite!.map.group).toBeUndefined();}else expect(initial.secondarySite).toBeUndefined();
  if(!resumeNative02)expect(initial.piles.filter(p=>p.item==='survival-meal'&&p.owner.type==='ground').reduce((n,p)=>n+p.quantity,0)).toBe(40);
  const originalIds=resumeExisting?parentProof!.initialPeople.map((p:{id:number})=>p.id) as number[]:initial.pawns.map(p=>p.id),
   initialCensus=resumeExisting?parentProof!.initialGoods as ReturnType<typeof captureHumanGoods>:captureHumanGoods(initial);
  proof.initialPeople=resumeExisting?parentProof!.initialPeople:initial.pawns.map(p=>({id:p.id,name:p.name,state:p.state}));proof.initialGoods=initialCensus;
  if(resumeExisting){proof.resumeGoods=captureHumanGoods(initial);assertHumanGoodsPeople(initialCensus,proof.resumeGoods,originalIds);}
  await page.goto('/?e2e');const front=page.locator('.front-menu');await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(resolve(input));
  await expect(front).toBeHidden({timeout:60_000});await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});await pause(page);await expectWorld(page,resumeNative02?JSON.parse(JSON.stringify(campaignPresentation(initial))) as World:initial);
  const homeBefore:AulnesPerformanceCapture[]=resumeExisting?parentProof!.performance:[];
  if(!resumeExisting)for(const speed of [0,1,6] as const){homeBefore.push(await captureAulnesPerformance(page,{label:'home-before-x'+speed,speed,windowMs:3000,campaign:initialCensus}));await assertSafe(page);}
  proof.performance=[...homeBefore];
  const id=resumeExisting?20331:await chooseMember(page,originalIds);ids=[id];await page.evaluate(ids=>{window.__aulnesV397Watch!.memberIds=ids;},ids);
  const member=(await world(page)).pawns.find(p=>p.id===id)!,originalPolicy=resumeExisting?parentProof!.selection.originalPolicy:member.foodPolicyId,originalPriorities=resumeExisting?parentProof!.selection.originalPriorities as Pawn['priorities']:{...member.priorities};
  proof.selection={id,name:member.name,tick:(await world(page)).tick,originalPolicy,originalPriorities,note:resumeNative02?'Inherited same Tao on actual site65 at14500; continue work, without re-forming or re-entering.':resumeNative01?'Same native01 Tao; actual paused state is recreation. Only that explicitly observed leisure is interrupted.':'Natural candidate revalidated after pause; protected work is never cancelled.'};
  let readyWorld=await world(page),choice=groupMemberChoices(readyWorld).find(c=>c.pawn.id===id);
  if(!resumeNative02){
  if(resumeNative01){expect(member.recreation.task).toMatchObject({activity:'horseshoes',buildingId:20651,phase:'active',elapsed:78});expect(member.foodPolicyId).toBe(2);proof.leisureInterruption=await interruptOnlyLeisure(page,id);}
  else await perform(page,{reason:'Autoriser les rations réelles uniquement pour le voyageur choisi',command:{type:'food-policy-assign',pawnId:id,policyId:2}},{value:0});
  readyWorld=await world(page);choice=groupMemberChoices(readyWorld).find(c=>c.pawn.id===id);
  if(!choice?.ok&&readyWorld.pawns.find(p=>p.id===id)?.recreation.task){proof.leisureInterruption=await interruptOnlyLeisure(page,id);readyWorld=await world(page);choice=groupMemberChoices(readyWorld).find(c=>c.pawn.id===id);}
  proof.formationEligibility={tick:readyWorld.tick,ok:choice?.ok,reason:choice?.reason};expect(choice,choice?.reason??'Actual post-pause caravan eligibility').toMatchObject({ok:true});
  }
  const worn=readyWorld.piles.filter(p=>p.owner.type==='apparel'&&p.owner.pawnId===id),equipment=readyWorld.piles.filter(p=>p.owner.type==='equipment'&&p.owner.pawnId===id);
  if(!resumeNative02){
  const owned=readyWorld.piles.filter(p=>'pawnId' in p.owner&&p.owner.pawnId===id),mass=captureGroupMass([readyWorld.pawns.find(p=>p.id===id)!],owned);expect(mass).toBeDefined();
  const route=findPlanetRoute(readyWorld.planet!,0,65,planetCostContext(readyWorld,mass!),{nodes:PLANET_QUERY_NODES,arcs:PLANET_QUERY_ARCS});expect(route.kind).toBe('found');if(route.kind!=='found')throw Error('Route65 refusée.');
  expect(route.tiles).toEqual([0,59,65]);expect(legacyPlanet(readyWorld).tiles[65]).toMatchObject({biome:'temperate-forest',hilliness:'small-hills'});
  const sources=readyWorld.piles.filter(p=>p.owner.type==='ground'&&p.item==='survival-meal'&&!p.foodPoison).slice(0,2).map(p=>({pileId:p.id,quantity:4}));
  const preview=previewGroupFormation(readyWorld,ids,sources,65);expect(preview.ok).toBe(true);
  proof.preflight={route,preview,apparel:worn.map(p=>({id:p.id,item:p.item,owner:p.owner,insulation:apparelInsulation(p)})),equipment:equipment.map(p=>({id:p.id,item:p.item,owner:p.owner})),tiles:route.tiles.map(i=>legacyPlanet(readyWorld).tiles[i]),policy:readyWorld.foodPolicies.find(p=>p.id===2),note:'No admissible direct neighbour: four oceans and mountain59. Choose existing temperate65 via59; no map regenerated, clothes unchanged.'};
  await inspectPerson(page,id,'gear');await page.screenshot({path:info.outputPath('01-actual-traveller-before-formation.png')});
  proof.outbound=await form(page,ids,65,8,info,'outbound');await assertSafe(page);await enter(page,65,ids,info,'first-entry');await assertSafe(page);
  }
  await page.keyboard.press('Escape');
  if(await page.locator('#world-panel').isVisible())await page.locator('#world-panel [data-close-panel]').click();
  await expect(page.locator('#world-panel')).toBeHidden();
  const work=await workOnSite(page,info,id);proof.localWork=work;
  const saved=await exactReload(page,info,'two-map-after-work');proof.twoMapReloadExact=true;const siteCensus=captureHumanGoods(saved.complete);proof.siteGoods=siteCensus;assertHumanGoodsPeople(initialCensus,siteCensus,originalIds);
  proof.performance.push(await captureAulnesPerformance(page,{label:'secondary-two-maps',speed:6,windowMs:3000,campaign:siteCensus}));await assertSafe(page);
  proof.returnPreparation=await form(page,ids,0,1,info,'return');
  await page.waitForFunction(ids=>{const w=window.__lisiere.world,g=w.group;return (w.campaignMap?.revision===2?undefined:w.campaignMap?.active)==='home'&&(!!g&&'members' in g&&g.members.every(p=>ids.includes(p.id))||!g&&ids.every(id=>w.pawns.some(p=>p.id===id)));},ids,{polling:100,timeout:75_000});
  await page.waitForFunction(ids=>{const w=window.__lisiere.world;return !w.group&&ids.every(id=>w.pawns.some(p=>p.id===id));},ids,{polling:100,timeout:120_000});await pause(page);await assertSafe(page);
  const returned=await exportCampaign(page,info,'home-returned');proof.returnedAt=returned.complete.tick;const returnedCensus=captureHumanGoods(returned.complete);proof.returnedGoods=returnedCensus;assertHumanGoodsPeople(initialCensus,returnedCensus,originalIds);
  expect(returned.complete.piles.some(p=>p.owner.type==='inventory'&&ids.includes(p.owner.pawnId))).toBe(false);
  await restoreHomeView(page,homeBefore[0]!.start.camera);
  for(const [index,speed] of ([0,1,6] as const).entries()){const measured=await captureAulnesPerformance(page,{label:'home-returned-x'+speed,speed,windowMs:3000,campaign:returnedCensus});proof.performance.push(measured);await assertSafe(page);assertComparableAulnesView(homeBefore[index]!,measured);}
  // The same expedition continues toward its saved site; retain policy2 until its eventual final return.
  proof.revisitPreparation=await form(page,ids,65,3,info,'revisit');await enter(page,65,ids,info,'revisit');await assertSafe(page);
  // Preserve a genuine whole-campaign export BEFORE final business assertions.
  for(const work of ['gather','build'] as const)await perform(page,{reason:'Rétablir les priorités propres du voyageur après travaux',command:{type:'priority',pawnId:id,work,value:originalPriorities[work]}},{value:0});
  const final=await exportCampaign(page,info,'revisited-final-complete');proof.finalExport={path:final.path,tick:final.complete.tick,rawSha256:sha(final.raw)};proof.finalGoods=captureHumanGoods(final.complete);
  assertHumanGoodsPeople(initialCensus,proof.finalGoods,originalIds);
  for(const original of [...worn,...equipment]){const occurrences=proof.finalGoods.piles.filter((r:{pile:{id:number}})=>r.pile.id===original.id);expect(occurrences).toHaveLength(1);expect(occurrences[0].pile).toMatchObject({id:original.id,item:original.item,quantity:original.quantity});}expect(final.complete.secondarySite!.tile).toBe(65);expect(final.complete.secondarySite!.createdAt).toBe(saved.complete.secondarySite!.createdAt);
  const local=final.active;expect(local.pawns.map(p=>p.id)).toEqual(ids);expect(local.resources.some(r=>r.id===work.treeId)).toBe(false);
  expect(local.structures.find(s=>s.id===work.wall.id)).toMatchObject(work.wall);
  for(const stock of work.stock)expect(local.piles.find(p=>p.id===stock.id)).toMatchObject(stock); // Damage may advance prospectively; identity/quantity/owner must remain.
  expect(wood(local)).toBe(work.woodBefore-work.woodPaid);expect(errors).toEqual([]);expect(await page.evaluate(()=>window.__lisiere.incident)).toMatchObject({simulationStopped:false,graphicsFault:false,waiting:0});
  await page.keyboard.press('Escape');await page.screenshot({path:info.outputPath('04-revisited-same-site-stock-wall.png')});
  proof.complete=true;proof.finalStatus='Same original traveller on persisted site65; resident colony retained, policy2 remains for ongoing expedition. General wood freight unsupported and unclaimed.';
 }catch(error){proof.error=error instanceof Error?error.message:String(error);await pause(page).catch(()=>{});proof.danger=await page.evaluate(()=>window.__aulnesV397Watch?.danger).catch(()=>null);
  try{const saved=await exportCampaign(page,info,'failure-true-complete',false);proof.failureExport={path:saved.path,tick:saved.complete.tick,rawSha256:sha(saved.raw)};}catch(cause){proof.conservationError=String(cause);const active=await page.evaluate(()=>JSON.stringify(window.__lisiere?.world)).catch(()=>null);if(active)await writeFile(info.outputPath('failure-active-projection.json'),active,'utf8');}
  throw error;
 }finally{proof.errors=errors;await writeFile(info.outputPath('proof.json'),JSON.stringify(proof,null,2),'utf8');}
});
