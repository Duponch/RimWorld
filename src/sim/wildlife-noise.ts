import { impactSoundSpace } from './impact-sound.ts';
import { animalBody,scareAnimal } from './wildlife-health.ts';
import { wildlifeRandom } from './wildlife-state.ts';
import type { Cell,World } from './types.ts';

/** Projectile impacts, not muzzle sounds. Same audibility geometry as people;
 * independent saved wildlife stream for the reference 40% panic chance. */
export function animalImpactNoise(w:World,point:Cell,launcherKey:string|null,core:number):boolean {
  const s=w.wildlife;if(w.schemaVersion<77||!s?.animals.length)return false;
  const launcher=w.pawns.find(p=>`pawn:${p.id}`===launcherKey);if(!launcher)return false;
  let sound:ReturnType<typeof impactSoundSpace>|undefined,changed=false;
  for(const a of s.animals){
    if(a.state==='dead'||a.state==='downed')continue;
    const d=(a.x-point.x)**2+(a.z-point.z)**2;if(d>=144)continue;
    const hearing=Math.min(1,animalBody(a).capacities.hearing);
    if(!hearing||d>=(12*hearing)**2||!(sound??=impactSoundSpace(w))(point,a))continue;
    a.sleepUntilCore=Math.max(a.sleepUntilCore??0,core+1000);
    if(a.state==='sleeping'){a.state='idle';a.nextDecision=w.tick;changed=true;}
    if(wildlifeRandom(s)<.4){scareAnimal(w,a,launcher,core);changed=true;}
  }
  return changed;
}
