import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {bridgeWorkshopV387} from '../scenarios/bridge-v387';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import type {Cell,Command,World} from '../../src/sim/types';
import {world,pause,panel,expectWorld,observeErrors,cell,settledCells,dragRectangle} from './helpers';
import {perform,revealCells} from './player-actions';

// Opt-in before the page fixture: global integration must not launch a browser.
test.skip(process.env.BRIDGE_V387!=='1','ROOT opt-in only; adopt/freeze schema247 first.');
const wood=(w:World)=>w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0);
async function exportReload(page:Page,info:TestInfo,name:string){
  await pause(page);const before=await world(page);await writeFile(info.outputPath(name+'-observed-world.json'),JSON.stringify(before));expect(validateWorld(before)).toEqual([]);
  await page.keyboard.press('Escape');await panel(page,'menu');const manager=page.locator('[data-save-manager]');
  await manager.locator('[data-save-manager-name]').fill('V387 '+name);
  await manager.locator('[data-save-manager-action="create"]').click();
  await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
  const path=info.outputPath(name+'.json');await(await download).saveAs(path);
  expect(deserializeWorld(await decodeStoredSave(await readFile(path,'utf8')))).toEqual(before);
  await page.locator('#browse-saves').click();await page.locator('.front-menu input[type=file]').setInputFiles(path);
  await expect(page.locator('.front-menu')).toBeHidden({timeout:30_000});
  await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});
  await pause(page);await expectWorld(page,before);await page.keyboard.press('Escape');
  await info.attach(name,{path,contentType:'application/json'});return before;
}

test('V387 prepared250²: paid timber bridge, real cargo passage, exact frame reload and removal',async({page},info)=>{
  test.setTimeout(150_000);const errors=observeErrors(page),f=bridgeWorkshopV387(250),rotation={value:0};
  expect(f.world.schemaVersion).toBe(247);expect(f.world.width).toBe(250);expect(wood(f.world)).toBe(22);
  const path=info.outputPath('declared-bridge-preparation.json');await writeFile(path,f.initial);
  const act=async(command:Command,reason:string)=>{await pause(page);await perform(page,{command,reason},rotation);await page.keyboard.press('Escape');};
  const point=async(c:Cell)=>{await revealCells(page,[c]);const [p]=await settledCells(page,[c]),b=(await page.locator('#viewport canvas').boundingBox())!;return {x:b.x+p!.x,y:b.y+p!.y};};
  const bridgeTool=async(kind:'build-bridge'|'remove-bridge')=>{
    await pause(page);await panel(page,'architect');await page.locator('[data-category="floors"]').click();
    const button=page.locator(`[data-tool="${kind}"]`);await expect(button).toBeVisible();await button.click();
    if(await page.locator('#architect-panel').isVisible())await page.locator('#architect-panel [data-close-panel]').click();
    await expect(button).toHaveClass(/active/);
  };
  await page.goto('/?e2e');const front=page.locator('.front-menu');
  await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(path);
  await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});await pause(page);await expectWorld(page,f.world);
  let p=await point(f.bridgeCell);await page.mouse.move(p.x,p.y);
  await expect(page.locator('#map-hover-readout')).toContainText('Marais');
  await expect(page.locator('#map-hover-readout')).toContainText('vitesse de déplacement 50 %');
  await bridgeTool('build-bridge');await revealCells(page,[f.bridgeCell]);
  await dragRectangle(page,f.bridgeCell,f.bridgeCell);await page.keyboard.press('Escape');
  await expect.poll(async()=>(await world(page)).jobs.some(j=>j.kind==='build-bridge'&&j.x===f.bridgeCell.x&&j.z===f.bridgeCell.z)).toBe(true);
  expect(wood(await world(page))).toBe(22); // Designation has not granted or consumed stock.
  await page.locator('[data-speed="6"]').click();
  await page.waitForFunction(()=>window.__lisiere.world.jobs.some(j=>j.kind==='build-bridge'&&j.construction==='frame'&&j.progress>0&&j.progress<100),undefined,{polling:20,timeout:20_000});
  await pause(page);const frame=await world(page),job=frame.jobs.find(j=>j.kind==='build-bridge')!;await writeFile(info.outputPath('observed-paid-frame.json'),JSON.stringify(frame));
  expect(job.construction).toBe('frame');expect(job.progress).toBeGreaterThan(0);
  expect(frame.tiles[f.bridgeCell.z*frame.width+f.bridgeCell.x]!.bridge).toBeUndefined();
  expect(frame.piles.find(p=>p.id===f.cargoId)).toMatchObject({item:'wood',quantity:10,owner:{type:'ground',...f.cargoCell}});
  await page.screenshot({path:info.outputPath('01-supplied-frame-ground-work.png')});
  const resumed=await exportReload(page,info,'paid-frame-exact');expect(resumed.jobs.find(j=>j.id===job.id)).toEqual(job);
  await page.locator('[data-speed="6"]').click();
  await page.waitForFunction(c=>window.__lisiere.world.tiles[c.z*window.__lisiere.world.width+c.x]?.bridge===true,f.bridgeCell,{timeout:15_000});await pause(page);
  const built=await world(page);await writeFile(info.outputPath('observed-built.json'),JSON.stringify(built));expect(wood(built)).toBe(10);expect(built.tiles[f.bridgeCell.z*built.width+f.bridgeCell.x]).toEqual({terrain:'marsh',bridge:true});
  p=await point(f.bridgeCell);await page.mouse.move(p.x,p.y);
  await expect(page.locator('#map-hover-readout')).toContainText('Pont en bois sur marais');
  await expect(page.locator('#map-hover-readout')).toContainText('vitesse de déplacement 100 %');
  await expect(page.locator('#map-hover-readout')).toContainText('Support léger uniquement');
  await act({type:'priority',pawnId:f.pawnId,work:'haul',value:1},'Autoriser le transport du bois préparé sur l’autre rive.');
  await act({type:'order-haul',pawnId:f.pawnId,target:{type:'pile',pileId:f.cargoId},queue:false},'Rapporter les10bois réels vers la réserve sèche par le pont.');
  await page.locator('[data-speed="1"]').click();
  const hit=await page.waitForFunction(({id,c})=>{
    const w=window.__lisiere.world,p=w.pawns.find(p=>p.id===id),m=p?.motion;
    if(!p||p.haul?.phase!=='deliver'||!m||m.end<=w.tick||m.to.x!==c.x||m.to.z!==c.z)return false;
    const cargo=w.piles.find(item=>item.id===p.haul!.carryPileId);
    return {tick:w.tick,motion:structuredClone(m),haul:structuredClone(p.haul),cargo:structuredClone(cargo)};
  },{id:f.pawnId,c:f.bridgeCell},{polling:20,timeout:25_000});
  const crossing=await hit.jsonValue();if(!crossing)throw Error('No physical cargo passage over the actual bridge was observed.');
  await pause(page);expect(crossing.motion.terrainDelay??0).toBe(0);
  expect(crossing.haul.sourcePileId).toBe(f.cargoId);
  expect(crossing.cargo).toMatchObject({item:'wood',quantity:10,owner:{type:'pawn',pawnId:f.pawnId}});
  await page.screenshot({path:info.outputPath('02-owned-cargo-on-bridge.png')});
  await page.locator('[data-speed="6"]').click();
  await page.waitForFunction(({id,store})=>{const w=window.__lisiere.world;return !w.pawns.find(p=>p.id===id)?.haul&&w.piles.some(p=>p.item==='wood'&&p.quantity===10&&p.owner.type==='ground'&&p.owner.x===store.x&&p.owner.z===store.z);},{id:f.pawnId,store:f.storage},{timeout:15_000});await pause(page);
  const stored=await world(page);await writeFile(info.outputPath('observed-stored.json'),JSON.stringify(stored));expect(wood(stored)).toBe(10);
  await act({type:'priority',pawnId:f.pawnId,work:'haul',value:0},'Laisser le bois remboursé à sa vraie sortie de chantier.');
  await bridgeTool('remove-bridge');await revealCells(page,[f.bridgeCell]);await cell(page,f.bridgeCell.x,f.bridgeCell.z);await page.keyboard.press('Escape');
  await expect.poll(async()=>(await world(page)).jobs.some(j=>j.kind==='remove-bridge')).toBe(true);
  await page.locator('[data-speed="6"]').click();
  await page.waitForFunction(c=>!window.__lisiere.world.tiles[c.z*window.__lisiere.world.width+c.x]?.bridge,f.bridgeCell,{timeout:15_000});await pause(page);
  const final=await world(page);await writeFile(info.outputPath('final-world.json'),JSON.stringify(final));expect(final.tiles[f.bridgeCell.z*final.width+f.bridgeCell.x]).toEqual({terrain:'marsh'});
  expect(wood(final)).toBe(16);expect(final.jobs.some(j=>j.kind==='build-bridge'||j.kind==='remove-bridge')).toBe(false);
  expect(validateWorld(final)).toEqual([]);
  await page.screenshot({path:info.outputPath('03-marsh-restored-six-wood-refund.png')});expect(errors).toEqual([]);
  expect(await page.evaluate(()=>({backend:window.__lisiere.backend,...window.__lisiere.incident}))).toMatchObject({backend:'WebGPU',simulationStopped:false,graphicsFault:false,waiting:0});
  await writeFile(info.outputPath('native-summary.json'),JSON.stringify({notice:f.notice,start:f.world.tick,frame:frame.tick,resumed:resumed.tick,built:built.tick,crossing,stored:stored.tick,final:final.tick,wood:{prepared:22,paid:12,stored:10,refund:6,remaining:16},errors,scope:'One prepared250² actual UI bridge chain; exact reload at paid frame. No natural wetland generation, heavy support, fire, destruction or performance certification.'},null,2));
});
