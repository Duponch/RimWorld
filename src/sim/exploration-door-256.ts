import {isSchema256Or257} from './schema-compatibility-257.ts';
/** Saved reference to the last actual door approach; no route, clock or load cleanup. */
import type {DoorState} from './door-rules.ts';
import {explorationEnabled256,type ExplorationMap256} from './exploration-state-256.ts';
import {explorationDoorNeedsReveal256,notifyExplorationDoor256,type FogReveal256,type ExplorationEffects256} from './exploration-flood-256.ts';
import type {FogPhysicalReaders256} from './exploration-physical-256.ts';
export type ExplorationDoorState256=Pick<DoorState,'open'>&{explorationApproacherId?:number};
/** Resolve the ACTUAL referenced Pawn/animal owner, including a genuinely retained
 * dead/away owner. Faction and HostFaction are current facts, not captured flags.
 * Absence is a broken reference, never an instruction to invent/clear an owner. */
export interface ExplorationApproacher256 {id:number;playerOwned:boolean;hostPlayer:boolean}
export type ResolveExplorationApproacher256=(id:number)=>ExplorationApproacher256|undefined;
const validId=(id:unknown):id is number=>typeof id==='number'&&Number.isSafeInteger(id)&&id>0;
function resolved(id:number,resolve:ResolveExplorationApproacher256):ExplorationApproacher256|undefined {
 const actor=resolve(id);return actor&&actor.id===id&&typeof actor.playerOwned==='boolean'&&typeof actor.hostPlayer==='boolean'?actor:undefined;
}
/** Companion to the existing strict DoorState guard; does not replace it.
 * Descriptor-only before resolver: own undefined/accessors and old fields reject.
 * nextId is the actual shared identity frontier; no living/local-only constraint. */
export function validExplorationDoorApproacher256(value:unknown,version:number,enabled:boolean,nextId:number,resolve:ResolveExplorationApproacher256):boolean {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)return false;
 const key='explorationApproacherId',d=Object.getOwnPropertyDescriptor(value,key);
 if(!d)return !(key in value);
 return isSchema256Or257(version)&&enabled&&d.enumerable===true&&Object.hasOwn(d,'value')&&validId(d.value)&&Number.isSafeInteger(nextId)&&d.value<nextId&&resolved(d.value,resolve)!==undefined;
}
/** Call only at real Notify_PawnApproaching equivalent, after actual permission.
 * Foreign actors also replace this reference if they can open or door is open. */
export function rememberExplorationApproacher256(map:ExplorationMap256,state:ExplorationDoorState256,actorId:number,canOpen:boolean):void {
 if(!explorationEnabled256(map))return;
 if(!validId(actorId)||typeof canOpen!=='boolean')throw Error('Invalid actual door approaching actor');
 if(canOpen||state.open)state.explorationApproacherId=actorId;
}
/** Called in the existing confirmed door update, while opening/open, BEFORE
 * close transition. Physical capture is lazy and only needed for a real reveal.
 * Consumption is independent of current path, life, map presence or allegiance. */
export function consumeExplorationApproacher256(map:ExplorationMap256,cell:number,state:ExplorationDoorState256,openness:number,resolve:ResolveExplorationApproacher256,capture:()=>FogPhysicalReaders256,effects:ExplorationEffects256={}):FogReveal256 {
 const empty:FogReveal256={changedCells:[],interiorCells:[]};
 if(!explorationEnabled256(map)||state.explorationApproacherId===undefined)return empty;
 if(!Number.isFinite(openness)||openness<0||openness>1)throw Error('Invalid confirmed door openness');
 if(!state.open||openness<Math.fround(.4))return empty;
 const id=state.explorationApproacherId,actor=validId(id)?resolved(id,resolve):undefined;
 if(!actor)throw Error('Unresolved actual exploration door approach owner');
 let result=empty;
 if((actor.playerOwned||actor.hostPlayer)&&explorationDoorNeedsReveal256(map,cell))result=notifyExplorationDoor256(map,cell,{...actor,approaching:true,openness},capture(),effects);
 delete state.explorationApproacherId;
 return result;
}
