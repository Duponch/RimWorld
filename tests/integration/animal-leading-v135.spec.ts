import { testOutputPath } from '../test-output.ts';
import {expect,test,type Page} from '@playwright/test';
import {huntingCamp} from '../scenarios/hunting';
import {newDoorState} from '../../src/sim/door-rules';
import {faunaBiome} from '../../src/sim/animal-species';
import {stepWorld} from '../../src/sim/engine';
import {refreshStock} from '../../src/sim/materials';
import {serializeWorld,validateWorld} from '../../src/sim/serialization';
import type {Structure} from '../../src/sim/types';
import {expectWorld,observeErrors,panel,pause,saveKey} from './helpers';

const probe=`window.__ropeView=null;
const ropeFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){const result=ropeFrame.call(this,now);if(!this.preparing)window.__ropeView=this;return result;};`;

function twoRopeCheckpoint(){
  const w=huntingCamp(),pawn=w.pawns[0]!,animal=w.wildlife!.animals[0]!;
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.jobs=[];w.piles=[];w.pawns=[pawn];w.structures=[];
  pawn.x=2;pawn.z=7;pawn.path=[];pawn.hunger=100;pawn.rest=100;
  for(const work of Object.keys(pawn.priorities) as (keyof typeof pawn.priorities)[])pawn.priorities[work]=0;
  pawn.priorities.handle=1;
  animal.species='deer';animal.x=3;animal.z=7;animal.path=[];animal.motion=undefined;
  animal.food=1.2;animal.rest=1;animal.state='idle';animal.nextDecision=w.tick+100;
  const biome=faunaBiome('temperate-forest'),full=w.width*w.height*biome.animalDensity/10000;
  w.wildlife!.profile='biome-herbivores-v1';
  w.wildlife!.population={biome:'temperate-forest',fullTargetWeight:full,
    targetWeight:full*biome.entries.reduce((n,e)=>n+e.commonality,0)/biome.totalCommonality,
    nextCheck:w.tick+122,checks:0,arrivals:0};
  animal.domestic={since:w.tick,care:'herbal',tameness:5,nextDecay:w.tick+45000,lastTraining:w.tick};
  const second=structuredClone(animal);second.id=w.nextId++;second.z=8;w.wildlife!.animals.push(second);
  const add=(kind:Structure['kind'],x:number,z:number)=>{
    const s:Structure={id:w.nextId++,kind,x,z,orientation:0,footprint:'standard',material:'wood'};
    if(kind==='fence-gate')s.door=newDoorState(w.tick);
    if(kind==='pen-marker')s.pen={accepted:['deer','gazelle','muffalo','dromedary']};
    w.structures.push(s);
  };
  for(let x=5;x<=9;x++){add('fence',x,5);add('fence',x,9);}
  for(let z=6;z<=8;z++){add(z===7?'fence-gate':'fence',5,z);add('fence',9,z);}
  add('pen-marker',7,7);refreshStock(w);
  for(let i=0;i<1000&&pawn.animalHandling?.ropees?.length!==2;i++)stepWorld(w);
  if(pawn.animalHandling?.ropees?.length!==2)throw new Error('Two animals did not attach in the prepared simulation.');
  expect(validateWorld(w)).toEqual([]);
  return w;
}

async function frames(page:Page){
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  await page.waitForTimeout(80);
}

async function changedPixels(page:Page,a:Buffer,b:Buffer):Promise<number>{
  return page.evaluate(async({before,after})=>{
    const image=(source:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{
      const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=`data:image/png;base64,${source}`;
    });
    const [first,second]=await Promise.all([image(before),image(after)]);
    const canvas=document.createElement('canvas');canvas.width=first.width;canvas.height=first.height;
    const context=canvas.getContext('2d',{willReadFrequently:true})!;
    const pixels=[first,second].map(img=>{context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(img,0,0);return context.getImageData(0,0,canvas.width,canvas.height).data;});
    let changed=0;
    for(let y=160;y<800;y++)for(let x=390;x<1050;x++){
      const i=(y*canvas.width+x)*4;
      if(Math.max(Math.abs(pixels[0]![i]!-pixels[1]![i]!),Math.abs(pixels[0]![i+1]!-pixels[1]![i+1]!),Math.abs(pixels[0]![i+2]!-pixels[1]![i+2]!))>12)changed++;
    }
    return changed;
  },{before:a.toString('base64'),after:b.toString('base64')});
}

test('V135 WebGPU draws two physical ropes in one batch, then culls them at distant LOD',async({playwright})=>{
  test.setTimeout(120_000);
  const prepared=twoRopeCheckpoint(),raw=serializeWorld(prepared);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page);
  try{
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:raw});
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    await page.goto('/?scenario=camp&size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);
    await pause(page);await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,prepared);
    await page.keyboard.press('Escape');await page.waitForFunction(()=>!!(window as any).__ropeView);
    await page.evaluate(()=>{
      const view=(window as any).__ropeView;view.controls.enableDamping=false;
      view.rig.setMode('orthographic');view.controls.target.set(3.5,0,7.5);view.camera.zoom=7;
      view.camera.updateProjectionMatrix();view.controls.update();
    });
    await frames(page);
    const visible=await page.evaluate(()=>{
      const view=(window as any).__ropeView;
      return {backend:view.backend,instances:view.ropes.mesh.geometry.instanceCount,visible:view.ropes.mesh.visible,uploads:view.ropes.stats.uploads};
    });
    expect(visible).toMatchObject({backend:'WebGPU',instances:2,visible:true});
    const drawn=await page.screenshot({path:testOutputPath('artifacts/animal-leading-v135.png')});
    await page.evaluate(()=>{
      const view=(window as any).__ropeView;
      view.__ropeSetDetailVisible=view.ropes.setDetailVisible.bind(view.ropes);
      view.ropes.setDetailVisible=()=>view.__ropeSetDetailVisible(false);
    });
    await frames(page);
    expect(await page.evaluate(()=>((window as any).__ropeView.ropes.mesh.visible))).toBe(false);
    const without=await page.screenshot();
    expect(await changedPixels(page,drawn,without)).toBeGreaterThan(8);
    await page.evaluate(()=>{
      const view=(window as any).__ropeView;
      view.ropes.setDetailVisible=view.__ropeSetDetailVisible;
      view.__ropePixelsPerCell=view.rig.pixelsPerCell;view.rig.pixelsPerCell=()=>17;
    });
    await frames(page);
    expect(await page.evaluate(()=>((window as any).__ropeView.ropes.mesh.visible))).toBe(false);
    await page.evaluate(()=>{
      const view=(window as any).__ropeView;view.rig.pixelsPerCell=view.__ropePixelsPerCell;
    });
    await frames(page);
    expect(await page.evaluate(()=>((window as any).__ropeView.ropes.mesh.visible))).toBe(true);
    expect(errors).toEqual([]);
  }finally{await browser.close();}
});
