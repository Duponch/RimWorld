import {test,expect,type Page,type Locator} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {readShelfInspection} from '../../src/ui/shelf-inspection';
import {mapObjectsAt} from '../../src/ui/map-object-selection';
import type {Structure,World} from '../../src/sim/types';
import {world,pause,panel,expectWorld,observeErrors,cell} from './helpers';
import {revealCells,inspectPerson} from './player-actions';

const sha=(text:string)=>createHash('sha256').update(text).digest('hex');
const front=(page:Page)=>page.locator('.front-menu');
test.skip(!process.env.AULNES_V381_CHECKPOINT,'Opt-in: ROOT-qualified V381 checkpoint required.');

// Pointer selection cycles through the actual objects at this cell. No inspector
// API, simulated command, camera API or write to window.__lisiere is used.
async function inspectStructure(page:Page,w:World,s:Structure,visible:Locator){
  await page.keyboard.press('Escape');await revealCells(page,[s]);
  const bound=mapObjectsAt(w,s).length+w.pawns.filter(p=>p.x===s.x&&p.z===s.z).length+2;
  for(let i=0;i<bound;i++){
    await cell(page,s.x,s.z);
    if(await visible.isVisible())return;
  }
  throw Error(`Actual structure ${s.id} at ${s.x},${s.z} could not be selected.`);
}

test('V381 qualified Aulnes 250²: atelier, shelves, Tao and exact file reload',async({page},info)=>{
  test.setTimeout(120_000);
  const input=process.env.AULNES_V381_CHECKPOINT!;
  const inputPath=resolve(input),stored=await readFile(inputPath,'utf8'),raw=await decodeStoredSave(stored);
  expect(sha(raw)).toBe('c95c7b6e99a21f521f8fe533a8b4664e758e6dd20fcdeeebf2da3f88531cced8');
  const expected=deserializeWorld(raw),errors=observeErrors(page);
  expect(validateWorld(expected)).toEqual([]);expect(expected.width).toBe(250);expect(expected.height).toBe(250);
  expect(expected.tick).toBeGreaterThan(8434);
  const tao=expected.pawns.find(p=>p.id===20331);expect(tao?.name).toBe('Tao');
  const armor=expected.piles.find(p=>p.item==='recon-armor'&&p.owner.type==='apparel'&&p.owner.pawnId===tao!.id);
  expect(armor,'Qualified checkpoint must already contain the physically worn preparation armor.').toBeDefined();
  const bench=expected.structures.find(s=>s.id===20946)!;
  expect(bench?.kind).toBe('fabrication-bench');
  const bill=bench.bills?.find(b=>b.recipe==='make-recon-armor');expect(bill).toBeDefined();
  const shelves=[{x:124,z:142},{x:130,z:142}].map(c=>expected.structures.find(s=>s.kind==='shelf'&&s.x===c.x&&s.z===c.z)!);
  expect(shelves.every(s=>!!s?.shelf)).toBe(true);

  // Genuine encoded file import, including decompression and 250² GPU adoption.
  await page.goto('/?e2e');
  await front(page).getByRole('button',{name:'Charger une partie',exact:true}).click();
  await front(page).locator('input[type=file]').setInputFiles(inputPath);
  await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});
  await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:60_000});
  await pause(page);await expectWorld(page,expected);

  const billView=page.locator(`[data-bill="${bill!.id}"]`);
  await inspectStructure(page,expected,bench,billView);
  await expect(billView.locator('.bill-cost')).toHaveText('80 plastacier · 3 composants avancés · 10 uranium · Artisanat 6');
  await expect(page.locator('[data-add-recipe="make-recon-armor"]')).toBeEnabled();
  for(const shelf of shelves){
    await inspectStructure(page,expected,shelf,page.locator('[data-shelf-contents]'));
    const contents=readShelfInspection(expected,shelf)!;
    await expect(page.locator('#cell-title')).toContainText('Étagère');
    await expect(page.locator('[data-shelf-slots]')).toHaveText(`${contents.piles.length} / ${contents.capacity} emplacements occupés`);
    await expect(page.locator('[data-shelf-pile]')).toHaveCount(contents.piles.length);
    for(const pile of contents.piles)await expect(page.locator(`[data-shelf-pile="${pile.id}"]`)).toContainText(`× ${pile.quantity}`);
  }
  // Both shelf anchors and the station belong to one actual workshop view.
  await page.keyboard.press('Escape');await revealCells(page,[bench,...shelves]);
  await inspectStructure(page,expected,shelves[0]!,page.locator('[data-shelf-contents]'));
  await page.screenshot({path:info.outputPath('01-atelier-shelves.png')});

  await inspectPerson(page,tao!.id,'gear');
  const armorRow=page.locator('.equipment-apparel-row').filter({has:page.locator(`[data-apparel-information="${armor!.id}"]`)});
  await expect(armorRow).toContainText('Combinaison de reconnaissance');
  await expect(armorRow.locator(`[data-remove-apparel="${armor!.id}"]`)).toBeEnabled();
  await page.screenshot({path:info.outputPath('02-tao-recon-armor.png')});
  await expectWorld(page,expected);

  await page.keyboard.press('Escape');await panel(page,'menu');
  const manager=page.locator('[data-save-manager]');
  await manager.locator('[data-save-manager-name]').fill('Les Aulnes V381 · inspection native');
  await manager.locator('[data-save-manager-action="create"]').click();
  await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
  const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();
  const exportedPath=info.outputPath('aulnes-v381-ui-export.json');await(await download).saveAs(exportedPath);
  const exported=await readFile(exportedPath,'utf8'),exportRaw=await decodeStoredSave(exported);
  expect(deserializeWorld(exportRaw)).toEqual(expected);
  // Reimport the exact downloaded file, rather than loading the untouched input.
  await page.locator('#browse-saves').click();
  await front(page).locator('input[type=file]').setInputFiles(exportedPath);
  await expect(front(page)).toBeHidden({timeout:60_000});
  await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});
  await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:60_000});
  await pause(page);await expectWorld(page,expected);
  expect((await world(page)).tick).toBe(expected.tick);
  expect(await page.evaluate(()=>({backend:window.__lisiere.backend,stopped:window.__lisiere.incident.simulationStopped,graphicsFault:window.__lisiere.incident.graphicsFault})))
    .toEqual({backend:'WebGPU',stopped:false,graphicsFault:false});
  expect(errors).toEqual([]);
  await writeFile(info.outputPath('v381-native-summary.json'),JSON.stringify({inputPath,inputStoredSha256:sha(stored),inputRawSha256:sha(raw),exportedPath,exportStoredSha256:sha(exported),tick:expected.tick,size:[250,250],taoId:tao!.id,armorId:armor!.id,shelfIds:shelves.map(s=>s.id),benchId:bench.id,billId:bill!.id,exactFullFileReload:true,errors,scope:'Prepared qualified Aulnes checkpoint; paused inspection and exact file reload only. No natural acquisition, crafting campaign or performance claim.'},null,2));
  await info.attach('full-ui-export',{path:exportedPath,contentType:'application/json'});
});
