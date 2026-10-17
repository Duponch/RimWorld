import {CORE_ANIMAL_BODIES_256,type AnimalBodyDef256} from './animal-anatomy-data-v256.ts';
import type {BodyPart,BodyPartId,BodyGroup} from './body-definition.ts';
export type AnimalPartId256=`a256-${AnimalBodyDef256}-${number}`;
export type AnimalBodyGroup256=typeof CORE_ANIMAL_BODIES_256[AnimalBodyDef256][number]['groups'][number];
export type AnimalBodyFact256=typeof CORE_ANIMAL_BODIES_256[AnimalBodyDef256][number];
const labels:Readonly<Record<string,string>>={HeadClaw:"Griffe céphalique",InsectHead:"Tête",InsectHeart:"Cœur",InsectNostril:"Orifice respiratoire",InsectMouth:"Mandibules",Pronotum:"Pronotum",Elytra:"Élytre",Antenna:"Antenne",InsectLeg:"Patte",InsectClaw:"Griffe","Body":"Corps","Tail":"Queue","Spine":"Colonne vertébrale","Stomach":"Estomac","Heart":"Cœur","Lung":"Poumon","Kidney":"Rein","Liver":"Foie","Neck":"Cou","Head":"Tête","HeadWithEarHoles":"Tête","SnakeHead":"Tête","Skull":"Crâne","Brain":"Cerveau","Eye":"Œil","Ear":"Oreille","Nose":"Nez","Jaw":"Mâchoire","AnimalJaw":"Mâchoire","Leg":"Patte","Foot":"Pied","Hoof":"Sabot","Paw":"Pied","FrontPaw":"Pied avant","RearPaw":"Pied arrière","Hump":"Bosse","Horn":"Corne","Tusk":"Défense","Trunk":"Trompe","Jowl":"Jabot","Claw":"Griffe","FrontClaw":"Griffe avant","RearClaw":"Griffe arrière","BirdLeg":"Patte","BirdFoot":"Pied","Wing":"Aile","Beak":"Bec","SnakeBody":"Corps","SnakeMouth":"Bouche","TurtleBody":"Corps","Shell":"Carapace","TurtleHead":"Tête","TurtleBeak":"Bec","Shoulder":"Épaule","Clavicle":"Clavicule","Arm":"Bras","Humerus":"Humérus","Radius":"Radius","Hand":"Main","Finger":"Doigt","Thumb":"Pouce","Waist":"Taille","Pelvis":"Bassin","Femur":"Fémur","Tibia":"Tibia","Toe":"Orteil","Tongue":"Langue","TurtleNeck":"Cou","TurtleLeg":"Patte","TurtleFoot":"Pied","Plastron":"Plastron","Ribcage":"Cage thoracique","Sternum":"Sternum","Torso":"Torse","TurtleShell":"Carapace"};
const common:Readonly<Record<string,BodyPartId>>={Spine:'spine',Stomach:'stomach',Heart:'heart',Liver:'liver',Neck:'neck',Head:'head',HeadWithEarHoles:'head',SnakeHead:'head',Skull:'skull',Brain:'brain',Nose:'nose',AnimalJaw:'jaw',Jaw:'jaw',Tail:'tail',Hump:'hump',Tongue:'tongue',Waist:'waist',Pelvis:'pelvis'};
export function animalPartId256(body:AnimalBodyDef256,index:number):BodyPartId {
 const row=CORE_ANIMAL_BODIES_256[body][index];if(!row)throw Error('Missing animal anatomical record.');if(row.parent===null)return 'torso';
 if(common[row.defId])return common[row.defId]!;
 if(row.side&&['Eye','Ear','Lung','Kidney'].includes(row.defId))return `${row.side}-${row.defId.toLowerCase()}` as BodyPartId;
 return `a256-${body}-${index}`;
}
export function animalPartFact256(body:AnimalBodyDef256,id:BodyPartId):AnimalBodyFact256|undefined {return CORE_ANIMAL_BODIES_256[body].find(row=>animalPartId256(body,row.index)===id);}
export function animalAnatomyParts256(body:AnimalBodyDef256,healthScale:number):readonly BodyPart[] {
 if(!Number.isFinite(healthScale)||healthScale<=0)throw Error('Invalid animal health scale.');
 const ids=new Set<BodyPartId>();return Object.freeze(CORE_ANIMAL_BODIES_256[body].map(row=>{
  const id=animalPartId256(body,row.index);if(ids.has(id))throw Error('Duplicate animal anatomical identity.');ids.add(id);
  const label=labels[row.defId];if(!label)throw Error('Missing original animal part label.');
  return Object.freeze({id,label:label+(row.side==='left'?' gauche':row.side==='right'?' droit':''),parent:row.parent===null?null:animalPartId256(body,row.parent),hp:Math.ceil(Math.fround(Math.fround(row.hp)*Math.fround(healthScale))),coverage:row.coverage,depth:row.depth,height:row.height,groups:Object.freeze([...row.groups]) as readonly BodyGroup[],destroyable:row.destroyable,conceptual:row.conceptual,nativeTags:Object.freeze([...row.tags]),nativeDefId:row.defId,nativeExecutionPriority:row.executionPriority,nativeInjuryRule:Object.freeze({skin:row.skin,solid:row.solid,bleed:row.bleed,delicate:row.delicate,scarFactor:row.scarFactor})});
 }));
}
export function animalToolParts256(body:AnimalBodyDef256,group:string):readonly BodyPartId[] {
 return CORE_ANIMAL_BODIES_256[body].filter(row=>(row.groups as readonly string[]).includes(group)).map(row=>animalPartId256(body,row.index));
}
