/** Dial queue for nonnegative integer costs <= 1414. One resident entry per cell.
 * Unlike a heap, decrease-key and extraction avoid log(N) work on full map floods. */
export class PathFrontier {
  private readonly heads=new Int32Array(1415).fill(-1);
  private readonly next:Int32Array;
  private readonly previous:Int32Array;
  private readonly buckets:Int32Array;
  private count=0;
  private cursor=0;
  private readonly costs:Float64Array;
  constructor(costs:Float64Array) {this.costs=costs;this.next=new Int32Array(costs.length).fill(-1);this.previous=new Int32Array(costs.length).fill(-1);this.buckets=new Int32Array(costs.length).fill(-1);}
  push(node:number):void {
    const old=this.buckets[node]!;
    if(old>=0) {
      const previous=this.previous[node]!,next=this.next[node]!;
      if(previous<0)this.heads[old]=next;else this.next[previous]=next;
      if(next>=0)this.previous[next]=previous;
    } else this.count++;
    const bucket=this.costs[node]!%1415,head=this.heads[bucket]!;
    this.buckets[node]=bucket;this.next[node]=head;this.previous[node]=-1;if(head>=0)this.previous[head]=node;this.heads[bucket]=node;
  }
  pop():number|undefined {
    if(!this.count)return undefined;
    while(this.heads[this.cursor%1415]===-1)this.cursor++;
    const bucket=this.cursor%1415,node=this.heads[bucket]!,next=this.next[node]!;
    this.heads[bucket]=next;if(next>=0)this.previous[next]=-1;this.buckets[node]=-1;this.count--;return node;
  }
}
