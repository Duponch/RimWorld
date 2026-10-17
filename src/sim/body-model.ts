import {nativeAnimalAnatomy256} from './native-animal-anatomy-256.ts';
import {trackedAnimalLifeStage256} from './animal-growth-runtime-256.ts';
import {animalCore256,isAnimalSpecies256,animalHealthScale256,animalLifeStageData256,animalStageAgeTicks256} from './animal-core-v256.ts';
import {animalAnatomyParts256,animalPartFact256} from './animal-anatomy-v256.ts';
import type {AnimalSpeciesId256} from './animal-core-data-v256.ts';
import { HUMAN_BODY,type BodyPart,type BodyPartId } from './body-definition.ts';
import { ANIMAL_SPECIES,LEGACY_ANIMAL_SPECIES_IDS,isAnimalSpecies,type AnimalSpeciesId } from './animal-species.ts';
import { compileBodyModel as model,type BodyModel } from './body-model-compiler.ts';
import { mechanoidBodyModel } from './mechanoid-anatomy.ts';
import { isMechanoidKind,type MechanoidKind } from './mechanoid-definition.ts';
export { compileBodyModel } from './body-model-compiler.ts';
export type { BodyModel } from './body-model-compiler.ts';

/** Species anatomy is independent of both actor storage and graphical bones.
 * The medical kernel uses one immutable model, never a humanoid surrogate. */
const animalBaseHp:Partial<Record<AnimalSpeciesId,Readonly<Partial<Record<BodyPartId,number>>>>>={};
function quadruped(species:AnimalSpeciesId):readonly BodyPart[] {
  const definition=ANIMAL_SPECIES[species],hoofed=definition.bodyTemplate!=='paws';
  const parts:BodyPart[]=[];
  const baseHp:Partial<Record<BodyPartId,number>>={};
  const add=(id:BodyPartId,label:string,parent:BodyPartId|null,hp:number,coverage:number,inside=false,destroyable=true)=>{
    const ancestor=parent?parts.find(p=>p.id===parent):undefined;
    if(parent&&!ancestor)throw new Error('Missing anatomical parent');
    baseHp[id]=hp;
    parts.push(Object.freeze({id,label,parent,hp:Math.ceil(hp*definition.healthScale),coverage,groups:Object.freeze([]),
      depth:inside?'inside':ancestor?.depth??'outside',height:id==='neck'?'top':id.endsWith('-leg')?'bottom':ancestor?.height??'middle',destroyable,conceptual:false}));
  };
  add('torso','Corps',null,40,1);if(!hoofed)add('tail','Queue','torso',10,.07);
  add('spine','Colonne','torso',25,.03,true);add('stomach','Estomac','torso',20,.03,true);
  add('heart','Cœur','torso',15,.03,true);
  for(const side of ['left','right'] as const){add(`${side}-lung`,side==='left'?'Poumon gauche':'Poumon droit','torso',15,.03,true);add(`${side}-kidney`,side==='left'?'Rein gauche':'Rein droit','torso',15,.03,true);}
  add('liver','Foie','torso',20,.03,true);if(definition.bodyTemplate==='camelid')add('hump','Bosse','torso',20,.1);
  add('neck','Cou','torso',25,definition.bodyTemplate==='camelid'?.18:hoofed?.22:.2);add('head','Tête','neck',25,.75);
  add('skull','Crâne','head',25,.25,true,false);add('brain','Cerveau','skull',10,.7);
  for(const side of ['left','right'] as const){add(`${side}-eye`,side==='left'?'Œil gauche':'Œil droit','head',10,.12);add(`${side}-ear`,side==='left'?'Oreille gauche':'Oreille droite','head',12,.08);}
  add('nose','Nez','head',10,.1);add('jaw','Mâchoire','head',10,.1);
  for(const side of ['left','right'] as const)for(const end of ['front','rear'] as const){
    const name=`${end==='front'?'avant':'arrière'} ${side==='left'?'gauche':'droite'}`;
    add(`${side}-${end}-leg`,`Patte ${name}`,'torso',30,hoofed?.065:.07);
    add(`${side}-${end}-${hoofed?'hoof':'paw'}`,`${hoofed?'Sabot':'Pied'} ${name}`,`${side}-${end}-leg`,10,.15);
  }
  animalBaseHp[species]=Object.freeze(baseHp);
  return Object.freeze(parts);
}
export const HUMAN_MODEL=model('human',1,HUMAN_BODY);
let teenagerHumanModel256:BodyModel|undefined;
/** Same anatomical IDs, immutable shared model; historical HUMAN_MODEL stays literal. */
export function nativeHumanBodyModel256(scale:number):BodyModel {
 if(scale===1)return HUMAN_MODEL;
 if(scale!==Math.fround(.9))throw Error('Invalid native Human clinical scale');
 return teenagerHumanModel256??=model('human',scale,Object.freeze(HUMAN_BODY.map(part=>Object.freeze({...part,hp:Math.ceil(Math.fround(Math.fround(part.hp)*scale))}))));
}
/** New anatomical models are shared by species and clinical life stage. They
 * are allocated on demand, never once per actor or per presentation frame. */
const stageModels=new Map<string,BodyModel>();
function compileNativeAnimalBody256(species:AnimalSpeciesId,scale:number,parts:readonly BodyPart[]):BodyModel {
 const base=model(species,scale,parts);
 // Clip overfull relative children only in prospective native anatomy.
 return Object.freeze({...base,coverage:Object.freeze(parts.map(part=>{
  let absolute=part.coverage;for(let id=part.parent;id!==null;id=base.byId[id].parent)absolute*=base.byId[id].coverage;
  const exclusive=1-parts.filter(child=>child.parent===part.id).reduce((sum,child)=>sum+child.coverage,0);
  return absolute*(Math.abs(exclusive)<1e-5?0:Math.max(0,exclusive));
 }))});
}
function coreAnimalModel(species:AnimalSpeciesId256,ageTicks:number,growth?:number):BodyModel {
  const stage=animalLifeStageData256(species,ageTicks,growth),key=species+':'+stage.definition;
  let compiled=stageModels.get(key);if(compiled)return compiled;
  const scale=animalHealthScale256(species,ageTicks,growth),parts=animalAnatomyParts256(animalCore256(species).race.body,scale);
  compiled=compileNativeAnimalBody256(species,scale,parts);
  stageModels.set(key,compiled);return compiled;
}
export const ANIMAL_BODY_MODELS:Readonly<Record<AnimalSpeciesId,BodyModel>>=Object.freeze(Object.fromEntries([
  ...LEGACY_ANIMAL_SPECIES_IDS.map(species=>[species,model(species,ANIMAL_SPECIES[species].healthScale,quadruped(species))]),
  ...Object.keys(ANIMAL_SPECIES).filter(isAnimalSpecies256).map(species=>[species,coreAnimalModel(species,animalStageAgeTicks256(species,'adult'))])
]) as Record<AnimalSpeciesId,BodyModel>);
export const HARE_MODEL=ANIMAL_BODY_MODELS.hare;
function trackedOriginalAnimalModel256(species:AnimalSpeciesId,growth:number):BodyModel {
 const stage=trackedAnimalLifeStage256(species,{value:growth}),key=species+':'+stage.definition;let compiled=stageModels.get(key);if(compiled)return compiled;
 const native=nativeAnimalAnatomy256(species),scale=Math.fround(Math.fround(native.baseHealthScale)*Math.fround(stage.healthScaleFactor));
 const parts=animalAnatomyParts256(native.body,scale);
 compiled=compileNativeAnimalBody256(species,scale,parts);stageModels.set(key,compiled);return compiled;
}
export const animalBodyModel=(species:AnimalSpeciesId,ageTicks?:number,growth?:number):BodyModel=>isAnimalSpecies256(species)&&(ageTicks!==undefined||growth!==undefined)?coreAnimalModel(species,ageTicks??0,growth):growth!==undefined?trackedOriginalAnimalModel256(species,growth):ANIMAL_BODY_MODELS[species];
/** Raw definition HP, independent of life-stage/species health scaling. */
export const animalPartBaseHp=(species:AnimalSpeciesId,part:BodyPartId,growth?:number):number=>growth!==undefined?animalPartFact256(nativeAnimalAnatomy256(species).body,part)?.hp??0:isAnimalSpecies256(species)?animalPartFact256(animalCore256(species).race.body,part)?.hp??0:animalBaseHp[species]?.[part]??0;
export const medicalModel=(record:{body?:AnimalSpeciesId|MechanoidKind;tick?:number;animalBirthTick?:number;animalGrowth?:number;humanHealthScale?:number;death?:{tick:number}}):BodyModel=>{
  if(isMechanoidKind(record.body))return mechanoidBodyModel(record.body);
  if(!isAnimalSpecies(record.body))return record.humanHealthScale===undefined?HUMAN_MODEL:nativeHumanBodyModel256(record.humanHealthScale);
  if(record.animalGrowth!==undefined)return animalBodyModel(record.body,0,record.animalGrowth);
  if(!isAnimalSpecies256(record.body))return animalBodyModel(record.body);
  const tick=record.death?.tick??record.tick,birth=record.animalBirthTick;
  if(!Number.isSafeInteger(tick)||!Number.isSafeInteger(birth)||!Number.isSafeInteger(tick!-birth!)||tick!<birth!)throw Error('Missing or invalid animal clinical age.');
  return animalBodyModel(record.body,tick!-birth!);
};
export const modelHasPart=(model:BodyModel,id:unknown):id is BodyPartId=>typeof id==='string'&&Object.hasOwn(model.byId,id);
