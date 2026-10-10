import { expect,test } from '@playwright/test';

/** DOM-only fixture: no colony/renderer/Source is instantiated. */
test('storage tree commits whole policies, keeps search passive and offers accessible dual ranges',async({page})=>{
  await page.route('**/src/main.ts*',route=>route.fulfill({contentType:'application/javascript',body:`
    import {mountStorageControls} from '/src/ui/storage-item-controls.ts';
    import '/src/ui/storage-item-controls.css';
    document.body.innerHTML='<main id="fixture" style="width:320px;padding:20px"></main>';
    window.changes=[];
    window.controls=mountStorageControls(document.querySelector('#fixture'),{
      filters:{wood:false,food:true,furniture:true},items:{rice:true},priority:3
    },value=>window.changes.push(value));
  `}));
  await page.goto('/');await page.waitForSelector('.storage-core-controls');
  const category=page.locator('[data-storage-category="foods"]');
  await expect(category).toHaveAttribute('aria-checked','mixed');
  await expect(page.locator('[data-storage-freshness="allowFresh"]')).toBeChecked();
  await expect(page.locator('[data-storage-freshness="allowRotten"]')).toBeChecked();
  await expect(page.locator('[data-storage-priority]')).toHaveValue('3');
  await page.locator('[aria-controls$="-manufactured"]').click();
  await expect(page.locator('[data-storage-item="furniture"]')).toBeChecked();
  await page.locator('[data-storage-search]').fill('riz');
  await expect(page.locator('[data-storage-item="rice"]')).toBeVisible();
  expect(await page.evaluate(()=>(window as any).changes.length)).toBe(0);
  await category.check();
  const afterFood=await page.evaluate(()=>(window as any).changes.at(-1));
  expect(afterFood.items).toBeUndefined();await expect(category).toHaveAttribute('aria-checked','true');
  expect(afterFood.filters.food).toBe(true);expect(afterFood.filters.furniture).toBe(true);
  await page.locator('[data-storage-search]').fill('inexistant');
  await expect(page.getByText('Aucun objet ne correspond à cette recherche.')).toBeVisible();
  await page.getByRole('button',{name:'Tout effacer',exact:true}).click();
  const empty=await page.evaluate(()=>(window as any).controls.read());
  expect(empty.items).toBeUndefined();expect(empty.filters.food).toBe(false);expect(empty.filters.furniture).toBeUndefined();expect(empty.allowFresh).toBe(true);
  await page.getByRole('button',{name:'Tout autoriser',exact:true}).click();
  await page.locator('[data-storage-freshness="allowRotten"]').uncheck();
  const freshPolicy=await page.evaluate(()=>(window as any).changes.at(-1));
  expect(freshPolicy.allowFresh).toBe(true);expect(freshPolicy.allowRotten).toBe(false);
  expect(freshPolicy.items).toBeUndefined();
  await expect(page.locator('[data-storage-item="human-corpse"]')).toBeChecked();await expect(page.locator('[data-storage-item="lancer-corpse"]')).toBeChecked();
  const count=await page.evaluate(()=>(window as any).changes.length);
  const min=page.locator('[data-storage-range="hitPoints"][data-storage-bound="min"]');
  await min.evaluate((input:HTMLInputElement)=>{input.value='40';input.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.evaluate(()=>(window as any).controls.show({filters:{wood:false,food:true,furniture:true},items:{rice:true},priority:3}));
  await expect(min).toHaveValue('40');
  expect(await page.evaluate(()=>(window as any).changes.length)).toBe(count);
  await expect(min).toHaveAttribute('aria-valuetext','40 %');
  await min.dispatchEvent('change');
  expect(await page.evaluate(()=>(window as any).changes.at(-1).hitPoints)).toEqual({min:40,max:100});
  const qualityMax=page.locator('[data-storage-range="quality"][data-storage-bound="max"]');
  await qualityMax.focus();await page.keyboard.press('ArrowLeft');
  await expect(qualityMax).toHaveAttribute('aria-valuetext','chef-d’œuvre');
  expect(await page.evaluate(()=>(window as any).changes.at(-1).quality.max)).toBe('masterwork');
  await page.evaluate(()=>{
    const c=(window as any).controls;c.show({filters:{wood:true,food:false},priority:5,hitPoints:{min:0,max:0},allowFresh:false});
  });
  await expect(min).toHaveValue('0');
  await expect(page.locator('[data-storage-range="hitPoints"][data-storage-bound="max"]')).toHaveValue('0');
  await expect(page.locator('[data-storage-freshness="allowFresh"]')).not.toBeChecked();
  await expect(page.locator('[data-storage-freshness="allowRotten"]')).toBeChecked();
  await page.locator('[data-storage-range="hitPoints"][data-storage-bound="max"]').evaluate((input:HTMLInputElement)=>{input.value='40';input.dispatchEvent(new Event('input',{bubbles:true}));});
  await min.evaluate((input:HTMLInputElement)=>{input.value='30';input.dispatchEvent(new Event('input',{bubbles:true}));});
  await expect(min).toHaveValue('30');
  await page.evaluate(()=>(window as any).controls.show({filters:{wood:true,food:false},priority:5,hitPoints:{min:0,max:0},allowFresh:false},true));
  await expect(min).toHaveValue('0');
  const disposed=await page.evaluate(()=>{
    const c=(window as any).controls,button=c.element.querySelector('[data-storage-all="true"]'),before=(window as any).changes.length;
    c.dispose();button.click();return {before,after:(window as any).changes.length};
  });
  expect(disposed.before).toBe(disposed.after);await expect(page.locator('.storage-core-controls')).toHaveCount(0);
});
