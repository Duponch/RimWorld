import type { World } from '../../src/sim/types.ts';
import type { Decision } from './colony-player.ts';

/** Cover dining after the windbreak exists; keep the vegetable patch exposed. */
export function roofingDecisions(world: World): Decision[] {
  if(world.tick<6000)return [];
  const x=Math.floor(world.width/2),z=Math.floor(world.height/2);
  if(![-3,3].every(dx=>[-3,-2,-1].every(dz=>world.structures.some(s=>s.kind==='wall'&&s.x===x+dx&&s.z===z+dz))))return [];
  const planned=new Set(world.roofing?.build);
  if(Array.from({length:28},(_,i)=>(z-3+Math.floor(i/7))*world.width+x-3+i%7).every(i=>planned.has(i)))return [];
  return [{reason:'Couvrir l’espace de repas après avoir construit ses supports.',command:{type:'area',action:'build-roof',from:{x:x-3,z:z-3},to:{x:x+3,z}}}];
}
