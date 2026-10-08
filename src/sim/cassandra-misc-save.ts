import { MISC_CHECK_INTERVAL,MISC_FIRST_CHECK,MISC_HEAT_COOLDOWN,MISC_INTRO_TICK } from './cassandra-misc.ts';
import { TICKS_PER_DAY,type World } from './types.ts';
import {validWeatherIncidents} from './weather-incident-save.ts';
import {validShortCircuits} from './short-circuit-save.ts';

const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const integer=(value:unknown,min=0,max=Number.MAX_SAFE_INTEGER):value is number=>Number.isSafeInteger(value)&&Number(value)>=min&&Number(value)<=max;
const keys=(value:Record<string,unknown>,allowed:readonly string[])=>Object.keys(value).every(key=>allowed.includes(key));

/** Called on the serialized source before a neutral 168→169 migration too. */
export function validMiscIncidents(value:unknown,version:number,world:Pick<World,'tick'|'gameProfile'|'heatwaves'>&Partial<Pick<World,'width'|'height'|'nextId'>>):boolean {
  if(value===undefined)return true;
  if(version<169||!world.gameProfile||!object(value)||
    !keys(value,['profile','adoptedAt','rng','nextCheck','introDone','checks','opportunities','heatwaves','lastHeatwaveStart','active',...version>=200?['weather']:[],...version>=201?['shortCircuits']:[]])||
    value.profile!=='cassandra-misc-v1'||!integer(value.adoptedAt,0,world.tick)||!integer(value.rng,1,0xffffffff)||
    !integer(value.nextCheck,MISC_FIRST_CHECK)||value.nextCheck%MISC_CHECK_INTERVAL!==0||
    value.nextCheck!==Math.max(MISC_FIRST_CHECK,(Math.floor(world.tick/MISC_CHECK_INTERVAL)+1)*MISC_CHECK_INTERVAL)||
    typeof value.introDone!=='boolean'||!integer(value.checks)||!integer(value.opportunities)||!integer(value.heatwaves)||
    value.checks>Math.max(0,Math.floor((world.tick-Math.max(MISC_FIRST_CHECK,(Math.floor(value.adoptedAt/MISC_CHECK_INTERVAL)+1)*MISC_CHECK_INTERVAL))/MISC_CHECK_INTERVAL)+1)||
    value.opportunities>value.checks+(value.introDone&&value.adoptedAt<MISC_INTRO_TICK?1:0)||
    value.heatwaves>value.opportunities||
    value.introDone!==(world.tick>=MISC_INTRO_TICK)||
    world.heatwaves!==undefined)return false;
  if(value.lastHeatwaveStart!==undefined&&(!integer(value.lastHeatwaveStart,value.adoptedAt,world.tick)||
    value.heatwaves===0||
    value.lastHeatwaveStart!==MISC_INTRO_TICK&&
      (value.lastHeatwaveStart<MISC_FIRST_CHECK||value.lastHeatwaveStart%MISC_CHECK_INTERVAL!==0)||
    value.lastHeatwaveStart===MISC_INTRO_TICK&&value.adoptedAt>=MISC_INTRO_TICK||
    value.lastHeatwaveStart<
      (value.adoptedAt<MISC_INTRO_TICK?MISC_INTRO_TICK:
        Math.max(MISC_FIRST_CHECK,(Math.floor(value.adoptedAt/MISC_CHECK_INTERVAL)+1)*MISC_CHECK_INTERVAL))+
      (value.heatwaves-1)*MISC_HEAT_COOLDOWN))return false;
  if(value.heatwaves>0&&value.lastHeatwaveStart===undefined)return false;
  if(value.active!==undefined){
    const active=value.active;
    if(!object(active)||!keys(active,['start','end'])||Object.keys(active).length!==2||
      !integer(active.start,value.adoptedAt,world.tick)||
      !integer(active.end,world.tick+1)||active.end-active.start<1.5*TICKS_PER_DAY||
      active.end-active.start>=3.5*TICKS_PER_DAY||active.start!==value.lastHeatwaveStart)return false;
  } else if(value.lastHeatwaveStart!==undefined&&world.tick-value.lastHeatwaveStart<1.5*TICKS_PER_DAY){
    return false;
  }
  const calendar=value as unknown as import('./cassandra-misc.ts').CassandraMiscCalendar;
  return validWeatherIncidents(value.weather,version,world,calendar)&&validShortCircuits(value.shortCircuits,version,world,calendar);
}

export function validateMiscIncidents(world:World,version=world.schemaVersion):string[] {
  return validMiscIncidents(world.miscIncidents,version,world)?[]:['Invalid Cassandra misc calendar.'];
}
