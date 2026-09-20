import { createWorld, applyCommand } from '../../src/sim/index.ts';
import type { World } from '../../src/sim/types.ts';

export function miningCamp(count=1):World {
  const w=createWorld(42,32,32);w.tick=2000;w.resources=[];w.piles=[];w.stock={wood:0,food:0};w.tiles=w.tiles.map(()=>({terrain:'grass'}));
  const original=structuredClone(w.pawns[0]!);
  w.pawns=Array.from({length:count},(_,i)=>({...structuredClone(original),id:w.nextId++,name:`Mineur ${i}`,x:10+i,z:12,hunger:100,rest:100,priorities: {clean:0,firefight:0,warden:0,basic:3,hunt:0,research:0, patient:0,bedrest:0,doctor:0,craft:2,mine:1,haul:2,gather:0,build:0,grow:0,cook:0}}));
  return w;
}

/** Natural 250² surroundings, cleared working patch only. Four rocks and one
 * tree per miner; real reservations, needs, excavation and carrying. */
export function miningLoad(count:number,steel=false,machinery=false):World {
  const w=createWorld(42,250,250);w.tick=2000;w.piles=[];w.stock={wood:0,food:0};
  const inside=(x:number,z:number)=>x>=108&&x<=144&&z>=108&&z<=144;
  for(let z=108;z<=144;z++)for(let x=108;x<=144;x++)w.tiles[z*w.width+x]={terrain:'grass'};
  w.resources=w.resources.filter(r=>!inside(r.x,r.z));
  const original=structuredClone(w.pawns[0]!);
  w.pawns=Array.from({length:count},(_,i)=>({...structuredClone(original),id:w.nextId++,name:`Mineur ${i}`,x:110+i%10*3,z:110+Math.floor(i/10)*3,hunger:100,rest:100,priorities: {clean:0,firefight:0,warden:0,basic:3,hunt:0,research:0, patient:0,bedrest:0,doctor:0,craft:2,mine:1,haul:2,gather:2,build:0,grow:0,cook:0}}));
  for(const p of w.pawns) {
    for(let dx=1;dx<=2;dx++)for(let dz=0;dz<=1;dz++)w.tiles[(p.z+dz)*w.width+p.x+dx]={terrain:'rock',stone:'sandstone',...machinery?{ore:'machinery' as const}:steel?{ore:'steel' as const}:{}};
    w.resources.push({id:w.nextId++,kind:'tree',x:p.x,z:p.z-1,amount:12});
    for(const c of [{type:'area',action:'mine',from:{x:p.x+1,z:p.z},to:{x:p.x+2,z:p.z+1}},{type:'designate',kind:'chop',x:p.x,z:p.z-1}] as const)if(!applyCommand(w,c).ok)throw new Error('Invalid mining load command.');
  }
  return w;
}
