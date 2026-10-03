import type { BodyPartId } from '../sim/body-definition';
type Vector3Tuple = [number,number,number];
export interface HarePart {size:Vector3Tuple;center:Vector3Tuple;bone:number;pivot:Vector3Tuple;color:number;
  /** Top/bottom width and depth factors; no subdivision or new vertex stream. */
  taper?:readonly [topX:number,bottomX:number,topZ:number,bottomZ:number];
  /** The living rig replaces these overlapping boxes with one outer shell. */
  core?:boolean;
  /** Medical part represented by this corpse proxy, independent of gait bone. */
  bodyPart?:BodyPartId}

/** Box proxies for corpses; the living rig keeps their articulated details. */
export const HARE_PARTS:readonly HarePart[]=(()=>{
  const parts:HarePart[]=[];
  const part=(size:Vector3Tuple,center:Vector3Tuple,bone:number,pivot:Vector3Tuple,color:number,taper?:HarePart['taper'],core=false,bodyPart:BodyPartId='torso')=>parts.push({size,center,bone,pivot,color,taper,core,bodyPart});
  part([.34,.32,.50],[0,.26,-.05],0,[0,0,0],0xa49c80,[.91,.99,.92,.96],true);
  part([.25,.25,.28],[0,.41,.225],3,[0,.33,.13],0xb6aa8c,[.89,1.08,.92,1.03],true,'head');
  part([.16,.12,.17],[0,.36,.4],3,[0,.33,.13],0xd3c6a5,undefined,true,'jaw');
  part([.14,.14,.15],[0,.28,-.34],0,[0,0,0],0xdad0b6,undefined,false,'tail');
  for(const side of [-1,1]) {
    const anatomicalSide=side<0?'left':'right';
    part([.07,.31,.065],[side*.075,.68,.22],3,[0,.33,.13],0xb1a083,undefined,false,`${anatomicalSide}-ear`);
    part([.034,.21,.012],[side*.075,.69,.26],3,[0,.33,.13],0xc19583,undefined,false,`${anatomicalSide}-ear`);
    part([.019,.035,.04],[side*.126,.455,.30],3,[0,.33,.13],0x302d29,undefined,false,`${anatomicalSide}-eye`);
    part([.115,.18,.24],[side*.145,.09,-.16],1,[0,.16,-.13],0x91896f,[1.12,.83,1.05,.89],false,`${anatomicalSide}-rear-leg`);
    part([.075,.24,.11],[side*.102,.12,.17],2,[0,.21,.13],0xa79c81,[1.10,.82,1.02,.92],false,`${anatomicalSide}-front-leg`);
  }
  return parts;
})();
