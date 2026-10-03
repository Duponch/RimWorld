import { animalParts } from './animal-shape';
import type { BodyPartId } from '../sim/body-definition';
import type { CorpseState } from '../sim/corpses';
import { corpsePartAbsent } from '../sim/corpse-anatomy';
import type { HarePart } from './hare-shape';
import type { Placement } from './primitives';

export type CorpseStage='fresh'|'rotting'|'desiccated';
const colors:Record<CorpseStage,number>={fresh:0xadaaa4,rotting:0x646b4f,desiccated:0xa89a81};
/** At most 23 exact bits fit in a float32 cargo word. Anatomical absence is
 * derived at snapshot adoption, never stored or searched during a frame. */
const visualParts:readonly BodyPartId[]=['torso','neck','head','jaw','nose','left-eye','right-eye','left-ear','right-ear','tail',
  'left-front-leg','right-front-leg','left-rear-leg','right-rear-leg',
  'left-front-paw','right-front-paw','left-rear-paw','right-rear-paw',
  'left-front-hoof','right-front-hoof','left-rear-hoof','right-rear-hoof','hump'];
export const corpseVisualMask=(corpse:CorpseState):number=>visualParts.reduce((mask,part,index)=>mask+(corpsePartAbsent(corpse,part)?2**index:0),0);
export const corpseVisualPartBit=(part:BodyPartId):number=>{const index=visualParts.indexOf(part);return index<0?0:2**index;};
/** Hare limb boxes previously included the foot; split only their corpse proxy
 * so consuming a paw is visible without changing the living rig or its gait. */
function corpseProxyParts(species:string):readonly HarePart[] {
  const source=animalParts(species);
  if(species!=='hare'&&species!=='snow-hare')return source;
  return source.flatMap(p=>{
    if(!p.bodyPart?.endsWith('-leg'))return [p];
    const footHeight=p.size[1]*.30,bottom=p.center[1]-p.size[1]/2;
    const upper:HarePart={...p,size:[p.size[0],p.size[1]-footHeight,p.size[2]],center:[p.center[0],p.center[1]+footHeight/2,p.center[2]]};
    const foot:HarePart={...p,size:[p.size[0],footHeight,p.size[2]],center:[p.center[0],bottom+footHeight/2,p.center[2]],bodyPart:p.bodyPart.replace('-leg','-paw') as BodyPartId};
    return [upper,foot];
  });
}
export interface CorpsePlacement extends Placement {corpsePartMask:number}

/** The same flattened pose as WildlifeLayer's dead rig, in existing box batches. */
export function corpseParts(x:number,z:number,stage:CorpseStage='fresh',yaw=0,species='hare',corpse?:CorpseState):CorpsePlacement[] {
  const c=Math.cos(yaw),s=Math.sin(yaw);
  return corpseProxyParts(species).filter(p=>!corpse||!corpsePartAbsent(corpse,p.bodyPart??'torso')).map(p=>({
    x:x+p.center[0]*c+p.center[2]*s,y:p.center[1]*.5,z:z+p.center[2]*c-p.center[0]*s,
    sx:p.size[0],sy:p.size[1]*.5,sz:p.size[2],ry:yaw,color:colors[stage],corpsePartMask:corpseVisualPartBit(p.bodyPart??'torso')}));
}
