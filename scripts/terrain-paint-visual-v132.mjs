import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {createWorld} from '../src/sim/engine.ts';
import {serializeWorld} from '../src/sim/index.ts';

process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.playwright');
const {chromium}=await import('@playwright/test');
const size=Number(process.argv[2]??32),middle=Math.floor(size/2);
const world=createWorld(42,size,size);
world.tick=3000; // test fixture at local noon; no source or gameplay rule is changed
// A small gravel island makes three natural pigments meet inside the same
// close-up. This is only the browser fixture; the simulation source is untouched.
for(let z=middle-4;z<=middle-2;z++)for(let x=middle-1;x<=middle+1;x++)world.tiles[z*world.width+x]={terrain:'gravel'};
for(let z=middle-1;z<=middle+2;z++)for(let x=middle+3;x<=middle+6;x++){
  const tile=world.tiles[z*world.width+x];
  if(tile.terrain!=='water'&&tile.terrain!=='rock')tile.floor='granite-tile';
}
const browser=await chromium.launch({channel:'chromium',headless:false});
const report={errors:[],views:[],backend:null};
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',error=>report.errors.push(String(error)));
  page.on('console',message=>{if(message.type()==='error'||/GPUValidationError|invalid pipeline/i.test(message.text()))report.errors.push(message.text());});
  await page.route('**/src/main.ts*',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:`const terrainFrame=ColonyRenderer.prototype.frame;ColonyRenderer.prototype.frame=function(...args){window.__terrainView=this;return terrainFrame.apply(this,args);};\n`+await response.text()});
  });
  await page.addInitScript(save=>{localStorage.setItem('lisiere.save.v1',save);localStorage.setItem('lisiere.presentation.textures.v1','true');},serializeWorld(world));
  await page.goto(`http://127.0.0.1:5173/?scenario=camp&size=${size}&e2e`);
  await page.waitForFunction(()=>window.__lisiere&&window.__terrainView);
  await page.locator('[data-speed="0"]').click();
  await page.locator('[data-panel="menu"]').click();await page.locator('#load').click();
  await page.waitForFunction(()=>window.__terrainView.world?.seed===42&&window.__terrainView.world?.tiles.some(t=>t.floor)&&!window.__terrainView.preparing);
  await page.keyboard.press('Escape');
  const inspect=async(name,zoom,textures,target)=>{
    const data=await page.evaluate(({zoom,target})=>{
      const v=window.__terrainView;
      const middle=Math.floor(v.world.width/2);
      const [tx,tz]=target??[middle,middle];
      v.controls.enableDamping=false;v.rig.setMode('orthographic');v.controls.target.set(tx,0,tz);
      v.camera.position.set(tx+8,32,tz+13);v.camera.zoom=zoom;v.camera.updateProjectionMatrix();v.controls.update();
      return {backend:v.backend,drawCalls:v.stats.drawCalls,terrainMeshes:v.terrainGroup.children.length,
        paintBytes:v.terrainPaintMaterial.map.image.data.byteLength,paintSize:[v.terrainPaintMaterial.map.image.width,v.terrainPaintMaterial.map.image.height],
        paintVersion:v.terrainPaintMaterial.map.version,
        painted:v.terrainGroup.children.some(m=>m.material===v.terrainPaintMaterial),
        uv:v.terrainGroup.children.filter(m=>m.material!==v.waterMaterial).every(m=>Boolean(m.geometry.getAttribute('uv'))),
        floorCells:v.world.tiles.filter(t=>t.floor).length,
        waterCells:v.world.tiles.filter(t=>t.terrain==='water').length};
    },{zoom,target});
    await page.waitForTimeout(300);
    await page.screenshot({path:`artifacts/terrain-v132-${size}-${name}.png`});
    report.views.push({name,zoom,textures,...data});
    assert.equal(data.painted,textures);
    assert.equal(data.uv,textures);
    assert.ok(data.terrainMeshes>=2);
  };
  await inspect('near',9,true);
  await inspect('far',1.2,true);
  const mixed=await page.evaluate(()=>{
    const w=window.__terrainView.world,m=w.width/2;
    let best=[m,m],score=-Infinity;
    for(let z=6;z<w.height-6;z++)for(let x=6;x<w.width-6;x++){
      const terrain=[];
      for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++)terrain.push(w.tiles[(z+dz)*w.width+x+dx].terrain);
      if(terrain.includes('rock')||terrain.includes('water'))continue;
      const kinds=new Set(terrain).size;
      const value=kinds*100-Math.hypot(x-m,z-m);
      if(value>score){score=value;best=[x,z];}
    }
    const terrain=[];
    for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++)terrain.push(w.tiles[(best[1]+dz)*w.width+best[0]+dx].terrain);
    return {target:best,kinds:[...new Set(terrain)].sort()};
  });
  report.mixed=mixed;
  await inspect('mixed',9,true,mixed.target);
  const waterTarget=await page.evaluate(()=>{
    const w=window.__terrainView.world,m=w.width/2;
    let best=null,distance=Infinity;
    for(let i=0;i<w.tiles.length;i++)if(w.tiles[i].terrain==='water'){
      const x=i%w.width,z=Math.floor(i/w.width),d=(x-m)**2+(z-m)**2;
      if(d<distance){distance=d;best=[x,z];}
    }
    return best;
  });
  await inspect('shore',7,true,waterTarget);
  await page.locator('[data-panel="menu"]').click();
  await page.locator('#textures-enabled').uncheck();
  await page.locator('[data-panel="menu"]').click();await page.locator('#menu-panel').waitFor({state:'hidden'});
  await inspect('plain',9,false,mixed.target);
  await page.locator('[data-panel="menu"]').click();
  await page.locator('#textures-enabled').check();
  await page.locator('[data-panel="menu"]').click();await page.locator('#menu-panel').waitFor({state:'hidden'});
  await inspect('restored',9,true,mixed.target);
  assert.equal(report.views[0].paintVersion,report.views[2].paintVersion); // camera pan did not rebuild pigment
  report.incremental=await page.evaluate(()=>{
    const v=window.__terrainView,w=v.world,x=Math.floor(w.width/2),z=Math.floor(w.height/2),i=z*w.width+x;
    const mesh=v.terrainGroup.children.find(m=>m.material===v.terrainPaintMaterial),texture=v.terrainPaintMaterial.map;
    window.__terrainColorAt=(mesh,cellX,cellZ)=>{
      const pos=mesh.geometry.getAttribute('position'),color=mesh.geometry.getAttribute('color');
      for(let j=0;j<pos.count;j+=4){
        const centerX=(pos.getX(j)+pos.getX(j+1)+pos.getX(j+2)+pos.getX(j+3))/4;
        const centerZ=(pos.getZ(j)+pos.getZ(j+1)+pos.getZ(j+2)+pos.getZ(j+3))/4;
        if(Math.abs(centerX-cellX)<.01&&Math.abs(centerZ-cellZ)<.01)return [color.getX(j),color.getY(j),color.getZ(j)];
      }
      return null;
    };
    const oldColor=v.terrainGroup.children.filter(m=>m.material===v.terrainPaintMaterial)
      .map(m=>window.__terrainColorAt(m,x,z)).find(Boolean);
    const tiles=w.tiles.slice();tiles[i]={terrain:tiles[i].terrain==='grass'?'soil':'grass'};
    const next={...w,tiles},start=performance.now();
    v.applyWorld(next);
    return {applyMs:performance.now()-start,meshRetained:v.terrainGroup.children.includes(mesh),cell:[x,z],oldColor,
      textureRetained:v.terrainPaintMaterial.map===texture,textureVersion:texture.version,
      geometryDirty:v.terrainGeometryDirty};
  });
  assert.equal(report.incremental.meshRetained,true);
  assert.equal(report.incremental.textureRetained,true);
  assert.equal(report.incremental.geometryDirty,true);
  await page.waitForTimeout(500);
  report.deferredPlain=await page.evaluate(()=>{
    const v=window.__terrainView,oldMesh=v.terrainGroup.children[0];
    v.setTexturesEnabled(false);
    const [x,z]=[Math.floor(v.world.width/2),Math.floor(v.world.height/2)];
    const newColor=v.terrainGroup.children.filter(m=>m.material===v.terrainPlainMaterial)
      .map(m=>window.__terrainColorAt(m,x,z)).find(Boolean);
    return {geometryRebuilt:!v.terrainGroup.children.includes(oldMesh),geometryDirty:v.terrainGeometryDirty,
      uv:v.terrainGroup.children.filter(m=>m.material!==v.waterMaterial).some(m=>Boolean(m.geometry.getAttribute('uv'))),
      newColor};
  });
  assert.equal(report.deferredPlain.geometryRebuilt,true);
  assert.equal(report.deferredPlain.geometryDirty,false);
  assert.equal(report.deferredPlain.uv,false);
  assert.notDeepEqual(report.deferredPlain.newColor,report.incremental.oldColor);
  report.waterTransition=await page.evaluate(()=>{
    const v=window.__terrainView;v.setTexturesEnabled(true);
    const w=v.world;
    let x=-1,z=-1;
    for(let row=4;row<w.height-4&&x<0;row++)for(let column=4;column<w.width-4;column++){
      if([[0,0],[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dz])=>w.tiles[(row+dz)*w.width+column+dx].terrain!=='water')){x=column;z=row;break;}
    }
    if(x<0)throw new Error('No dry water-transition cell');
    const surface=v.terrainGroup.children.find(m=>m.material===v.terrainPaintMaterial);
    const surfaceIndices=surface.geometry.index.count;
    const waterIndices=v.terrainGroup.children.filter(m=>m.material===v.waterMaterial).reduce((sum,m)=>sum+m.geometry.index.count,0);
    const tiles=w.tiles.slice();tiles[z*w.width+x]={terrain:'water'};
    v.applyWorld({...w,tiles});
    const nextSurface=v.terrainGroup.children.find(m=>m.material===v.terrainPaintMaterial);
    const nextWaterIndices=v.terrainGroup.children.filter(m=>m.material===v.waterMaterial).reduce((sum,m)=>sum+m.geometry.index.count,0);
    return {geometryRebuilt:nextSurface!==surface,bankIndexDelta:nextSurface.geometry.index.count-surfaceIndices,
      waterIndexDelta:nextWaterIndices-waterIndices};
  });
  assert.deepEqual(report.waterTransition,{geometryRebuilt:true,bankIndexDelta:18,waterIndexDelta:6});
  assert.deepEqual(report.errors,[]);
}finally{await browser.close();}
console.log(JSON.stringify(report));
