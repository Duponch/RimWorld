import { createWorld } from '../../src/sim/engine.ts';
import { canDesignate } from '../../src/sim/engine.ts';
import { addGroundMaterial,refreshStock } from '../../src/sim/materials.ts';
import type { Command,World } from '../../src/sim/types.ts';
import type { Decision } from './colony-player.ts';

/** Compact supplied expedition, not a natural-world generation/performance fixture.
 * Only the starting wood/food are supplied. All shelter and cooling use commands. */
export function heatwaveCamp():World {
  const w=createWorld(42,16,16);w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.structures=[];w.piles=[];w.pawns=w.pawns.slice(0,2);
  for(const [i,p] of w.pawns.entries()){p.x=10+i;p.z=5;p.hunger=p.rest=100;for(const k in p.priorities)p.priorities[k as keyof typeof p.priorities]=0;p.priorities.build=1;p.priorities.haul=2;p.priorities.doctor=1;}
  for(let i=0;i<6;i++)addGroundMaterial(w,'wood',75,{x:9+i,z:7},'wood');
  addGroundMaterial(w,'food',75,{x:10,z:6},'survival-meal');refreshStock(w);return w;
}
export function heatwaveDecisions(w:World):Decision[] {
  const result:Decision[]=[];
  if(!w.heatwaves)result.push({reason:'Accepter les conditions climatiques du camp.',command:{type:'enable-heatwaves'}});
  const plans:Command[]=[];
  for(let z=2;z<=7;z++)for(let x=2;x<=7;x++)if(x===2||x===7||z===2||z===7)plans.push({type:'designate',kind:x===7&&z===5?'door':'wall',material:'wood',x,z,orientation:0});
  plans.push({type:'designate',kind:'bed',material:'wood',x:4,z:5,orientation:0},{type:'designate',kind:'bed',material:'wood',x:6,z:5,orientation:0});
  for(const command of plans)if(command.type==='designate'&&canDesignate(w,command).ok)result.push({reason:'Construire deux couchages dans un refuge fermé.',command});
  if(!w.roofing?.build.includes(3*w.width+3)&&!w.roofing?.constructed.includes(3*w.width+3))result.push({reason:'Couvrir entièrement le refuge.',command:{type:'area',action:'build-roof',from:{x:3,z:3},to:{x:6,z:6}}});
  if(w.structures.filter(s=>s.kind==='wall'||s.kind==='door').length===20&&w.roofing?.constructed.includes(3*w.width+3)){
    const c={type:'designate' as const,kind:'passive-cooler' as const,material:'wood' as const,x:3,z:3};
    if(canDesignate(w,c).ok)result.push({reason:'Préparer le rafraîchissement avant la première canicule.',command:c});
  }
  return result;
}
