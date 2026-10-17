import {nativeAnimalAnatomy256} from '../sim/native-animal-anatomy-256';
import {CORE_ANIMAL_BODIES_256} from '../sim/animal-anatomy-data-v256';
import {animalPartId256} from '../sim/animal-anatomy-v256';
import {isAnimalSpecies256} from '../sim/animal-core-v256';
import {animalVisualParts256} from './animal-visual-parts-v256';
import type { BodyPartId } from '../sim/body-definition';
import type { CorpseState } from '../sim/corpses';
import { corpsePartAbsent } from '../sim/corpse-anatomy';

export type CorpseStage='fresh'|'rotting'|'desiccated';
/** At most 23 exact bits fit in a float32 cargo word. Anatomical absence is
 * derived at snapshot adoption, never stored or searched during a frame. */
const visualParts:readonly BodyPartId[]=['torso','neck','head','jaw','nose','left-eye','right-eye','left-ear','right-ear','tail',
  'left-front-leg','right-front-leg','left-rear-leg','right-rear-leg',
  'left-front-paw','right-front-paw','left-rear-paw','right-rear-paw',
  'left-front-hoof','right-front-hoof','left-rear-hoof','right-rear-hoof','hump'];
/** Existing seven graphical meshes retain their stable bit layout. Only a
 * prospective clinical record maps those slots to its native anatomical IDs. */
function nativeOriginalVisualPart256(corpse:CorpseState,part:BodyPartId):BodyPartId {
 if(corpse.health.animalGrowth===undefined||isAnimalSpecies256(corpse.species))return part;
 const match=/^(left|right)-(front|rear)-(leg|paw|hoof)$/.exec(part);if(!match)return part;
 const body=nativeAnimalAnatomy256(corpse.species).body,rows=CORE_ANIMAL_BODIES_256[body],legs=rows.filter(row=>row.defId==='Leg'),index=(match[2]==='rear'?2:0)+(match[1]==='right'?1:0),leg=legs[index];
 if(!leg)throw Error('Missing native quadruped graphical limb');
 const row=match[3]==='leg'?leg:rows.find(row=>row.parent===leg.index&&row.defId===(match[3]==='paw'?'Paw':'Hoof'));
 return row?animalPartId256(body,row.index):part;
}
export const corpseVisualMask=(corpse:CorpseState):number=>(animalVisualParts256(corpse.species)??visualParts).reduce((mask,part,index)=>mask+(corpsePartAbsent(corpse,nativeOriginalVisualPart256(corpse,part))?2**index:0),0);
export const corpseVisualPartBit=(part:BodyPartId,species?:string):number=>{const index=(species?animalVisualParts256(species)??visualParts:visualParts).indexOf(part);return index<0?0:2**index;};
