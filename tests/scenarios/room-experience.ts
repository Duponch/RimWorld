import {createWorld} from '../../src/sim/engine.ts';
import {newDoorState} from '../../src/sim/door-rules.ts';
import {sowDaylily} from '../../src/sim/flower-pot.ts';
import {refreshStock} from '../../src/sim/materials.ts';
import type {World} from '../../src/sim/types.ts';

/** Prepared physical room for V103 checks and discovery. No progression is implied. */
export function roomExperienceCamp():World {
  const w=createWorld(103,32,32);w.tick=2000;
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.jobs=[];w.structures=[];w.stockpiles=[];
  w.pawns=w.pawns.slice(0,1);const p=w.pawns[0]!;
  Object.assign(p,{x:17,z:15,hunger:100,rest:100});
  p.schedule.fill('anything');p.priorities={clean:0,firefight:0,warden:0,basic:0,hunt:0,research:0,patient:0,bedrest:0,doctor:0,art:0,craft:0,mine:0,gather:0,build:0,haul:0,grow:0,cook:0};
  const building=(kind:'wall'|'flower-pot',x:number,z:number)=>{
    const s={id:w.nextId++,kind,x,z,orientation:0 as const,footprint:'standard' as const,...(kind==='flower-pot'?{material:'wood' as const,quality:'normal' as const,flower:{allowSow:true,plant:sowDaylily(w.tick)}}:{})};
    w.structures.push(s);
  };
  for(let x=8;x<=22;x++){if(x!==15)building('wall',x,8);building('wall',x,22);}
  w.structures.push({id:w.nextId++,kind:'door',x:15,z:8,orientation:0,footprint:'standard',material:'wood',door:newDoorState(w.tick)});
  for(let z=9;z<=21;z++){building('wall',8,z);building('wall',22,z);}
  for(let z=9;z<=21;z++){building('flower-pot',9,z);building('flower-pot',21,z);}
  for(let z=9;z<=21;z++)for(let x=9;x<=21;x++)w.tiles[z*w.width+x]={terrain:'grass',floor:'marble-tile'};
  refreshStock(w);
  return w;
}
