/** Specific GenStep_ScatterThings stack subdivision used by Crashlanded875.
 * Same caller-owned875 stream, including balancing draws even when repeated
 * indices do nothing. This never creates held starter stacks: Silver800 is
 * one born Thing until the real GenPlace output, not pre-split here. */
import type {WorldGenerationRandom} from './world-generation-random.ts';
const f=Math.fround;
const round=(x:number)=>{const n=Math.floor(x),p=x-n;return p===.5?n+n%2:Math.round(x);};
export function divideStartingScatterCount256(count:number,stackLimit:number,isMeal:boolean,random:Pick<WorldGenerationRandom,'integer'|'value'>):number[] {
 if(!Number.isSafeInteger(count)||count<0||!Number.isSafeInteger(stackLimit)||stackLimit<1||stackLimit>10000||typeof isMeal!=='boolean')throw Error('Invalid actual starting scatter count/limit');
 const min=isMeal&&stackLimit<=10?1:stackLimit<=5?stackLimit:round(f(f(stackLimit)*f(.5))),max=isMeal&&stackLimit<=10?1:stackLimit;
 const out:number[]=[];let remaining=count;
 while(remaining>0){const value=Math.min(remaining,min===max?min:random.integer(min,max+1));out.push(value);remaining-=value;}
 if(max>2)for(let i=0;i<out.length*4;i++){const a=out.length===1?0:random.integer(0,out.length),b=out.length===1?0:random.integer(0,out.length);if(a!==b&&out[a]!>out[b]!){const moved=Math.trunc(f(f(out[a]!-out[b]!)*random.value()));out[a]!-=moved;out[b]!+=moved;}}
 return out;
}
