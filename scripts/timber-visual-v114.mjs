import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {deconstructionCamp} from '../tests/scenarios/deconstruction.ts';
import {newDoorState} from '../src/sim/door-rules.ts';
import {SOLAR_POWER_RESEARCH_COST} from '../src/sim/research.ts';
import {serializeWorld,validateWorld} from '../src/sim/index.ts';

process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('@playwright/test');
const world=deconstructionCamp(1,32);
world.tick=2000;
world.pawns[0].x=16;world.pawns[0].z=16;
const doors=new Map([[14,'wood'],[16,'steel'],[18,'granite-blocks']]);
for(let z=12;z<=20;z++)for(let x=12;x<=20;x++)if(x===12||x===20||z===12||z===20){
  const material=z===20?doors.get(x):undefined;
  world.structures.push({id:world.nextId++,kind:material?'door':'wall',x,z,orientation:0,
    footprint:'standard',material:material??'wood',...(material?{door:newDoorState(world.tick)}:{})});
}
world.roofing={constructed:[],build:[],remove:[],cursor:0};
for(let z=13;z<=19;z++)for(let x=13;x<=19;x++)world.roofing.constructed.push(z*world.width+x);
assert.deepEqual(validateWorld(world),[]);
assert.equal(world.structures.filter(s=>s.kind==='wall').length,29);
assert.deepEqual(world.structures.filter(s=>s.kind==='door').map(s=>s.material),['wood','steel','granite-blocks']);

const detailWorld=deconstructionCamp(1,32);
detailWorld.tick=2000;
detailWorld.pawns[0].x=15;detailWorld.pawns[0].z=17;
detailWorld.resources.push({id:detailWorld.nextId++,kind:'tree',x:7,z:16,amount:12});
detailWorld.structures.push({id:detailWorld.nextId++,kind:'table',x:12,z:15,orientation:0,
  footprint:'standard',material:'wood',quality:'normal'});
detailWorld.structures.push({id:detailWorld.nextId++,kind:'solar-generator',x:19,z:14,orientation:0,
  footprint:'standard',material:'steel',power:{on:true,parentId:null}});
detailWorld.research??={points:0,project:null};
detailWorld.research.solarPower={points:SOLAR_POWER_RESEARCH_COST,completedAt:detailWorld.tick};
assert.deepEqual(validateWorld(detailWorld),[]);

const report={date:new Date().toISOString(),fixture:'Prepared 9×9 timber room with wood, steel and granite doors along one wall; 49 constructed interior roof cells',
  errors:[],views:[],detailFixture:'Prepared tree, wood table, steel solar panel and one pawn',detailViews:[],adapter:null};
const browser=await chromium.launch({channel:'chromium',headless:false});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',error=>report.errors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error'||/GPUValidationError|invalid pipeline/i.test(message.text()))report.errors.push(message.text());});
  await page.route('**/src/main.ts*',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:`const timberFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(...args){window.__timberView=this;return timberFrame.apply(this,args);};\n`+await response.text()});
  });
  await page.addInitScript(save=>{
    localStorage.setItem('lisiere.save.v1',save);
    localStorage.setItem('lisiere.presentation.textures.v1','true');
  },serializeWorld(world));
  await page.goto('http://127.0.0.1:5173/?scenario=camp&size=32&e2e');
  await page.waitForFunction(()=>window.__lisiere&&window.__timberView);
  await page.locator('[data-speed="0"]').click();
  await page.locator('[data-panel="menu"]').click();await page.locator('#load').click();
  await page.waitForFunction(()=>window.__timberView.world?.structures.length===32&&!window.__timberView.preparing);
  await page.keyboard.press('Escape');

  const inspect=async(name,position,{cutaway=false,roof=false,zoom=3,textures=true}={})=>{
    const data=await page.evaluate(({position,cutaway,roof,zoom})=>{
      const v=window.__timberView;
      v.controls.enableDamping=false;v.rig.setMode('orthographic');v.controls.target.set(16,1.3,16);
      v.camera.position.set(...position);v.camera.zoom=zoom;v.camera.updateProjectionMatrix();v.controls.update();
      v.setWallCutaway(cutaway);v.setRoofsVisible(roof);
      const roofGeometry=v.roofs.mesh.geometry;roofGeometry.computeBoundingBox();
      const bounds=roofGeometry.boundingBox;
      return {
        walls:v.world.structures.filter(s=>s.kind==='wall').length,
        doors:v.world.structures.filter(s=>s.kind==='door').map(s=>({x:s.x,z:s.z,material:s.material})),
        constructedRoofCells:v.world.roofing.constructed.length,
        roofTriangles:roofGeometry.getAttribute('position').count/3,
        roofBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},
        roofVisible:v.roofs.surface.visible,cutaway:v.wallCutaway,
        timberInstances:v.timber.wallMesh.count,
        textureVariants:{walls:v.timber.wallMesh.material===v.timber.material,
          roof:v.roofs.mesh.material===v.roofs.textured,doors:v.doors.mesh.material===v.doors.textured},
        drawCalls:v.stats.drawCalls,
      };
    },{position,cutaway,roof,zoom});
    await page.waitForTimeout(400);
    const file=`artifacts/timber-v114-${name}.png`;await page.screenshot({path:file});
    const preference=await page.evaluate(()=>localStorage.getItem('lisiere.presentation.textures.v1'));
    report.views.push({name,file,textures,preference,...data});
    assert.equal(data.walls,29);assert.equal(data.doors.length,3);
    assert.equal(data.constructedRoofCells,49);
    assert.equal(data.roofVisible,roof);assert.equal(data.cutaway,cutaway);
    assert.deepEqual(data.textureVariants,{walls:textures,roof:textures,doors:textures});
    assert.equal(preference,String(textures));
  };
  await inspect('three-doors',[16,9,31],{zoom:3.05});
  await inspect('three-doors-close',[16,7,30],{zoom:3.75});
  await inspect('roof-front',[16,10,31],{roof:true,zoom:3.05});
  await inspect('roof-top',[25,34,31],{roof:true,zoom:2.6});
  await inspect('roof-side',[29,10,30],{roof:true,zoom:2.95});
  await inspect('cutaway',[25,20,30],{cutaway:true,zoom:2.75});

  await page.locator('[data-panel="menu"]').click();
  await page.locator('#textures-enabled').uncheck();
  assert.equal(await page.locator('#textures-enabled').isChecked(),false);
  report.settingsScreenshot='artifacts/timber-v114-settings-off.png';
  await page.screenshot({path:report.settingsScreenshot});
  await page.locator('[data-panel="menu"]').click();
  await page.locator('#menu-panel').waitFor({state:'hidden'});
  await inspect('three-doors-plain',[16,9,31],{zoom:3.05,textures:false});
  await inspect('roof-top-plain',[25,34,31],{roof:true,zoom:2.6,textures:false});
  report.adapter=await page.evaluate(()=>{
    const v=window.__timberView,context=v.renderer.getContext();
    return {backend:v.backend,info:context.getConfiguration?.().device.adapterInfo??null};
  });
  await page.close();

  const detailPage=await browser.newPage({viewport:{width:1440,height:1000}});
  detailPage.on('pageerror',error=>report.errors.push(String(error)));
  detailPage.on('console',message=>{if(message.type()==='error'||/GPUValidationError|invalid pipeline/i.test(message.text()))report.errors.push(message.text());});
  await detailPage.route('**/src/main.ts*',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:`const timberFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(...args){window.__timberView=this;return timberFrame.apply(this,args);};\n`+await response.text()});
  });
  await detailPage.addInitScript(save=>{
    localStorage.setItem('lisiere.save.v1',save);
    localStorage.setItem('lisiere.presentation.textures.v1','true');
  },serializeWorld(detailWorld));
  await detailPage.goto('http://127.0.0.1:5173/?scenario=camp&size=32&e2e');
  await detailPage.waitForFunction(()=>window.__lisiere&&window.__timberView);
  await detailPage.locator('[data-speed="0"]').click();
  await detailPage.locator('[data-panel="menu"]').click();await detailPage.locator('#load').click();
  await detailPage.waitForFunction(()=>window.__timberView.world?.structures.length===2
    &&window.__timberView.world?.resources.length===1&&!window.__timberView.preparing);
  await detailPage.keyboard.press('Escape');
  await detailPage.waitForTimeout(4200);
  const inspectDetail=async(name,target,position,zoom,textures)=>{
    const data=await detailPage.evaluate(({target,position,zoom})=>{
      const v=window.__timberView;
      v.controls.enableDamping=false;v.rig.setMode('orthographic');v.controls.target.set(...target);
      v.camera.position.set(...position);v.camera.zoom=zoom;v.camera.updateProjectionMatrix();v.controls.update();
      const canopy=v.resourceGroup.getObjectByName('tree-canopy');
      const furniture=v.boxes.batches.get('furniture');
      return {resources:v.world.resources.map(r=>({kind:r.kind,x:r.x,z:r.z})),
        structures:v.world.structures.map(s=>({kind:s.kind,x:s.x,z:s.z,material:s.material})),
        pawn:{x:v.world.pawns[0].x,z:v.world.pawns[0].z},
        textureVariants:{tree:canopy?.material===v.texturedStaticMaterial,
          furniture:furniture?.material===v.boxes.texturedSolid,
          pawn:v.pawns.pawnMesh?.material===v.pawns.texturedMaterial},
        drawCalls:v.stats.drawCalls};
    },{target,position,zoom});
    await detailPage.waitForTimeout(500);
    const file=`artifacts/stylized-v114-${name}-${textures?'on':'off'}.png`;
    await detailPage.screenshot({path:file});
    const preference=await detailPage.evaluate(()=>localStorage.getItem('lisiere.presentation.textures.v1'));
    report.detailViews.push({name,file,textures,preference,...data});
    assert.deepEqual(data.textureVariants,{tree:textures,furniture:textures,pawn:textures});
    assert.equal(preference,String(textures));
  };
  const detailCameras=[
    ['tree',[7,2.5,16],[13,9,27],3.35],
    ['table',[12,.5,15.5],[17,6,23],4.2],
    ['solar',[20.5,.5,15.5],[27,8,25],3.6],
    ['pawn',[15,1,17],[19,5.5,24],4.5],
    ['group',[14,2,16],[24,15,28],1.85],
  ];
  for(const [name,target,position,zoom] of detailCameras)await inspectDetail(name,target,position,zoom,true);
  await detailPage.locator('[data-panel="menu"]').click();
  await detailPage.locator('#textures-enabled').uncheck();
  await detailPage.locator('[data-panel="menu"]').click();
  await detailPage.locator('#menu-panel').waitFor({state:'hidden'});
  for(const [name,target,position,zoom] of detailCameras)await inspectDetail(name,target,position,zoom,false);
  assert.deepEqual(report.errors,[]);
}finally{await browser.close();writeFileSync('artifacts/timber-visual-v114.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
