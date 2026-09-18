import { applyCommand } from '../../src/sim/engine.ts';
import { addMaterial } from '../../src/sim/materials.ts';
import { equipmentCamp } from './equipment.ts';
import { miningLoad } from './mining.ts';
import type { World } from '../../src/sim/types.ts';

/** Controlled, explicitly friendly-fire scenario, not a generated enemy raid. */
export function firingCamp():World {
  const w=equipmentCamp(3);w.piles=[];w.rng=81733;
  w.pawns.forEach((p,i)=>{p.x=4+i*10;p.z=10;p.skills.shooting.passion=1;});
  addMaterial(w,'weapon',1,{type:'equipment',pawnId:w.pawns[0].id},'revolver');
  for(const p of w.pawns)if(!applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true}).ok)throw Error('Invalid firing camp');
  return w;
}

export function shootingLoad(count:number,movingTargets=false):{world:World;pairs:number[][]} {
  const world=miningLoad(count,true),pairs:number[][]=[];
  const inside=(x:number,z:number)=>x>=65&&x<=90&&z>=65&&z<=140;
  for(let z=65;z<=140;z++)for(let x=65;x<=90;x++)world.tiles[z*world.width+x]={terrain:'grass'};
  world.resources=world.resources.filter(r=>!inside(r.x,r.z));
  for(let i=0;i+2<count;i+=3){const a=world.pawns[i],b=world.pawns[i+1],z=70+i/3*2;Object.assign(a,{x:70,z});Object.assign(b,{x:80,z});
    addMaterial(world,'weapon',1,{type:'equipment',pawnId:a.id},'revolver');
    if(!applyCommand(world,{type:'draft',pawnIds:[a.id,b.id],enabled:true}).ok)throw Error('Draft refused');pairs.push([a.id,b.id]);
    if(movingTargets)for(let leg=0;leg<16;leg++)if(!applyCommand(world,{type:'draft-move',pawnIds:[b.id],target:{x:80,z:z+(leg%2===0?4:0)},queue:leg>0}).ok)throw Error('Moving target refused');
  }
  return {world,pairs};
}
