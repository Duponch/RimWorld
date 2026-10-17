/** Original scalar selection of the actual no-DLC starting-pet pool.
 * All positive-petness kinds are retained in the observed native107 order.
 * Constructor/clinical failure after a choice must reject the candidate, never
 * reroll, drop its weight or reinterpret a dog/cat as a supported species. */
import type {Pawn} from './types.ts';
import type {WorldGenerationRandom} from './world-generation-random.ts';
const f=Math.fround;
export interface StartingPetKind256 {readonly defId:string;readonly nativePawnKindIndex:number;readonly raceDefId:string;readonly petness:number;readonly wildness:number;readonly trainability:string}
export const STARTING_PET_KINDS_256:readonly StartingPetKind256[]=Object.freeze([{"defId":"Cat","nativePawnKindIndex":48,"raceDefId":"Cat","petness":1.0,"wildness":0.0,"trainability":"None"},{"defId":"YorkshireTerrier","nativePawnKindIndex":49,"raceDefId":"YorkshireTerrier","petness":1.0,"wildness":0.0,"trainability":"Intermediate"},{"defId":"GuineaPig","nativePawnKindIndex":50,"raceDefId":"GuineaPig","petness":0.3,"wildness":0.6,"trainability":"None"},{"defId":"LabradorRetriever","nativePawnKindIndex":51,"raceDefId":"LabradorRetriever","petness":1.0,"wildness":0.0,"trainability":"Advanced"},{"defId":"Husky","nativePawnKindIndex":52,"raceDefId":"Husky","petness":1.0,"wildness":0.0,"trainability":"Advanced"},{"defId":"Monkey","nativePawnKindIndex":53,"raceDefId":"Monkey","petness":0.5,"wildness":0.6,"trainability":"Intermediate"},{"defId":"Yak","nativePawnKindIndex":65,"raceDefId":"Yak","petness":0.3,"wildness":0.2,"trainability":"None"},{"defId":"Horse","nativePawnKindIndex":67,"raceDefId":"Horse","petness":0.6,"wildness":0.35,"trainability":"None"},{"defId":"Donkey","nativePawnKindIndex":68,"raceDefId":"Donkey","petness":0.6,"wildness":0.0,"trainability":"None"},{"defId":"Hare","nativePawnKindIndex":71,"raceDefId":"Hare","petness":0.08,"wildness":0.75,"trainability":"None"},{"defId":"Snowhare","nativePawnKindIndex":72,"raceDefId":"Snowhare","petness":0.08,"wildness":0.75,"trainability":"None"},{"defId":"Cobra","nativePawnKindIndex":77,"raceDefId":"Cobra","petness":0.05,"wildness":0.75,"trainability":"None"},{"defId":"Chinchilla","nativePawnKindIndex":85,"raceDefId":"Chinchilla","petness":0.2,"wildness":0.6,"trainability":"None"},{"defId":"Capybara","nativePawnKindIndex":89,"raceDefId":"Capybara","petness":0.08,"wildness":0.75,"trainability":"None"},{"defId":"Boomrat","nativePawnKindIndex":92,"raceDefId":"Boomrat","petness":0.2,"wildness":0.75,"trainability":"None"},{"defId":"Iguana","nativePawnKindIndex":94,"raceDefId":"Iguana","petness":0.15,"wildness":0.5,"trainability":"None"},{"defId":"Warg","nativePawnKindIndex":95,"raceDefId":"Warg","petness":0.5,"wildness":0.6,"trainability":"Intermediate"},{"defId":"Wolf_Timber","nativePawnKindIndex":96,"raceDefId":"Wolf_Timber","petness":0.1,"wildness":0.85,"trainability":"Advanced"},{"defId":"Wolf_Arctic","nativePawnKindIndex":97,"raceDefId":"Wolf_Arctic","petness":0.1,"wildness":0.85,"trainability":"Advanced"},{"defId":"Fox_Fennec","nativePawnKindIndex":98,"raceDefId":"Fox_Fennec","petness":0.1,"wildness":0.75,"trainability":"Intermediate"},{"defId":"Fox_Red","nativePawnKindIndex":99,"raceDefId":"Fox_Red","petness":0.1,"wildness":0.75,"trainability":"Intermediate"},{"defId":"Fox_Arctic","nativePawnKindIndex":100,"raceDefId":"Fox_Arctic","petness":0.1,"wildness":0.75,"trainability":"Intermediate"}].map(row=>Object.freeze(row)));
const handlingPoints=[[0,0],[.15,1],[.98,10],[.99,14]] as const;
/** Abstract minimum handling stat: Float32 curve, clamp, ties-to-even. */
export function startingPetMinimumHandling256(wildness:number):number {
 if(!Number.isFinite(wildness)||wildness<0||wildness>1)throw Error('Missing actual pet wildness');
 let y=0;const x=f(wildness);
 if(x>=f(.99))y=14;else for(let i=1;i<handlingPoints.length;i++){const a=handlingPoints[i-1]!,b=handlingPoints[i]!;if(x<=f(b[0])){y=f(f(a[1])+f(f(b[1]-a[1])*f(f(x-f(a[0]))/f(f(b[0])-f(a[0])))));break;}}
 const value=Math.max(0,Math.min(20,y)),floor=Math.floor(value),fraction=value-floor;
 return fraction===.5?floor+(floor%2):Math.round(value);
}
export function chooseStartingPetKind256(selected:readonly Pawn[],random:Pick<WorldGenerationRandom,'float'>):StartingPetKind256 {
 if(selected.length!==3||new Set(selected.map(p=>p.id)).size!==3)throw Error('Three actual selected originals required');
 let skill=0;for(const pawn of selected){const actual=pawn.skills.animals?.level;if(!Number.isInteger(actual)||actual!<0||actual!>20)throw Error('Missing actual Animals skill');skill=Math.max(skill,actual!);}
 const tameable=STARTING_PET_KINDS_256.filter(row=>skill>=startingPetMinimumHandling256(row.wildness)),pool=tameable.length?tameable:STARTING_PET_KINDS_256;
 let chosen:StartingPetKind256|undefined,total=0;
 for(const row of pool){const weight=f(row.petness);if(!chosen){chosen=row;total=weight;continue;}const next=f(total+weight);if(random.float(0,next)>=total)chosen=row;total=next;}
 if(!chosen)throw Error('Actual starting-pet pool was empty');return chosen;
}
