import {animalCore256} from './animal-core-v256.ts';
import type {AnimalSpeciesId256} from './animal-core-data-v256.ts';
const draw=(random:()=>number)=>{const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw Error('Invalid litter draw.');return Math.fround(n);};
const even=(x:number)=>{const floor=Math.floor(x),f=x-floor;return f<.5?floor:f>.5?floor+1:floor%2===0?floor:floor+1;};
/** Piecewise-linear density sampled by area and reflection. Exactly two
 * draws for a real curve, zero for the default singleton; no reroll on block. */
export function drawAnimalLitter256(species:AnimalSpeciesId256,random:()=>number):number {
 const curve=animalCore256(species).race.litterSizeCurve;
 if(!curve.length)return 1;
 const weights:number[]=[];let total=0;
 for(let i=1;i<curve.length;i++){const a=curve[i-1]!,b=curve[i]!,weight=Math.fround(Math.fround(b[0]-a[0])*Math.fround(a[1]+b[1]));weights.push(weight);total=Math.fround(total+weight);}
 if(!(total>0))throw Error('Invalid litter probability curve.');
 let area=Math.fround(draw(random)*total),index=0;
 while(index<weights.length-1&&area>=weights[index]!){area=Math.fround(area-weights[index]!);index++;}
 const a=curve[index]!,b=curve[index+1]!,width=Math.fround(b[0]-a[0]),heightSum=Math.fround(a[1]+b[1]);
 let offset=Math.fround(area/heightSum);
 const height=Math.fround(a[1]+Math.fround(Math.fround(b[1]-a[1])*Math.fround(offset/width)));
 if(Math.fround(draw(random)*Math.fround(heightSum*.5))>height)offset=Math.fround(width-offset);
 return Math.max(1,even(Math.fround(a[0]+offset)));
}
