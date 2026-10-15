/* ROOT opt-in V361: a prepared 32² storage scene, never the natural campaign.
 * All orders/imports/exports/reloads are player UI gestures. __lisiere is read
 * only for observed World, projection, backend and technical incidents.
 */
import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {world,pause,panel,expectWorld,observeErrors,tool,cell} from './helpers';
import {perform,revealCells} from './player-actions';
import {deconstructionCamp} from '../scenarios/deconstruction';
import {addGroundMaterial} from '../../src/sim/materials';
import {COMPLEX_FURNITURE_RESEARCH_COST} from '../../src/sim/research';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {readShelfInspection} from '../../src/ui/shelf-inspection';
import type {World,Command} from '../../src/sim/types';

const TARGET={x:17,z:18},RESIDUAL={x:18,z:18},SECOND={x:21,z:18},SECOND_RESIDUAL={x:22,z:18};
const sha=(text:string)=>createHash('sha256').update(text).digest('hex');
test.use({channel:'chrome'});

test('V361 UI blueprint, paid frame, shelf and same-object reinstallation over a stockpile',async({page},info)=>{
 test.skip(process.env.V361!=='1','ROOT opt-in; synthetic storage qualification only.');
 test.setTimeout(240000);page.setDefaultTimeout(10000);
 const segment=process.env.V361_SEGMENT??'01';expect(segment).toMatch(/^[a-zA-Z0-9_-]{1,32}$/);
 const initial=deconstructionCamp(1,32);initial.stockpiles=[];initial.growingZones=[];
 initial.research={project:null,points:0,complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:initial.tick}};
 const worker=initial.pawns[0]!;worker.priorities.build=1;worker.priorities.haul=2;
 addGroundMaterial(initial,'wood',10,{x:14,z:16},'wood');
 addGroundMaterial(initial,'food',5,TARGET,'rice');
 const riceId=initial.piles.find(p=>p.item==='rice')!.id,woodId=initial.piles.find(p=>p.item==='wood')!.id;
 expect(validateWorld(initial)).toEqual([]);
 const input=serializeWorld(initial),inputPath=info.outputPath('prepared-input.json');await writeFile(inputPath,input);
 const errors=observeErrors(page),rotation={value:0},started=Date.now(),deadline=started+180000;
 const actions:unknown[]=[],journal:unknown[]=[],lifecycle:unknown[]=[],checkpoints:unknown[]=[];
 let last:World|undefined,loaded=false,stage='input',failure:unknown,conservation:unknown,backend:unknown,shelfId:number|undefined,shelfCells:number[]=[];
 const front=()=>page.locator('.front-menu');
 const closeMenu=async()=>{if(await page.locator('#menu-panel').isVisible())await page.locator('[data-panel="menu"]').click();};
 const onCrash=()=>lifecycle.push({kind:'pagecrash'}),onClose=()=>lifecycle.push({kind:'pageclose'}),onDisconnect=()=>lifecycle.push({kind:'browserdisconnected'});
 page.on('crash',onCrash);page.on('close',onClose);const browser=page.context().browser();browser?.on('disconnected',onDisconnect);
 let lastKey='';
 const read=async()=>{
  const w=await world(page);last=w;backend=await page.evaluate(()=>window.__lisiere.backend);
  expect(errors).toEqual([]);expect(lifecycle).toEqual([]);
  const incident=await page.evaluate(()=>window.__lisiere.incident);expect(incident.graphicsFault||incident.simulationStopped).toBe(false);
  expect(w.pawns.map(p=>p.id)).toEqual([worker.id]);expect(w.pawns[0]!.state).not.toBe('dead');expect(w.pawns[0]!.state).not.toBe('downed');
  expect(w.piles.find(p=>p.id===riceId)).toMatchObject({id:riceId,item:'rice',quantity:5,owner:{type:'ground',...TARGET}});
  if(Date.now()>deadline)throw Error('V361 body bound; preserve the last actual state.');
  const sample={stage,tick:w.tick,worker:w.pawns[0],jobs:w.jobs,structures:w.structures,packed:w.packed,piles:w.piles,stockpiles:w.stockpiles,events:w.events.slice(-8)};
  const key=JSON.stringify([stage,w.pawns[0]!.haul?.phase,w.pawns[0]!.jobId,w.jobs.map(j=>[j.id,j.construction,j.escrow]),w.structures.map(s=>s.id),w.packed.map(p=>[p.building.id,p.owner.type])]);
  if(key!==lastKey){journal.push(sample);if(journal.length>80)journal.shift();lastKey=key;}
  return w;
 };
 const wait=async(done:(w:World)=>boolean)=>{for(let i=0;i<1800;i++){const w=await read();if(done(w))return w;if(w.tick>initial.tick+1600)throw Error('V361 tick bound');await page.waitForTimeout(40);}throw Error('V361 observation bound');};
 const act=async(command:Command,reason:string)=>{await pause(page);await closeMenu();await perform(page,{command,reason},rotation);const w=await read();actions.push({command,reason,tick:w.tick});return w;};
 const run=async()=>{await closeMenu();await page.keyboard.press('Escape');await page.locator('[data-speed="1"]').click();await expect(page.locator('[data-speed="1"]')).toHaveAttribute('aria-pressed','true');};
 const capture=async(name:string,screenshot=true)=>{
  await pause(page);await closeMenu();const before=await read();expect(validateWorld(before)).toEqual([]);
  if(screenshot)await page.screenshot({path:info.outputPath(name+'.png')});
  await panel(page,'menu');const manager=page.locator('[data-save-manager]'),label=`V361 ${segment} ${name}`;
  await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();
  await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
  const path=info.outputPath(name+'.json');await(await download).saveAs(path);const text=await readFile(path,'utf8');expect(deserializeWorld(text)).toEqual(before);
  await page.locator('#browse-saves').click();
  const row=front().locator('label').filter({has:page.locator('strong').filter({hasText:label})});
  await row.locator('input[name="front-save"]').check();await front().getByRole('button',{name:'Charger',exact:true}).click();
  await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:90000});await expectWorld(page,before);
  checkpoints.push({name,path,tick:before.tick,sha256:sha(text),exactReload:true,screenshot});await info.attach(name,{contentType:'application/json',path});await closeMenu();return before;
 };
 const inspectShelf=async(id:number)=>{
  await tool(page,'select');const w=await read(),s=w.structures.find(s=>s.id===id)!;await revealCells(page,[s]);
  for(let n=0;n<w.pawns.length+w.piles.length+5;n++){await revealCells(page,[s]);await cell(page,s.x,s.z);if(await page.locator(`[data-shelf-controls="${id}"]`).isVisible())return;}
  throw Error('Shelf selection did not reach its real inspector.');
 };
 const stockpile=(from:typeof TARGET,to:typeof TARGET):Command=>({type:'area',action:'stockpile',from,to,filters:{wood:true,food:false},items:{wood:true},priority:2,allowFresh:true,allowRotten:false});
 try{
  await page.goto('/?e2e');await front().getByRole('button',{name:'Charger une partie',exact:true}).click();await front().locator('input[type=file]').setInputFiles(inputPath);
  await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:90000});await expectWorld(page,initial);loaded=true;await pause(page);
  // Exercise the new growing-intent boundary with genuine UI discovery first.
  // Growing is disabled for this prepared worker; intentions are discovered
  // by the normal farming scan and never fabricated as jobs or debug commands.
  const sowCell={x:9,z:10},sowResidual={x:10,z:10};stage='growing-intent';
  let w=await act({type:'area',action:'growing',from:sowCell,to:sowResidual},'Créer une culture avant le calcul ordinaire des intentions de semis.');
  const growingId=w.growingZones[0]!.id;await run();
  await wait(state=>state.jobs.some(j=>j.kind==='sow'&&j.growingZoneId===growingId&&j.x===sowCell.x&&j.z===sowCell.z));await pause(page);
  w=await act({type:'designate',kind:'small-shelf',...sowCell,orientation:0,material:'wood'},'Placer un blueprint sur le semis automatique, sans payer ni terminer ce premier plan.');
  expect(w.growingZones[0]).toMatchObject({id:growingId,cells:[sowResidual.z*w.width+sowResidual.x]});
  expect(w.jobs.filter(j=>j.growingZoneId===growingId)).toHaveLength(0);expect(w.jobs.find(j=>j.kind==='small-shelf')).toMatchObject({construction:'blueprint',escrow:{wood:0}});
  await capture('sowing-blueprint',false);
  await act({type:'area',action:'cancel',from:sowCell,to:sowCell},'Annuler le plan non payé par Ordres, en conservant les vrais matériaux.');
  w=await act({type:'area',action:'remove-growing',from:sowCell,to:sowResidual},'Retirer la cellule de culture résiduelle par Zones avant la chaîne principale.');
  expect(w.jobs).toHaveLength(0);expect(w.growingZones).toHaveLength(0);
  // A wood-only reserve is deliberate: the original rice remains at its real
  // cell instead of being hauled/reidentified while the construction is held.
  stage='stockpile-ui';w=await act(stockpile(TARGET,RESIDUAL),'Créer deux cellules de réserve par Zones, avec leur vraie politique.');
  const residual=structuredClone(w.stockpiles.find(s=>s.x===RESIDUAL.x&&s.z===RESIDUAL.z)!);expect(w.stockpiles).toHaveLength(2);
  stage='blueprint';w=await act({type:'designate',kind:'small-shelf',...TARGET,orientation:0,material:'wood'},'Placer la petite étagère directement sur une cellule de réserve existante.');
  const jobId=w.jobs.find(j=>j.kind==='small-shelf')!.id;
  expect(w.jobs.find(j=>j.id===jobId)).toMatchObject({construction:'blueprint',escrow:{wood:0,food:0}});expect(w.stockpiles).toEqual([residual]);expect(w.structures).toHaveLength(0);
  expect(w.piles.find(p=>p.id===woodId)).toMatchObject({quantity:10,owner:{type:'ground',x:14,z:16}});await capture('blueprint');
  // Real Work UI temporarily separates delivery from finishing, so the paid
  // frame is observable without a timing shortcut or frozen debug worker.
  await act({type:'priority',pawnId:worker.id,work:'build',value:0},'Suspendre Construction pendant la livraison afin d’observer le vrai cadre payé.');
  stage='delivery';w=await act({type:'order-haul',pawnId:worker.id,target:{type:'job',jobId},queue:false},'Livrer les dix bois physiques au chantier par le menu contextuel.');
  expect(w.pawns[0]!.haul?.sourcePileId).toBe(woodId);await run();
  await wait(state=>state.jobs.find(j=>j.id===jobId)?.construction==='frame'&&state.jobs.find(j=>j.id===jobId)?.escrow.wood===10);
  await pause(page);w=await read();stage='frame';expect(w.jobs.find(j=>j.id===jobId)).toMatchObject({construction:'frame',progress:0,escrow:{wood:10,food:0}});
  expect(w.piles.filter(p=>p.owner.type==='job'&&p.owner.jobId===jobId).reduce((sum,p)=>sum+p.quantity,0)).toBe(10);expect(w.structures).toHaveLength(0);await capture('paid-frame');
  await act({type:'priority',pawnId:worker.id,work:'haul',value:0},'Suspendre les transports génériques ; les identités de contenu restent observables.');
  await act({type:'priority',pawnId:worker.id,work:'build',value:1},'Réactiver le constructeur pour terminer son cadre approvisionné.');
  stage='finish';await run();await wait(state=>state.structures.some(s=>s.kind==='small-shelf'));await pause(page);w=await read();
  const built=w.structures.find(s=>s.kind==='small-shelf')!;shelfId=built.id;shelfCells=[...built.shelf!.cells];
  expect(w.jobs).toHaveLength(0);expect(w.piles.filter(p=>p.item==='wood')).toHaveLength(0);expect(w.stockpiles).toEqual([residual]);
  expect(shelfCells).toHaveLength(1);expect(shelfCells[0]).not.toBe(shelfId);expect(readShelfInspection(w,built)).toMatchObject({capacity:3,cellIds:shelfCells});
  expect(Object.hasOwn(built,'quality')).toBe(false);await inspectShelf(shelfId);await expect(page.locator('[data-shelf-slots]')).toHaveText('1 / 3 emplacements occupés');
  await expect(page.locator(`[data-shelf-pile="${riceId}"]`)).toBeVisible();
  // One real policy change provides a preservation witness for minification.
  await page.locator(`[data-shelf-controls="${shelfId}"] [data-storage-priority]`).selectOption('4');await wait(state=>state.structures.find(s=>s.id===shelfId)?.shelf?.settings.priority===4);
  const settings=structuredClone((await read()).structures.find(s=>s.id===shelfId)!.shelf!.settings);await capture('built-shelf');
  stage='second-stockpile';w=await act(stockpile(SECOND,SECOND_RESIDUAL),'Préparer une seconde réserve cible par la même UI Zones.');
  const secondResidual=structuredClone(w.stockpiles.find(s=>s.x===SECOND_RESIDUAL.x&&s.z===SECOND_RESIDUAL.z)!);
  stage='uninstall';await act({type:'designate',kind:'uninstall',targetId:shelfId,...TARGET},'Désinstaller le même meuble par son inspection, sans copier son contenu.');
  await run();await wait(state=>state.packed.some(p=>p.building.id===shelfId&&p.owner.type==='ground'));await pause(page);w=await read();
  const packed=w.packed.find(p=>p.building.id===shelfId)!;expect(packed.building.shelf).toEqual({cells:shelfCells,settings});expect(w.structures.some(s=>s.id===shelfId)).toBe(false);
  stage='install-blueprint';w=await act({type:'install',structureId:shelfId,...SECOND,orientation:0},'Installer le meuble original sur la nouvelle réserve par son bouton et la carte.');
  expect(w.jobs.some(j=>j.kind==='install'&&j.furniture?.structureId===shelfId)).toBe(true);expect(w.stockpiles).toEqual([residual,secondResidual]);
  expect(w.packed.find(p=>p.building.id===shelfId)!.building.shelf).toEqual({cells:shelfCells,settings});await capture('install-blueprint',false);
  stage='reinstallation';await run();await wait(state=>state.structures.some(s=>s.id===shelfId&&s.x===SECOND.x&&s.z===SECOND.z));await pause(page);w=await read();
  const reinstalled=w.structures.find(s=>s.id===shelfId)!;expect(reinstalled.shelf).toEqual({cells:shelfCells,settings});expect(w.packed).toHaveLength(0);expect(w.jobs).toHaveLength(0);
  expect(w.stockpiles).toEqual([residual,secondResidual]);expect(readShelfInspection(w,reinstalled)).toMatchObject({capacity:3,cellIds:shelfCells});
  await inspectShelf(shelfId);await expect(page.locator('[data-shelf-slots]')).toHaveText('0 / 3 emplacements occupés');await capture('reinstalled-shelf');
  stage='complete';expect(errors).toEqual([]);expect(lifecycle).toEqual([]);
 }catch(error){failure=error;}
 finally{
  if(loaded&&failure&&!page.isClosed())try{await pause(page);const actual=await world(page);last=actual;const validation=validateWorld(actual);if(!validation.length){const path=info.outputPath('conservation.json'),text=serializeWorld(actual);await writeFile(path,text);conservation={path,tick:actual.tick,sha256:sha(text),provenance:'last adopted World, not UI export/reload'};}else conservation={validation};await page.screenshot({path:info.outputPath('conservation.png')});}catch(error){conservation={error:String(error)};}
  const path=info.outputPath('shelf-zone-summary.json');await writeFile(path,JSON.stringify({version:361,segment,prepared:true,naturalCampaign:false,input:{path:inputPath,sha256:sha(input),tick:initial.tick},bodyMs:Date.now()-started,backend,stage,shelfId,shelfCells,riceId,woodId,actions,checkpoints,journal,lifecycle,errors,conservation,failure:failure instanceof Error?{message:failure.message,stack:failure.stack}:failure,last:last?{tick:last.tick,people:last.pawns,stockpiles:last.stockpiles,jobs:last.jobs,structures:last.structures,packed:last.packed,piles:last.piles}:null},null,2));
  await info.attach('V361 prepared storage summary',{contentType:'application/json',path});page.off('crash',onCrash);page.off('close',onClose);browser?.off('disconnected',onDisconnect);
 }
 if(failure)throw failure;expect(stage).toBe('complete');
});
