import {afterEach,expect,test,vi} from 'vitest';
import {OrthographicCamera} from 'three/webgpu';
import {createWorld} from '../src/sim/engine';
import {newShelfStorage} from '../src/sim/shelf-storage';
import {MapLabelsOverlay} from '../src/render/MapLabelsOverlay';
import {pileIdentitySurfaces} from '../src/render/pile-surfaces';
import type {MaterialPile,World} from '../src/sim/types';

afterEach(()=>vi.unstubAllGlobals());
test('shelf quantities retain real IDs and heights; layout changes invalidate while policy and steady frames retain the canvas',()=>{
  const context={setTransform:vi.fn(),clearRect:vi.fn(),strokeText:vi.fn(),fillText:vi.fn()},canvas={hidden:false,width:0,height:0,setAttribute:vi.fn(),getContext:()=>context,remove:vi.fn()};
  vi.stubGlobal('document',{createElement:()=>canvas});vi.stubGlobal('window',{devicePixelRatio:1});
  const overlay=new MapLabelsOverlay({after:vi.fn()} as unknown as HTMLElement),camera=new OrthographicCamera(-6,6,6,-6,.1,100);
  camera.position.set(8,12,10);camera.lookAt(4,0,4);camera.updateProjectionMatrix();
  let w:World=createWorld(42,8);w.structures=[{id:50,kind:'small-shelf',x:4,z:4,orientation:0,footprint:'standard',material:'wood',shelf:newShelfStorage([51])}];w.packed=[];
  w.piles=[3,1,2].map(n=>({id:60+n,kind:'wood',item:'wood',quantity:11*n,owner:{type:'ground',x:4,z:4}} as MaterialPile));
  overlay.draw(w,camera,120,800,600);const entries=overlay['chunks'].flatMap(c=>c.entries),supports=pileIdentitySurfaces(w);
  expect(entries.map(e=>e.label)).toEqual(['33','11','22']);expect(new Set(entries.map(e=>e.y)).size).toBe(3);
  for(const e of entries){const support=supports.get(e.pileId!)!;expect(e.x).toBe(4+support.x);expect(e.y).toBe(support.y+.18);expect(e.z).toBe(4+support.z);}
  const stationary=overlay['chunks'];overlay.draw(w,camera,120,800,600);expect(context.clearRect).toHaveBeenCalledTimes(1);
  w={...w,structures:w.structures.map(s=>({...s,damage:1,shelf:{...s.shelf!,settings:{...s.shelf!.settings,priority:5}}}))};
  overlay.draw(w,camera,120,800,600);expect(overlay['chunks']).toBe(stationary);expect(context.clearRect).toHaveBeenCalledTimes(1);
  w={...w,structures:w.structures.map(s=>({...s,orientation:1}))};overlay.draw(w,camera,120,800,600);expect(context.clearRect).toHaveBeenCalledTimes(2);expect(overlay['chunks']).not.toBe(stationary);
  w={...w,piles:w.piles.filter(p=>p.id!==61)};overlay.draw(w,camera,120,800,600);expect(context.clearRect).toHaveBeenCalledTimes(3);
  const two=overlay['chunks'].flatMap(c=>c.entries);expect(two.map(e=>e.pileId).sort()).toEqual([62,63]);expect(two.map(e=>e.y).sort()).toEqual([.14+.18,.64+.18]);
  w={...w,structures:[]};overlay.draw(w,camera,120,800,600);expect(context.clearRect).toHaveBeenCalledTimes(4);expect(overlay['chunks'].flatMap(c=>c.entries).every(e=>e.y===.32)).toBe(true);
  overlay.dispose();
});
