import { HUMAN_BODY,type BodyPart,type BodyPartId } from './body-definition.ts';
import { ANIMAL_SPECIES,isAnimalSpecies,type AnimalSpeciesId } from './animal-species.ts';
import { compileBodyModel as model,type BodyModel } from './body-model-compiler.ts';
import { SCYTHER_MODEL } from './mechanoid-anatomy.ts';
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
export const ANIMAL_BODY_MODELS:Readonly<Record<AnimalSpeciesId,BodyModel>>=Object.freeze(Object.fromEntries(
  (Object.keys(ANIMAL_SPECIES) as AnimalSpeciesId[]).map(species=>[species,model(species,ANIMAL_SPECIES[species].healthScale,quadruped(species))])
) as Record<AnimalSpeciesId,BodyModel>);
export const HARE_MODEL=ANIMAL_BODY_MODELS.hare;
export const animalBodyModel=(species:AnimalSpeciesId):BodyModel=>ANIMAL_BODY_MODELS[species];
/** Raw Core definition HP before the species multiplier and ceiling. */
export const animalPartBaseHp=(species:AnimalSpeciesId,part:BodyPartId):number=>animalBaseHp[species]?.[part]??0;
export const medicalModel=(record:{body?:AnimalSpeciesId|'scyther'}):BodyModel=>record.body==='scyther'?SCYTHER_MODEL:isAnimalSpecies(record.body)?animalBodyModel(record.body):HUMAN_MODEL;
export const modelHasPart=(model:BodyModel,id:unknown):id is BodyPartId=>typeof id==='string'&&Object.hasOwn(model.byId,id);
