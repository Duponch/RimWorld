import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {preparedVentNativeV383} from '../scenarios/vent-v383';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {blockedCells} from '../../src/sim/pathfinding';
import {canStandAt} from '../../src/sim/furniture-travel';
import type {World} from '../../src/sim/types';
import {world,pause,panel,expectWorld,observeErrors,cell,settledCells} from './helpers';
import {perform,revealCells} from './player-actions';

test.skip(process.env.VENT_V383_NATIVE!=='1','Opt-in short vent workflow.');
const steel=(w:World)=>w.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0);
async function exportReload(page:Page,info:TestInfo,name:string){
  await pause(page);const before=await world(page);expect(validateWorld(before)).toEqual([]);
  await page.keyboard.press('Escape');await panel(page,'menu');const manager=page.locator('[data-save-manager]');
  await manager.locator('[data-save-manager-name]').fill('V383 '+name);
  await manager.locator('[data-save-manager-action="create"]').click();
  await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
  const path=info.outputPath(name+'.json');await(await download).saveAs(path);
  expect(deserializeWorld(await decodeStoredSave(await readFile(path,'utf8')))).toEqual(before);
  await page.locator('#browse-saves').click();await page.locator('.front-menu input[type=file]').setInputFiles(path);
  await expect(page.locator('.front-menu')).toBeHidden({timeout:30_000});
  await expect(page.locator('#loading')).toHaveCount(0,{timeout:30_000});
  await pause(page);await expectWorld(page,before);await page.keyboard.press('Escape');
  await info.attach(name,{path,contentType:'application/json'});return before;
}

test('V383 prepared two-room vent: paid building, physical service, rare heat exchange and exact pending reload',async({page},info)=>{
  test.setTimeout(150_000);const errors=observeErrors(page),f=preparedVentNativeV383(),rotation={value:0};
  expect(f.world.schemaVersion).toBe(244);expect(f.world.width).toBe(32);expect(f.orientation).toBe(0);
  expect(steel(f.world)).toBe(30);expect(f.world.structures.some(s=>s.kind==='vent')).toBe(false);
  expect(f.world.structures.every(s=>s.power===undefined)).toBe(true);
  expect(f.world.pawns.find(p=>p.id===f.pawnId)!.priorities.basic).toBe(0);
  const path=info.outputPath('declared-two-room-preparation.json');await writeFile(path,f.initial);
  await page.goto('/?e2e');const front=page.locator('.front-menu');
  await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(path);
  await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});await pause(page);await expectWorld(page,f.world);
  // Dedicated real selection: the shared helper's historical tool union/category
  // does not yet include vents; the fixture uses the fresh orientation0.
  await panel(page,'architect');await page.locator('[data-category="temperature"]').click();
  const tool=page.locator('[data-tool="vent"]');await expect(tool).toBeEnabled();await tool.click();
  await revealCells(page,[f.ventCell]);await cell(page,f.ventCell.x,f.ventCell.z);await page.keyboard.press('Escape');
  const planned=(await world(page)).jobs.find(j=>j.kind==='vent'&&j.x===f.ventCell.x&&j.z===f.ventCell.z)!;
  expect(planned).toMatchObject({kind:'vent',material:'steel',orientation:0});
  await page.locator('[data-speed="6"]').click();
  await page.waitForFunction(c=>window.__lisiere.world.structures.some(s=>s.kind==='vent'&&s.x===c.x&&s.z===c.z),f.ventCell,{timeout:30_000});await pause(page);
  const built=await world(page),vent=built.structures.find(s=>s.kind==='vent')!;
  expect(vent.vent).toEqual({open:true});expect(vent.power).toBeUndefined();expect(steel(built)).toBe(0);
  expect(built.jobs.some(j=>j.id===planned.id)).toBe(false);
  const inspect=async()=>{
    await page.keyboard.press('Escape');await revealCells(page,[f.ventCell]);
    for(let i=0;i<4;i++){await cell(page,f.ventCell.x,f.ventCell.z);if(await page.locator(`[data-power-id="${vent.id}"]`).isVisible())break;}
    await expect(page.locator('#cell-title')).toContainText('Bouche d’aération');
    return page.locator(`[data-power-id="${vent.id}"]`);
  };
  const priority=async(value:0|1)=>{await pause(page);await perform(page,{reason:'Manutention : contrôler le service réel de la bouche.',command:{type:'priority',pawnId:f.pawnId,work:'basic',value}},rotation);await page.keyboard.press('Escape');};
  const request=async(open:boolean)=>{
    const card=await inspect();await expect(card.locator('[data-power-flick]')).toHaveText(open?'Demander l’ouverture':'Demander la fermeture');
    await card.locator('[data-power-flick]').click();
    await expect(card.locator('[data-power-request]')).toContainText(open?'Ouverture demandé':'Fermeture demandé');
    const w=await world(page);expect(w.structures.find(s=>s.id===vent.id)!.vent!.open).toBe(!open);
    expect(w.jobs.find(j=>j.flick?.structureId===vent.id)?.flick?.on).toBe(open);return card;
  };
  const service=async(open:boolean)=>{
    await priority(1);await page.locator('[data-speed="1"]').click();
    const observed=await page.waitForFunction(({id,pawnId,open})=>{
      const w=window.__lisiere.world,s=w.structures.find(s=>s.id===id),p=w.pawns.find(p=>p.id===pawnId);
      if(s?.vent?.open===open&&p)return {tick:w.tick,x:p.x,z:p.z,jobAbsent:!w.jobs.some(j=>j.flick?.structureId===id)};
      return false;
    },{id:vent.id,pawnId:f.pawnId,open},{timeout:15_000});
    const at=await observed.jsonValue();await pause(page);
    expect(at).not.toBe(false);if(!at)throw Error('Missing physical service sample.');
    expect(Math.max(Math.abs(at.x-f.ventCell.x),Math.abs(at.z-f.ventCell.z))).toBe(1);expect(at.jobAbsent).toBe(true);
    const card=await inspect();await expect(card.locator('[data-power-state]')).toContainText(open?'Ouverte':'Fermée');
    await expect(card.locator('[data-power-request]')).toHaveText('');return at;
  };
  // A real tactical click onto the vent must resolve to standable ground beside
  // it, never to the vent cell or a path crossing that cell, in BOTH states.
  const obstruction=async()=>{
    const w=await world(page);expect(blockedCells(w)[f.ventCell.z*w.width+f.ventCell.x]).toBe(1);expect(canStandAt(w,f.ventCell)).toBe(false);
    await perform(page,{reason:'Vérifier la bouche comme obstacle réel, même ouverte.',command:{type:'draft',pawnIds:[f.pawnId],enabled:true}},rotation);
    await revealCells(page,[f.ventCell]);const [point]=await settledCells(page,[f.ventCell]),box=(await page.locator('#viewport canvas').boundingBox())!;
    await page.mouse.click(box.x+point!.x,box.y+point!.y,{button:'right'});
    await expect(page.locator('#notice')).toContainText(`Déplacement demandé vers ${f.ventCell.x}, ${f.ventCell.z}.`);
    const p=(await world(page)).pawns.find(p=>p.id===f.pawnId)!;expect(p.draft?.target).toBeTruthy();expect(p.draft?.target).not.toEqual(f.ventCell);
    expect(p.path.some(c=>c.x===f.ventCell.x&&c.z===f.ventCell.z)).toBe(false);
    await perform(page,{reason:'Revenir au service civil sans déplacer le colon.',command:{type:'draft',pawnIds:[f.pawnId],enabled:false}},rotation);await page.keyboard.press('Escape');
  };
  await obstruction();await request(false);await page.screenshot({path:info.outputPath('01-close-request-still-open.png')});
  const pending=await exportReload(page,info,'pending-close-exact');
  expect(pending.structures.find(s=>s.id===vent.id)!.vent!.open).toBe(true);
  expect(pending.jobs.find(j=>j.flick?.structureId===vent.id)?.flick?.on).toBe(false);
  const closedAt=await service(false);await priority(0);await obstruction();

  const sample=()=>page.evaluate(points=>{
    const w=window.__lisiere.world,temps=points.map(p=>w.thermal?.regions.find(r=>r.cells.includes(p.z*w.width+p.x))?.temperature);
    return {tick:w.tick,temps,gap:Math.abs((temps[0]??NaN)-(temps[1]??NaN))};
  },f.thermalPoints);
  // The finite prepared fire builds a measurable gradient while CLOSED. No
  // temperature is injected after import and ordinary wall/source terms remain.
  await page.locator('[data-speed="6"]').click();
  await expect.poll(async()=>(await sample()).gap,{timeout:15_000,intervals:[100]}).toBeGreaterThan(4);await pause(page);
  const pulse=async(open:boolean)=>{
    await page.locator('[data-speed="1"]').click();
    const preceding=await page.waitForFunction(({id,points})=>{
      const w=window.__lisiere.world;if((w.tick+1)%25!==id%25)return false;
      const temps=points.map(p=>w.thermal?.regions.find(r=>r.cells.includes(p.z*w.width+p.x))?.temperature);
      if(temps.some(t=>t===undefined))return false;return {tick:w.tick,temps,gap:Math.abs(temps[0]!-temps[1]!)};
    },{id:vent.id,points:f.thermalPoints},{polling:20,timeout:6_000});
    const before=await preceding.jsonValue();if(!before)throw Error('Missing pre-pulse snapshot.');
    await page.waitForFunction(tick=>window.__lisiere.world.tick>tick,before.tick,{polling:20,timeout:2_000});
    const after=await sample();await pause(page);expect(after.tick-before.tick).toBeLessThanOrEqual(2);
    expect(before.gap).toBeGreaterThan(1);
    if(open)expect(after.gap).toBeLessThan(before.gap*.9);else expect(after.gap).toBeGreaterThan(before.gap*.9);
    return {open,before,after};
  };
  const closedPulse=await pulse(false);await request(true);
  const opening=(await world(page)).structures.find(s=>s.id===vent.id)!;expect(opening.vent!.open).toBe(false);
  const openedAt=await service(true);await priority(0);const openPulse=await pulse(true);
  const card=await inspect();await expect(card.locator('[data-power-state]')).toContainText('Sans électricité');
  await page.screenshot({path:info.outputPath('02-open-vent-two-rooms.png')});
  const final=await exportReload(page,info,'open-vent-exact');
  expect(final.structures.find(s=>s.id===vent.id)!.power).toBeUndefined();expect(steel(final)).toBe(0);
  expect(errors).toEqual([]);expect(await page.evaluate(()=>({backend:window.__lisiere.backend,...window.__lisiere.incident})))
    .toMatchObject({backend:'WebGPU',simulationStopped:false,graphicsFault:false,waiting:0});
  await writeFile(info.outputPath('vent-native-summary.json'),JSON.stringify({notice:f.notice,schema:244,start:f.world.tick,built:built.tick,pending:pending.tick,closedAt,openedAt,closedPulse,openPulse,final:final.tick,ventId:vent.id,paidSteel:30,errors,scope:'Declared32² walled/roofed preparation with finite existing campfire; construction and two physical services, UI obstacle targeting and exact reloads only. No winter campaign or performance claim.'},null,2));
});
