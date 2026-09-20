import { ensureFireState,fireRandom } from './fire-rules.ts';
import { extinguishFire } from './fire.ts';
import type { Cell,World } from './types.ts';
import type { WildAnimal } from './wildlife-state.ts';
export interface BurningAnimalContext {free(c:Cell):boolean;route(goals:Cell[]):Cell[]|null|undefined;move():void}
/** Uses the wildlife caller's shared search budget and ordinary captured edges. */
export function processBurningAnimal(w:World,a:WildAnimal,context:BurningAnimalContext):boolean {
  const fire=w.fires?.items.find(f=>f.attachedAnimalId===a.id);if(!fire){delete a.burning;return false;}
  if(a.state==='dead'||a.state==='downed'||a.motion&&a.motion.end>w.tick)return true;
  const reaction=a.burning??={phase:'panic',remainingCore:0};
  if(reaction.phase==='extinguish'){
    a.path=[];a.state='idle';reaction.remainingCore=Math.max(0,reaction.remainingCore-10);
    if(!reaction.remainingCore)extinguishFire(w,fire.id,1000);return true;
  }
  if(a.path.length){context.move();return true;}
  if(reaction.remainingCore>0){reaction.remainingCore=Math.max(0,reaction.remainingCore-10);a.state='idle';return true;}
  const state=ensureFireState(w);if(fireRandom(state)<.1){reaction.phase='extinguish';reaction.remainingCore=150;delete reaction.target;a.state='idle';return true;}
  const angle=fireRandom(state)*Math.PI*2,radius=1+Math.floor(fireRandom(state)*7),goal={x:a.x+Math.round(Math.cos(angle)*radius),z:a.z+Math.round(Math.sin(angle)*radius)};
  reaction.remainingCore=5+Math.floor(fireRandom(state)*6);
  if(!context.free(goal)){a.state='idle';return true;}
  const path=context.route([goal]);if(path===null)return true;
  if(path?.length){a.path=path;reaction.target=goal;context.move();}else a.state='idle';return true;
}
