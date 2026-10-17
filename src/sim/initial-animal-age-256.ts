/** Original float32 mathematics for initial biological age and the actual
 * OrganicStandard selection frontier; no clinical state is manufactured. */
import {drawInitialAnimalBirthdays256} from './animal-birthday-application-256.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
import type {InitialAnimalFact256} from './initial-animal-data-256.ts';
import {drawInitialAnimalScars256} from './initial-animal-scars-256.ts';
import type {MedicalRecord} from './injury-types.ts';
export type InitialAnimalRandom256=Pick<WorldGenerationRandom,'value'|'integer'|'float'>;
type Point=readonly [number,number];
const f=Math.fround;
export const INITIAL_ANIMAL_AGE_CURVE_256:readonly Point[]=[[.05,0],[.1,100],[.675,100],[.75,30],[.875,18],[1,10],[1.125,3],[1.25,0]];
/** Two draws, the same folded trapezoid distribution and segment boundaries.
 * The numeric data and distribution are facts; no Core implementation copied. */
export function drawInitialAnimalAgeFraction256(random:InitialAnimalRandom256):number {
 const parts=INITIAL_ANIMAL_AGE_CURVE_256.slice(1).map((b,i)=>{const a=INITIAL_ANIMAL_AGE_CURVE_256[i]!,dx=f(f(b[0])-f(a[0])),height=f(f(a[1])+f(b[1]));return {a,b,dx,height,weight:f(dx*height)};});
 let total=0;for(const part of parts)total=f(total+part.weight);
 let roll=random.float(0,total);
 for(const part of parts){if(part.weight<roll){roll=f(roll-part.weight);continue;}
  const distance=f(roll/part.height),ratio=f(distance/part.dx),t=Math.max(0,Math.min(1,ratio)),height=f(f(part.a[1])+f(f(f(part.b[1])-f(part.a[1]))*t));
  const folded=random.float(0,f(part.height/2))>height?f(part.dx-distance):distance;
  return f(f(part.a[0])+folded);
 }throw Error('Initial animal age curve has no segment for its roll');
}
export function initialAnimalGrowth256(fact:InitialAnimalFact256,ageCoreTicks:number):number {
 if(!Number.isSafeInteger(ageCoreTicks)||ageCoreTicks<0||!fact.stages.length)throw Error('Invalid generated animal biological age');
 const years=f(f(ageCoreTicks)/3600000),adult=f(fact.stages.at(-1)!.minAgeYears);
 return Math.max(0,Math.min(1,f(years/adult)));
}
export function initialAnimalStage256(fact:InitialAnimalFact256,ageCoreTicks:number):InitialAnimalFact256['stages'][number] {
 if(!Number.isSafeInteger(ageCoreTicks)||ageCoreTicks<0||!fact.stages.length)throw Error('Invalid generated animal biological age');
 const growth=initialAnimalGrowth256(fact,ageCoreTicks),grownYears=f(f(fact.stages.at(-1)!.minAgeYears)*growth),boundary=f(grownYears+f(.000001));let stage=fact.stages[0]!;
 for(const next of fact.stages){if(boundary<f(next.minAgeYears))break;stage=next;}return stage;
}
export function drawInitialAnimalAge256(fact:InitialAnimalFact256,random:InitialAnimalRandom256):{ageCoreTicks:number;ageSamples:number;ageAllowed:boolean} {
 let ageCoreTicks=0,ageSamples=0,allowed=false;
 do {const years=f(drawInitialAnimalAgeFraction256(random)*f(fact.lifeExpectancy));ageCoreTicks=Math.trunc(f(years*3600000));ageSamples++;
  // Every installed animal life-stage is DevelopmentalStage.Adult, including
  // AnimalBaby. The 301st draw is retained even when its age was not allowed.
  const stage=initialAnimalStage256(fact,ageCoreTicks);allowed=years>=fact.minGenerationAge&&years<=fact.maxGenerationAge&&stage.developmentalStage==='Adult';
 }while(!allowed&&ageSamples<=300);
 return {ageCoreTicks,ageSamples,ageAllowed:allowed};
}
const BIRTHDAYS:readonly {defId:string;curve:readonly Point[]}[]=[
 {defId:'Carcinoma',curve:[[.28,0],[1,.0011],[1.5,.0015]]},
 {defId:'BadBack',curve:[[.5,0],[.625,.0093],[.75,.01395],[.875,.01395],[1,.0186]]},
 {defId:'Frail',curve:[[.625,0],[.75,.01395],[.875,.02604]]},
 {defId:'Cataract',curve:[[.6,0],[.75,.0053],[.875,.011045]]},
 {defId:'HearingLoss',curve:[[.6,0],[.75,.0053],[.875,.011045]]},
 {defId:'Dementia',curve:[[.85,0],[.95,.0093],[1.15,.093]]},
 {defId:'Alzheimers',curve:[[.42,0],[.7,.00061],[.9,.0012],[1,.002],[1.5,.003]]},
 {defId:'Asthma',curve:[[0,0],[.2,.00048],[.3,.00096],[.5,.001344]]},
 {defId:'HeartArteryBlockage',curve:[[.25,0],[.3,.001],[.5,.00145],[1,.0016],[1.5,.0017]]},
];
function birthdayChance(points:readonly Point[],x:number):number {
 if(x<=f(points[0]![0]))return f(points[0]![1]);
 for(let i=1;i<points.length;i++){const b=points[i]!,a=points[i-1]!;if(x<=f(b[0])){const t=Math.max(0,Math.min(1,f(f(x-f(a[0]))/f(f(b[0])-f(a[0])))));return f(f(a[1])+f(f(f(b[1])-f(a[1]))*t));}}
 return f(points.at(-1)![1]);
}
export type InitialAnimalClinicalFrontier256={status:'represented-healthy'}|{status:'represented-injured';health:MedicalRecord}|{status:'blocked';branch:'old-age-injury-generation'|'birthday-giver';reason?:string;partIndex?:number;defId?:string;year?:number;scarCount?:number};
/** Refuse an unrepresented branch at the actual selected frontier. In
 * particular a selected giver is NOT asserted to have applied a diagnosis:
 * body-part admission/severity/retries remain unrepresented, so no healthy
 * result or further favorable draw is produced for that branch. */
export function drawInitialAnimalClinicalFrontier256(fact:InitialAnimalFact256,ageCoreTicks:number,random:InitialAnimalRandom256,tick=0,owner?:Pick<import('./wildlife-state.ts').WildAnimal,'species'|'ageTicks'|'ageCoreRemainder'|'growthTracker'>):InitialAnimalClinicalFrontier256 {
 if(!fact.allowOldAgeInjuries)return {status:'represented-healthy'};
 const years=Math.floor(ageCoreTicks/3600000),step=f(f(fact.lifeExpectancy)/8),last=Math.min(years,f(f(fact.lifeExpectancy)*1.5));
 let scars=0;for(let age=step;age<last;age=f(age+step))if(random.value()<f(.03))scars++;
 const clinical=drawInitialAnimalScars256(fact,ageCoreTicks,scars,initialAnimalStage256(fact,ageCoreTicks).healthScaleFactor,tick,random,owner);
 if(clinical.status==='blocked')return {status:'blocked',branch:'old-age-injury-generation',scarCount:scars,reason:clinical.reason,...(clinical.partIndex===undefined?{}:{partIndex:clinical.partIndex})};
 if(owner?.growthTracker){const result=drawInitialAnimalBirthdays256(owner,clinical.health,fact,tick,random);if(result.status==='blocked')return {status:'blocked',branch:'birthday-giver',reason:result.reason,defId:result.defId,year:result.year};return result.health?{status:'represented-injured',health:result.health}:{status:'represented-healthy'};}
 for(let year=1;year<years;year++)for(const giver of BIRTHDAYS){const fraction=f(f(year)/f(fact.lifeExpectancy));if(random.value()<birthdayChance(giver.curve,fraction))return {status:'blocked',branch:'birthday-giver',defId:giver.defId,year};}
 return clinical.health?{status:'represented-injured',health:clinical.health}:{status:'represented-healthy'};
}
