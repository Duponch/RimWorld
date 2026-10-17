/** Raw closed historical fence; no accessors are executed by a migration. */
export function validCamp260Historical(input:unknown,version:number):boolean {
 if(version>=260)return true;const seen=new Set<object>();
 const walk=(v:unknown):boolean=>{if(!v||typeof v!=='object')return true;if(seen.has(v))return true;seen.add(v);for(const k of Reflect.ownKeys(v)){const d=Object.getOwnPropertyDescriptor(v,k);if(!d||!('value'in d))return false;if(k==='campPressure'||k==='source260'||k==='profile'&&d.value==='camp-pressure-v1'||k==='birth'&&d.value&&typeof d.value==='object'&&Object.getOwnPropertyDescriptor(d.value,'kind')?.value==='reform')return false;if(!walk(d.value))return false;}return true;};return walk(input);
}
