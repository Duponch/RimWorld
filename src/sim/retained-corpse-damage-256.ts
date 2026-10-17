/** One physical corpse HP scalar while the original actor still owns its
 * body. Clinical injuries are frozen and never reused as corpse hit points. */
export interface RetainedCorpseDamage256 {corpseDamage?:number}
export const retainedCorpseDamage256=(owner:object):number=>(owner as RetainedCorpseDamage256).corpseDamage??0;
export function validRetainedCorpseDamage256(owner:object,version:number):boolean {
 const d=Object.getOwnPropertyDescriptor(owner,'corpseDamage');if(!d)return true;
 if(version<256||!Object.hasOwn(d,'value'))return false;
 const state=Object.getOwnPropertyDescriptor(owner,'state'),health=Object.getOwnPropertyDescriptor(owner,'health');
 const death=health&&Object.hasOwn(health,'value')&&health.value&&typeof health.value==='object'?Object.getOwnPropertyDescriptor(health.value,'death'):undefined;
 return state?.value==='dead'&&!!death&&Object.hasOwn(death,'value')&&!!death.value&&Number.isSafeInteger(d.value)&&d.value>0&&d.value<100;
}
