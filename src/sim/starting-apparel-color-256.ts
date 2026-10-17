import type {WorldGenerationRandom} from './world-generation-random.ts';
export interface StartingApparelColor256 {r:number;g:number;b:number}
/** Presentation only: the exact Float32 state above stays saved. The existing
 * resident equipment scalar carries a15bit pigment interpretation, not a
 * new instance buffer and not a claim of Core texture/pixel equivalence. */
export function packStartingApparelTint256(color:StartingApparelColor256):number {
 const q=(v:number)=>Math.max(0,Math.min(31,Math.round(v*31)));return 1+q(color.r)*1024+q(color.g)*32+q(color.b);
}
export function startingApparelTintHex256(color:StartingApparelColor256):number {
 const q=(v:number)=>{const linear=Math.max(0,Math.min(31,Math.round(v*31)))/31,srgb=linear<=.0031308?linear*12.92:1.055*linear**(1/2.4)-.055;return Math.max(0,Math.min(255,Math.round(srgb*255)));};return q(color.r)*65536+q(color.g)*256+q(color.b);
}
const f=Math.fround;
/** Actual MakeThing/CompColorable.Initialize numeric outcome. Plasteel does
 * not allow this generator, even though the helmet Def has color options. */
export function drawStartingApparelColor256(item:string,random:Pick<WorldGenerationRandom,'value'|'float'>):StartingApparelColor256|undefined {
 if(item!=='flak-pants'&&item!=='flak-vest')return;
 const weights=item==='flak-pants'?[1,1]:[1,1,.5],total=item==='flak-pants'?2:2.5;
 let remaining=f(random.value()*f(total)),selected=weights.length-1;
 for(let i=0;i<weights.length;i++){remaining=f(remaining-f(weights[i]!));if(remaining<=0){selected=i;break;}}
 if(item==='flak-vest'&&selected===2)return {r:random.float(.3,.5),g:random.float(.3,.5),b:random.float(.3,.5)};
 const shade=f(item==='flak-pants'?(selected===0?.44:.62):(selected===0?.33:.65));return {r:shade,g:shade,b:shade};
}
/** Own undefined/accessors are rejected. Absent historical colors are never
 * inferred or installed from a current definition or a purported seed. */
export function validStartingApparelColor256(apparel:unknown,item:unknown,version:number):boolean {
 if(!apparel||typeof apparel!=='object')return false;const d=Object.getOwnPropertyDescriptor(apparel,'birthColor');if(!d)return !('birthColor'in apparel);
 if(version!==256||!d.enumerable||!Object.hasOwn(d,'value')||!d.value||typeof d.value!=='object'||Object.getPrototypeOf(d.value)!==Object.prototype||Reflect.ownKeys(d.value).length!==3)return false;
 const c=d.value,values:number[]=[];for(const key of ['r','g','b']){const a=Object.getOwnPropertyDescriptor(c,key);if(!a?.enumerable||!Object.hasOwn(a,'value')||typeof a.value!=='number'||!Number.isFinite(a.value)||f(a.value)!==a.value||Object.is(a.value,-0))return false;values.push(a.value);}
 const gray=(n:number)=>values.every(v=>v===f(n));
 return item==='flak-pants'?(gray(.44)||gray(.62)):item==='flak-vest'&&(gray(.33)||gray(.65)||values.every(v=>v>=f(.3)&&v<=f(.5)));
}
