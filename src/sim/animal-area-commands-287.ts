import {isSchema287OrLater} from './schema-compatibility-257.ts';
import {prepareAnimalAreaAssignment287,prepareAnimalAreaRemoval287,type AnimalAreaOwnerPlan287} from './animal-area-owners-287.ts';
import {prepareAnimalAreaChange287,type AnimalAreaChange287,type AnimalAreaChangePlan287} from './animal-area-change-287.ts';
import {currentAnimalAreaChoice287,supportsAnimalAreas287} from './animal-area-policy-287.ts';
import {validAnimalAreaChoice287} from './animal-area-save-287.ts';
import {registeredCampaign,registeredMapId} from './world-map-context.ts';
import {removalWritesMutable259} from './map-removal-writes-259.ts';
import {refreshStock} from './materials.ts';
import type {AnimalAreaChoice287,AnimalAreaCommand287} from './animal-area-state-287.ts';
import type {Cell,CommandResult,World} from './types.ts';

const refusal=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
const emptyDrops:ReadonlyMap<number,Cell>=new Map();
const stockMutable=(w:World)=>removalWritesMutable259([{object:w,key:'stock',present:true,value:undefined},
 ...w.jobs.map(job=>({object:job,key:'escrow',present:true,value:undefined}))]);
export type AnimalAreaCommandPhase287={ok:false;reason:string}|{
 ok:true;noop:boolean;current():boolean;begin():boolean;adoptOwner():boolean;adoptRuntime():boolean;
};
function compose(w:World,runtime:AnimalAreaChangePlan287,owner?:AnimalAreaOwnerPlan287):AnimalAreaCommandPhase287 {
 if(!runtime.ok)return runtime;
 const changesStock=runtime.writes.some(write=>write.key==='owner');let admitted=false,ownerUsed=false,used=false;
 const current=()=>!admitted&&!used&&runtime.current()&&(!owner||owner.current())&&(!changesStock||stockMutable(w));
 return {ok:true,noop:runtime.noop&&(!owner||owner.noop),current,
  begin(){if(!current()||!runtime.begin())return false;owner?.begin();admitted=true;return true;},
  adoptOwner(){if(!admitted||ownerUsed||used)return false;ownerUsed=true;return !owner||owner.adoptAdmitted();},
  adoptRuntime(){if(!admitted||!ownerUsed||used||!runtime.adoptAdmitted())return false;used=true;if(changesStock)refreshStock(w);return true;},
 };
}
/** Future masks are explicit data over the true local originals. */
export function prepareAnimalAreaCellsEdit287(w:World,choice:AnimalAreaChoice287,cells:readonly number[],priorHumanDrops:ReadonlyMap<number,Cell>=emptyDrops):AnimalAreaCommandPhase287 {
 const changes:AnimalAreaChange287[]=[];
 for(const animal of w.wildlife?.animals??[]){const assigned=currentAnimalAreaChoice287(w,animal);
  if(assigned?.kind===choice.kind&&(choice.kind==='home'||assigned.kind==='allowed'&&assigned.areaId===choice.areaId))changes.push({animal,choice:assigned,cells});
 }
 return compose(w,prepareAnimalAreaChange287(w,changes,priorHumanDrops));
}
/** Remove this genuine Map/Area reference on all actual retained bodies. */
export function prepareAnimalAreaDefinitionRemoval287(w:World,areaId:number):AnimalAreaCommandPhase287 {
 const mapId=registeredMapId(w);if(mapId===undefined)return {ok:false,reason:'La carte locale de la zone est absente.'};
 const owner=prepareAnimalAreaRemoval287(registeredCampaign(w),{mapId,areaId});if(!owner.ok)return owner;
 const changes=(w.wildlife?.animals??[]).filter(animal=>{const c=currentAnimalAreaChoice287(w,animal);return c?.kind==='allowed'&&c.areaId===areaId;})
  .map(animal=>({animal,choice:null}));
 return compose(w,prepareAnimalAreaChange287(w,changes),owner);
}
export function applyAnimalAreaAssignmentCommand287(w:World,input:unknown):CommandResult {
 if(!isSchema287OrLater(w.schemaVersion))return refusal('Les aires animales nécessitent le schéma287.');
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.getPrototypeOf(input)!==Object.prototype)return refusal('Affectation animale invalide.');
 const keys=Reflect.ownKeys(input),required=['type','animalId','choice'];
 if(keys.length!==3||keys.some(key=>typeof key!=='string'||!required.includes(key))||required.some(key=>{const d=Object.getOwnPropertyDescriptor(input,key);return !d?.enumerable||!Object.hasOwn(d,'value');}))return refusal('Affectation animale invalide.');
 const command=input as AnimalAreaCommand287;
 if(command.type!=='animal-area-assign'||!Number.isSafeInteger(command.animalId)||command.animalId<1
  ||command.choice!==null&&!validAnimalAreaChoice287(command.choice,w.nextId))return refusal('Choix de zone animale invalide.');
 const animal=w.wildlife?.animals.find(a=>a.id===command.animalId);
 if(!animal?.domestic||animal.state==='dead'||animal.health?.death||animal.shipCryptosleepHeldAt277!==undefined||!supportsAnimalAreas287(animal.species))
  return refusal('Aucun animal domestique compatible présent sur cette carte.');
 const owner=prepareAnimalAreaAssignment287(w,animal,command.choice);if(!owner.ok)return refusal(owner.reason);
 if(owner.noop)return {ok:true,affected:0};
 const choice=command.choice,cells=choice?.kind==='home'?w.home:choice?.kind==='allowed'?w.allowedAreas?.find(a=>a.id===choice.areaId)?.cells:undefined;
 const phase=compose(w,prepareAnimalAreaChange287(w,[{animal,choice:command.choice,cells}]),owner);
 if(!phase.ok)return refusal(phase.reason);if(!phase.begin())return refusal('L’état de l’animal a changé avant l’affectation.');
 if(!phase.adoptOwner()||!phase.adoptRuntime())throw Error('Admitted animal area assignment failed');
 return {ok:true,affected:1};
}
