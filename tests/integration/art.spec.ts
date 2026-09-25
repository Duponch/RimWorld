import {expect,test,type Page} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {PRODUCTION_RECIPES} from '../../src/sim/production-recipes';
import {captureRoomQuality} from '../../src/sim/room-quality';
import {structureBeauty} from '../../src/sim/room-beauty';
import {structureRoomMarketValue} from '../../src/sim/room-market-value';
import {observeErrors,world,panel,cell,pause,pawnTab,expectWorld} from './helpers';
import {perform,revealCells} from './player-actions';

async function loadCatalogue(page:Page,id:string,expected:import('../../src/sim/types').World):Promise<void> {
  await panel(page,'menu');
  await page.locator('#browse-saves').click();
  await page.getByRole('button',{name:'Colonies de test'}).click();
  const choice=page.locator(`input[name="test-colony"][value="${id}"]`);
  await expect(choice).toBeVisible();await choice.check();
  await page.getByRole('button',{name:'Charger cette colonie'}).click();
  await expectWorld(page,expected);
}
async function openEnvironment(page:Page):Promise<void> {
  const details=page.locator('.cell-environment');
  if(await details.getAttribute('open')===null)await details.locator('summary').click();
}

test('art : catalogue V103 puis V104, facture réelle, œuvre minifiée, pose et inspection',async({playwright},testInfo)=>{
  test.setTimeout(240000);
  const browser=await playwright.chromium.launch({channel:'chromium',headless:false,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page);page.setDefaultTimeout(15000);
  try{
    const previous=deserializeWorld(readFileSync('public/test-saves/v103/salles.json','utf8'));
    const initial=deserializeWorld(readFileSync('public/test-saves/v104/sculpture.json','utf8'));
    expect(validateWorld(previous)).toEqual([]);expect(validateWorld(initial)).toEqual([]);
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('[data-speed="0"]')).toBeVisible();
    await expect(page.locator('#loading')).toHaveCount(0);await pause(page);

    await loadCatalogue(page,'salles-v103',previous);
    await revealCells(page,[{x:14,z:14}]);await cell(page,14,14);
    await openEnvironment(page);
    await expect(page.locator('#room-description')).toContainText('Impression :');
    expect((await world(page)).structures.some(s=>s.kind==='small-sculpture'||s.kind==='large-sculpture')).toBe(false);

    await loadCatalogue(page,'art-v104',initial);
    const artist=initial.pawns[0]!,bench=initial.structures.find(s=>s.kind==='art-bench')!;
    const large=initial.structures.find(s=>s.kind==='large-sculpture')!;
    expect(large.art?.authorId).toBe(artist.id);
    expect(initial.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0)).toBe(50);
    await revealCells(page,[large]);await cell(page,large.x,large.z);
    await expect(page.locator('#cell-title')).toContainText('Grande sculpture');
    await expect(page.locator('#cell-description')).toContainText(`Auteur : ${artist.name}`);
    await openEnvironment(page);
    const before=captureRoomQuality(initial).room(large)!;
    await expect(page.locator('#room-description')).toContainText(`Richesse : ${before.wealth.toFixed(1)}`);
    await page.screenshot({path:'artifacts/art-large-prepared-v104.png'});

    await perform(page,{reason:'Créer réellement une facture de petite sculpture.',command:{type:'bill-add',structureId:bench.id,recipe:'small-sculpture'}},{value:0});
    const withBill=await world(page),bill=withBill.structures.find(s=>s.id===bench.id)!.bills!.at(-1)!;
    const filters=Object.fromEntries(PRODUCTION_RECIPES['small-sculpture'].inputs.map(item=>[item,item==='wood']));
    await perform(page,{reason:'Autoriser seulement le bois et déposer le produit physique au sol.',command:{type:'bill-update',structureId:bench.id,billId:bill.id,
      settings:{...bill,filters,destination:'drop'}}},{value:0});
    await expect.poll(async()=>{
      const saved=(await world(page)).structures.find(s=>s.id===bench.id)?.bills?.find(b=>b.id===bill.id);
      return saved?.destination==='drop'&&saved.filters.wood===true&&saved.filters['marble-blocks']===false;
    }).toBe(true);
    await expect(page.locator(`[data-bill="${bill.id}"] .bill-cost`)).toContainText('50 unités');
    await page.keyboard.press('Escape');
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>{
      const w=await world(page);
      return w.packed.some(p=>p.building.kind==='small-sculpture'&&p.owner.type==='ground');
    },{timeout:150000}).toBe(true);
    await pause(page);
    const produced=await world(page),pack=produced.packed.find(p=>p.building.kind==='small-sculpture')!;
    expect(pack.building).toMatchObject({kind:'small-sculpture',material:'wood',art:{authorId:artist.id}});
    expect(produced.piles.some(p=>p.item==='unfinished-sculpture')).toBe(false);
    expect(produced.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0)).toBe(0);
    const unpackedView={...produced,packed:produced.packed.filter(p=>p.building.id!==pack.building.id)};
    expect(captureRoomQuality(produced).room(large)!.wealth).toBeCloseTo(captureRoomQuality(unpackedView).room(large)!.wealth,6);
    expect(validateWorld(produced)).toEqual([]);

    await perform(page,{reason:'Installer le paquet de petite sculpture avec le geste réel.',command:{type:'install',structureId:pack.building.id,x:18,z:13,orientation:0}},{value:0});
    await page.locator('[data-speed="6"]').click();
    await expect.poll(async()=>(await world(page)).structures.some(s=>s.id===pack.building.id),{timeout:30000}).toBe(true);
    await pause(page);
    const finished=await world(page),small=finished.structures.find(s=>s.id===pack.building.id)!;
    expect(small.art).toEqual(pack.building.art);
    expect(small.quality).toBe(pack.building.quality);
    expect(finished.packed.some(p=>p.building.id===small.id)).toBe(false);
    const after=captureRoomQuality(finished).room(small)!;
    const withoutSmall=captureRoomQuality({...finished,structures:finished.structures.filter(s=>s.id!==small.id)}).room(small)!;
    expect(after.total-withoutSmall.total).toBeCloseTo(structureBeauty(small),6);
    expect(after.wealth-withoutSmall.wealth).toBeCloseTo(structureRoomMarketValue(small),6);
    await revealCells(page,[small]);await cell(page,small.x,small.z);
    await expect(page.locator('#cell-title')).toContainText('Petite sculpture');
    await expect(page.locator('#cell-description')).toContainText(`Auteur : ${artist.name}`);
    await openEnvironment(page);
    await expect(page.locator('#room-description')).toContainText(`Impression : ${after.impressiveness.toFixed(1)}`);
    await page.locator(`[data-pawn="${artist.id}"]`).click();await pawnTab(page,'needs');
    await expect(page.locator('#mood-thoughts')).toBeVisible();
    await expect(page.locator('#room-description')).toContainText('Impression :');
    expect(validateWorld(finished)).toEqual([]);expect(errors).toEqual([]);
    await page.screenshot({path:'artifacts/art-installed-needs-v104.png'});
    const backend=await page.evaluate(()=>window.__lisiere.backend);expect(backend).toContain('WebGPU');
    const report=JSON.stringify({backend,tick:finished.tick,artist:artist.id,large:large.id,small:small.id,
      quality:small.quality,before:{beauty:before.beauty,wealth:before.wealth},
      after:{beauty:after.beauty,wealth:after.wealth,impressiveness:after.impressiveness},errors},null,2);
    writeFileSync('artifacts/art-native-v104.json',report);
    await testInfo.attach('art-v104',{contentType:'application/json',body:report});
  }finally{await browser.close();}
});
