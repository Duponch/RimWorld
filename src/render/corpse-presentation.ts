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
export const corpseVisualMask=(corpse:CorpseState):number=>visualParts.reduce((mask,part,index)=>mask+(corpsePartAbsent(corpse,part)?2**index:0),0);
export const corpseVisualPartBit=(part:BodyPartId):number=>{const index=visualParts.indexOf(part);return index<0?0:2**index;};
