import { xpRequired } from './skills.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min:number,max:number):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
export function validSkills(value:unknown,tick:number,version=59):boolean {
  if(!object(value)||Object.keys(value).some(k=>k!=='construction'&&k!=='lastResetTick'&&!(version>=47&&k==='medicine')&&!(version>=56&&k==='shooting')&&!(version>=59&&k==='melee'))||!integer(value.lastResetTick,-1,tick))return false;
  const multiplier=version>=69?1.75:1;
  return validSkill(value.construction,22500000*multiplier)&&(version<47||validSkill(value.medicine,22500000*multiplier))&&(version<56||validSkill(value.shooting,22500000*multiplier))&&(version<59||validSkill(value.melee,80000000*multiplier));
}
function validSkill(s:unknown,dailyMax=22500000):boolean {
  if(!object(s)||Object.keys(s).some(k=>!['level','xp','dailyXp','passion'].includes(k))||!integer(s.level,0,20)||!integer(s.passion,0,2))return false;
  if(!integer(s.xp,s.level===0?0:-1000*1000+1,xpRequired(s.level)-(s.level===20?1000:1)))return false;
  // Conservative bounds for the maximum supported learning profile (legacy bounds remain strict), per day.
  return integer(s.dailyXp,-3600000,dailyMax);
}
