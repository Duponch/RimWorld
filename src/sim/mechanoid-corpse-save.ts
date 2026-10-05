import { validMechaMedicalRecord } from './mechanoid-save.ts';
import type { World } from './types.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function validMechCorpseShape(value:unknown,version:number,tick:number):boolean {
  if(!object(value))return false;
  const mechanical=value.kind==='mech-corpse'||value.item==='scyther-corpse';
  if(!mechanical)return value.mechCorpse===undefined;
  const c=value.mechCorpse,o=value.owner;
  return version>=194&&value.kind==='mech-corpse'&&value.item==='scyther-corpse'&&value.quantity===1
    &&object(c)&&Object.keys(c).every(k=>['mechKind','health','heading'].includes(k))&&c.mechKind==='scyther'
    &&validMechaMedicalRecord(c.health,tick,true)
    &&(c.heading===undefined||typeof c.heading==='number'&&Number.isFinite(c.heading)&&Math.abs(c.heading)<=Math.PI*2)
    &&object(o)&&['ground','pawn'].includes(String(o.type))
    &&['corpse','humanCorpse','rot','foodPoison','apparel','weapon','unfinished','artWork','gunWork','flakWork','componentWork'].every(k=>value[k]===undefined);
}
export function validMechSalvageLedger(w:World,version:number):boolean {
  const s=w.mechSalvage;
  return s===undefined||version>=194&&object(s)&&Object.keys(s).length===2&&Number.isSafeInteger(s.completed)&&s.completed>0
    &&Number.isSafeInteger(s.steel)&&s.steel>=0&&s.steel<=s.completed*23;
}
