/** Civil event dates stay factual. Only their received active age is frozen. */
export interface SuspendedMemory271 {suspendedTicks?:number}
export const memoryExpiry271=(memory:object,expiry:number):number=>expiry+((memory as SuspendedMemory271).suspendedTicks??0);
export const memoryAge271=(memory:object,bornAt:number,tick:number):number=>Math.max(0,tick-bornAt-((memory as SuspendedMemory271).suspendedTicks??0));
export const memoryReadTick271=(pawn:{cryptosleepHeldAt271?:number},tick:number):number=>Math.min(tick,pawn.cryptosleepHeldAt271??tick);
export function validSuspendedMemory271(value:unknown,version:number,tick:number,bornAt:number):boolean {
 if(!value||typeof value!=='object')return false;
 const d=Object.getOwnPropertyDescriptor(value,'suspendedTicks');if(!d)return !('suspendedTicks'in value);
 return version===271&&Object.hasOwn(d,'value')&&d.enumerable===true&&Number.isSafeInteger(d.value)&&d.value>0&&Number.isSafeInteger(tick)&&Number.isSafeInteger(bornAt)&&d.value<=tick-bornAt;
}
