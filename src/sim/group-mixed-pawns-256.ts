import type {AwayGroup} from './group-capture.ts';
import type {CaravanPhysicalPawn256} from './group-animal-state-256.ts';
/** IDs are references into exactly one human or animal owner array. */
export function groupPhysicalPawns256(g:AwayGroup):CaravanPhysicalPawn256[] {
 if(!g.animalOwners)return [...g.members];const all=new Map([...g.members,...g.animalOwners.members].map(p=>[p.id,p]));
 if(all.size!==g.members.length+g.animalOwners.members.length||g.animalOwners.order.length!==all.size||new Set(g.animalOwners.order).size!==all.size)throw Error('Invalid mixed caravan roster');
 return g.animalOwners.order.map(id=>{const p=all.get(id);if(!p)throw Error('Unknown mixed caravan member');return p;});
}
/** Installed Mono boolean-key Sort followed by reverse; 2/3-element partitions
 * use the native strict swap pattern. No invented ID tie-break or RNG. */
export function groupMixedNeedOrder256(g:AwayGroup):CaravanPhysicalPawn256[] {
 const a=groupPhysicalPawns256(g),key=(p:CaravanPhysicalPawn256)=>'species'in p?0:1;
 const swap=(i:number,j:number)=>{if(i!==j){const v=a[i]!;a[i]=a[j]!;a[j]=v;}},greater=(i:number,j:number)=>{if(key(a[i]!)>key(a[j]!))swap(i,j);};
 const pending:[number,number][]=[[0,a.length-1]];while(pending.length){const [lo,hi]=pending.pop()!,size=hi-lo+1;if(size<2)continue;if(size===2){greater(lo,hi);continue;}if(size===3){greater(lo,hi-1);greater(lo,hi);greater(hi-1,hi);continue;}
  if(size<=16){for(let i=lo;i<hi;i++){const v=a[i+1]!;let j=i;while(j>=lo&&key(v)<key(a[j]!)){a[j+1]=a[j]!;j--;}a[j+1]=v;}continue;}
  const mid=lo+Math.floor((hi-lo)/2);greater(lo,mid);greater(lo,hi);greater(mid,hi);const pivot=key(a[mid]!);swap(mid,hi-1);let left=lo,right=hi-1;
  for(;;){while(key(a[++left]!)<pivot){}while(pivot<key(a[--right]!)){}if(left>=right)break;swap(left,right);}swap(left,hi-1);pending.push([lo,left-1],[left+1,hi]);
 }return a.reverse();
}
