import {isSchema256Or257} from './schema-compatibility-257.ts';
/** A retained initial facing only, not a replacement for Core's general Rot4.
 * No migration creates it; movement/real directed work supersede it. */
import type {Orientation} from './types.ts';
export function validArrivalRotation256(actor:unknown,version:number):boolean {
 if(!actor||typeof actor!=='object'||Array.isArray(actor))return false;
 const d=Object.getOwnPropertyDescriptor(actor,'arrivalRotation');
 if(!d)return !('arrivalRotation'in actor);
 return isSchema256Or257(version)&&d.enumerable===true&&Object.hasOwn(d,'value')&&Number.isInteger(d.value)&&d.value>=0&&d.value<=3;
}
export function arrivalRotationYaw256(actor:{readonly arrivalRotation?:Orientation}):number|undefined {
 return actor.arrivalRotation===undefined?undefined:(actor.arrivalRotation===3?-1:actor.arrivalRotation)*Math.PI/2;
}
/** A reservation/route request is not physical direction. Caller passes the
 * actual move/contact target only after that operation has been admitted. */
export function finishArrivalFacing256(actor:{x:number;z:number;arrivalRotation?:Orientation},target:{x:number;z:number}):void {
 if(actor.x!==target.x||actor.z!==target.z)delete actor.arrivalRotation;
}
