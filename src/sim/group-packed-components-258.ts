import type {World} from './types.ts';
import type {PackedFurniture} from './furniture-rules.ts';
import {validatePower} from './power-save.ts';
import {validateCooking} from './cooking-save.ts';
import {validateBreakdowns} from './breakdown-save.ts';
import {validateHeaters} from './heater.ts';
import {validateConstructionMaterials} from './construction-material-save.ts';
import {validDeepDrillingTransport} from './deep-drilling-save.ts';
import {validEmpStructureTransport,validEmpProductionTransport} from './emp-save.ts';
/** Reuse each domain's literal checks, visiting only these original packages.
 * The actual campaign supplies research/time; no World, map or owner is made. */
export function validateGroupPackedComponents258(w:World,packs:readonly PackedFurniture[],version:number,clock:number=w.tick):string[] {
 if(version<258||!packs.length)return [];
 const ids=new Set(packs.flatMap(p=>[p.building.id,...p.building.shelf?.cells??[]]));
 const errors=[...validatePower(w,version,undefined,undefined,packs),...validateCooking(w,version,ids,false,false,undefined,packs),
  ...validateBreakdowns(w,version,packs,clock),...validateHeaters(w,version,packs),...validateConstructionMaterials(w,version,packs)];
 if(!validDeepDrillingTransport(w,version,packs,clock))errors.push('Invalid packed deep drill state.');
 if(!validEmpStructureTransport(w,version,packs,clock)||!validEmpProductionTransport(w,version,packs))errors.push('Invalid packed EMP state or bill.');
 return errors;
}
