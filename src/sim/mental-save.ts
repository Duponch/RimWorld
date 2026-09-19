import type { World } from './types.ts';
import { isColonist } from './affiliation.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,lo:number,hi:number)=>Number.isSafeInteger(v)&&Number(v)>=lo&&Number(v)<=hi;
export function validateMental(world:World,version:number):string[] {
  const errors:string[]=[];
  for(const p of world.pawns) {
    const m:unknown=p.mental;if(m===undefined)continue;
    if(version<65){errors.push('Legacy mental state.');continue;}
    if(!isColonist(p)||!object(m)||Object.keys(m).some(k=>!['below','cooldown','catharsis','crisis'].includes(k))||!Array.isArray(m.below)||m.below.length!==3||!m.below.every(n=>integer(n,0,2100)&&Number(n)%150===0)||!integer(m.cooldown,0,1500)||!Array.isArray(m.catharsis)||m.catharsis.length>5||!m.catharsis.every((n,i,a)=>integer(n,world.tick+1,world.tick+18000)&&(i===0||Number(n)>Number(a[i-1])))){errors.push('Invalid mental state.');continue;}
    if(Number(m.below[0])<Number(m.below[1])||Number(m.below[1])<Number(m.below[2]))errors.push('Invalid mental exposure.');
    if(m.crisis!==undefined) {
      const c=m.crisis;
      if(!object(c)||Object.keys(c).some(k=>!['kind','age','target','waitUntil'].includes(k))||c.kind!=='sad-wander'||!integer(c.age,0,59999)||Number(c.age)%30!==0||typeof c.waitUntil!=='number'||!Number.isFinite(c.waitUntil)||c.waitUntil<0||c.waitUntil>world.tick+20.1||!(c.target===null||object(c.target)&&Object.keys(c.target).every(k=>k==='x'||k==='z')&&integer(c.target.x,0,world.width-1)&&integer(c.target.z,0,world.height-1)))errors.push('Invalid sad wander.');
      else if(!p.need&&p.path.length) {
        const end=p.path.at(-1)!;
        if(!object(c.target)||end.x!==c.target.x||end.z!==c.target.z)errors.push('Mental route has no matching destination.');
      }
      if(p.state==='dead'||p.state==='downed'||p.draft||p.shooting||p.melee||p.flee||p.tactics||p.jobId!==null||p.haul||p.cooking||p.equipmentTask||p.feed||p.tend||p.rescue||p.recreation.task||p.orders.active!==null||p.orders.queue.length||p.priorityWork)errors.push('Conflicting mental task.');
      if(!p.need&&!['idle','moving','hungry'].includes(p.state))errors.push('Invalid mental posture.');
    }
  }
  return errors;
}
