import {groupPawnInterval256} from './group-core-cadence-256.ts';
import type {Pawn} from './types.ts';
import type {PackedFurniture} from './furniture-rules.ts';
import type {GroupWithTravelPacked256} from './group-caravan-mass-256.ts';
import {bedRestEffectiveness,bedComfort} from './furniture-stats.ts';
import {validBedrollBuilding256} from './bedroll-save-256.ts';
import {groupWouldBenefitFromCarrying256} from './group-caravan-carry-256.ts';
export interface GroupBedUse256 {pack:PackedFurniture;restEffectiveness:number;comfort:number;immunityFactor:1.05;healPerDay:4}
/** This domain sort follows installed Mono median/insertion comparisons; ties
 * above16 retain its swaps, not a made-up stable ID tie break. No game RNG. */
function orderBedrolls(beds:PackedFurniture[],moving:boolean):void {
 const key=(p:PackedFurniture)=>moving?1.05:bedRestEffectiveness(p.building),cmp=(a:PackedFurniture,b:PackedFurniture)=>key(b)-key(a);
 const swap=(i:number,j:number)=>{const p=beds[i]!;beds[i]=beds[j]!;beds[j]=p;};
 const swapGreater=(i:number,j:number)=>{if(i!==j&&cmp(beds[i]!,beds[j]!)>0)swap(i,j);};
 function insertion(lo:number,hi:number){for(let i=lo;i<hi;i++){const p=beds[i+1]!;let j=i;while(j>=lo&&cmp(p,beds[j]!)<0){beds[j+1]=beds[j]!;j--;}beds[j+1]=p;}}
 function downHeap(i:number,n:number,lo:number){const p=beds[lo+i-1]!;while(i<=Math.floor(n/2)){let child=2*i;if(child<n&&cmp(beds[lo+child-1]!,beds[lo+child]!)<0)child++;if(cmp(p,beds[lo+child-1]!)>=0)break;beds[lo+i-1]=beds[lo+child-1]!;i=child;}beds[lo+i-1]=p;}
 function heap(lo:number,hi:number){const n=hi-lo+1;for(let i=Math.floor(n/2);i>=1;i--)downHeap(i,n,lo);for(let i=n;i>1;i--){swap(lo,lo+i-1);downHeap(1,i-1,lo);}}
 function sort(lo:number,hi:number,depth:number){while(hi>lo){const size=hi-lo+1;if(size<=16){if(size===2)swapGreater(lo,hi);else if(size===3){swapGreater(lo,hi-1);swapGreater(lo,hi);swapGreater(hi-1,hi);}else insertion(lo,hi);return;}if(depth===0){heap(lo,hi);return;}depth--;
  const middle=lo+Math.floor((hi-lo)/2);swapGreater(lo,middle);swapGreater(lo,hi);swapGreater(middle,hi);const pivot=beds[middle]!;swap(middle,hi-1);let left=lo,right=hi-1;
  for(;;){do left++;while(cmp(beds[left]!,pivot)<0);do right--;while(cmp(pivot,beds[right]!)<0);if(left>=right)break;swap(left,right);}swap(left,hi-1);sort(left+1,hi,depth);hi=left-1;
 }}
 if(beds.length>1)sort(0,beds.length-1,2*(Math.floor(Math.log2(beds.length))+1));
}
/** Rebuilt from actual minified originals on spawn/load/removal and each
 * caravan interval. Bed ownership is a derived service, never a second Thing. */
export function recalculateGroupBeds256(g:GroupWithTravelPacked256,moving:boolean,carried:ReadonlySet<number>):ReadonlyMap<number,GroupBedUse256> {
 const memberIds=new Set([...g.members,...g.animalOwners?.members??[]].map(p=>p.id)),available:PackedFurniture[]=[];
 for(const pack of g.packed??[]){if(pack.building.kind!=='bedroll')continue;if(!validBedrollBuilding256(pack.building,256)||pack.owner.type!=='inventory'||!memberIds.has(pack.owner.pawnId))throw Error('Invalid actual caravan bedroll');available.push(pack);}
 orderBedrolls(available,moving);const result=new Map<number,GroupBedUse256>();
 for(const p of g.members){if(p.state==='dead'||p.health?.death||moving&&(!carried.has(p.id)||!groupWouldBenefitFromCarrying256(p)))continue;const pack=available.shift();if(!pack)break;
  result.set(p.id,{pack,restEffectiveness:bedRestEffectiveness(pack.building),comfort:bedComfort(pack.building),immunityFactor:1.05,healPerDay:4});}
 return result;
}
/** Need_Comfort marks are runtime-only, as in the primary. Bed assignment
 * itself never grants comfort immediately or scales a meter by caravan delta. */
export class GroupComfortMarks256 {
 private readonly marks=new Map<number,{at:number;ceiling:number}>();
 clear():void {this.marks.clear();}
 remove(id:number):void {this.marks.delete(id);}
 used(p:Pawn,bed:GroupBedUse256,coreTick:number,deltaCore:number):void {
  if(!groupPawnInterval256(p.id,coreTick,15,deltaCore))return;
  this.marks.set(p.id,{at:coreTick,ceiling:Math.max(0,Math.min(1,bed.comfort))});
 }
 /** Call alongside the existing pawn needs150 pass, before caravan interval. */
 needAt(p:Pawn,coreTick:number):void {
  if(p.state==='dead'||p.health?.death||!groupPawnInterval256(p.id,coreTick,150,1))return;
  const f=Math.fround,mark=this.marks.get(p.id),target=mark&&mark.at>=coreTick-15?f(mark.ceiling):0;let level=f(p.comfort/100);
  if(target>level)level=Math.min(f(level+f(f(.6)*f(.06))),target);
  if(target<level)level=Math.max(f(level-f(f(.04)*f(.06))),target);
  p.comfort=Math.max(0,Math.min(100,f(level*100)));
 }
}
