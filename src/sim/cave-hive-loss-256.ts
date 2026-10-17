import {isSchema256Or257} from './schema-compatibility-257.ts';
/** Prospective destruction count for the two real natural edifices. These
 * are destroyed Things, never lost wood, Jelly or an invented inventory item. */
import type {DestructionLedger} from './barriers.ts';
export type HiveNaturalLoss256=Partial<Record<'insect-hive'|'glow-pod',number>>;
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&Object.getPrototypeOf(v)===Object.prototype;
export function validNaturalHiveLoss256(ledger:unknown,version:number):boolean {
 if(!plain(ledger))return false;
 const d=Object.getOwnPropertyDescriptor(ledger,'natural');if(!d)return !('natural'in ledger);
 if(!isSchema256Or257(version)||!Object.hasOwn(d,'value')||!d.enumerable||!plain(d.value))return false;
 const keys=Reflect.ownKeys(d.value);if(!keys.length||keys.length>2)return false;
 let sum=0;for(const key of keys){if(key!=='insect-hive'&&key!=='glow-pod')return false;const row=Object.getOwnPropertyDescriptor(d.value,key)!;if(!Object.hasOwn(row,'value')||!row.enumerable||!Number.isSafeInteger(row.value)||row.value<1)return false;sum+=row.value;if(!Number.isSafeInteger(sum))return false;}
 const count=Object.getOwnPropertyDescriptor(ledger,'count');return !!count&&Object.hasOwn(count,'value')&&count.enumerable===true&&Number.isSafeInteger(count.value)&&sum<=count.value;
}
export function planNaturalHiveLoss256(prior:DestructionLedger|undefined,kind:'insect-hive'|'glow-pod'):DestructionLedger|null {
 if(prior&&!validNaturalHiveLoss256(prior,256))return null;
 const old:DestructionLedger=prior??{count:0,lost:{}},count=old.count+1;
 const natural:HiveNaturalLoss256={...old.natural,[kind]:(old.natural?.[kind]??0)+1};
 if(!Number.isSafeInteger(count)||!Number.isSafeInteger(natural[kind]))return null;
 return {...old,count,natural};
}
