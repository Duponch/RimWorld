import { plantGrowth } from '../sim/plants';
import type { Resource,World } from '../sim/types';
import type { Placement } from './primitives';

/** Four visible growth steps keep the forest resident between shape changes. */
export const floraSize=(world:World,r:Resource):number=>!r.species?1:(r.growth??1)===1?1:.3+.7*Math.ceil(plantGrowth(world,r)*4)/4;
const FLORA_COLORS={pine:0x47684c,birch:0x8fa467,oak:0x57754d,poplar:0x849752,drago:0x728966,saguaro:0x698661,agave:0x839c89,moss:0x718356,grass:0x929357,'tall-grass':0x7d8a4f,brambles:0x556648,'berry-bush':0x677b55};
export const floraColor=(r:Resource):number=>FLORA_COLORS[r.species??'berry-bush'];
export const isClusterPlantSpecies=(species:Resource['species']):boolean=>species==='grass'||species==='tall-grass';
export const floraTreeHeight=(r:Resource):number=>r.species==='saguaro'?2.2:r.species==='drago'?2.7:r.species==='pine'?4.6:r.species==='poplar'?4.3:3.8;
export const floraIdentity=(world:World,r:Resource):string=>`${r.kind}:${r.x}:${r.z}:${r.stone??''}:${r.species??''}:${floraSize(world,r)}`;

export interface FloraParts {trunks:Placement[];crowns:Placement[];cones:Placement[];bushes:Placement[];blades:Placement[];cacti:Placement[];fruit:Placement[]}
/** Compact 3D meshes for trees, shrubs and agave. Grass species use their one
 * resident cluster batch rather than duplicating geometry in every chunk. */
export function appendFlora(parts:FloraParts,world:World,r:Resource,turn:number):void {
  if(isClusterPlantSpecies(r.species))return;
  const {x,z}=r,s=floraSize(world,r),color=floraColor(r),leaves=-r.id*2,fruit=-r.id*2-1;
  const add=(items:Placement[],p:Omit<Placement,'x'|'z'> & {dx?:number;dz?:number})=>{
    const {dx=0,dz=0,...shape}=p;
    items.push({...shape,x:x+dx*s,z:z+dz*s,y:p.y*s,sx:(p.sx??1)*s,sy:(p.sy??1)*s,sz:(p.sz??1)*s,color:p.color??color,key:p.key??leaves});
  };
  if(r.kind==='tree') {
    const height=floraTreeHeight(r);
    if(r.species==='saguaro') {
      add(parts.cacti,{y:height/2,sx:.32,sy:height,sz:.32,key:r.id});
      for(const side of [-1,1]){add(parts.cacti,{dx:side*.35,y:1,sy:.22,sx:.65,sz:.22,key:r.id});add(parts.cacti,{dx:side*.6,y:1.4,sy:1,sx:.22,sz:.22,key:r.id});}
    } else {
      add(parts.trunks,{y:height*.25,sx:r.species==='birch'?.85:1,sy:height*.5,sz:1,color:r.species==='birch'?0xcac9b4:0x70573e,key:r.id});
      if(r.species==='pine') {
        add(parts.cones,{y:height*.57,sx:1,sy:height*.6,sz:1,ry:turn});
        add(parts.cones,{y:height*.82,sx:.7,sy:height*.4,sz:.7,ry:turn+.3});
      } else {
        add(parts.crowns,{y:height*.65,sx:r.species==='poplar'?.7:1,sy:height*(r.species==='drago'?.12:.24),sz:r.species==='poplar'?.7:1,ry:turn});
        if(r.species!=='drago')add(parts.crowns,{y:height*.87,sx:.66,sy:height*.16,sz:.66,ry:turn+.5});
      }
    }
  } else if(r.species==='agave') {
    const h=.4;
    for(let i=0;i<6;i++) {const angle=turn+i*Math.PI/3;add(parts.blades,{dx:Math.sin(angle)*.13,dz:Math.cos(angle)*.13,y:h*.5,sx:.15,sy:h,sz:.65,ry:angle});}
  } else {
    const moss=r.species==='moss';
    add(parts.bushes,{y:moss?.04:.3,sx:.43,sy:moss?.055:.37,sz:.41,ry:turn});
    if(r.kind==='berries')for(let i=0;i<5;i++){const angle=turn+i*2.4;add(parts.fruit,{dx:Math.sin(angle)*.25,dz:Math.cos(angle)*.25,y:.42+(i%2)*.09,sx:1,sy:1,sz:1,color:0xb96f63,key:fruit});}
  }
}
