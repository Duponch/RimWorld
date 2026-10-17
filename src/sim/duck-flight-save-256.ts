import {validDuckFlight256} from './duck-flight-state-256.ts';
/** Descriptor-only addition to the existing outer actor/edge guards. */
export function validDuckFlightFields256(animal:object,version:number,tick:number):boolean {
 const flight=Object.getOwnPropertyDescriptor(animal,'flight'),species=Object.getOwnPropertyDescriptor(animal,'species'),state=Object.getOwnPropertyDescriptor(animal,'state'),motion=Object.getOwnPropertyDescriptor(animal,'motion');
 if(motion&&'value'in motion&&motion.value&&typeof motion.value==='object'){
  const mark=Object.getOwnPropertyDescriptor(motion.value,'animalFlight');
  if(mark&&(version<256||!species||!('value'in species)||species.value!=='duck'||!('value'in mark)||!mark.enumerable||mark.value!==true||!flight))return false;
 }
 if(!flight)return true;
 return !!species&&'value'in species&&!!state&&'value'in state&&'value'in flight&&flight.enumerable===true&&flight.value!==undefined&&validDuckFlight256(flight.value,species.value,version,tick*10,state.value==='dead');
}
