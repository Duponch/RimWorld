import { xpRequired } from './skills.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
export function validSkills(value:unknown,tick:number):boolean {
  if(!object(value)||Object.keys(value).some(k=>k!=='construction'&&k!=='lastResetTick')||!integer(value.lastResetTick,-1,tick))return false;
  const s=value.construction;
  if(!object(s)||Object.keys(s).some(k=>!['level','xp','dailyXp','passion'].includes(k))||!integer(s.level,0,20)||!integer(s.passion,0,2))return false;
  if(!integer(s.xp,s.level===0?0:-1000*1000+1,xpRequired(s.level)-(s.level===20?1000:1)))return false;
  // Conservative bounds for the current neutral learning profile, per day.
  return integer(s.dailyXp,-3600000,22500000);
}
