import {expect,test,type Page} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {colonyWealth} from '../../src/sim/colony-wealth';
import {quoteTrade} from '../../src/sim/trade-goods';
import {deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {expectWorld,observeErrors,panel,pause,world} from './helpers';

async function loadCatalogue(page:Page,id:string,expected:import('../../src/sim/types').World):Promise<void> {
  await panel(page,'menu');
  await page.locator('#browse-saves').click();
  await page.getByRole('button',{name:'Colonies de test'}).click();
  const choice=page.locator(`input[name="test-colony"][value="${id}"]`);
  await expect(choice).toBeVisible();await choice.check();
  await page.getByRole('button',{name:'Charger cette colonie'}).click();
  await expectWorld(page,expected);
}

test('économie V105 : adoption historique, contact réel, vente de sculpture, argent et reprise exacte',async({playwright},testInfo)=>{
  test.setTimeout(150000);
  const browser=await playwright.chromium.launch({channel:'chromium',headless:false,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page);page.setDefaultTimeout(15000);
  try {
    const initial=deserializeWorld(readFileSync('public/test-saves/v105/economie.json','utf8'));
    const trader=initial.pawns.find(p=>p.visitor?.role==='trader')!,colonist=initial.pawns.find(p=>!p.visitor)!;
    const art=initial.packed.find(p=>p.building.kind==='small-sculpture'&&p.owner.type==='ground')!;
    expect(validateWorld(initial)).toEqual([]);
    expect(initial.economy).toBeUndefined();expect(initial.trade?.count??0).toBe(0);
    expect(art.building.art?.authorId).toBe(colonist.id);
    const originalArt=structuredClone(art.building),wealth=colonyWealth(initial);
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);await pause(page);
    await loadCatalogue(page,'economie-v105',initial);

    await page.locator('[data-panel="history"]').click();
    await expect(page.locator('#history-panel')).toBeVisible();
    await expect(page.locator('#adopt-economy')).toBeVisible();
    await expect(page.locator('#colony-economy')).toContainText('Cette colonie conserve ses règles historiques');
    await page.locator('#adopt-economy').click();
    await expect.poll(async()=>(await world(page)).economy?.wealth.knownTotal).toBe(wealth.knownTotal);
    const adopted=await world(page);
    expect(adopted.economy).toMatchObject({profile:'colony-prosperity-v1',adoptedAt:initial.tick,sampledAt:initial.tick,wealth});
    await expect(page.locator('#adopt-economy')).toBeHidden();
    await expect(page.locator('#colony-economy')).toContainText(`Patrimoine évalué : ${new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(wealth.knownTotal)}`);
    await page.screenshot({path:'artifacts/economy-history-v105.png'});
    await page.locator('#history-panel [data-close-panel]').click();

    await page.locator('#trade-letter').click();
    await page.locator('#trade-merchant').selectOption(String(trader.id));
    await page.locator('#trade-negotiator').selectOption(String(colonist.id));
    await page.locator('#trade-contact').click();
    await expect(page.locator('#trade-goods')).toBeVisible({timeout:30000});
    // Contact pauses the game itself; the modal correctly blocks HUD clicks.
    await expect(page.locator('[data-speed="0"]')).toHaveAttribute('aria-pressed','true');
    const beforeSale=await world(page);
    const q=quoteTrade(beforeSale,colonist.id,trader.id,[{packedId:art.building.id,quantity:-1}]);
    expect(q.ok).toBe(true);if(!q.ok)throw new Error(q.reason);
    expect(q.paid).toBeLessThan(0);expect(q.forgone).toBe(0);
    const saleInput=page.locator(`input[data-packed="${art.building.id}"]`);
    await expect(saleInput).toBeVisible();await expect(saleInput).toHaveAttribute('data-side','sell');
    await expect(saleInput.locator('xpath=ancestor::tr')).toContainText(colonist.name);
    await saleInput.fill('1');
    await expect(page.locator('#trade-total')).toContainText(`À recevoir : ${-q.paid} argent`);
    await expect(page.locator('#trade-confirm')).toBeEnabled();
    await page.screenshot({path:'artifacts/economy-trade-v105.png'});
    await page.locator('#trade-confirm').click();
    await expect(page.locator('#trade-dialog')).not.toBeVisible();
    await expect.poll(async()=>(await world(page)).trade?.count).toBe(1);
    await pause(page);
    const sold=await world(page),soldArt=sold.packed.find(p=>p.building.id===art.building.id)!;
    expect(soldArt.building).toEqual(originalArt);
    expect(soldArt.owner).toEqual({type:'inventory',pawnId:trader.id});
    expect(sold.trade).toMatchObject({count:1,silverReceived:-q.paid,artSold:{'small-sculpture':1},
      recent:[{lines:[{packedId:art.building.id,quantity:-1,art:originalArt.art}]}]});
    const beforeSilver=beforeSale.piles.filter(p=>p.item==='silver'&&p.owner.type==='ground').reduce((n,p)=>n+p.quantity,0);
    const afterSilver=sold.piles.filter(p=>p.item==='silver'&&p.owner.type==='ground').reduce((n,p)=>n+p.quantity,0);
    expect(afterSilver-beforeSilver).toBe(-q.paid);
    expect(validateWorld(sold)).toEqual([]);
    await page.screenshot({path:'artifacts/economy-sold-v105.png'});

    await page.locator('[data-panel="history"]').click();
    await expect(page.locator('#colony-economy')).toContainText('Patrimoine évalué :');
    expect((await world(page)).economy).toEqual(sold.economy);
    await page.locator('#history-panel [data-close-panel]').click();
    await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();
    await expectWorld(page,sold);
    expect(errors).toEqual([]);
    const backend=await page.evaluate(()=>window.__lisiere.backend);
    expect(backend).toContain('WebGPU');
    const report=JSON.stringify({backend,fixture:'economie-v105',prepared:true,adoptedAt:adopted.economy!.adoptedAt,
      initialWealth:wealth.knownTotal,artId:art.building.id,merchantId:trader.id,
      saleSilver:-q.paid,soldTick:sold.tick,receipt:sold.trade?.recent.at(-1),restored:true,errors},null,2)+'\n';
    writeFileSync('artifacts/economy-native-v105.json',report);
    await testInfo.attach('economy-v105',{contentType:'application/json',body:report});
  } finally {await browser.close();}
});
