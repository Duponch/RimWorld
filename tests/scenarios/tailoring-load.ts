import { miningLoad } from './mining.ts';
import { applyCommand } from '../../src/sim/engine.ts';
import { addGroundMaterial,addMaterial } from '../../src/sim/materials.ts';
import type { Command,World } from '../../src/sim/types.ts';

/** Half craft one garment, half mine/chop, in a natural 250² map. Controlled
 * cloth is a load fixture; the ordinary colony test grows its own material. */
export function tailoringLoad(count:number):World {
  const w=miningLoad(count),command=(c:Command)=>{const r=applyCommand(w,c);if(!r.ok)throw Error(r.reason);};
  for(const [i,p] of w.pawns.entries()){
    addMaterial(w,'apparel',1,{type:'apparel',pawnId:p.id},'cloth-tribalwear');
    if(i%2)continue;
    const cells=new Set<number>();for(let dx=1;dx<=2;dx++)for(let dz=0;dz<=1;dz++){cells.add((p.z+dz)*w.width+p.x+dx);w.tiles[(p.z+dz)*w.width+p.x+dx]={terrain:'grass'};}
    w.jobs=w.jobs.filter(j=>!cells.has(j.z*w.width+j.x));p.priorities.craft=1;p.priorities.mine=0;p.schedule.fill('work');
    p.skills.crafting={level:8,xp:0,dailyXp:0,passion:1};
    addGroundMaterial(w,'textile',60,{x:p.x+1,z:p.z+2},'cloth');
    command({type:'designate',kind:'crafting-spot',x:p.x+1,z:p.z+1});command({type:'bill-add',structureId:w.structures.at(-1)!.id});
  }return w;
}
