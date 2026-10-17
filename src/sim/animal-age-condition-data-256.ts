/** Resolved Core4871 numeric facts, no copied implementation or prose. The
 * array order is OrganicStandard's actual giver order, not alphabetical. */
export const ANIMAL_BIRTHDAY_KINDS_256=['Carcinoma','BadBack','Frail','Cataract','HearingLoss','Dementia','Alzheimers','Asthma','HeartArteryBlockage'] as const;
export type AnimalBirthdayKind256=typeof ANIMAL_BIRTHDAY_KINDS_256[number];
export type AnimalAgeConditionKind256=AnimalBirthdayKind256|'HeartAttack';
export interface AnimalConditionStage256 {min:number;partOffset?:number;pain?:number;moving?:number;manipulation?:number;talking?:number;hearing?:number;consciousnessFactor?:number;consciousnessMax?:number;confusionMtb?:number;heartAttackMtb?:number;destroyPart?:true;lifeThreatening?:true}
export interface AnimalAgeConditionDefinition256 {part?:string;anyLive?:true;count:number;initial:number;min:number;max:number;noPainChance:number;pastSeverityPerDay:number;stages:readonly AnimalConditionStage256[];curve?:readonly (readonly [number,number])[]}
const standard={count:1,initial:.001,min:0,max:3.4028234663852886e38,noPainChance:0,pastSeverityPerDay:0};
export const ANIMAL_AGE_CONDITION_DEFINITIONS_256:Readonly<Record<AnimalAgeConditionKind256,AnimalAgeConditionDefinition256>>=Object.freeze({
 Carcinoma:{...standard,anyLive:true,initial:.3,noPainChance:.3,pastSeverityPerDay:.0005,curve:[[.28,0],[1,.0011],[1.5,.0015]],stages:[{min:0,partOffset:-.1,pain:.1},{min:.15,partOffset:-.25,pain:.2},{min:.4,partOffset:-.5,pain:.35},{min:.6,partOffset:-.8,pain:.5},{min:.8,partOffset:-.9,pain:.6},{min:1,partOffset:-1,pain:.7,destroyPart:true}]},
 BadBack:{...standard,part:'Spine',curve:[[.5,0],[.625,.0093],[.75,.01395],[.875,.01395],[1,.0186]],stages:[{min:0,moving:-.3,manipulation:-.1}]},
 Frail:{...standard,part:'Torso',curve:[[.625,0],[.75,.01395],[.875,.02604]],stages:[{min:0,moving:-.3,manipulation:-.3}]},
 Cataract:{...standard,part:'Eye',count:2,curve:[[.6,0],[.75,.0053],[.875,.011045]],stages:[{min:0,partOffset:-.5}]},
 HearingLoss:{...standard,part:'Ear',count:2,curve:[[.6,0],[.75,.0053],[.875,.011045]],stages:[{min:0,partOffset:-.5}]},
 Dementia:{...standard,part:'Brain',curve:[[.85,0],[.95,.0093],[1.15,.093]],stages:[{min:0,partOffset:-.15,talking:-.25,hearing:-.25,confusionMtb:5}]},
 Alzheimers:{...standard,part:'Brain',pastSeverityPerDay:.001,curve:[[.42,0],[.7,.00061],[.9,.0012],[1,.002],[1.5,.003]],stages:[{min:0,partOffset:-.05,confusionMtb:12},{min:.2,partOffset:-.1,confusionMtb:9},{min:.5,partOffset:-.15,confusionMtb:7},{min:.8,partOffset:-.2,confusionMtb:4}]},
 Asthma:{...standard,part:'Lung',count:2,min:.001,max:.5,curve:[[0,0],[.2,.00048],[.3,.00096],[.5,.001344]],stages:[{min:0,partOffset:-.1},{min:.3,partOffset:-.3},{min:.45,partOffset:-.5}]},
 HeartArteryBlockage:{...standard,part:'Heart',max:1,pastSeverityPerDay:.00025,curve:[[.25,0],[.3,.001],[.5,.00145],[1,.0016],[1.5,.0017]],stages:[{min:0,partOffset:-.05,heartAttackMtb:300},{min:.2,partOffset:-.1,heartAttackMtb:200},{min:.4,partOffset:-.15,heartAttackMtb:100},{min:.6,partOffset:-.35,heartAttackMtb:60},{min:.9,partOffset:-.6,heartAttackMtb:30,lifeThreatening:true}]},
 HeartAttack:{...standard,part:'Heart',initial:.4,max:1,stages:[{min:0,pain:.4,consciousnessFactor:.5,lifeThreatening:true},{min:.6,pain:.6,consciousnessMax:.1,lifeThreatening:true},{min:1}]},
});
export function animalConditionStage256(kind:AnimalAgeConditionKind256,severity:number):AnimalConditionStage256 {const stages=ANIMAL_AGE_CONDITION_DEFINITIONS_256[kind].stages;for(let i=stages.length-1;i>=0;i--)if(severity>=Math.fround(stages[i]!.min))return stages[i]!;return stages[0]!;}
export function animalBirthdayChance256(kind:AnimalBirthdayKind256,fraction:number):number {const f=Math.fround,points=ANIMAL_AGE_CONDITION_DEFINITIONS_256[kind].curve!;if(fraction<=f(points[0]![0]))return f(points[0]![1]);for(let i=1;i<points.length;i++){const a=points[i-1]!,b=points[i]!;if(fraction<=f(b[0])){const t=Math.max(0,Math.min(1,f(f(fraction-f(a[0]))/f(f(b[0])-f(a[0])))));return f(f(a[1])+f(f(f(b[1])-f(a[1]))*t));}}return f(points.at(-1)![1]);}
