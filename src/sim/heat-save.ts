import type { World } from './types.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const keys=(v:object,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k));
export function validateHeat(world:World,version:number):string[] {
  const errors:string[]=[],s=world.heatwaves;
  if(s!==undefined){
    if(version<74||!object(s)||!keys(s,['profile','rng','nextAt','serial','active','lastEnd'])||s.profile!=='camp-heat-v1'||!integer(s.rng,1,0xffffffff)||!integer(s.nextAt)||!integer(s.serial)||s.lastEnd!==undefined&&!integer(s.lastEnd,0,world.tick))errors.push('Invalid heatwave calendar.');
    else if(s.active!==undefined){const a=s.active;if(!object(a)||!keys(a,['start','end'])||!integer(a.start,0,world.tick)||!integer(a.end,world.tick+1)||a.end-a.start<9000||a.end-a.start>21000||s.serial<1||s.nextAt<a.end||s.lastEnd!==undefined&&s.lastEnd>=a.start)errors.push('Invalid heatwave interval.');}
  }
  for(const p of world.pawns){const t=p.heatRefuge;if(t===undefined)continue;
    if(version<74||!object(t)||!keys(t,['target','until'])||!object(t.target)||!keys(t.target,['x','z'])||!integer(t.target.x,0,world.width-1)||!integer(t.target.z,0,world.height-1)||!integer(t.until,0,world.tick+500)){errors.push('Invalid heat refuge.');continue;}
    if(p.jobId!==null||p.need||p.haul||p.cooking||p.research||p.recreation.task||p.equipmentTask||p.rescue||p.tend||p.feed||p.draft||p.shooting||p.melee||p.flee||p.tactics||p.raid||p.mental?.crisis||p.orders.active!==null||!['moving','idle'].includes(p.state))errors.push('Incompatible heat refuge activity.');
  }
  return errors;
}
