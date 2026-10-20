/** A real previous caravan rest service, never a promised gain or a local bed.
 * Keep the receipt on its original actor across ownership transfers. */
export interface CaravanRestMark266 {atCore:number;effectiveness:number}

/** The supplied clock belongs to the actual actor (including frozen owners).
 * Absence is meaningful on migrated saves; own undefined is not absence. */
export function validCaravanRestField266(actor:Record<string,unknown>,version:number,tick:number):boolean {
 const property=Object.getOwnPropertyDescriptor(actor,'caravanRest');
 if(!property)return !('caravanRest'in actor);
 if(!property.enumerable||!Object.hasOwn(property,'value'))return false;
 if(version<266||!Number.isSafeInteger(tick)||tick<0||!Number.isSafeInteger(tick*10))return false;
 const value=property.value;
 if(typeof value!=='object'||value===null||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)return false;
 const keys=Reflect.ownKeys(value);
 if(keys.length!==2||!keys.every(k=>(k==='atCore'||k==='effectiveness')&&Object.getOwnPropertyDescriptor(value,k)!.enumerable&&Object.hasOwn(Object.getOwnPropertyDescriptor(value,k)!,'value')))return false;
 const mark=value as CaravanRestMark266;
 return Number.isSafeInteger(mark.atCore)&&mark.atCore>=0&&mark.atCore<=tick*10
  &&typeof mark.effectiveness==='number'&&Number.isFinite(mark.effectiveness)&&mark.effectiveness>0;
}
