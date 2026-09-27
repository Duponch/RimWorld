import { readFileSync } from 'node:fs';
import { expect,test,type Page } from '@playwright/test';
import { deserializeWorld } from '../../src/sim/serialization';
import { expectWorld,observeErrors,panel,pause,saveKey } from './helpers';

const probe=`
window.__brawlView=null;
const brawlFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){const result=brawlFrame.call(this,now);if(!this.preparing)window.__brawlView=this;return result;};`;

async function nextFrames(page:Page):Promise<void> {
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())))));
  // Wait for the WebGPU queue's submitted image to be presented as well.
  await page.waitForTimeout(80);
}

async function changedPixels(page:Page,a:Buffer,b:Buffer):Promise<number> {
  return page.evaluate(async ({first,second})=>{
    const decode=(base64:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{
      const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=`data:image/png;base64,${base64}`;
    });
    const images=await Promise.all([decode(first),decode(second)]);
    const canvas=document.createElement('canvas');canvas.width=images[0]!.width;canvas.height=images[0]!.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true})!;
    const pixels=images.map(img=>{ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0);return ctx.getImageData(0,0,canvas.width,canvas.height).data;});
    let changed=0;
    // Battle occupies the centre; ignore the HUD/FPS counter and notifications.
    for(let y=180;y<700;y++)for(let x=420;x<1060;x++){
      const i=(y*canvas.width+x)*4;
      if(Math.max(Math.abs(pixels[0]![i]!-pixels[1]![i]!),Math.abs(pixels[0]![i+1]!-pixels[1]![i+1]!),Math.abs(pixels[0]![i+2]!-pixels[1]![i+2]!))>18)changed++;
    }
    return changed;
  },{first:a.toString('base64'),second:b.toString('base64')});
}

test('V128: brawl pixels disappear and return on the same retained WebGPU renderer',async ({playwright})=>{
  test.setTimeout(120_000);
  const raw=readFileSync(new URL('../../public/test-saves/v125/insulte-bagarre.json',import.meta.url),'utf8');
  const world=deserializeWorld(raw);
  const browser=await playwright.chromium.launch({channel:'chromium',headless:false,args:[]});
  try{
    const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
    const errors=observeErrors(page);
    try{
      await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:raw});
      await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
      await page.goto('/?scenario=camp&size=32&e2e');
      await expect(page.locator('#loading')).toHaveCount(0);
      await pause(page);await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,world);
      await page.keyboard.press('Escape');await page.waitForFunction(()=>!!(window as any).__brawlView);
      await page.evaluate(()=>{
        const view=(window as any).__brawlView;view.controls.enableDamping=false;
        view.rig.setMode('orthographic');view.controls.target.set(16.5,0,15.5);view.camera.zoom=6;
        view.camera.updateProjectionMatrix();view.controls.update();
      });
      await nextFrames(page);
      const first=await page.screenshot();
      const live=await page.evaluate(()=>{const view=(window as any).__brawlView;return {backend:view.backend,tick:view.world.tick,count:view.brawlCloud.group.children[0].geometry.instanceCount};});
      expect(live.backend).toBe('WebGPU');expect(live.count).toBeGreaterThan(0);

      // End the pair through the layer's real snapshot entry point, without
      // recreating the renderer or moving the camera.
      await page.evaluate(()=>{
        const view=(window as any).__brawlView,calm=structuredClone(view.world);
        for(const pawn of calm.pawns){if(pawn.social)delete pawn.social.fight;delete pawn.melee;}
        view.brawlCloud.update(calm,view.pawns.feedbackSource);
      });
      await nextFrames(page);
      const hidden=await page.screenshot();
      const stopped=await page.evaluate(()=>{const view=(window as any).__brawlView;return {tick:view.world.tick,count:view.brawlCloud.group.children[0].geometry.instanceCount,visible:view.brawlCloud.group.children[0].visible};});
      expect(stopped).toEqual({tick:live.tick,count:0,visible:false});
      const disappeared=await changedPixels(page,first,hidden);
      expect(disappeared).toBeGreaterThan(2000);

      await page.evaluate(()=>{const view=(window as any).__brawlView;view.brawlCloud.update(view.world,view.pawns.feedbackSource);});
      await nextFrames(page);
      const restored=await page.screenshot();
      const returned=await changedPixels(page,hidden,restored);
      expect(returned).toBeGreaterThan(2000);

      // Simulate the true LOD predicate at the same camera to isolate the
      // visibility transition from the zoom's own change in projected pixels.
      await page.evaluate(()=>{const view=(window as any).__brawlView;view.__originalPixelsPerCell=view.rig.pixelsPerCell;view.rig.pixelsPerCell=()=>17;});
      await nextFrames(page);
      const lodHidden=await page.screenshot();
      expect(await changedPixels(page,restored,lodHidden)).toBeGreaterThan(2000);
      await page.evaluate(()=>{const view=(window as any).__brawlView;view.rig.pixelsPerCell=view.__originalPixelsPerCell;});
      await nextFrames(page);
      const lodRestored=await page.screenshot();
      expect(await changedPixels(page,lodHidden,lodRestored)).toBeGreaterThan(2000);
      expect(errors).toEqual([]);
    }finally{await page.close();}
  }finally{await browser.close();}
});
