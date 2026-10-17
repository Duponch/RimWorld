/** Original integer-offset construction. Installed Mono's unstable distance
 * ordering is part of the cave contract, including ties; no stable JS sort or
 * copied coordinate asset is used. This table is built once, without RNG. */
export type CaveRadialOffset256=readonly [x:number,z:number,radius:number];
let pattern:readonly CaveRadialOffset256[]|undefined;
function build():readonly CaveRadialOffset256[] {
 const ids=Array.from({length:25600},(_,i)=>i),distance=(id:number)=>{const x=Math.floor(id/160)-80,z=id%160-80;return x*x+z*z;};
 const cmp=(a:number,b:number)=>distance(a)-distance(b),swap=(i:number,j:number)=>{const a=ids[i]!;ids[i]=ids[j]!;ids[j]=a;};
 const exchangeIfGreater=(i:number,j:number)=>{if(i!==j&&cmp(ids[i]!,ids[j]!)>0)swap(i,j);};
 function insertion(lo:number,hi:number){for(let i=lo;i<hi;i++){const v=ids[i+1]!;let j=i;while(j>=lo&&cmp(v,ids[j]!)<0){ids[j+1]=ids[j]!;j--;}ids[j+1]=v;}}
 function sift(i:number,n:number,lo:number){const v=ids[lo+i-1]!;while(i<=Math.floor(n/2)){let child=i*2;if(child<n&&cmp(ids[lo+child-1]!,ids[lo+child]!)<0)child++;if(cmp(v,ids[lo+child-1]!)>=0)break;ids[lo+i-1]=ids[lo+child-1]!;i=child;}ids[lo+i-1]=v;}
 function heap(lo:number,hi:number){const n=hi-lo+1;for(let i=Math.floor(n/2);i>=1;i--)sift(i,n,lo);for(let i=n;i>1;i--){swap(lo,lo+i-1);sift(1,i-1,lo);}}
 function partitionSort(lo:number,hi:number,depth:number){while(hi>lo){const size=hi-lo+1;if(size<=16){if(size===2)exchangeIfGreater(lo,hi);else if(size===3){exchangeIfGreater(lo,hi-1);exchangeIfGreater(lo,hi);exchangeIfGreater(hi-1,hi);}else insertion(lo,hi);return;}if(depth--===0){heap(lo,hi);return;}
  const middle=lo+Math.floor((hi-lo)/2);exchangeIfGreater(lo,middle);exchangeIfGreater(lo,hi);exchangeIfGreater(middle,hi);const pivot=ids[middle]!;swap(middle,hi-1);let left=lo,right=hi-1;
  for(;;){do left++;while(cmp(ids[left]!,pivot)<0);do right--;while(cmp(pivot,ids[right]!)<0);if(left>=right)break;swap(left,right);}swap(left,hi-1);partitionSort(left+1,hi,depth);hi=left-1;
 }}
 partitionSort(0,ids.length-1,2*(Math.floor(Math.log2(ids.length))+1));
 return Object.freeze(ids.slice(0,20000).map(id=>Object.freeze([Math.floor(id/160)-80,id%160-80,Math.fround(Math.sqrt(distance(id)))] as const)));
}
/** The count is the prefix whose float radii are <= float(radius+epsilon).
 * It is equivalent to Core's integer lower bound followed by its radius scan. */
export function caveRadialPattern256(radius:number):{readonly count:number;readonly offsets:readonly CaveRadialOffset256[]} {
 if(!Number.isFinite(radius)||radius<0)throw Error('Invalid actual cave radius');const offsets=pattern??=build(),limit=Math.fround(Math.fround(radius)+1.401298464324817e-45);
 let lo=0,hi=offsets.length;while(lo<hi){const mid=lo+Math.floor((hi-lo)/2);if(offsets[mid]![2]<=limit)lo=mid+1;else hi=mid;}return {count:lo,offsets};
}
