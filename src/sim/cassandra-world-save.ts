import { WORLD_FIRST_CHECK,WORLD_CHECK_INTERVAL,SOLAR_FLARE_COOLDOWN } from './cassandra-world.ts';
import type { World } from './types.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const keys=(v:Record<string,unknown>,allowed:readonly string[])=>Object.keys(v).every(k=>allowed.includes(k));
export function validWorldIncidents(value:unknown,version:number,world:Pick<World,'tick'|'gameProfile'>):boolean {
  if(value===undefined)return true;
  if(version<184||!world.gameProfile||!object(value)||
    !keys(value,['profile','adoptedAt','rng','nextCheck','checks','opportunities','flares','lastStart','lastEndCore','active'])||
    value.profile!=='cassandra-world-v1'||!integer(value.adoptedAt,0,world.tick)||!integer(value.rng,1,0xffffffff)||
    !integer(value.nextCheck,WORLD_FIRST_CHECK)||value.nextCheck%WORLD_CHECK_INTERVAL!==0||
    value.nextCheck!==Math.max(WORLD_FIRST_CHECK,(Math.floor(world.tick/WORLD_CHECK_INTERVAL)+1)*WORLD_CHECK_INTERVAL)||
    !integer(value.checks)||!integer(value.opportunities,0,value.checks)||!integer(value.flares,0,value.opportunities))return false;
  const first=Math.max(WORLD_FIRST_CHECK,(Math.floor(value.adoptedAt/WORLD_CHECK_INTERVAL)+1)*WORLD_CHECK_INTERVAL);
  if(value.checks>Math.max(0,Math.floor((world.tick-first)/WORLD_CHECK_INTERVAL)+1))return false;
  if(value.flares===0)return value.lastStart===undefined&&value.lastEndCore===undefined&&value.active===undefined;
  if(!integer(value.lastStart,first+(value.flares-1)*SOLAR_FLARE_COOLDOWN,world.tick)||
    value.lastStart%WORLD_CHECK_INTERVAL!==0||!integer(value.lastEndCore,value.lastStart*10+9000,value.lastStart*10+30000))return false;
  if(value.active!==undefined){
    const a=value.active;
    if(!object(a)||!keys(a,['start','endCore'])||Object.keys(a).length!==2||
      a.start!==value.lastStart||a.endCore!==value.lastEndCore||value.lastEndCore<world.tick*10)return false;
  }else if(world.tick*10<=value.lastEndCore)return false;
  return true;
}
