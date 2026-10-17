/** Original mathematical implementation of the versioned generation counter
 * stream. Local instances isolate world generation from the gameplay PRNG. */
const rotate=(value:number,bits:number)=>(value<<bits)|(value>>>(32-bits));
export function combineWorldSeed(seed:number,value:number):number {
 return (seed^(value+2654435769+(seed<<6)+(seed>>2)))|0;
}
export function worldCounterHash(seed:number,counter:number):number {
 let value=Math.imul(counter,3432918353);
 value=Math.imul(rotate(value,15),461845907)^seed;
 value=(Math.imul(rotate(value,13),5)+3864292196)|0;
 value^=2834544218;value^=value>>>16;
 value=Math.imul(value,2246822507);value^=value>>>13;
 value=Math.imul(value,3266489909);return (value^(value>>>16))|0;
}
export class WorldGenerationRandom {
 #seed:number;#counter=0;
 constructor(seed:number){if(!Number.isInteger(seed)||seed< -2147483648||seed>4294967295)throw Error('Invalid world random seed');this.#seed=seed>>>0;}
 /** Adopt an ACTUAL captured private generation frontier, without replaying
  * draws or mutating its previous owner. This is not a save migration or a
  * replacement for a missing seed/counter. Existing fresh construction stays0. */
 static fromState(state:Readonly<{seed:number;counter:number}>):WorldGenerationRandom {
  if(!state||!Number.isInteger(state.seed)||state.seed<0||state.seed>4294967295||!Number.isInteger(state.counter)||state.counter<0||state.counter>4294967295)throw Error('Invalid actual world generation frontier');
  const result=new WorldGenerationRandom(state.seed);result.#counter=state.counter;return result;
 }
 get state():Readonly<{seed:number;counter:number}>{return {seed:this.#seed,counter:this.#counter};}
 integerValue():number {const result=worldCounterHash(this.#seed,this.#counter);this.#counter=(this.#counter+1)>>>0;return result;}
 value():number{return Math.fround((this.integerValue()+2147483648)/4294967295);}
 boolean():boolean{return this.value()<.5;}
 integer(min:number,maxExclusive:number):number {
  if(!Number.isInteger(min)||!Number.isInteger(maxExclusive)||min< -2147483648||maxExclusive>2147483647)throw Error('Invalid world random range');
  if(maxExclusive<=min)return min;
  const span=maxExclusive-min;if(span>2147483647)throw Error('Excessive world random range');
  return min+Math.abs(this.integerValue()%span);
 }
 float(min:number,max:number):number {
  min=Math.fround(min);max=Math.fround(max);
  if(!Number.isFinite(min)||!Number.isFinite(max))throw Error('Invalid world random float range');
  if(max<=min)return min;
  return Math.fround(Math.fround(this.value()*Math.fround(max-min))+min);
 }
}
