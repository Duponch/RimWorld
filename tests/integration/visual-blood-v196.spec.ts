import { readFileSync } from 'node:fs';
import { expect,test,type Page } from '@playwright/test';
import { deserializeWorld,validateWorld,serializeWorld } from '../../src/sim/serialization.ts';
import { ANIMAL_SPECIES_IDS } from '../../src/sim/animal-species.ts';
import { expectWorld,observeErrors,panel,pause,saveKey,world } from './helpers.ts';
import { testOutputPath,writeTestFile } from '../test-output.ts';

// This is a prepared renderer diagnostic, not a played seven-species biome.
// The persistent public scene remains strictly valid. Its two missing living
// snow hares are added only to a renderer clone, never to the worker or save.
const hook=`const v196Frame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(...args){const result=v196Frame.apply(this,args);if(!this.preparing){window.__v196View=this;
const probe=window.__v196Probe;if(probe?.cargoId&&this.world){const pile=this.world.piles.find(p=>p.id===probe.cargoId);
const rig=this.wildlife.rigs.find(r=>r.animals.some(a=>a.corpsePile?.id===probe.cargoId));const index=rig?.animals.findIndex(a=>a.corpsePile?.id===probe.cargoId)??-1;
const g=rig?.mesh.geometry,from=g?.getAttribute('aFrom'),to=g?.getAttribute('aTo'),handoff=g?.getAttribute('aCorpseHandoff');
const sample={tick:this.world.tick,owner:pile?.owner,instances:this.wildlife.rigs.reduce((n,r)=>n+r.animals.filter(a=>a.corpsePile?.id===probe.cargoId).length,0),
carrier:index<0?null:g.getAttribute('aCarrier').getX(index),handoff:index<0?null:handoff.getY(index),from:index<0?null:[from.getX(index),from.getY(index),from.getZ(index)],to:index<0?null:[to.getX(index),to.getY(index),to.getZ(index)]};
const key=JSON.stringify(sample);if(key!==probe.lastCargo){probe.cargo.push(sample);probe.lastCargo=key;}}}return result;};
window.__v196Command=async command=>{await client.command(command);return {ok:true};};`;

const settled=async(page:Page)=>{
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
};
async function camera(page:Page,x:number,z:number,mode:'orthographic'|'perspective',zoom=5){
  await page.evaluate(({x,z,mode,zoom})=>{
    const v=(window as any).__v196View;v.controls.enableDamping=false;v.controls.maxZoom=20;
    v.rig.setMode(mode);v.controls.minDistance=0;
    v.controls.target.set(x,.5,z);
    v.camera.position.set(x+6,mode==='perspective'?5:7,z+8);
    v.camera.zoom=mode==='orthographic'?zoom:1;v.camera.updateProjectionMatrix();v.controls.update();
    v.invalidatePausedShadow();
  },{x,z,mode,zoom});await settled(page);
}
const clip={x:420,y:170,width:600,height:660};
async function capture(page:Page,name:string,full=false){
  await settled(page);const path=testOutputPath(`artifacts/visual-blood-v196-${name}.png`);
  const pixels=await page.screenshot({path,...full?{}:{clip}});
  await test.info().attach(name,{path,contentType:'image/png'});return pixels;
}

test('V196 prepared native WebGPU blood, seven shared animal rigs and physical corpse handoffs',async({playwright})=>{
  test.setTimeout(120_000);
  const prepared=deserializeWorld(readFileSync('public/test-saves/v196/sang-depouilles-douleur.json','utf8'));
  expect(validateWorld(prepared)).toEqual([]);
  const browser=await playwright.chromium.launch({channel:'chromium',headless:true,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page),requests:{url:string;failure:string|null}[]=[],consoleMessages:unknown[]=[];
  page.on('requestfailed',request=>requests.push({url:request.url(),failure:request.failure()?.errorText??null}));
  page.on('console',message=>{if(message.type()==='error'||message.type()==='warning')consoleMessages.push({type:message.type(),text:message.text(),source:message.location()});});
  try{
    await page.addInitScript(({key,save})=>{
      localStorage.setItem(key,save);
      const probe={hooked:false,pipelines:[] as unknown[],cargo:[] as unknown[],cargoId:0,lastCargo:''};
      (window as any).__v196Probe=probe;
      const device=(globalThis as any).GPUDevice?.prototype;if(!device)return;
      const code=new WeakMap<object,string>(),shader=device.createShaderModule;
      device.createShaderModule=function(d:any){const module=Reflect.apply(shader,this,[d]) as object;code.set(module,d.code);return module;};
      for(const name of ['createRenderPipeline','createRenderPipelineAsync']){
        const original=device[name];device[name]=function(d:any){
          const buffers=(d.vertex.buffers??[]).filter(Boolean);
          probe.pipelines.push({name,label:d.label,vertexBuffers:buffers.length,vertexAttributes:buffers.reduce((n:number,b:any)=>n+b.attributes.length,0),
            layouts:buffers,vertexCode:code.get(d.vertex.module),fragmentCode:d.fragment?code.get(d.fragment.module):undefined});
          return Reflect.apply(original,this,[d]);
        };
      }probe.hooked=true;
    },{key:saveKey,save:serializeWorld(prepared)});
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:hook+await response.text()});});
    await page.goto('/?scenario=camp&size=32&e2e');await expect(page.locator('#loading')).toHaveCount(0);await pause(page);
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,prepared);await page.keyboard.press('Escape');
    await page.waitForFunction(()=>Boolean((window as any).__v196View?.world));
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');

    const chart=await page.evaluate(async()=>{
      const v=(window as any).__v196View,w=structuredClone(v.world);
      const healthPath='/src/sim/injury-state.ts',damagePath='/src/sim/wildlife-health.ts';
      const {createMedicalRecord}=await import(healthPath),{damageAnimalWithBullet}=await import(damagePath);
      const base=w.wildlife.animals.find((a:any)=>a.species==='hare');
      for(const [z,state] of [[6,'idle'],[11,'sleeping']] as const){
        const a={...structuredClone(base),id:w.nextId++,species:'snow-hare',x:8,z,state:'idle',
          health:{...createMedicalRecord(w.tick),body:'snow-hare'}};
        w.wildlife.animals.push(a);damageAnimalWithBullet(w,a,{part:'torso',damage:1});a.state=state;
      }
      v.hasTracks=false;v.setWorld(w,true,0);v.setGroundGrassEnabled(true);
      (window as any).__v196Chart=w;
      return v.wildlife.rigs.map((r:any)=>{
        const g=r.mesh.geometry,eye=g.getAttribute('eyeMark'),position=g.getAttribute('position');
        g.computeBoundingBox();const box=g.boundingBox;
        const row=r.animals.map((a:any,i:number)=>({id:a.id,state:g.getAttribute('aAnimal').getZ(i),scale:g.getAttribute('aScale').getX(i),blood:g.getAttribute('aBodyBlood').getX(i)}));
        (window as any).__v196Probe[r.species]={geometry:g,position:position.data,color:g.getAttribute('color').data};
        return {species:r.species,instances:g.instanceCount,row,eyeOpen:Array.from({length:eye.count},(_,i)=>eye.getX(i)).filter(x=>x===0).length,
          eyeCross:Array.from({length:eye.count},(_,i)=>eye.getX(i)).filter(x=>x===1).length,
          bindDimensions:[box.max.x-box.min.x,box.max.y-box.min.y,box.max.z-box.min.z],
          sharedPoseGraph:r.plainMaterial.positionNode===r.texturedMaterial.positionNode,vertices:position.count};
      });
    });
    expect(chart.map((r:any)=>r.species)).toEqual(ANIMAL_SPECIES_IDS);
    for(const rig of chart){expect(rig.instances).toBe(3);expect(rig.row.map((a:any)=>a.state)).toEqual([0,1,2]);
      expect(rig.row.map((a:any)=>a.scale)).toEqual([1,1,1]);expect(rig.row[0].blood).toBeGreaterThan(0);
      expect(rig.eyeOpen).toBeGreaterThan(0);expect(rig.eyeCross).toBeGreaterThan(0);expect(rig.sharedPoseGraph).toBe(true);
      expect(rig.bindDimensions.every((n:number)=>n>0)).toBe(true);}
    for(const mode of ['orthographic','perspective'] as const){
      await camera(page,16,11,mode,1.1);if(mode==='perspective')await page.evaluate(()=>{
        const v=(window as any).__v196View;v.camera.position.set(32,27,36);v.controls.update();
      });await capture(page,`chart-${mode}-textured`,true);
    }
    await page.evaluate(()=>(window as any).__v196View.setTexturesEnabled(false));
    await camera(page,16,11,'orthographic',1.1);await capture(page,'chart-orthographic-plain',true);

    // Identical full rig and rolled pose; only the submitted eye state changes.
    // These pixel pairs must differ, and the seven close captures require human
    // inspection to establish readable crosses, coat fidelity and proportions.
    for(const [column,species] of ANIMAL_SPECIES_IDS.entries()){
      await camera(page,4+column*4,16,'orthographic',species.includes('hare')?16:8);
      const dead=await capture(page,`${species}-dead-cross`);
      await page.evaluate(species=>{
        const r=(window as any).__v196View.wildlife.rigs.find((r:any)=>r.species===species),g=r.mesh.geometry;
        const i=r.animals.findIndex((a:any)=>a.corpsePile),attr=g.getAttribute('aAnimal');
        attr.setZ(i,1);attr.data.needsUpdate=true;(window as any).__v196View.invalidatePausedShadow();
      },species);
      const sleepingEyes=await capture(page,`${species}-same-pose-open-eyes`);expect(sleepingEyes.equals(dead)).toBe(false);
      await page.evaluate(species=>{const v=(window as any).__v196View,r=v.wildlife.rigs.find((r:any)=>r.species===species),attr=r.mesh.geometry.getAttribute('aAnimal');
        attr.setZ(r.animals.findIndex((a:any)=>a.corpsePile),2);attr.data.needsUpdate=true;v.invalidatePausedShadow();},species);
    }

    // A disabled pigment word is a GPU control, not a fabricated medical record.
    for(const actor of ['human','animal'] as const){
      await camera(page,actor==='human'?6:4,actor==='human'?23:6,'orthographic',actor==='human'?8:16);
      if(actor==='human')await page.evaluate(()=>{const v=(window as any).__v196View;v.camera.position.set(0,7,31);v.controls.update();});
      const painted=await capture(page,`${actor}-body-blood`);
      const words=await page.evaluate(actor=>{
        const v=(window as any).__v196View,g=actor==='human'?v.pawns.feedbackSource:v.wildlife.rigs.find((r:any)=>r.species==='hare').mesh.geometry;
        const attr=g.getAttribute('aBodyBlood'),count=actor==='human'?v.world.pawns.length:3;
        const words=Array.from({length:count},(_,i)=>attr.getX(i));for(let i=0;i<count;i++)attr.setX(i,0);
        if(attr.data)attr.data.needsUpdate=true;else attr.needsUpdate=true;return words;
      },actor);expect(words.some((word:number)=>word>0)).toBe(true);
      const bare=await capture(page,`${actor}-pigment-disabled-control`);expect(bare.equals(painted)).toBe(false);
      await page.evaluate(({actor,words})=>{const v=(window as any).__v196View,g=actor==='human'?v.pawns.feedbackSource:v.wildlife.rigs.find((r:any)=>r.species==='hare').mesh.geometry;
        const a=g.getAttribute('aBodyBlood');words.forEach((word:number,i:number)=>a.setX(i,word));if(a.data)a.data.needsUpdate=true;else a.needsUpdate=true;},{actor,words});
    }
    await camera(page,8,23,'orthographic',12);
    const grass=await page.evaluate(()=>{
      const v=(window as any).__v196View;v.hygiene.filth.mesh.visible=false;
      return {cell:Array.from(v.grass.map.image.data.slice((23*32+8)*4,(23*32+8)*4+4)),count:v.grass.mesh.geometry.instanceCount};
    });expect(grass.count).toBeGreaterThan(0);expect(grass.cell[3]).toBe(255);
    const stainedGrass=await capture(page,'grass-blood-with-ground-filth-hidden');
    const cleanGrass=await page.evaluate(()=>{
      const v=(window as any).__v196View,w=structuredClone(v.world);w.filth.items=w.filth.items.filter((f:any)=>f.kind!=='blood');
      v.grass.update(w,false);return Array.from(v.grass.map.image.data.slice((23*32+8)*4,(23*32+8)*4+4));
    });expect(cleanGrass).not.toEqual(grass.cell);
    expect((await capture(page,'grass-clean-pigment-control')).equals(stainedGrass)).toBe(false);

    // Restore the original worker world through the actual load boundary before
    // issuing real hauling commands. No ownership field is changed by the test.
    await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,prepared);await page.keyboard.press('Escape');
    const corpse=prepared.piles.find(p=>p.corpse?.species==='hare')!,carrier=prepared.pawns[1]!;
    await camera(page,5,19,'orthographic',4);
    const accepted=await page.evaluate(async({id,pawnId})=>{
      const send=(window as any).__v196Command;(window as any).__v196Probe.cargoId=id;
      // Disable food choices during the short transport observation; preserving
      // the initial medical records and every real item/owner is intentional.
      await send({type:'food-policy-assign',pawnId:window.__lisiere.world.pawns[0]!.id,policyId:4});
      await send({type:'priority',pawnId,work:'haul',value:1});
      return send({type:'order-haul',pawnId,target:{type:'pile',pileId:id},queue:false});
    },{id:corpse.id,pawnId:carrier.id});expect(accepted.ok).toBe(true);
    await page.locator('[data-speed="1"]').click();
    await page.waitForFunction(id=>window.__lisiere.world.piles.some(p=>p.id===id&&p.owner.type==='pawn'),corpse.id,{polling:'raf',timeout:20_000});
    // Wait for the renderer to adopt the confirmed pickup before pausing.
    // A worker-owned item alone does not prove a visible handoff.
    await page.waitForFunction(()=> (window as any).__v196Probe.cargo.some((s:any)=>s.carrier===1&&s.handoff>0),undefined,{polling:'raf',timeout:20_000});
    await pause(page);const held=await world(page);expect(validateWorld(held)).toEqual([]);
    expect(held.piles.filter(p=>p.corpse?.animalId===corpse.corpse!.animalId)).toHaveLength(1);
    await capture(page,'corpse-physically-carried');
    await page.locator('[data-speed="3"]').click();
    await page.waitForFunction(id=>window.__lisiere.world.piles.some(p=>p.id===id&&p.owner.type==='ground'&&p.owner.x===3&&p.owner.z===19),corpse.id,{polling:'raf',timeout:20_000});
    await page.waitForFunction(()=> (window as any).__v196Probe.cargo.some((s:any)=>s.handoff<0),undefined,{polling:'raf',timeout:20_000});
    await pause(page);const deposited=await world(page);expect(validateWorld(deposited)).toEqual([]);
    expect(deposited.piles.filter(p=>p.corpse?.animalId===corpse.corpse!.animalId)).toHaveLength(1);
    await capture(page,'corpse-physically-deposited');
    const final=await page.evaluate(()=>{
      const v=(window as any).__v196View,p=(window as any).__v196Probe;
      const bound=v.wildlife.rigs.map((r:any)=>({species:r.species,sameGeometry:r.mesh.geometry===p[r.species].geometry,
        samePositions:r.mesh.geometry.getAttribute('position').data===p[r.species].position,sameColors:r.mesh.geometry.getAttribute('color').data===p[r.species].color}));
      const proxyKinds:number[]=[];v.pawns.group.traverse((m:any)=>{const a=m.geometry?.getAttribute('cargoKind');if(a)for(let i=0;i<a.count;i++)proxyKinds.push(a.getX(i));});
      return {pipelines:p.pipelines,hooked:p.hooked,cargo:p.cargo,bound,proxyKinds:[...new Set(proxyKinds)]};
    });
    await writeTestFile('artifacts/visual-blood-v196-native.json',JSON.stringify({prepared:true,renderOnlySnowHares:true,
      visualInspection:'Screenshots captured; readability, silhouettes, pigment and crosses require separate human inspection.',
      performance:'No benchmark or general CPU/GPU claim.',chart,grass,cleanGrass,heldTick:held.tick,depositedTick:deposited.tick,...final,errors,requests,consoleMessages},null,2));
    for(const r of final.bound){expect(r.sameGeometry).toBe(true);expect(r.samePositions).toBe(true);expect(r.sameColors).toBe(true);}
    for(const kind of [27,60,61,62,63,64,74])expect(final.proxyKinds).not.toContain(kind);
    expect(final.hooked).toBe(true);expect(final.pipelines.length).toBeGreaterThan(0);
    for(const pipeline of final.pipelines){expect(pipeline.vertexBuffers,pipeline.label).toBeLessThanOrEqual(8);expect(pipeline.vertexAttributes,pipeline.label).toBeLessThanOrEqual(16);}
    expect(final.cargo.length).toBeGreaterThan(2);for(const sample of final.cargo)expect(sample.instances).toBe(1);
    expect(final.cargo.some((s:any)=>s.carrier===1)).toBe(true);
    expect(final.cargo.some((s:any)=>s.handoff>0)).toBe(true);expect(final.cargo.some((s:any)=>s.handoff<0)).toBe(true);
    expect(errors).toEqual([]);expect(requests).toEqual([]);
  }finally{await writeTestFile('artifacts/visual-blood-v196-cargo-checkpoint.json',JSON.stringify(await page.evaluate(()=> (window as any).__v196Probe?.cargo??[]).catch(()=>[]),null,2));await writeTestFile('artifacts/visual-blood-v196-errors.json',JSON.stringify({errors,requests,consoleMessages},null,2));await browser.close();}
});
