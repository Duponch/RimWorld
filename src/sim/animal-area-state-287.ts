import type {Cell} from './types.ts';

/** One native-like choice per genuine map; Home is not a fabricated ThingID. */
export type AnimalAreaChoice287={kind:'home'}|{kind:'allowed';areaId:number};
export interface AnimalMapAreas287 {
 readonly revision:1;
 assignments:{mapId:number;choice:AnimalAreaChoice287}[];
}
export interface AnimalAreaHolder287 {animalMapAreas287?:AnimalMapAreas287}
/** A real local Goto intention, distinct from the passive map dictionary. */
export interface AnimalAreaReturn287 {mapId:number;target:Cell}
export interface AnimalAreaCommand287 {
 type:'animal-area-assign';animalId:number;choice:AnimalAreaChoice287|null;
}
export function readAnimalAreaChoice287(holder:AnimalAreaHolder287,mapId:number):AnimalAreaChoice287|null {
 return holder.animalMapAreas287?.assignments.find(row=>row.mapId===mapId)?.choice??null;
}
export function sameAnimalAreaChoice287(a:AnimalAreaChoice287|null,b:AnimalAreaChoice287|null):boolean {
 return a===null||b===null?a===b:a.kind===b.kind&&(a.kind==='home'||b.kind==='allowed'&&a.areaId===b.areaId);
}
export function cloneAnimalMapAreas287(value:AnimalMapAreas287):AnimalMapAreas287 {
 return {revision:1,assignments:value.assignments.map(row=>({mapId:row.mapId,choice:{...row.choice}}))};
}
