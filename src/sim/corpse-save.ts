import { validateMedicalRecord } from './injury-validation.ts';
import type { World } from './types.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
/** Corpses may keep ageing beyond either rotting threshold. The body remains an
 * object; time changes its usability, not its existence or its owner. */
export function validCorpseRot(v:unknown,tick:number,death:number):boolean {
  return object(v)&&Object.keys(v).every(k=>['progress','atTick','rate'].includes(k))&&int(v.atTick,death,tick)
    &&typeof v.progress==='number'&&Number.isFinite(v.progress)&&v.progress>=0&&v.progress<=Number(v.atTick)-death
    &&(v.rate===undefined||typeof v.rate==='number'&&Number.isFinite(v.rate)&&v.rate>=0&&v.rate<1);
}
export function validCorpseShape(p:Record<string,unknown>,version:number):boolean {
  if(p.kind!=='corpse')return p.corpse===undefined;
  const c=p.corpse;
  return version>=79&&p.item==='hare-corpse'&&p.quantity===1&&object(p.owner)&&['ground','pawn'].includes(String(p.owner.type))&&object(c)
    &&Object.keys(c).every(k=>['animalId','species','sex','health','facing'].includes(k))&&c.animalId===p.id&&c.species==='hare'&&['female','male'].includes(String(c.sex))
    &&(c.facing===undefined||typeof c.facing==='number'&&Number.isFinite(c.facing)&&Math.abs(c.facing)<=Math.PI)
    &&validateMedicalRecord(c.health,true,true,false,false,true,version>=79,version>=81)===null&&object(c.health)&&object(c.health.death);
}
export function validateCorpses(w:World,version:number):string[] {
  const errors:string[]=[];
  for(const p of w.piles)if(p.kind==='corpse') {
    if(!validCorpseShape(p as unknown as Record<string,unknown>,version)){errors.push('Invalid corpse state.');continue;}
    const c=p.corpse!;
    if(!validCorpseRot(p.rot,w.tick,c.health.death!.tick)||c.health.tick>w.tick||Array.isArray(w.wildlife?.animals)&&w.wildlife.animals.some(a=>a?.id===c.animalId))errors.push('Invalid corpse age, clock or duplicated animal.');
  }
  return errors;
}
