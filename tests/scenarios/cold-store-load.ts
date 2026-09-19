import { researchLoad } from './research-load.ts';
import { AIR_CONDITIONING_COST } from '../../src/sim/research.ts';
import { newBuildingFuel } from '../../src/sim/fuel.ts';
import { addGroundMaterial,refreshStock } from '../../src/sim/materials.ts';
import { builtDoorState } from '../../src/sim/door-rules.ts';
import { reconcileTemperature } from '../../src/sim/temperature.ts';
import { updateFoodTemperatures } from '../../src/sim/thermal-food.ts';
import { createMedicalRecord } from '../../src/sim/injury-state.ts';
import type { Structure,World } from '../../src/sim/types.ts';

/** Declared load, not earned content: 1/6/20 cold rooms beside the existing
 * research/crafting/mining workload. One fifth starts exposed and must leave. */
export function coldStoreLoad(count:number):World {
  const w=researchLoad(count);w.research!.airConditioning={points:AIR_CONDITIONING_COST,completedAt:w.tick};
  const roofs=new Set(w.roofing?.constructed),cleared=new Set<number>();
  for(let n=0;n<Math.ceil(count/5);n++){
    const x=150+n%4*8,z=108+Math.floor(n/4)*7;
    for(let dx=-1;dx<7;dx++)for(let dz=-1;dz<6;dz++){const i=(z+dz)*w.width+x+dx;cleared.add(i);w.tiles[i]={terrain:'grass'};}
    const g:Structure={id:w.nextId++,kind:'wood-generator',material:'steel',footprint:'standard',orientation:0,x:x+5,z,power:{on:true,parentId:null},fuel:newBuildingFuel('wood-generator')};g.fuel!.ticks=45000;w.structures.push(g);
    for(let dx=0;dx<=4;dx++)for(let dz=0;dz<=4;dz++){
      if(dx>0&&dx<4&&dz>0&&dz<4){roofs.add((z+dz)*w.width+x+dx);continue;}
      const kind=dx===2&&dz===0?'cooler':dx===4&&dz===2?'door':'wall';
      const s:Structure={id:w.nextId++,kind,material:kind==='cooler'?'steel':'wood',orientation:0,footprint:'standard',x:x+dx,z:z+dz};
      if(kind==='door')s.door=builtDoorState(w,s);
      if(kind==='cooler'){s.power={on:true,parentId:g.id};s.cooler={target:-10,high:true};}w.structures.push(s);
    }
    addGroundMaterial(w,'food',50,{x:x+2,z:z+2},'rice');
    const pawn=w.pawns[n*5]!;pawn.x=x+1;pawn.z=z+1;pawn.health=createMedicalRecord(w.tick);pawn.health.hypothermia=340000000;
  }
  w.resources=w.resources.filter(r=>!cleared.has(r.z*w.width+r.x));
  w.roofing={constructed:[...roofs].sort((a,b)=>a-b),build:[],remove:[],cursor:0};
  const layout=reconcileTemperature(w);for(const r of w.thermal?.regions??[])r.temperature=-10;
  updateFoodTemperatures(w,layout);refreshStock(w);return w;
}
