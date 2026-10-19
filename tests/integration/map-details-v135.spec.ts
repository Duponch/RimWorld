import { expect, test } from '@playwright/test';
import { createWorld } from '../../src/sim/engine';
import { addGroundMaterial, refreshStock } from '../../src/sim/materials';
import { serializeWorld, validateWorld } from '../../src/sim/serialization';
import { expectWorld, observeErrors, panel, pawnTab, saveKey, settledCells } from './helpers';
import { revealCells } from './player-actions';

test('V135: avatar stays in the lower summary; Alt and close zoom reveal physical map details', async ({ playwright }) => {
  test.setTimeout(100_000);
  const world=createWorld(1352,32,32),target={x:18,z:16};
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  world.resources=[];world.structures=[];world.piles=[];world.packed=[];world.jobs=[];world.growingZones=[];world.stockpiles=[];
  addGroundMaterial(world,'food',4,target,'simple-meal');refreshStock(world);
  expect(validateWorld(world)).toEqual([]);
  const browser=await playwright.chromium.launch({channel:'chromium',headless:false,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try {
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(world)});
    await page.route('**/src/main.ts*',async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:`const originalDetailsFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){window.__v135Details=this;return originalDetailsFrame.call(this,now);};\n`+await response.text()});
    });
    await page.goto('/?scenario=camp&size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);
    await page.locator('[data-speed="0"]').click();await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,world);
    await page.locator(`[data-pawn="${world.pawns[0]!.id}"]`).click();await pawnTab(page,'bio');
    await expect(page.locator('.colonist-inspector-summary .appearance-inspection img')).toBeVisible();
    await expect(page.locator('[data-colonist-panel="bio"] .appearance-inspection')).toHaveCount(0);
    await page.screenshot({path:test.info().outputPath('lower-avatar-v135.png')});
    await page.keyboard.press('Escape');
    await revealCells(page,[target]);
    const pointer=async()=>{
      const [point]=await settledCells(page,[target]),bounds=(await page.locator('#viewport canvas').boundingBox())!;
      return {x:bounds.x+point!.x,y:bounds.y+point!.y};
    };
    let p=await pointer();await page.mouse.move(p.x,p.y);
    await page.keyboard.down('Alt');
    await expect(page.locator('#map-cell-details')).toBeVisible();
    await expect(page.locator('#map-cell-details')).toContainText('Repas simple ×4');
    await expect(page.locator('#map-cell-details')).toContainText('Fertilité');
    await page.screenshot({path:test.info().outputPath('alt-inspector-v135.png')});
    await page.keyboard.up('Alt');await expect(page.locator('#map-cell-details')).toBeHidden();
    await page.waitForFunction(()=>!!(window as any).__v135Details&&!(window as any).__v135Details.preparing);
    for(let i=0;i<8&&!await page.evaluate(()=>(window as any).__v135Details.mapLabels.mesh.visible);i++){
      p=await pointer();await page.mouse.move(p.x,p.y);await page.mouse.wheel(0,-400);await page.waitForTimeout(120);
    }
    await expect.poll(()=>page.evaluate(()=>(window as any).__v135Details.mapLabels.mesh.visible)).toBe(true);
    const caption=await page.evaluate(target=>{
      const view=(window as any).__v135Details,mesh=view.mapLabels.mesh;
      const entry=view.mapLabels.chunks.flatMap((chunk:any)=>chunk.entries).find((entry:any)=>entry.x===target.x&&entry.z===target.z);
      if(!entry)throw Error('Physical quantity caption missing');
      const anchor=mesh.geometry.getAttribute('labelAnchor'),bounds=view.renderer.domElement.getBoundingClientRect();
      const point=view.camera.position.clone().set(entry.x,entry.y,entry.z).project(view.camera);
      return {label:entry.label,count:mesh.geometry.instanceCount,anchor:[anchor.getX(0),anchor.getY(0),anchor.getZ(0)],
        entry:[entry.x,entry.y,entry.z],x:bounds.left+(point.x+1)*bounds.width/2,y:bounds.top+(1-point.y)*bounds.height/2};
    },target);
    expect(caption.label).toBe('4');expect(caption.count).toBe(1);
    expect(caption.anchor[0]).toBe(target.x);expect(caption.anchor[1]).toBeCloseTo(caption.entry[1]!,5);expect(caption.anchor[2]).toBe(target.z);
    expect(await page.evaluate(point=>document.elementFromPoint(point.x,point.y)===document.querySelector('#viewport canvas'),caption)).toBe(true);
    const withLabels=await page.screenshot({path:'tmp/map-labels-v438/map-details-v135-label.png'});
    await page.evaluate(()=>{
      const overlay=(window as any).__v135Details.mapLabels;
      (window as any).__v135LabelDraw=overlay.draw.bind(overlay);
      overlay.draw=(...args:any[])=>{(window as any).__v135LabelDraw(...args);overlay.mesh.visible=false;};
    });
    await page.waitForTimeout(120);
    const withoutLabels=await page.screenshot({path:'tmp/map-labels-v438/map-details-v135-without-label.png'});
    const changed=await page.evaluate(async({withLabels,withoutLabels,point})=>{
      const bitmap=(base64:string)=>createImageBitmap(new Blob([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))],{type:'image/png'}));
      const [a,b]=await Promise.all([bitmap(withLabels),bitmap(withoutLabels)]);
      const canvas=document.createElement('canvas');canvas.width=a.width;canvas.height=a.height;
      const ctx=canvas.getContext('2d')!;ctx.drawImage(a,0,0);const before=ctx.getImageData(0,0,a.width,a.height).data;
      ctx.clearRect(0,0,a.width,a.height);ctx.drawImage(b,0,0);const after=ctx.getImageData(0,0,b.width,b.height).data;
      let count=0;
      for(let y=Math.max(0,Math.floor(point.y)-16);y<Math.min(a.height,Math.ceil(point.y)+16);y++)
        for(let x=Math.max(0,Math.floor(point.x)-16);x<Math.min(a.width,Math.ceil(point.x)+16);x++){
          const i=(y*a.width+x)*4;
          if(Math.max(Math.abs(before[i]!-after[i]!),Math.abs(before[i+1]!-after[i+1]!),Math.abs(before[i+2]!-after[i+2]!))>35)count++;
        }
      a.close();b.close();return count;
    },{withLabels:withLabels.toString('base64'),withoutLabels:withoutLabels.toString('base64'),point:caption});
    expect(changed).toBeGreaterThan(5);
    await page.evaluate(()=>{(window as any).__v135Details.mapLabels.draw=(window as any).__v135LabelDraw;});
    await page.waitForTimeout(120);
    await page.locator(`[data-pawn="${world.pawns[0]!.id}"]`).click();await pawnTab(page,'needs');
    await expect(page.locator('[data-colonist-panel="needs"] #mood-gauge')).toBeVisible();
    await expect(page.locator('#mood-meter')).toHaveCount(0);
    const panelIsAboveLabels=await page.evaluate(()=>{
      const canvas=document.querySelector<HTMLCanvasElement>('#viewport canvas')!;
      const inspector=document.querySelector<HTMLElement>('#inspector')!;
      const bounds=inspector.getBoundingClientRect();
      const top=document.elementFromPoint(bounds.left+bounds.width/2,bounds.top+bounds.height/2);
      return !!canvas&&top!==canvas&&(top===inspector||inspector.contains(top));
    });
    expect(panelIsAboveLabels).toBe(true);
    await page.screenshot({path:test.info().outputPath('map-details-v135.png')});
    expect(errors).toEqual([]);
  } finally {await browser.close();}
});
