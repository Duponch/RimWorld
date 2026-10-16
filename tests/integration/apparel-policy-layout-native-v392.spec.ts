import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {decodeStoredSave} from '../../src/ui/save-storage-codec';
import {deserializeWorld} from '../../src/sim/serialization';
import {world,pause,panel,expectWorld,observeErrors} from './helpers';

test.skip(process.env.APPAREL_POLICY_V392_LAYOUT!=='1','ROOT opt-in: CSS-only recheck from the acquired V392 checkpoint.');
test('V392 label geometry: wrapped text stays inside its own label and the filter list scrolls',async({page},info)=>{
  test.setTimeout(75_000);const errors=observeErrors(page),input=resolve(process.env.APPAREL_POLICY_V392_LAYOUT_INPUT??'tmp/apparel-policy-v392/native-01/apparel-policy-native-v392-48b69-ical-wear-with-exact-reload/applied-world.json');
  const initial=deserializeWorld(await decodeStoredSave(await readFile(input,'utf8')));
  await page.goto('/?e2e');const front=page.locator('.front-menu');await front.getByRole('button',{name:'Charger une partie',exact:true}).click();await front.locator('input[type=file]').setInputFiles(input);
  await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});await pause(page);await expectWorld(page,initial);await panel(page,'assign');await page.locator('#manage-apparel-policies').click();
  const dialog=page.locator('#apparel-policy-dialog'),field=dialog.locator('.apparel-item-filters');await expect(dialog).toBeVisible();
  expect(initial.tick).toBe(3000);const originalLabels=await dialog.locator('fieldset label').allTextContents();
  for(const viewport of [{width:1440,height:1000},{width:1024,height:768}]){
  await page.setViewportSize(viewport);await page.evaluate(async()=>{await document.fonts.ready;});
  expect(await dialog.locator('fieldset label').allTextContents()).toEqual(originalLabels);
  const geometry=await dialog.evaluate(el=>{
    const rect=(r:DOMRect)=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height});
    const groups=[...el.querySelectorAll<HTMLElement>('.apparel-item-filters,.apparel-material-filters')].map(field=>{
      const labels=[...field.querySelectorAll<HTMLLabelElement>('label')].map(label=>{
        const style=getComputedStyle(label),lines:ReturnType<typeof rect>[]=[];
        for(const node of label.childNodes)if(node.nodeType===Node.TEXT_NODE&&node.textContent?.trim()){
          const range=document.createRange();range.selectNodeContents(node);for(const r of range.getClientRects())if(r.width>0&&r.height>0)lines.push(rect(r));
        }
        return {text:label.textContent?.trim(),bounds:rect(label.getBoundingClientRect()),lines,display:style.display,visibility:style.visibility,overflowY:style.overflowY,font:style.fontFamily,lineHeight:style.lineHeight};
      });
      const escaped=labels.flatMap(label=>label.lines.filter(r=>r.top<label.bounds.top-1||r.bottom>label.bounds.bottom+1||r.left<label.bounds.left-1||r.right>label.bounds.right+1).map(r=>({text:label.text,line:r,bounds:label.bounds})));
      const overlaps:{a:string|undefined;b:string|undefined}[]=[];
      for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++)if(labels[i]!.lines.some(a=>labels[j]!.lines.some(b=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>.5&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>.5)))overlaps.push({a:labels[i]!.text,b:labels[j]!.text});
      return {kind:field.className,labels,escaped,overlaps,overflowY:getComputedStyle(field).overflowY,clientHeight:field.clientHeight,scrollHeight:field.scrollHeight};
    });
    return {viewport:{width:innerWidth,height:innerHeight},font:document.documentElement.dataset.uiFont,groups};
  });
  await writeFile(info.outputPath(`label-geometry-${viewport.width}x${viewport.height}.json`),JSON.stringify(geometry,null,2));
  expect(geometry.groups).toHaveLength(2);
  for(const group of geometry.groups){expect(group.labels.length).toBeGreaterThan(0);expect(group.escaped).toEqual([]);expect(group.overlaps).toEqual([]);for(const label of group.labels){expect(label.lines.length).toBeGreaterThan(0);expect(label.display).not.toBe('none');expect(label.visibility).toBe('visible');expect(label.overflowY).not.toBe('hidden');}}
  const garments=geometry.groups.find(g=>g.kind.includes('apparel-item-filters'))!;
  expect(garments.labels.some(label=>label.lines.length>1)).toBe(true);expect(garments.overflowY).toBe('auto');expect(garments.scrollHeight).toBeGreaterThan(garments.clientHeight);
  await field.locator('label').first().scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`01-intrinsic-multiline-labels-${viewport.width}x${viewport.height}.png`)});
  await field.locator('label').last().scrollIntoViewIfNeeded();expect(await field.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);await page.screenshot({path:info.outputPath(`02-last-label-reachable-by-scroll-${viewport.width}x${viewport.height}.png`)});
  }
  await page.locator('#close-apparel-policies').click();await page.keyboard.press('Escape');await expectWorld(page,initial);expect(await world(page)).toEqual(initial);expect(errors).toEqual([]);
});
