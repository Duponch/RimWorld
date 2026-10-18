import {buildingLabels} from './building-labels';
/** Snapshot-only travel readers. Never create/step a World or invent an owner. */
import {animalSpecies} from '../sim/animal-species';
import {animalLifeStage,animalNutritionMax} from '../sim/animal-life';
import {caravanPawnCapacityGrams256,caravanRidingFactor256} from '../sim/group-animal-capacity-256';
import {QUALITY_LABELS} from '../sim/equipment-rules';
import {ITEM_DEFINITIONS} from '../sim/items';
import type {WildAnimal} from '../sim/wildlife-state';
import type {Pawn} from '../sim/types';
import type {PackedFurniture} from '../sim/furniture-rules';
import type {GroupState} from '../sim/group-state';
import type {GroupPanelSnapshot} from './group-panel';
export type GroupAnimalChoice256={animal:WildAnimal;ok:boolean;reason?:string};
export type GroupBedrollChoice256={pack:PackedFurniture;ok:boolean;reason?:string};
/** This label describes actual living colonists spawned on other maps. The
 * social campaignPeople registry also knows foreigners and sealed casket
 * contents; relationship status alone never proves map/player membership.
 * Reuse the confirmed mapChoices colonist projection, without new transport. */
export function travelElsewhereColonists256(s:GroupPanelSnapshot):readonly Pick<Pawn,'id'|'name'>[] {
 const present=new Set(s.world.pawns.map(p=>p.id));
 if(s.group)for(const id of 'members'in s.group?s.group.members.map(p=>p.id):s.group.memberIds)present.add(id);
 const currentMap=s.originMapId??s.campaign?.activeMapId;
 return (s.campaign?.maps??[]).filter(map=>map.id!==currentMap).flatMap(map=>map.abandonConsequences.pawns).filter(p=>!present.has(p.id));
}
export const travelAnimalLabel256=(a:WildAnimal):string=>`${animalSpecies(a.species).label} · ${a.sex==='female'?'femelle':'mâle'} · ${{baby:'jeune',juvenile:'juvénile',adult:'adulte'}[animalLifeStage(a)]}`;
export const travelActorLabel256=(a:Pawn|WildAnimal):string=>'species'in a?travelAnimalLabel256(a):a.name;
export const travelAnimalNeeds256=(a:WildAnimal):string=>`Nutrition ${(a.food).toLocaleString('fr-FR',{maximumFractionDigits:2})} / ${animalNutritionMax(a).toLocaleString('fr-FR',{maximumFractionDigits:2})} · repos ${Math.round(a.rest*100)} % · ${a.state==='downed'?'À terre':a.state==='dead'?'Décédé':a.state==='sleeping'?'Endormi':'Vivant'}`;
export function travelGroupLabel256(g:GroupState,knownPeople:readonly Pick<Pawn,'id'|'name'>[]=[]):string {const people='members'in g?g.members:g.memberIds.flatMap(id=>{const p=knownPeople.find(p=>p.id===id);return p?[p]:[];});return people.length?`Caravane de ${people.slice(0,2).map(p=>p.name).join(' et ')}${people.length>2?` et ${people.length-2} autres`:''}`:`Caravane en préparation · ${'memberIds'in g?g.memberIds.length:0} personnes`; }
export function travelAnimals256(s:GroupPanelSnapshot,chosen:ReadonlySet<number>=new Set()):readonly WildAnimal[] {
 const g=s.group;if(g&&'members'in g)return g.animalOwners?.members??[];
 const ids=g?'manifest'in g?g.animalPreparation?.lines.map(l=>l.animalId)??[]:g.animalIds??[]:[...chosen];
 if(!g)return (s.world.wildlife?.animals??[]).filter(a=>chosen.has(a.id));
 return ids.map(id=>{const a=s.world.wildlife?.animals.find(a=>a.id===id);if(!a)throw Error('Un animal du groupe n’est plus présent.');return a;});
}
export function travelPacks256(s:GroupPanelSnapshot,ids:ReadonlySet<number>):readonly PackedFurniture[] {
 if(s.group&&'members'in s.group)return s.group.packed??[];
 return s.world.packed.filter(p=>p.owner.type!=='ground'&&ids.has(p.owner.pawnId));
}
export const travelPackLabel256=(p:PackedFurniture):string=>`${buildingLabels[p.building.kind]??'Meuble minifié'}${p.building.material?` · ${ITEM_DEFINITIONS[p.building.material].label}`:''}${p.building.quality?` · ${QUALITY_LABELS[p.building.quality]}`:''}`;
export function travelRidingFactor256(people:number,animals:readonly WildAnimal[]):number {return caravanRidingFactor256(people,animals);}
export const travelCapacity256=(p:Pawn|WildAnimal):number=>caravanPawnCapacityGrams256(p);
