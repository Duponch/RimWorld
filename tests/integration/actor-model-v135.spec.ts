import { expect,test } from '@playwright/test';
import { serializeWorld,validateWorld } from '../../src/sim/serialization';
import { addMaterial } from '../../src/sim/materials';
import { equipmentCamp } from '../scenarios/equipment';
import { expectWorld,observeErrors,panel,pause,saveKey } from './helpers';

const probe=`
window.__actorView=null;
const actorFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(...args){const result=actorFrame.apply(this,args);if(!this.preparing)window.__actorView=this;return result;};
`;

test('V135: one resident WebGPU rig keeps its revolver on the standing and sleeping body',async({playwright})=>{
  test.setTimeout(120_000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  try{
    for(const state of ['idle','sleeping'] as const){
      const prepared=equipmentCamp(1),pawn=prepared.pawns[0]!;
      prepared.piles=[];pawn.x=12;pawn.z=12;pawn.state=state;
      if(state==='sleeping'){
        pawn.rest=20;pawn.need={kind:'sleep',phase:'sleep',bedId:null,target:{x:pawn.x,z:pawn.z}};
        pawn.schedule.fill('sleep');
      }
      addMaterial(prepared,'weapon',1,{type:'equipment',pawnId:pawn.id},'revolver');
      expect(validateWorld(prepared)).toEqual([]);
      const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}}),errors=observeErrors(page);
      try{
        await page.addInitScript(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(prepared)});
        await page.route('**/src/main.ts*',async route=>{
          const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});
        });
        await page.goto('/?scenario=camp&size=32&e2e');
        await expect(page.locator('#loading')).toHaveCount(0);await pause(page);
        await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,prepared);
        await page.keyboard.press('Escape');
        await page.waitForFunction(()=>!!(window as any).__actorView);
        const rig=await page.evaluate(({x,z})=>{
          const view=(window as any).__actorView;
          view.controls.enableDamping=false;view.rig.setMode('orthographic');
          view.controls.target.set(x,0,z);view.camera.zoom=10;view.camera.updateProjectionMatrix();view.controls.update();
          const g=view.pawns.feedbackSource;
          return {backend:view.backend,actors:g.instanceCount,equipment:g.getAttribute('aEquipment').getX(0),pose:g.getAttribute('aMotion').getZ(0)};
        },pawn);
        expect(rig).toMatchObject({backend:'WebGPU',actors:1,equipment:1,pose:state==='sleeping'?18:0});
        await page.waitForTimeout(200);
        await page.screenshot({path:test.info().outputPath(`actor-model-v135-${state}.png`)});
        expect(errors).toEqual([]);
      }finally{await page.close();}
    }
  }finally{await browser.close();}
});
