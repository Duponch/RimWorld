import { addActorObstacles } from './combat-navigation.ts';
import { doorCorners } from './door-rules.ts';
import type { Cell, World } from './types.ts';
import type { CandidateAccess } from './navigation-types.ts';
import { WeightedSearch } from './weighted-search.ts';
import { navigationCosts } from './furniture-travel.ts';

/** With solid diagonal corners, a legal diagonal always has a cardinal detour.
 * Four-neighbour connectivity therefore answers existence exactly, without
 * assigning any unweighted route or distance to the simulation. */
export function candidateAccess(world:World,start:Cell,blocked:Uint8Array,occupied:ReadonlySet<number>):CandidateAccess {
  const width=world.width,height=world.height,size=width*height,origin=start.z*width+start.x;
  const unavailable=blocked.slice();for(const index of occupied)unavailable[index]=1;addActorObstacles(world,start,unavailable);
  const {costs,repeaters,stops,floors}=navigationCosts(world);
  const corners=doorCorners(world);
  const connected=new Uint8Array(size),queue=new Int32Array(size);let head=0,tail=1;
  queue[0]=origin;connected[origin]=1;
  const visit=(i:number)=>{if(!unavailable[i]&&!connected[i]){connected[i]=1;queue[tail++]=i;}};
  const has=(target:number)=>{
    if(target<0||target>=size||!Number.isInteger(target))return false;
    if(connected[target])return true;
    if(unavailable[target])return false;
    while(head<tail&&!connected[target]) {
      const index=queue[head++]!,x=index%width;
      if(index>=width)visit(index-width);if(x+1<width)visit(index+1);
      if(index+width<size)visit(index+width);if(x>0)visit(index-1);
    }
    return connected[target]===1;
  };
  let weighted:WeightedSearch|undefined;
  return {
    kind:'candidate-access',start:origin,stops,
    has,
    resolve:goals=>{weighted??=new WeightedSearch(width,height,origin,unavailable,costs,repeaters,floors,corners);weighted.field.stops=stops;return weighted.advance(goals);},
    costTo:index=>index===origin?0:weighted?.field.settled?.[index]?weighted.field.costs[index]!:Infinity,
    get visited(){return weighted?.field.visited??0;},
    get connectivityVisited(){return head;},unreachedGroups:0,
  };
}
