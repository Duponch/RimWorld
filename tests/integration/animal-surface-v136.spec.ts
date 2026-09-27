import { expect,test } from '@playwright/test';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { adultAgeTicks } from '../../src/sim/animal-life';
import { animalSpecies,faunaBiome,type AnimalSpeciesId } from '../../src/sim/animal-species';
import { huntingCamp } from '../scenarios/hunting';
import { expectWorld,observeErrors,panel,pause,saveKey } from './helpers';

const probe=`window.__animalView=null;
const animalFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(...args){const result=animalFrame.apply(this,args);if(!this.preparing)window.__animalView=this;return result;};`;

test('V136: close WebGPU views use the resident animal shells',async({playwright})=>{
  test.setTimeout(120_000);
  const prepared=huntingCamp(136),base=prepared.wildlife!.animals[0]!;
  const kinds:AnimalSpeciesId[]=['hare','muffalo','dromedary'];
  prepared.wildlife!.animals=kinds.map((species,index)=>({
    ...structuredClone(base),id:index?prepared.nextId++:base.id,species,
    ageTicks:adultAgeTicks(species),sex:'male' as const,
    x:16,z:5+index*10,food:animalSpecies(species).nutrition,rest:1,
    state:'idle' as const,path:[],nextDecision:prepared.tick+100,motion:undefined,
  }));
  prepared.wildlife!.animals[2]!.domestic={since:prepared.tick,care:'herbal',tameness:5,nextDecay:prepared.tick+45000,lastTraining:prepared.tick};
  const biome=faunaBiome('temperate-forest'),full=prepared.width*prepared.height*biome.animalDensity/10000;
  prepared.wildlife!.profile='biome-herbivores-v1';
  prepared.wildlife!.population={biome:'temperate-forest',fullTargetWeight:full,targetWeight:full*biome.entries.reduce((sum,entry)=>sum+entry.commonality,0)/biome.totalCommonality,
    nextCheck:prepared.tick+122,checks:0,arrivals:0};
  expect(validateWorld(prepared)).toEqual([]);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
  try{
    await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(prepared)});
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    await page.goto('/?scenario=camp&size=32&e2e');
    await expect(page.locator('#loading')).toHaveCount(0);await pause(page);
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,prepared);
    await page.keyboard.press('Escape');await page.waitForFunction(()=>!!(window as any).__animalView);
    for(const animal of prepared.wildlife!.animals)for(const angle of ['side','front'] as const){
      const rendered=await page.evaluate(({species,x,z,angle})=>{
        const view=(window as any).__animalView;
        view.controls.enableDamping=false;view.rig.setMode('orthographic');
        view.controls.maxZoom=20;
        view.controls.target.set(x,.75,z);
        view.camera.position.set(x+(angle==='side'?7:0),3,z+(angle==='side'?1:7));
        view.camera.zoom=species==='hare'?16:8.5;
        view.camera.updateProjectionMatrix();view.controls.update();
        const mesh=view.wildlife.mesh.children.find((child:any)=>child.name===`Wild ${species} — GPU rig`);
        return {backend:view.backend,instances:mesh?.geometry.instanceCount,attributes:Object.keys(mesh?.geometry.attributes??{})};
      },{...animal,angle});
      expect(rendered.backend).toBe('WebGPU');
      expect(rendered.instances).toBe(1);
      expect(rendered.attributes).toContain('boneId');
      await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
      await page.waitForTimeout(100);
      await page.screenshot({path:test.info().outputPath(`animal-surface-v136-${animal.species}-${angle}.png`),
        clip:{x:420,y:170,width:600,height:660}});
    }
    expect(errors).toEqual([]);
  }finally{await page.close();await browser.close();}
});
