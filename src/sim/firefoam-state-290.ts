import type {Cell} from './types.ts';

export interface FirefoamPopper290 {autoRebuild:boolean;wick?:{startedAtCore:number;endCore:number}}
/** A helpful wave has its own owner: it never enters hostile bomb avoidance. */
export interface FirefoamWave290 {
 id:number;sourceId:number;center:Cell;startedAtCore:number;advancedAtCore:number;
 cells:number[];damageOnlyCells:number[];nextCell:number;affectedActorKeys:string[];
}
export interface FirefoamWorld290 {rng:number;waves:FirefoamWave290[]}
export type FirefoamCommand290={type:'firefoam-auto-rebuild';structureId:number;on:boolean};
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
export const firefoamInteger290=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&(v as number)>=min&&(v as number)<=max;
export function firefoamData290(v:unknown,required:readonly string[],optional:readonly string[]=[]):v is Record<string,unknown>{
 if(!plain(v))return false;const allowed=[...required,...optional];
 return required.every(k=>Object.hasOwn(v,k))&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&allowed.includes(k)&&(()=>{const d=Object.getOwnPropertyDescriptor(v,k)!;return d.enumerable&&Object.hasOwn(d,'value');})());
}
export function firefoamDense290(v:unknown,limit:number):v is unknown[]{
 return Array.isArray(v)&&Object.getPrototypeOf(v)===Array.prototype&&v.length<=limit&&Reflect.ownKeys(v).length===v.length+1
  &&Array.from({length:v.length},(_,i)=>Object.getOwnPropertyDescriptor(v,String(i))).every(d=>!!d&&d.enumerable&&Object.hasOwn(d,'value'));
}
export function validFirefoamPopper290(v:unknown,version:number):v is FirefoamPopper290 {
 try{return (version===290||version===291)&&firefoamData290(v,['autoRebuild'],['wick'])&&typeof v.autoRebuild==='boolean'
  &&(!Object.hasOwn(v,'wick')||firefoamData290(v.wick,['startedAtCore','endCore'])&&firefoamInteger290(v.wick.startedAtCore,0,Number.MAX_SAFE_INTEGER-150)&&firefoamInteger290(v.wick.endCore,v.wick.startedAtCore+140,v.wick.startedAtCore+150));}catch{return false;}
}
export function validFirefoamWaveShape290(v:unknown,version:number):v is FirefoamWave290 {
 try{
  if((version!==290&&version!==291)||!firefoamData290(v,['id','sourceId','center','startedAtCore','advancedAtCore','cells','damageOnlyCells','nextCell','affectedActorKeys'])
   ||!firefoamInteger290(v.id,1)||!firefoamInteger290(v.sourceId,1,v.id-1)||!firefoamData290(v.center,['x','z'])||!firefoamInteger290(v.center.x)||!firefoamInteger290(v.center.z)
   ||!firefoamInteger290(v.startedAtCore)||!firefoamInteger290(v.advancedAtCore,v.startedAtCore)||!firefoamDense290(v.cells,441)||!v.cells.length
   ||!v.cells.every(n=>firefoamInteger290(n))||new Set(v.cells).size!==v.cells.length||!firefoamDense290(v.damageOnlyCells,441)
   ||!v.damageOnlyCells.every(n=>firefoamInteger290(n))||new Set(v.damageOnlyCells).size!==v.damageOnlyCells.length
   ||!v.damageOnlyCells.every(n=>(v.cells as number[]).includes(n as number))||!firefoamInteger290(v.nextCell,0,v.cells.length)||!firefoamDense290(v.affectedActorKeys,131072))return false;
  return v.affectedActorKeys.every((k,n,all)=>typeof k==='string'&&/^(pawn|animal|mech):[1-9]\d*$/.test(k)&&firefoamInteger290(Number(k.slice(k.indexOf(':')+1)),1)
   &&(n===0||(all[n-1] as string)<k));
 }catch{return false;}
}
export function validFirefoamWorldShape290(v:unknown,version:number):v is FirefoamWorld290{
 try{return (version===290||version===291)&&firefoamData290(v,['rng','waves'])&&firefoamInteger290(v.rng,1,0xffffffff)&&firefoamDense290(v.waves,1_000_000)&&v.waves.every(w=>validFirefoamWaveShape290(w,version));}catch{return false;}
}
export const firefoamCellCore290=(width:number,wave:FirefoamWave290,index:number)=>wave.startedAtCore+Math.floor(Math.hypot(index%width-wave.center.x,Math.floor(index/width)-wave.center.z)*1.5);
