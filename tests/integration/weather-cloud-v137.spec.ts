import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { observeErrors, pause } from './helpers';

test('V185: native cloud mask preserves colour and depth in both projections',async({playwright})=>{
  test.setTimeout(120_000);
  const browser=await playwright.chromium.launch({channel:'chromium',headless:false,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  const errors=observeErrors(page);
  try{
    await page.route('**/src/main.ts*',async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:`const originalCloudFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){window.__cloudView=this;return originalCloudFrame.call(this,now);};\n`+await response.text()});
    });
    await page.goto('/?scenario=camp&size=32&seed=42&e2e');
    await expect(page.locator('#loading')).toHaveCount(0,{timeout:60_000});
    await pause(page);
    await page.waitForFunction(()=>Boolean((window as any).__cloudView?.world)&&!(window as any).__cloudView.preparing);
    const canvas=page.locator('#viewport canvas').first();
    for(const mode of ['orthographic','perspective']){
      await page.evaluate(mode=>{
        const view=(window as any).__cloudView,clouds=view.clouds;
        view.rig.setMode(mode);view.controls.enableDamping=false;
        view.controls.target.set(15.5,0,15.5);view.camera.position.set(15.5,20,55.5);
        if(mode==='orthographic'){view.camera.zoom=1;view.camera.updateProjectionMatrix();}
        view.controls.update();
        (window as any).__cloudPresent??=clouds.present.bind(clouds);
        (window as any).__cloudPresent({seed:0x12345679,tick:view.world.tick,weather:view.world.weather,camera:view.camera,target:view.controls.target,strength:0,directionX:1,directionZ:0,daylight:1});
        // Deliberately prepared shader fixture, separate from natural cloud
        // altitude/spawn checks: an unmasked control proves central coverage.
        clouds.present=()=>{};
        const centre=view.controls.target.clone().addScaledVector(view.camera.position.clone().sub(view.controls.target).normalize(),15);
        clouds.mesh.count=1;
        clouds.mesh.setMatrixAt(0,clouds.mesh.matrix.clone().makeScale(20,20,20).setPosition(centre));
        clouds.mesh.instanceMatrix.needsUpdate=true;
        clouds.mesh.geometry.getAttribute('aCloudMatrix0').data.needsUpdate=true;
        clouds.mesh.geometry.getAttribute('aCloudFade').setX(0,1);clouds.mesh.geometry.getAttribute('aCloudFade').needsUpdate=true;
        clouds.mesh.boundingSphere.center.copy(centre);clouds.mesh.boundingSphere.radius=90;
        clouds.mesh.visible=true;clouds.opacityUniform.value=1;
        (window as any).__maskedOpacity=clouds.mesh.material.opacityNode;
        const witness=view.precipitation.mesh.clone();
        witness.geometry=witness.geometry.clone();witness.geometry.instanceCount=1;
        witness.material=new clouds.mesh.material.constructor({color:0xff00aa,transparent:true,opacity:1,depthWrite:false,depthTest:true,side:2,forceSinglePass:true,fog:false});
        witness.position.copy(view.controls.target);witness.quaternion.copy(view.camera.quaternion);witness.scale.set(12,12,1);
        witness.renderOrder=100;witness.frustumCulled=false;witness.visible=true;view.scene.add(witness);
        (window as any).__cloudWitness=witness;
      },mode);
      await page.waitForTimeout(300);
      const masked=await canvas.screenshot({path:test.info().outputPath(`v185-cloud-${mode}-masked.png`)});
      const withCloud=await page.evaluate(()=>{
        const view=(window as any).__cloudView;
        return {backend:view.backend,drawCalls:view.stats.drawCalls,triangles:view.stats.triangles,cloudTriangles:view.clouds.mesh.geometry.getAttribute('position').count/3};
      });
      expect(withCloud.backend).toBe('WebGPU');
      const shader=await page.evaluate(async()=>{const view=(window as any).__cloudView;return {material:view.clouds.mesh.material.id,...await view.renderer.debug.getShaderAsync(view.scene,view.camera,view.clouds.mesh)};});
      await writeFile(test.info().outputPath('cloud-shader.json'),JSON.stringify(shader));
      await page.evaluate(()=>(window as any).__cloudView.clouds.mesh.visible=false);
      await page.waitForTimeout(250);
      const hidden=await canvas.screenshot({path:test.info().outputPath(`v185-cloud-${mode}-hidden.png`)});
      const without=await page.evaluate(()=>{const view=(window as any).__cloudView;return {drawCalls:view.stats.drawCalls,triangles:view.stats.triangles};});
      expect(withCloud.drawCalls-without.drawCalls).toBe(1);
      expect(withCloud.triangles-without.triangles).toBe(withCloud.cloudTriangles);
      await page.evaluate(()=>{
        const clouds=(window as any).__cloudView.clouds;clouds.mesh.visible=true;
        clouds.mesh.material.opacityNode=clouds.opacityUniform;clouds.mesh.material.needsUpdate=true;
      });
      await page.waitForTimeout(300);
      const unmasked=await canvas.screenshot({path:test.info().outputPath(`v185-cloud-${mode}-unmasked.png`)});
      const pixels=await page.evaluate(async({masked,hidden,unmasked})=>{
        const decode=async(encoded:string)=>{
          const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
          const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
          const surface=new OffscreenCanvas(bitmap.width,bitmap.height),ctx=surface.getContext('2d')!;
          ctx.drawImage(bitmap,0,0);bitmap.close();
          return {width:surface.width,height:surface.height,data:ctx.getImageData(0,0,surface.width,surface.height).data};
        };
        const a=await decode(masked),b=await decode(hidden),c=await decode(unmasked),short=Math.min(a.width,a.height);
        let innerMax=0,outerChanged=0,coveredCentre=0;
        for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){
          const radius=Math.hypot(x-a.width/2,y-a.height/2)/short,offset=(y*a.width+x)*4;
          const diff=Math.max(...[0,1,2].map(k=>Math.abs(a.data[offset+k]!-b.data[offset+k]!)));
          const control=Math.max(...[0,1,2].map(k=>Math.abs(c.data[offset+k]!-b.data[offset+k]!)));
          if(radius<.26){innerMax=Math.max(innerMax,diff);if(control>3)coveredCentre++;}
          if(radius>.35&&diff>3)outerChanged++;
        }
        return {innerMax,outerChanged,coveredCentre};
      },{masked:masked.toString('base64'),hidden:hidden.toString('base64'),unmasked:unmasked.toString('base64')});
      console.log(JSON.stringify({mode,pixels,cloudTriangles:withCloud.cloudTriangles}));
      expect(pixels.coveredCentre).toBeGreaterThan(1000);
      expect(pixels.innerMax).toBe(0);
      expect(pixels.outerChanged).toBeGreaterThan(1000);
      await page.evaluate(()=>{
        const view=(window as any).__cloudView,witness=(window as any).__cloudWitness;
        view.clouds.mesh.material.opacityNode=(window as any).__maskedOpacity;view.clouds.mesh.material.needsUpdate=true;
        view.scene.remove(witness);witness.geometry.dispose();witness.material.dispose();
      });
    }
    expect(errors).toEqual([]);
  }finally{await browser.close();}
});
