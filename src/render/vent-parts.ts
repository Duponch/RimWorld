import {WORLD_SCALE} from '../world/scale';
import type {World} from '../sim/types';
import type {Placement} from './primitives';

/** Original authored grille. Same resident boxes, no scene/material per vent.
 * A constant part count keeps real open/closed changes resident and visible. */
export function ventParts(world:Pick<World,'structures'>,cutaway=false):Placement[]{
  const out:Placement[]=[],height=cutaway?WORLD_SCALE.wallCutawayHeight:WORLD_SCALE.wallHeight;
  for(const s of world.structures)if(s.kind==='vent'){
    const ry=s.orientation*Math.PI/2,cos=Math.cos(ry),sin=Math.sin(ry),open=s.vent?.open!==false;
    const part=(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:number)=>out.push({targetId:s.id,x:s.x+x*cos+z*sin,z:s.z+z*cos-x*sin,y,sx,sy,sz,ry,color});
    part(-.41,height/2,0,.18,height,.96,0x8b978f);part(.41,height/2,0,.18,height,.96,0x8b978f);
    part(0,.09,0,.64,.18,.96,0xaab0a0);part(0,height-.09,0,.64,.18,.96,0xaab0a0);
    part(0,height/2,0,.64,Math.max(.1,height-.36),open?.09:.7,open?0x526663:0x8c988f);
    for(const sign of [-1,1])for(let i=1;i<=4;i++)part(0,.15+(height-.3)*i/5,sign*.48,.66,.045,.045,0xbac1ad);
  }
  return out;
}
