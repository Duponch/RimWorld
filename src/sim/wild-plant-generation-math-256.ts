import {WorldGenerationRandom} from './world-generation-random.ts';
const f=Math.fround;
export const clampPlant256=(x:number):number=>Math.min(1,Math.max(0,x));
export const lerpPlant256=(a:number,b:number,t:number):number=>f(a+f(f(b-a)*clampPlant256(t)));
export function remapPlant256(a:number,b:number,c:number,d:number,x:number):number {
 return lerpPlant256(c,d,f(f(x-a)/f(b-a)));
}
export function globalPlantBias256(x:number):number {
 if(Number.isNaN(x))return NaN;
 const points=[[0,3],[1,1],[1.5,.25],[3,.02]] as const;
 if(x<=0)return 3;if(x>=3)return f(.02);
 for(let i=1;i<points.length;i++){const a=points[i-1]!,b=points[i]!;if(x<=b[0])return remapPlant256(a[0],b[0],a[1],b[1],x);}
 return NaN;
}
/** The independently seeded MapCellsInRandomOrder stream. The final swap is
 * inclusive [0,n], and never consumes the generation-step stream. */
export function plantCellOrder256(size:number,worldSeed:number,tileHash:number):{cells:Uint32Array;state:Readonly<{seed:number;counter:number}>} {
 if(!Number.isSafeInteger(size)||size<1||size>160000||![worldSeed,tileHash].every(n=>Number.isInteger(n)&&n>=-2147483648&&n<=4294967295))throw Error('Invalid plant cell-order input');
 const random=new WorldGenerationRandom((worldSeed^tileHash)|0),cells=Uint32Array.from({length:size},(_,i)=>i);
 for(let end=size-1;end>0;end--){const other=random.integer(0,end+1),value=cells[end]!;cells[end]=cells[other]!;cells[other]=value;}
 return {cells,state:random.state};
}
/** IList weighted choice has a specific NaN fallback when there are no plants
 * yet (0/0 global ratio). Preserve its N draws/first-entry result; do not turn
 * this into a fictitious ratio or redraw with reweighted living species. */
export function chooseInitialPlant256(weights:readonly number[],random:{value():number}):number|undefined {
 let total=0;for(const weight of weights){if(weight<0)throw Error('Negative plant choice weight');total=f(total+weight);}
 if(weights.length===1&&total>0)return 0;if(total===0||!weights.length)return;
 if(Number.isNaN(total)){for(let i=0;i<weights.length;i++)random.value();return 0;}
 let remaining=f(random.value()*total);
 for(let i=0;i<weights.length;i++)if(weights[i]!>0){remaining=f(remaining-weights[i]!);if(remaining<=0)return i;}
 // Only a floating-point fall-through reaches the source reservoir fallback.
 let selected=0,running=weights[0]!;
 for(let i=1;i<weights.length;i++){running=f(running+weights[i]!);if(f(random.value()*running)>=f(running-weights[i]!))selected=i;}
 return selected;
}
