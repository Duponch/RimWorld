import { groundFire } from './fire-rules.ts';
import type { NavigationCostLookup } from './navigation-costs.ts';
import type { World } from './types.ts';
/** Nine sparse entries per ground flame, captured for one synchronous search.
 * Core costs are divided by 30 (human base 3 local =30 Core), then x1000. */
export function fireNavigationCosts(w:World):ReadonlyMap<number,number> {
  const costs=new Map<number,number>();if(w.schemaVersion<87)return costs;
  for(const f of w.fires?.items??[])if(groundFire(f))for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
    const x=f.x+dx,z=f.z+dz;if(x<0||z<0||x>=w.width||z>=w.height)continue;
    const i=z*w.width+x,core=dx===0&&dz===0?1000:150;costs.set(i,(costs.get(i)??0)+core);
  }
  for(const [i,core] of costs)costs.set(i,Math.round(core/30*1000));return costs;
}
/** Always additive, including consecutive repeatable furniture cells. */
export function addFireNavigationCosts(base:NavigationCostLookup|undefined,fire:ReadonlyMap<number,number>):NavigationCostLookup|undefined {
  if(!fire.size)return base;
  let maximum=0;for(const value of fire.values())maximum=Math.max(maximum,value);
  return {maximum:(base?.maximum??0)+maximum,has:i=>fire.has(i)||!!base?.has(i),get(i){const a=base?.get(i),b=fire.get(i);return a===undefined&&b===undefined?undefined:(a??0)+(b??0);}};
}
