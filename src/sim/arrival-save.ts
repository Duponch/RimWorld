import { TICKS_PER_DAY,type World } from './types.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
export function validateArrivals(world:World,version:number):string[] {
  const errors:string[]=[];const s:unknown=world.arrivals;
  if(s!==undefined) {
    if(version<66)return ['Legacy save contains arrival state.'];
    if(!object(s)||Object.keys(s).some(k=>!['profile','rng','nextCheck','serial','accepted','declined','expired','pending'].includes(k))||s.profile!=='camp-arrivals-v1'||!integer(s.rng,1,4294967295)||!integer(s.nextCheck,world.tick+1,world.tick+8*TICKS_PER_DAY)||!['serial','accepted','declined','expired'].every(k=>integer(s[k],0)))return ['Invalid arrival calendar.'];
    const o=s.pending;
    if(o!==undefined&&(!object(o)||Object.keys(o).some(k=>!['id','openedAt','expiresAt','name','profile'].includes(k))||o.id!==s.serial||!integer(o.id,1)||!integer(o.openedAt,0,world.tick)||!integer(o.expiresAt,world.tick+1)||Number(o.expiresAt)!==Number(o.openedAt)+TICKS_PER_DAY||typeof o.name!=='string'||!o.name.trim()||o.name.length>48||!integer(o.profile,0,2)))errors.push('Invalid arrival offer.');
    if(Number(s.serial)!==Number(s.accepted)+Number(s.declined)+Number(s.expired)+(o===undefined?0:1))errors.push('Inconsistent arrival outcomes.');
  }
  for(const p of world.pawns)if(p.deniedJoining!==undefined) {
    const m:unknown=p.deniedJoining;
    if(version<66||!Array.isArray(m)||m.length<1||m.length>5||!m.every((t,i)=>integer(t,world.tick+1,world.tick+6*TICKS_PER_DAY)&&(i===0||Number(t)>Number(m[i-1]))))errors.push('Invalid denied joining memories.');
  }
  return errors;
}
