import {expect,test,type Page} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {preparedCassandraExpedition} from '../scenarios/secondary-incidents-v379.ts';
import {addGroundMaterial} from '../../src/sim/materials.ts';
import {ITEM_DEFINITIONS} from '../../src/sim/items.ts';
import {flushSecondaryContext} from '../../src/sim/secondary-site-context.ts';
import {campaignPresentation} from '../../src/sim/secondary-site-presentation.ts';
import {serializeWorld,validateWorld} from '../../src/sim/serialization.ts';
import {expectWorld,observeErrors,panel,pause,saveKey,world} from './helpers.ts';
import {inspectPerson} from './player-actions.ts';

async function hoverCanvas(page:Page){
  const point=await page.evaluate(()=>{
    const canvas=document.querySelector('#viewport canvas')!,r=canvas.getBoundingClientRect(),w=window.__lisiere.world;
    let best:{x:number;y:number;score:number}|undefined;
    // Project a genuine cell: a free canvas pixel could instead show the table.
    for(let z=1;z<w.height-1;z++)for(let x=1;x<w.width-1;x++){
      const q=window.__lisiere.projectCell(x,z),px=r.left+q.x,py=r.top+q.y;
      if(px<r.left+5||px>r.right-5||py<r.top+5||py>r.bottom-5||document.elementFromPoint(px,py)!==canvas)continue;
      const score=Math.hypot(px-r.width*.62,py-r.height*.35);if(!best||score<best.score)best={x:px,y:py,score};
    }
    if(!best)throw Error('No genuine map cell is visible');return best;
  });
  await page.mouse.move(point.x,point.y);await expect(page.locator('#map-hover-readout')).toBeVisible();
}

test('V380 real HUD layout: expanded ledger, large dossier, orders, hover, four sizes and map reset',async({page},info)=>{
  test.setTimeout(180000);page.setDefaultTimeout(10000);
  const f=preparedCassandraExpedition(),cell=f.local.pawns[0]!;
  for(const item of ['wood','granite-blocks','steel','plasteel','uranium','silver','component','advanced-component','chemfuel','cloth','medicine','rice'] as const)
    addGroundMaterial(f.local,ITEM_DEFINITIONS[item].kind,10,cell,item);
  flushSecondaryContext(f.w);expect(validateWorld(f.w)).toEqual([]);
  const errors=observeErrors(page),proof:Record<string,unknown>={prepared:'32² two-map layout fixture; finite additional ground materials supplied before load; no simulated production claimed',sizes:[],complete:false};
  try{
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(f.w)});
    await page.goto('/?scenario=camp&size=32&e2e',{waitUntil:'domcontentloaded'});
    await expect(page.locator('.game-shell')).toHaveJSProperty('inert',false,{timeout:60000});await pause(page);await panel(page,'menu');await page.locator('#load').click();
    await expectWorld(page,JSON.parse(JSON.stringify(campaignPresentation(f.w))));await page.keyboard.press('Escape');
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    const groups=page.locator('.resource-ledger-group:not([hidden])');
    for(let i=0;i<await groups.count();i++)if(await groups.nth(i).getAttribute('open')===null)await groups.nth(i).locator(':scope > summary').click();
    for(const size of [{width:1280,height:720},{width:1600,height:900},{width:1920,height:1080},{width:1024,height:768}]){
      await page.setViewportSize(size);await inspectPerson(page,f.ids[0]!,'bio');await hoverCanvas(page);
      const geometry=()=>page.evaluate(()=>{
        const box=(e:Element)=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
        const resource=document.querySelector('.resource-list')!,dock=document.querySelector('.map-tools-dock')!,hover=document.querySelector<HTMLElement>('#map-hover-readout')!;
        const obstacles=[resource,...dock.querySelectorAll('.map-tools-heading,.map-tools-tray'),...document.querySelectorAll('#inspector .colonist-inspector-pages,#inspector .colonist-inspector-summary,#inspector .colonist-inspector-tabs button,#inspector .colonist-inspector-actions')].filter(e=>e.getClientRects().length);
        const h=box(hover),overlap=obstacles.filter(e=>{const r=box(e);return Math.min(r.right,h.right)-Math.max(r.left,h.left)>1&&Math.min(r.bottom,h.bottom)-Math.max(r.top,h.top)>1;}).map(e=>e.className);
        return {resource:box(resource),dock:box(dock),hover:h,overlap,mode:hover.dataset.hoverLayout,scrollHeight:hover.scrollHeight,clientHeight:hover.clientHeight,text:hover.textContent,style:getComputedStyle(hover).pointerEvents};
      });
      await expect.poll(async()=>{const g=await geometry();return g.resource.bottom<=g.dock.top+1&&g.mode==='whole'&&g.overlap.length===0&&g.scrollHeight<=g.clientHeight+1;}).toBe(true);
      const g=await geometry();expect(g.hover.left).toBeGreaterThanOrEqual(0);expect(g.hover.right).toBeLessThanOrEqual(size.width);expect(g.hover.bottom).toBeLessThanOrEqual(size.height);expect(g.text).toContain('Lumière');
      const dossier=g;await page.screenshot({path:info.outputPath(`hud-${size.width}x${size.height}.png`)});
      // Opening a tray legally closes the dossier; these are two real states,
      // never a forced coexistence of otherwise exclusive DOM surfaces.
      await page.locator('#orders-open').click();await hoverCanvas(page);
      await expect.poll(async()=>{const g=await geometry();return g.resource.bottom<=g.dock.top+1&&g.mode==='whole'&&g.overlap.length===0&&g.scrollHeight<=g.clientHeight+1;}).toBe(true);
      const orders=await geometry();await page.locator('#zones-open').click();await hoverCanvas(page);
      await expect.poll(async()=>{const g=await geometry();return g.resource.bottom<=g.dock.top+1&&g.overlap.length===0;}).toBe(true);
      const zones=await geometry();(proof.sizes as unknown[]).push({...size,dossier,orders,zones});
      if(size.width<=1280)await page.screenshot({path:info.outputPath(`zones-${size.width}x${size.height}.png`)});
      await page.locator('#zones-open').click();
    }
    await panel(page,'world');await page.locator('[data-world-tab="group"]').click();await page.locator('[data-site-action="home"]').click();
    await page.waitForFunction(()=>window.__lisiere.world.campaignMap?.active==='home');await page.keyboard.press('Escape');
    await expect(page.locator('#map-hover-readout')).toBeHidden();await hoverCanvas(page);
    expect((await world(page)).campaignMap?.active).toBe('home');expect(errors).toEqual([]);proof.errors=errors;
    const incident=await page.evaluate(()=>window.__lisiere.incident);expect(incident.graphicsFault||incident.simulationStopped).toBe(false);proof.incident=incident;proof.complete=true;
  }finally{await writeFile(info.outputPath('proof.json'),JSON.stringify(proof,null,2));}
});
