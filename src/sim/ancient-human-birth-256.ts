/** Original Core-only AncientSoldier birth mathematics. This is a transient
 * construction receipt, NOT a Pawn, MedicalRecord or persistent owner. */
import {WorldGenerationRandom} from './world-generation-random.ts';
import {drawActualHumanGender256} from './actual-human-gender-256.ts';
export type AncientHumanBirthRandom256=Pick<WorldGenerationRandom,'value'|'float'|'integer'>;
const f=Math.fround;
type Point=readonly [number,number];
// Human race's own Core curve. Do not substitute the animal relative curve or
// Biotech child points; HumanlikeTeenager has the default Adult development.
const AGE:readonly Point[]=[[14,0],[16,100],[50,100],[60,30],[70,18],[80,10],[90,3],[100,0]];
const HEADS=['AverageNormal','AveragePointy','AverageWide','NarrowNormal','NarrowPointy','NarrowWide'] as const;
function drawHumanYears(random:AncientHumanBirthRandom256):number {
 const parts=AGE.slice(1).map((b,i)=>{const a=AGE[i]!,dx=f(f(b[0])-f(a[0])),height=f(f(a[1])+f(b[1]));return {a,b,dx,height,weight:f(dx*height)};});
 let total=0;for(const p of parts)total=f(total+p.weight);
 let roll=random.float(0,total);
 for(const p of parts){if(p.weight<roll){roll=f(roll-p.weight);continue;}
  const distance=f(roll/p.height),ratio=f(distance/p.dx),t=Math.max(0,Math.min(1,ratio)),height=f(f(p.a[1])+f(f(f(p.b[1])-f(p.a[1]))*t));
  return f(f(p.a[0])+(random.float(0,f(p.height/2))>height?f(p.dx-distance):distance));
 }throw Error('Actual Human age curve exhausted');
}
/** Head source is an IEnumerable Where, hence weighted reservoir, not an
 * IList index draw. Its private ThingID seed never advances the caller. */
export function drawActualAncientHumanHead256(thingId:number,gender:'Male'|'Female'):string {
 if(!Number.isInteger(thingId)||thingId<1||thingId>2147483647)throw Error('Actual Human ThingID required');
 const privateRandom=new WorldGenerationRandom(thingId);let chosen=0,total=1;
 for(let i=1;i<HEADS.length;i++){const next=f(total+1);if(privateRandom.float(0,next)>=total)chosen=i;total=next;}
 return `${gender}_${HEADS[chosen]}`;
}
export interface AncientHumanBirthReceipt256 {
 readonly thingId:number;readonly gender:'Male'|'Female';readonly biologicalCore:number;
 readonly chronologicalCore:number;readonly birthAbsCore:number;readonly headDef:string;
 readonly healthScale:number;readonly bodySize:number;readonly foodCapacity:number;
 readonly needs:Readonly<{mood:number;foodPercentage:number;rest:number}>;
 readonly bioBranch:'solid-bio'|'shuffled-bio';
}
/** Called AFTER actual MakeThing/CreateInitialComponents on this fresh lane.
 * CertainlyBeenInCryptosleep short-circuits its preliminary chance, but not
 * the subsequent chronology range, ResetAgeReversalDemand or post-age needs. */
export function drawActualAncientHumanBirth256(thingId:number,absoluteCore:number,random:AncientHumanBirthRandom256):AncientHumanBirthReceipt256 {
 if(!Number.isInteger(thingId)||thingId<1||thingId>2147483647||!Number.isSafeInteger(absoluteCore)||absoluteCore<0)throw Error('Actual Human identity/absolute clock required');
 // Food.SetInitialLevel=.8 and Mood=.5 draw nothing. Need's virtual base ctor
 // and AddNeed's explicit initializer EACH draw Rest, in that order.
 random.float(.9,1);random.float(.9,1);
 const gender=drawActualHumanGender256({requestFixedGender:null,kindFixedGender:null,raceHasGenders:true,raceForceGender:'None'},random);
 if(gender==='None')throw Error('Actual gendered Human birth cannot be None without an override');
 const years=drawHumanYears(random),biologicalCore=Math.trunc(f(years*3600000));
 // The curve's whole range is permitted by this request: 14..100, including
 // Teenager13..18 (Adult development, .9 health/.8 body/1.25 food capacity).
 const branch=random.value(),ageYears=Math.floor(biologicalCore/3600000),year=5500+Math.floor(f(f(absoluteCore)/f(3600000)));
 const cryptosleepYears=branch<f(.7)?random.integer(0,100):branch<f(.95)?random.integer(100,1000):random.integer(1000,year-2026-ageYears);
 const chronologicalCore=biologicalCore+cryptosleepYears*3600000,birthAbsCore=absoluteCore-chronologicalCore;
 if(!Number.isSafeInteger(chronologicalCore)||!Number.isSafeInteger(birthAbsCore))throw Error('Actual Human chronology exceeds safe precision');
 random.integer(20,41); // AgeReversalReason.Initial, even with Core alone.
 const rest=random.float(.9,1),headDef=drawActualAncientHumanHead256(thingId,gender);
 const bioBranch=random.value()<f(.25)?'solid-bio':'shuffled-bio';
 const teenager=years<f(18);
 return Object.freeze({thingId,gender,biologicalCore,chronologicalCore,birthAbsCore,headDef,healthScale:teenager?f(.9):1,bodySize:teenager?f(.8):1,foodCapacity:teenager?f(1.25):1,needs:Object.freeze({mood:f(.5),foodPercentage:f(.8),rest}),bioBranch});
}
