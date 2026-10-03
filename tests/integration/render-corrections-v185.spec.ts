import { expect, test } from '@playwright/test';
import { observeErrors, pause } from './helpers';

test('V185: prepared animal rest, paper flames and higher smoke share the native scene',async({playwright})=>{
  test.setTimeout(120_000);
  const browser=await playwright.chromium.launch({channel:'chromium',headless:false,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page);
  try{
    await page.route('**/src/main.ts*',async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:`const originalV185Frame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){window.__v185View=this;return originalV185Frame.call(this,now);};\n`+await response.text()});
    });
    await page.goto('/?scenario=camp&size=32&seed=42&e2e');
    await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});
    await pause(page);
    await page.waitForFunction(()=>Boolean((window as any).__v185View?.world));
    await page.evaluate(async()=>{
      const module=(path:string)=>import(/* @vite-ignore */ path);
      const [{enableWildlife},{adultAgeTicks},{ensureFireState},{newWeatherState}]=await Promise.all([
        module('/src/sim/wildlife.ts'),module('/src/sim/animal-life.ts'),module('/src/sim/fire-rules.ts'),module('/src/sim/weather.ts'),
      ]);
      const view=(window as any).__v185View,world=structuredClone(view.world);
      world.pawns=[];world.structures=[];world.piles=[];world.jobs=[];
      world.tick=3000;world.tiles=world.tiles.map(()=>({terrain:'grass'}));
      world.weather??=newWeatherState(world.seed,world.tick);
      world.weather.current=world.weather.previous='clear';world.weather.ageCore=4000;
      delete world.wildlife;enableWildlife(world,6);
      if(world.wildlife.animals.length!==6)throw new Error('Prepared scene requires six actual animals.');
      world.resources=[];
      const species=['hare','snow-hare','deer','muffalo','gazelle','dromedary'];
      world.wildlife.animals.forEach((animal:any,i:number)=>Object.assign(animal,{
        species:species[i],ageTicks:adultAgeTicks(species[i]),x:4+i*4,z:12,
        state:'idle',path:[],motion:undefined,
      }));
      const state=ensureFireState(world);state.items=[];
      for(const [x,size] of [[10,.1],[22,1.75]])state.items.push({id:world.nextId++,x,z:18,size,bornCore:30000,nextPulseCore:30015,complexCore:30150,spreadCore:30150});
      view.hasTracks=false;view.controls.enableDamping=false;
      view.setWorld(world,true,0);
    });
    await page.waitForFunction(()=>(window as any).__v185View.world.tick===3000);
    await page.evaluate(()=>{
      const view=(window as any).__v185View;
      view.rig.setMode('orthographic');
      view.camera.position.set(16,23,38);view.controls.target.set(16,0,14);
      view.camera.zoom=2;view.camera.updateProjectionMatrix();view.controls.update();
    });
    const canvas=page.locator('#viewport canvas').first();
    await page.waitForTimeout(350);
    expect(await page.evaluate(()=>(window as any).__v185View.backend)).toBe('WebGPU');
    await canvas.screenshot({path:test.info().outputPath('v185-animals-standing-fire.png')});
    const resident=await page.evaluate(()=>{
      const view=(window as any).__v185View;
      return view.wildlife.mesh.children.map((m:any)=>({geometry:m.geometry.uuid,material:m.material.uuid}));
    });
    for(const posture of ['sleeping','downed','idle']){
      await page.evaluate(posture=>{
        const view=(window as any).__v185View,w=structuredClone(view.world);
        for(const animal of w.wildlife.animals)animal.state=posture;
        view.setWorld(w,false,0);
      },posture);
      await page.waitForTimeout(250);
      const state=await page.evaluate(()=>{
        const view=(window as any).__v185View;
        return {actors:view.wildlife.mesh.children.map((m:any)=>({geometry:m.geometry.uuid,material:m.material.uuid})),
          encoded:view.wildlife.mesh.children.filter((m:any)=>m.name.startsWith('Wild ')).map((m:any)=>m.geometry.getAttribute('aAnimal').getZ(0)),
          flameTriangles:view.fires.mesh.geometry.getIndex().count/3,
          smoke:view.structureVfx.smoke.geometry.instanceCount,
          heights:Array.from({length:view.structureVfx.smoke.geometry.instanceCount},(_,i)=>view.structureVfx.smoke.geometry.getAttribute('smokePosition').getY(i))};
      });
      expect(state.actors).toEqual(resident);
      expect(state.encoded.every((n:number)=>n===(posture==='idle'?0:1))).toBe(true);
      expect(state.flameTriangles).toBe(10);
      expect(state.smoke).toBe(14);
      expect(Math.max(...state.heights)).toBeGreaterThan(2.8);
      await canvas.screenshot({path:test.info().outputPath(`v185-animals-${posture}-fire.png`)});
    }
    await page.evaluate(()=>{
      const view=(window as any).__v185View;
      view.rig.setMode('perspective');view.controls.target.set(16,1,16);
      view.camera.position.set(16,6,34);view.controls.update();
    });
    await page.waitForTimeout(250);
    await canvas.screenshot({path:test.info().outputPath('v185-fire-perspective.png')});
    const beforeAttached=await page.evaluate(()=>{
      const view=(window as any).__v185View;
      return {calls:view.stats.drawCalls,triangles:view.stats.triangles};
    });
    // First attached fire occurs after both projections were prepared with
    // zero active slots; actor indices and resident attributes must survive.
    await page.evaluate(()=>{
      const view=(window as any).__v185View,w=structuredClone(view.world);
      for(const animal of [w.wildlife.animals[0],w.wildlife.animals[5]])
        w.fires.items.push({id:w.nextId++,x:animal.x,z:animal.z,size:.7,bornCore:30000,nextPulseCore:30015,complexCore:0,spreadCore:0,attachedAnimalId:animal.id});
      view.setWorld(w,false,0);
    });
    await page.waitForTimeout(250);
    expect(await page.evaluate(()=>(window as any).__v185View.wildlife.flames.children.map((m:any)=>m.geometry.instanceCount))).toEqual([1,0,0,0,0,1]);
    const afterAttached=await page.evaluate(()=>{
      const view=(window as any).__v185View;
      return {calls:view.stats.drawCalls,triangles:view.stats.triangles};
    });
    expect(afterAttached.calls-beforeAttached.calls).toBe(2);
    expect(afterAttached.triangles-beforeAttached.triangles).toBe(20);
    await canvas.screenshot({path:test.info().outputPath('v185-first-attached-fire.png')});
    await page.evaluate(()=>{
      const view=(window as any).__v185View,w=structuredClone(view.world);
      w.fires.items=w.fires.items.filter((f:any)=>f.attachedAnimalId===undefined);
      view.setWorld(w,false,0);
    });
    await page.waitForTimeout(250);
    expect(await page.evaluate(()=>(window as any).__v185View.wildlife.flames.children.map((m:any)=>m.geometry.instanceCount))).toEqual([0,0,0,0,0,0]);
    expect(errors).toEqual([]);
  }finally{await browser.close();}
});
