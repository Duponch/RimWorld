import type { MedicalRecord } from './injury-types.ts';
import { FLU_TEND_DURATION_CORE,FLU_TEND_OVERLAP_CORE,FLU_UNIT } from './flu-rules.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const keys=(v:Record<string,unknown>,allowed:readonly string[])=>Object.keys(v).every(k=>allowed.includes(k));

export function validFlu(record:MedicalRecord,allowed:boolean):boolean {
  const value:unknown=record.flu;
  if(value===undefined)return true;
  if(!allowed||record.body||!object(value)||!keys(value,['bornAt','severity','immunity','luck','tend','vomit'])||
    !integer(value.bornAt,0,record.tick)||!integer(value.severity,0,FLU_UNIT)||!integer(value.immunity,0,FLU_UNIT)||
    !integer(value.luck,800_000,1_200_000)||!value.severity&&!value.immunity&&!value.vomit)return false;
  const tend=value.tend;
  if(tend!==undefined&&(!value.severity||!object(tend)||!keys(tend,['quality','expiresAtCore'])||!integer(tend.quality,0,1300)||
    !integer(tend.expiresAtCore,Number(value.bornAt)*10+FLU_TEND_DURATION_CORE,record.tick*10+FLU_TEND_DURATION_CORE+FLU_TEND_OVERLAP_CORE-1)))return false;
  const vomit=value.vomit;
  return vomit===undefined||object(vomit)&&keys(vomit,['remainingCore','cell'])&&integer(vomit.remainingCore,1,899)&&
    object(vomit.cell)&&keys(vomit.cell,['x','z'])&&integer(vomit.cell.x,0)&&integer(vomit.cell.z,0);
}
