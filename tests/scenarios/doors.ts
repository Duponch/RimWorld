import { deconstructionCamp, fixtureBuilding } from './deconstruction.ts';
import { applyCommand } from '../../src/sim/engine.ts';
import { addGroundMaterial } from '../../src/sim/materials.ts';
import type { World } from '../../src/sim/types.ts';

/** Real builders create doors, then harvest trees inside their walled plots
 * and return the wood to outside stockpiles. Needs stay enabled. */
export function doorTraffic(count:number):World {
  const w=deconstructionCamp(count,250);w.tick=2000;
  w.pawns.forEach((p,i)=>{
    const x=10+(i%10)*22,z=10+Math.floor(i/10)*22;
    p.x=x-3;p.z=z;p.priorities={basic:3,hunt:0,research:0, patient:0,bedrest:0,doctor:0,mine:0,craft:0,gather:2,build:1,haul:2,grow:0,cook:0};
    for(let dx=0;dx<=4;dx++)for(let dz=-2;dz<=2;dz++)if((dx===0||dx===4||Math.abs(dz)===2)&&!(dx===0&&dz===0))fixtureBuilding(w,'wall',x+dx,z+dz);
    addGroundMaterial(w,'wood',25,{x:x-3,z:z-1},'wood');
    w.resources.push({id:w.nextId++,kind:'tree',x:x+2,z,amount:12});
    for(const command of [{type:'designate',kind:'door',material:'wood',x,z},{type:'designate',kind:'chop',x:x+2,z},{type:'stockpile',x:x-3,z:z+1,enabled:true,filters:{wood:true,food:false},capacity:75}] as const) {
      const r=applyCommand(w,command);if(!r.ok)throw new Error(JSON.stringify({command,r}));
    }
  });
  return w;
}
export function doorTrafficOutcome(w:World) {
  const storage=new Set(w.stockpiles.map(s=>s.z*w.width+s.x));
  return {doors:w.structures.filter(s=>s.kind==='door').length,trees:w.resources.filter(r=>r.kind==='tree').length,
    stored:w.piles.filter(p=>p.owner.type==='ground'&&storage.has(p.owner.z*w.width+p.owner.x)).reduce((n,p)=>n+p.quantity,0),
    hauling:w.pawns.filter(p=>p.haul).length,jobs:w.jobs.length};
}
