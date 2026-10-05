import { SCYTHER_MODEL,SCYTHER_PART_IDS } from './mechanoid-anatomy.ts';
import { SCYTHER_DEFINITION } from './mechanoid-definition.ts';
import { mechaAssessment,mechaMass } from './mechanoid-health.ts';
import { partMissing,remainingPartHealth } from './injury-state.ts';
import { HP_UNIT,INJURY_RULES } from './injury-rules.ts';
import type { BodyPartId } from './body-definition.ts';
import type { MedicalRecord } from './injury-types.ts';
import type { Mechanoid } from './mechanoid-state.ts';
import type { Cell,World } from './types.ts';
import { ANIMAL_SPECIES } from './animal-species.ts';

/** The authored rig names its pieces independently of the medical namespace. */
export function scytherPartIndex(visualId:string):number {
  const id=(visualId==='torso'?'scyther-thorax':visualId==='left-eye'?'scyther-left-sight-sensor':visualId==='right-eye'?'scyther-right-sight-sensor':`scyther-${visualId}`) as BodyPartId;
  return SCYTHER_MODEL.index[id]??-1;
}
export function mechanoidVisualMask(actor:{health?:MedicalRecord}):readonly [number,number] {
  let low=0,high=0;
  if(actor.health)SCYTHER_PART_IDS.forEach((id,index)=>{if(partMissing(actor.health!,id)){if(index<16)low+=2**index;else high+=2**(index-16);}});
  return [low,high];
}

export interface MechanoidTargetView {id:number;label:string;cell:Cell|null}
export function mechanoidTargetView(world:World,id:number):MechanoidTargetView {
  const human=world.pawns.find(p=>p.id===id);if(human)return {id,label:human.name,cell:{x:human.x,z:human.z}};
  const animal=world.wildlife?.animals.find(a=>a.id===id);if(animal)return {id,label:ANIMAL_SPECIES[animal.species].label,cell:{x:animal.x,z:animal.z}};
  const mech=world.mechanoids?.find(m=>m.id===id);if(mech)return {id,label:`Scyther ${id}`,cell:{x:mech.x,z:mech.z}};
  const building=world.structures.find(s=>s.id===id);if(building)return {id,label:`Bâtiment ${id}`,cell:{x:building.x,z:building.z}};
  return {id,label:`Cible ${id} indisponible`,cell:null};
}
export function mechanoidView(world:World,actor:Mechanoid) {
  const targetId=actor.melee?.order?.targetId??actor.melee?.strike?.targetId;
  const target=targetId===undefined?null:mechanoidTargetView(world,targetId);
  const active=world.raids?.mechActive,group=active&&actor.raid?.group===active.id?active:undefined;
  const action=actor.state==='dead'?'Neutralisé':actor.state==='downed'?'Incapacité mécanique':actor.stun?'Immobilisé':
    actor.melee?.strike?'Récupère après son coup':actor.melee?.order?actor.state==='working'?'Frappe au contact':'Approche sa cible':
    actor.state==='moving'?group?.phase==='staging'?'Rejoint le point de regroupement':'Avance vers la colonie':group?.phase==='staging'?'Se regroupe avant l’assaut':'Cherche une cible';
  const assessment=mechaAssessment(actor);
  const parts=SCYTHER_MODEL.parts.map(part=>{
    const absent=!!actor.health&&partMissing(actor.health,part.id),health=actor.health?remainingPartHealth(actor.health,part.id)/HP_UNIT:part.hp;
    const injuries=actor.health?.injuries.filter(i=>i.part===part.id).map(i=>({id:i.id,label:INJURY_RULES[i.kind].label,severity:i.severity/HP_UNIT}))??[];
    return {id:part.id,label:part.label,maximum:part.hp,health,absent,injuries};
  });
  return {id:actor.id,label:`Scyther ${actor.id}`,action,target,hostile:true,group:group?.phase??null,
    goal:actor.raid?.goal?{...actor.raid.goal}:null,capacities:assessment.capacities,parts,mass:mechaMass(actor),
    armor:SCYTHER_DEFINITION.armor,position:{x:actor.x,z:actor.z},dead:actor.state==='dead'};
}
