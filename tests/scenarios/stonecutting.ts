import { createWorld } from '../../src/sim/index.ts';
import { addGroundMaterial, refreshStock } from '../../src/sim/materials.ts';
import { initialRecreation } from '../../src/sim/recreation-rules.ts';
import type { World } from '../../src/sim/types.ts';

/** Directed logistics fixture, not evidence of a naturally developed colony. */
export function stonecuttingCamp(count=1,size=24):World {
  const w=createWorld(42,size,size),base=structuredClone(w.pawns[0]!);
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.jobs=[];w.structures=[];w.stockpiles=[];
  w.pawns=Array.from({length:count},(_,i)=>({...structuredClone(base),id:i===0?base.id:w.nextId++,name:`Artisan ${i+1}`,x:3+(i%10)*6,z:3+Math.floor(i/10)*6,hunger:100,rest:100,recreation:initialRecreation(),priorities: {clean:0,firefight:0,warden:0,basic:3,hunt:0,research:0, patient:0,bedrest:0,doctor:0,mine:0,gather:0,build:0,haul:0,grow:0,cook:0,art:0,craft:1}}));
  for(const p of w.pawns){p.schedule.fill('anything');w.structures.push({id:w.nextId++,kind:'stonecutter',material:'wood',x:p.x,z:p.z+1,orientation:0,footprint:'standard',bills:[]});}
  refreshStock(w);return w;
}
export function stonecuttingLoad(count:number):World {
  const w=stonecuttingCamp(count,250);
  for(const p of w.pawns){p.x+=90;p.z+=90;}for(const s of w.structures){s.x+=90;s.z+=90;}
  for(const [i,p] of w.pawns.entries()) {
    const s=w.structures[i]!;
    s.bills=[{id:w.nextId++,recipe:'stone-blocks',mode:'times',target:3,suspended:false,filters:{'granite-chunk':true,'limestone-chunk':true,'marble-chunk':true,'sandstone-chunk':true,'slate-chunk':true},radius:4,destination:'stockpile'}];
    for(let k=0;k<3;k++)addGroundMaterial(w,'chunk',1,{x:p.x+2,z:p.z+k},'granite-chunk');
    w.stockpiles.push({id:w.nextId++,x:p.x+2,z:p.z-1,filters:{wood:false,food:false,blocks:true},priority:2,capacity:75});
  }
  return w;
}
