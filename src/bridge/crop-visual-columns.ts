import type {TypedCropVisualDelta} from './natural-appearance-values';

/** Per-publication owned columns. No Resource, World buffer or transferable is
 * borrowed. Growth and IDs remain Float64; ordinals/flags are exact integers. */
export class CropVisualColumnWriter {
 private count=0;private capacity=0;
 private ids=new Float64Array();private ordinals=new Uint32Array();private growth=new Float64Array();private flags=new Uint8Array();
 constructor(private readonly maximum:number){}
 append(id:number,ordinal:number,growth:number,flags:number):void {
  if(this.count>=this.maximum)throw Error('Crop column population exceeded');
  if(this.count===this.capacity){
   const capacity=Math.min(this.maximum,Math.max(16,this.capacity*2));
   const ids=new Float64Array(capacity),ordinals=new Uint32Array(capacity),values=new Float64Array(capacity),bits=new Uint8Array(capacity);
   ids.set(this.ids);ordinals.set(this.ordinals);values.set(this.growth);bits.set(this.flags);
   this.ids=ids;this.ordinals=ordinals;this.growth=values;this.flags=bits;this.capacity=capacity;
  }
  const i=this.count++;this.ids[i]=id;this.ordinals[i]=ordinal;this.growth[i]=growth;this.flags[i]=flags;
 }
 finish(removed:Iterable<number>):TypedCropVisualDelta {
  // slice is mandatory when capacity has slack: receiving a view over a larger
  // buffer would transport stale/outside bytes and fail the closed wire shape.
  const n=this.count;
  return {format:'columns-v1',ids:n===this.capacity?this.ids:this.ids.slice(0,n),ordinals:n===this.capacity?this.ordinals:this.ordinals.slice(0,n),
   growth:n===this.capacity?this.growth:this.growth.slice(0,n),flags:n===this.capacity?this.flags:this.flags.slice(0,n),removed:Float64Array.from(removed)};
 }
}

const typedPrototype=Object.getPrototypeOf(Uint8Array.prototype),tagOf=Object.getOwnPropertyDescriptor(typedPrototype,Symbol.toStringTag)!.get!,lengthOf=Object.getOwnPropertyDescriptor(typedPrototype,'length')!.get!,
 bytesOf=Object.getOwnPropertyDescriptor(typedPrototype,'byteLength')!.get!,offsetOf=Object.getOwnPropertyDescriptor(typedPrototype,'byteOffset')!.get!,bufferOf=Object.getOwnPropertyDescriptor(typedPrototype,'buffer')!.get!,
 bufferBytes=Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,'byteLength')!.get!,resizable=Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,'resizable')?.get;
type Column=Float64Array|Uint32Array|Uint8Array;
function column(value:unknown,prototype:object,maximum:number):value is Column {
 try{
  if(!value||typeof value!=='object'||Object.getPrototypeOf(value)!==prototype
   ||tagOf.call(value)!==(prototype===Float64Array.prototype?'Float64Array':prototype===Uint32Array.prototype?'Uint32Array':'Uint8Array'))return false;
  const length=lengthOf.call(value),bytes=bytesOf.call(value),offset=offsetOf.call(value),buffer=bufferOf.call(value);
  if(!Number.isSafeInteger(length)||length<0||length>maximum||Object.getPrototypeOf(buffer)!==ArrayBuffer.prototype
   ||offset!==0||bytes!==bufferBytes.call(buffer)||resizable?.call(buffer)||Reflect.ownKeys(buffer).length)return false;
  new Uint8Array(buffer,0,0); // Intrinsic detached-buffer refusal, also for length0.
  // One key-count per column rejects named/symbol expandos. Native integer-index
  // semantics forbid index accessors; NO numeric descriptor or row-object scan.
  return Reflect.ownKeys(value).length===length;
 }catch{return false;}
}
/** The receiver checks only six top-level descriptors plus native column
 * shapes. Numerical cells/identity/presence are checked by the existing owner.
 * No source column escapes into a committed frame/page. */
export function readCropVisualColumns(value:unknown,maximum:number,removedMaximum:number):TypedCropVisualDelta|undefined {
 if(!value||typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype)return;
 const keys=Reflect.ownKeys(value),expected=['format','ids','ordinals','growth','flags','removed'];
 if(keys.length!==expected.length||keys.some(key=>typeof key!=='string'||!expected.includes(key)||Object.getOwnPropertyDescriptor(value,key)?.enumerable!==true||!Object.hasOwn(Object.getOwnPropertyDescriptor(value,key)!,'value')))return;
 const raw=value as Record<string,unknown>;
 if(raw.format!=='columns-v1'||!column(raw.ids,Float64Array.prototype,maximum)||!column(raw.ordinals,Uint32Array.prototype,maximum)
  ||!column(raw.growth,Float64Array.prototype,maximum)||!column(raw.flags,Uint8Array.prototype,maximum)||!column(raw.removed,Float64Array.prototype,removedMaximum))return;
 const typed=raw as unknown as TypedCropVisualDelta,n=typed.ids.length;
 if(typed.ordinals.length!==n||typed.growth.length!==n||typed.flags.length!==n)return;
 // Current producer supplies disjoint whole buffers, including empty columns.
 if(new Set([typed.ids.buffer,typed.ordinals.buffer,typed.growth.buffer,typed.flags.buffer,typed.removed.buffer]).size!==5)return;
 return typed;
}
