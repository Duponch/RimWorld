/** An ordinary per-adoption membership collection, never
 * a World witness or a persistent validation cache. No native Set subclass. */
export interface NumericMembershipWriter extends ReadonlySet<number> {
  add(value:number):unknown;
}

const MAX_DENSE_CAPACITY=1_048_576;
type NumericIterator=ReturnType<ReadonlySet<number>['values']>;
type NumericEntryIterator=ReturnType<ReadonlySet<number>['entries']>;

/** Dense nonnegative integer slots plus native SameValueZero fallback. The
 * ordered sequence contains every unique value, including sparse values. */
export class NumericMembership implements NumericMembershipWriter {
  readonly [Symbol.toStringTag]='Set';
  private readonly dense:Uint8Array;
  private readonly sparse=new Set<number>();
  private readonly order:number[]=[];

  constructor(denseCapacity=65_536,values?:Iterable<number>){
    if(!Number.isSafeInteger(denseCapacity)||denseCapacity<0||denseCapacity>MAX_DENSE_CAPACITY)
      throw new RangeError('Private dense capacity must be in 0..1048576.');
    this.dense=new Uint8Array(denseCapacity);
    if(values!==undefined)for(const value of values)this.add(value);
  }
  get size():number {return this.order.length;}
  has(value:number):boolean {
    return Number.isInteger(value)&&value>=0&&value<this.dense.length
      ?this.dense[value]===1:this.sparse.has(value);
  }
  add(value:number):this {
    // Native Set normalizes -0 before storage/iteration. NaN and all values
    // outside the bounded dense integer domain use the real native Set.
    const normalized=value===0?0:value;
    if(Number.isInteger(normalized)&&normalized>=0&&normalized<this.dense.length){
      if(this.dense[normalized]===1)return this;
      this.dense[normalized]=1;
    }else{
      if(this.sparse.has(normalized))return this;
      this.sparse.add(normalized);
    }
    this.order.push(normalized);return this;
  }
  *values():NumericIterator {
    // The live length includes additions after iterator creation, exactly as
    // native Set iteration does. This collection exposes no delete/clear.
    for(let index=0;index<this.order.length;index++)yield this.order[index]!;
    return undefined;
  }
  readonly keys=this.values;
  readonly [Symbol.iterator]=this.values;
  *entries():NumericEntryIterator {
    for(const value of this.values())yield [value,value];
    return undefined;
  }
  forEach(callbackfn:(value:number,value2:number,set:ReadonlySet<number>)=>void,thisArg?:unknown):void {
    if(typeof callbackfn!=='function')throw new TypeError('Callback must be callable.');
    for(const value of this.values())Reflect.apply(callbackfn,thisArg,[value,value,this]);
  }
}
