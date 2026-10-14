import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {medicalCamp} from '../scenarios/health';
import {prepareConstructionFlora} from '../scenarios/construction-flora-v348';
import {serializeWorld,deserializeWorld,validateWorld} from '../../src/sim/serialization';
import {decorOccludesMap,type DecorPoint} from '../../src/render/decor-occlusion';
import {world,pause,panel,expectWorld,observeErrors} from './helpers';

// Private opt-in instrumentation only: the browser receives copied DTOs, never
// a renderer/mesh/World handle or a command. All changes below use real controls.
const probe=`
let decorProbeView;
let decorProbeFrames=0;
const decorProbeFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){const result=decorProbeFrame.call(this,now);decorProbeView=this;decorProbeFrames++;return result;};
Object.defineProperty(window,'__decorV350',{get(){
  const v=decorProbeView;if(!v||!v.world)return null;
  const c=v.camera,e=c.matrixWorld.elements;
  const point=(x,y,z,m)=>({x:m[0]*x+m[4]*y+m[8]*z+m[12],y:m[1]*x+m[5]*y+m[9]*z+m[13],z:m[2]*x+m[6]*y+m[10]*z+m[14]});
  const pieces=v.room?v.room.meshes.map(({mesh,part})=>{
    const a=mesh.geometry.getAttribute('position'),m=mesh.matrixWorld.elements,positions=[];
    if(part.section==='orbit')for(let i=0;i<16;i++){const j=Math.min(a.count-1,Math.floor(i*a.count/16));positions.push(point(a.getX(j),a.getY(j),a.getZ(j),m));}
    return {name:mesh.name,section:part.section,materialId:mesh.material.id,materialType:mesh.material.type,masked:mesh.material.maskNode===v.decorOcclusion.visibleNode,positions};
  }):[];
  const cloudPositions=[];const a=v.clouds.mesh.instanceMatrix.array,fade=v.clouds.mesh.geometry.getAttribute('aCloudFade');
  for(let i=0;i<v.clouds.mesh.count;i++)if(fade.getX(i)>.1)cloudPositions.push({x:a[i*16+12],y:a[i*16+13],z:a[i*16+14]});
  return {frames:decorProbeFrames,backend:v.backend,map:{width:v.world.width,height:v.world.height},
    camera:{perspective:c.isPerspectiveCamera===true,eye:{x:e[12],y:e[13],z:e[14]},forward:{x:-e[8],y:-e[9],z:-e[10]},matrixWorld:c.matrixWorld.toArray(),projection:c.projectionMatrix.toArray()},
    enabled:v.decorOcclusion.enabled.value===1,roomRenders:v.room?.backdrop.stats.roomRenders??null,pieces,materials:(()=>{const rows=[];v.scene.traverse(o=>{for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m)rows.push({mesh:o.name,id:m.id,type:m.type,name:m.name,masked:m.maskNode===v.decorOcclusion.visibleNode});});return rows;})(),
    clouds:{visible:v.clouds.mesh.visible,masked:v.clouds.mesh.material.maskNode===v.decorOcclusion.visibleNode,opacity:v.clouds.opacityUniform.value,positions:cloudPositions,positionQualification:'Active undeformed instance centres; not fragment/raster evidence.'}};
}});
`;
interface Probe {frames:number;backend:string;map:{width:number;height:number};camera:{perspective:boolean;eye:DecorPoint;forward:DecorPoint;matrixWorld:number[];projection:number[]};enabled:boolean;roomRenders:number|null;pieces:{name:string;section:string;masked:boolean;positions:DecorPoint[]}[];clouds:{visible:boolean;masked:boolean;opacity:number;positions:DecorPoint[];positionQualification:string}}
const readProbe=(page:import('@playwright/test').Page)=>page.evaluate(()=>structuredClone((window as unknown as {__decorV350:Probe}).__decorV350));
const sha=(raw:string)=>createHash('sha256').update(raw).digest('hex');

test.use({channel:'chrome'});
test('V350 actual geometric decor masks, two menus and exact paused reload',async({page},info)=>{
  test.skip(process.env.V350!=='1','ROOT private opt-in renderer qualification on port 5413.');
  test.setTimeout(240000);page.setDefaultTimeout(12000);const started=Date.now(),deadline=started+180000,errors=observeErrors(page);
  // Declared 32² presentation input: valid biome context, dense initial fog
  // for resident clouds. No campaign copy, simulated weather or future gain.
  const initial=medicalCamp();prepareConstructionFlora(initial);initial.weather!.current='fog';initial.weather!.previous='fog';initial.weather!.durationCore=16000;
  const checkpoints:{name:string;tick:number;sha256:string;reloaded:boolean}[]=[],poses:unknown[]=[];let loaded=false,complete=false,failure:unknown,exportFailure:unknown,backend:unknown;
  const front=()=>page.locator('.front-menu'),canvas=()=>page.locator('#viewport canvas').first();
  const guard=async()=>{if(Date.now()>deadline)throw Error('Bounded V350 presentation body expired');expect(errors).toEqual([]);const incident=await page.evaluate(()=>window.__lisiere.incident);expect(incident).toMatchObject({simulationStopped:false,graphicsFault:false});await expectWorld(page,initial);};
  const frames=async(count=8)=>{const start=(await readProbe(page)).frames;await page.waitForFunction(({start,count})=>(window as unknown as {__decorV350:Probe}).__decorV350.frames>=start+count,{start,count});};
  const closeMenu=async()=>{if(await page.locator('#menu-panel').isVisible())await page.locator('[data-panel="menu"]').click();await expect(page.locator('#menu-panel')).not.toBeVisible();};
  const toggle=async(id:string,value:boolean)=>{await panel(page,'menu');await page.locator('#'+id).setChecked(value);if(value)await expect(page.locator('#'+id)).toBeChecked();else await expect(page.locator('#'+id)).not.toBeChecked();await guard();await closeMenu();await guard();await stableView();await frames();await guard();};
  const capture=async(name:string,reload=true)=>{
    await pause(page);const before=await world(page);expect(validateWorld(before)).toEqual([]);await panel(page,'menu');
    const manager=page.locator('[data-save-manager]'),label='V350 '+name;await manager.locator('[data-save-manager-name]').fill(label);await manager.locator('[data-save-manager-action="create"]').click();await expect(manager.locator('[data-save-manager-status]')).toHaveAttribute('data-state','success');
    const download=page.waitForEvent('download');await manager.locator('[data-save-manager-action="export"]').click();const path=info.outputPath(name+'.json');await(await download).saveAs(path);const raw=await readFile(path,'utf8');expect(deserializeWorld(raw)).toEqual(before);const record={name,tick:before.tick,sha256:sha(raw),reloaded:false};checkpoints.push(record);
    if(reload){await page.locator('#browse-saves').click();const row=front().locator('label').filter({has:page.locator('strong').filter({hasText:label})});await row.locator('input[name="front-save"]').check();await front().getByRole('button',{name:'Charger',exact:true}).click();await expectWorld(page,before);record.reloaded=true;}
    await info.attach(name,{contentType:'application/json',path});await closeMenu();
  };
  const stableView=async()=>{let previous='',stable=0;await expect.poll(async()=>{expect(errors).toEqual([]);const p=await readProbe(page),key=JSON.stringify([p.camera.matrixWorld,p.camera.projection]);stable=key===previous?stable+1:0;previous=key;return stable>=3;},{timeout:12000,intervals:[150]}).toBe(true);};
  const image=async(name:string)=>{await closeMenu();await guard();await stableView();await frames();await expect(page.locator('#menu-panel')).not.toBeVisible();await guard();const p=await readProbe(page);backend=p.backend;poses.push({name,...p,roomSampleClassification:p.pieces.filter(v=>v.section==='orbit').map(v=>({name:v.name,cut:v.positions.filter(q=>decorOccludesMap(q,p.camera,p.map)).length,kept:v.positions.filter(q=>!decorOccludesMap(q,p.camera,p.map)).length})),notice:'Vertex/centre classifications qualify the declared scene only. ROOT reviews actual raster captures; no full fragment or FPS proof inferred.'});return canvas().screenshot({path:info.outputPath(name+'.png')});};
  try{
    if(process.env.V350_PIPELINE==='1')await page.addInitScript(()=>{
      const modules=new WeakMap<GPUShaderModule,string>(),rows:unknown[]=[];
      const device=GPUDevice.prototype,shader=device.createShaderModule;
      device.createShaderModule=function(d){const result=shader.call(this,d);modules.set(result,d.code);return result;};
      const remember=(d:GPURenderPipelineDescriptor)=>{if(rows.length<16&&/MeshStandardNodeMaterial_(136|139)$/.test(d.label??''))rows.push({label:d.label,vertex:modules.get(d.vertex.module),fragment:d.fragment?modules.get(d.fragment.module):undefined});};
      const asyncCreate=device.createRenderPipelineAsync,syncCreate=device.createRenderPipeline;
      device.createRenderPipelineAsync=function(d){remember(d);return asyncCreate.call(this,d);};
      device.createRenderPipeline=function(d){remember(d);return syncCreate.call(this,d);};
      Object.defineProperty(window,'__pipelineV350',{value:()=>structuredClone(rows)});
    });
    expect(validateWorld(initial)).toEqual([]);const input=info.outputPath('prepared-input.json');await writeFile(input,serializeWorld(initial));
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    await page.goto('/?e2e');expect(new URL(page.url()).port).toBe('5413');await front().getByRole('button',{name:'Options',exact:true}).click();await expect(page.locator('#front-decor-occlusion-enabled')).toBeChecked();
    await page.locator('#front-decor-occlusion-enabled').uncheck();await front().getByRole('button',{name:'Retour',exact:true}).click();await front().getByRole('button',{name:'Charger une partie',exact:true}).click();await front().locator('input[type=file]').setInputFiles(input);await expectWorld(page,initial);loaded=true;await pause(page);
    await page.waitForFunction(()=>!!(window as unknown as {__decorV350:Probe}).__decorV350);await panel(page,'menu');await expect(page.locator('#decor-occlusion-enabled')).not.toBeChecked();await closeMenu();expect((await readProbe(page)).enabled).toBe(false);await capture('prepared');
    const box=await canvas().boundingBox();if(!box)throw Error('Native canvas absent');await page.mouse.move(box.x+box.width*.55,box.y+box.height*.45);await page.mouse.wheel(0,600);await guard();await stableView();
    for(const room of [true,false]){
      await toggle('room-enabled',room);
      for(const perspective of [false,true]){
        if((await page.locator('#camera-mode').getAttribute('aria-pressed')==='true')!==perspective)await page.locator('#camera-mode').click();
        const name=(room?'room':'clouds')+'-'+(perspective?'perspective':'iso');await toggle('decor-occlusion-enabled',false);const off=await image(name+'-off');const before=await readProbe(page);
        expect(before.camera.perspective).toBe(perspective);expect(before.clouds.visible).toBe(!room);expect(before.clouds.masked).toBe(true);
        if(room){expect(before.pieces.filter(v=>v.section==='orbit').every(v=>v.masked)).toBe(true);expect(before.pieces.filter(v=>v.section!=='orbit').every(v=>!v.masked)).toBe(true);}else expect(before.clouds.opacity).toBe(1);
        await toggle('decor-occlusion-enabled',true);const on=await image(name+'-on');const after=await readProbe(page);expect(after.enabled).toBe(true);expect(after.camera.matrixWorld).toEqual(before.camera.matrixWorld);expect(after.camera.projection).toEqual(before.camera.projection);expect(on.equals(off),'Actual raster must witness a cut for this declared pose.').toBe(false);
        if(room){expect(after.roomRenders!).toBeGreaterThan(before.roomRenders!);await frames(20);expect((await readProbe(page)).roomRenders).toBe(after.roomRenders);}
        const b=await canvas().boundingBox();if(!b)throw Error('Native canvas absent');await page.mouse.move(b.x+b.width*.5,b.y+b.height*.45);await page.mouse.down({button:'right'});await page.mouse.move(b.x+b.width*.5+100,b.y+b.height*.45+35,{steps:12});await page.mouse.up({button:'right'});await page.keyboard.press('Escape');await image(name+'-rotated');
      }
    }
    await toggle('room-enabled',true);await panel(page,'menu');await page.locator('#return-home').click();await front().getByRole('button',{name:'Options',exact:true}).click();await expect(page.locator('#front-decor-occlusion-enabled')).toBeChecked();await page.locator('#front-decor-occlusion-enabled').uncheck();await front().getByRole('button',{name:'Retour',exact:true}).click();await front().getByRole('button',{name:'Reprendre la colonie',exact:true}).click();await expectWorld(page,initial);await panel(page,'menu');await expect(page.locator('#decor-occlusion-enabled')).not.toBeChecked();await closeMenu();await toggle('decor-occlusion-enabled',true);await capture('final');
    expect(checkpoints.every(v=>v.reloaded)).toBe(true);await guard();expect(backend).toBe('WebGPU');complete=true;
  }catch(error){failure=error;throw error;}
  finally{
    if(loaded&&failure&&!errors.length)try{await pause(page);await page.keyboard.press('Escape');await canvas().screenshot({path:info.outputPath('failure-map.png')});await capture('failure-outcome',false);}catch(error){exportFailure=error;}
    if(process.env.V350_PIPELINE==='1')try{await writeFile(info.outputPath('pipeline-diagnostic.json'),JSON.stringify(await page.evaluate(()=>(window as unknown as {__pipelineV350:()=>unknown}).__pipelineV350()),null,2));}catch{}
    const path=info.outputPath('decor-v350-summary.json');await writeFile(path,JSON.stringify({version:350,channel:'chrome',backend,qualification:'Prepared 32² decor geometry and UI only; no campaign, schema change, FPS or GPU-cost gain certified.',result:failure||exportFailure?'partial-failure':complete?'prepared-presentation':'not-loaded',elapsedMs:Date.now()-started,failure:String(failure??''),exportFailure:String(exportFailure??''),checkpoints,errors,poses},null,2));await info.attach('decor-v350-summary',{contentType:'application/json',path});
  }
});