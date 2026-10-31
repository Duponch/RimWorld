import {isCorePhysicalSchema297} from './physical-schema-297.ts';
import type {RetiredWorldMap} from './world-map-state.ts';
/** An owned terminal receipt; absence is the exact historical phase-zero retirement. */
export function removedMapCore297(value:Pick<RetiredWorldMap,'removedAt'|'removedAtCore297'>,version:number):number {
 if(!Number.isSafeInteger(value.removedAt)||value.removedAt<0||!Number.isSafeInteger(value.removedAt*10))return NaN;
 if(!('removedAtCore297'in value))return value.removedAt*10;
 const d=Object.getOwnPropertyDescriptor(value,'removedAtCore297');return isCorePhysicalSchema297(version)&&!!d&&d.enumerable===true&&Object.hasOwn(d,'value')&&typeof d.value==='number'&&Number.isSafeInteger(d.value)&&Math.floor(d.value/10)===value.removedAt?d.value:NaN;
}
