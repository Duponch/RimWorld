import {isSchema256Or257} from './schema-compatibility-257.ts';
import type {AncientCasketCommand256} from './ancient-casket-state-256.ts';
export function validAncientCasketOpenCommand256(v:unknown,version:number,nextId:number):v is AncientCasketCommand256 {
 if(!isSchema256Or257(version)||!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype)return false;
 const names=['type','pawnId','casketId'],keys=Reflect.ownKeys(v);if(keys.length!==3||keys.some(k=>typeof k!=='string'||!names.includes(k)||!Object.getOwnPropertyDescriptor(v,k)?.enumerable||!('value'in Object.getOwnPropertyDescriptor(v,k)!)))return false;
 const c=v as AncientCasketCommand256;return c.type==='order-open-casket'&&[c.pawnId,c.casketId].every(n=>Number.isSafeInteger(n)&&n>0&&n<nextId);
}
