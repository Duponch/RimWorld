import type {Pawn} from './types.ts';
/** Domain-specific permutation: every current group member is humanlike.
 * Installed Mono Sort uses median partition above16, with strictly-greater
 * swaps/strictly-less insertion. Equal human keys therefore need only the
 * deterministic partition swaps below; small partitions preserve order.
 * This is an original all-equal-key derivation, not a generic sorting library. */
export function groupHumanNeedOrder256(members:readonly Pawn[]):Pawn[] {
 const ordered=[...members],pending:[number,number][]=[[0,ordered.length-1]];
 const exchange=(i:number,j:number)=>{if(i!==j){const saved=ordered[i]!;ordered[i]=ordered[j]!;ordered[j]=saved;}};
 while(pending.length){const [first,last]=pending.pop()!;if(last-first+1<=16)continue;
  // Median comparisons of three humanlike keys are ties: no conditional swap.
  exchange(first+Math.floor((last-first)/2),last-1);
  let left=first+1,right=last-2;
  while(left<right){exchange(left,right);left++;right--;}
  exchange(left,last-1);
  // Equal-key partitions are balanced, so the native depth fallback cannot
  // occur. Disjoint partition processing order cannot affect the permutation.
  pending.push([first,left-1],[left+1,last]);
 }
 return ordered.reverse();
}
