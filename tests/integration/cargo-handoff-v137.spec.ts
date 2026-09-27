import { expect,test } from '@playwright/test';
import { observeErrors,startPaused } from './helpers';

test('confirmed floor and table releases compile their resident WebGPU cargo paths',async({playwright})=>{
  test.setTimeout(90_000);
  const browser=await playwright.chromium.launch({channel:'chromium',headless:false,args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  try {
    const errors=observeErrors(page);
    await page.route('**/src/main.ts*',async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:`const originalCargoFrame=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){window.__cargoView=this;return originalCargoFrame.call(this,now);};\n`+await response.text()});
    });
    await startPaused(page);
    await page.waitForFunction(()=>Boolean((window as any).__cargoView?.world));
    const full=await page.evaluate(()=>{
      const v=(window as any).__cargoView,w=structuredClone(v.world),id=w.pawns[0].id;
      v.hasTracks=false;
      w.tick=120;w.pawns[0].x=10;w.pawns[0].z=10;w.pawns[0].state='idle';w.pawns[0].haul=null;
      w.piles=[{id:90001,kind:'wood',item:'wood',quantity:10,owner:{type:'pawn',pawnId:id}}];
      v.setWorld(w,true,0);
      const next=structuredClone(w);next.tick=121;next.piles[0].owner={type:'ground',x:11,z:10};
      v.pawns.adoptCargo(w,next,121,true);v.world=next;v.updatePiles(next,false);v.pawns.update(next,1,false);
      v.timeFrom=v.timeTo=121/6;v.snapshotDuration=0;
      return {id,hidden:v.pawns.hiddenPileQuantity(90001),load:v.pawns.pawnMesh.geometry.getAttribute('aCargo').getX(0),
        buffers:new Set(Object.values(v.pawns.cargoMesh.geometry.attributes).map((a:any)=>a.data??a)).size,backend:v.backend};
    });
    expect(full.backend).toBe('WebGPU');expect(full.hidden).toBe(10);expect(full.load).toBe(1);
    expect(full.buffers).toBeLessThanOrEqual(8);
    await page.waitForTimeout(250);
    const halfway=await page.evaluate(()=>{
      const v=(window as any).__cargoView;v.timeFrom=v.timeTo=121.75/6;
      return {hidden:v.pawns.hiddenPileQuantity(90001),clock:v.pawns.cargoTime.value};
    });
    expect(halfway.hidden).toBe(10);
    await page.waitForTimeout(250);
    const finished=await page.evaluate(()=>{
      const v=(window as any).__cargoView;v.timeFrom=v.timeTo=122.6/6;return true;
    });
    expect(finished).toBe(true);
    await page.waitForFunction(()=>(window as any).__cargoView.pawns.hiddenPileQuantity(90001)===0);
    const partial=await page.evaluate(()=>{
      const v=(window as any).__cargoView,w=structuredClone(v.world),id=w.pawns[0].id;
      w.tick=130;w.structures=[...w.structures,{id:90002,kind:'table',x:11,z:10,orientation:0,footprint:'standard'}];
      w.pawns[0].cooking={phase:'output',storageId:null,actionCell:{x:11,z:10}};
      w.piles=[{id:90003,kind:'wood',item:'wood',quantity:20,owner:{type:'pawn',pawnId:id}}];
      v.setWorld(w,true,0);
      const next=structuredClone(w);next.tick=131;next.piles[0].quantity=12;
      next.piles.push({id:90004,kind:'wood',item:'wood',quantity:8,owner:{type:'ground',x:11,z:10}});
      v.pawns.adoptCargo(w,next,131,true);v.world=next;v.updatePiles(next,false);v.pawns.update(next,1,false);
      v.timeFrom=v.timeTo=131/6;v.snapshotDuration=0;
      const mesh=v.pawns.partialCargoMesh;
      return {hidden:v.pawns.hiddenPileQuantity(90004),held:v.pawns.pawnMesh.geometry.getAttribute('aCargo').getX(0),
        transfers:mesh.geometry.instanceCount,height:mesh.geometry.getAttribute('aTransferTo').getY(0)};
    });
    expect(partial).toMatchObject({hidden:8,held:1,transfers:1});
    expect(partial.height).toBeGreaterThan(.8);
    await page.waitForTimeout(300); // compiles and renders the extra batch
    expect(errors).toEqual([]);
  } finally {await browser.close();}
});
