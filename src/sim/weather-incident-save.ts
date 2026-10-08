import {MISC_CHECK_INTERVAL,MISC_FIRST_CHECK,MISC_INTRO_TICK,MISC_COLD_COOLDOWN,MISC_ECLIPSE_COOLDOWN,type CassandraMiscCalendar} from './cassandra-misc.ts';
import {TICKS_PER_DAY,type World} from './types.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const keys=(v:Record<string,unknown>,required:string[],optional:string[]=[])=>required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k));

/** Prospective climate incidents share the existing Misc opportunities, not
 * a second storyteller stream. Histories do not allocate entities or owners. */
export function validWeatherIncidents(value:unknown,version:number,w:Pick<World,'tick'>,calendar:Pick<CassandraMiscCalendar,'adoptedAt'|'heatwaves'|'opportunities'|'active'>):boolean {
  if(value===undefined)return true;
  if(version<200||!object(value)||!keys(value,['adoptedAt','coldSnaps','eclipses'],['lastColdSnapStart','lastEclipseStart','coldSnap','eclipse'])
    ||!int(value.adoptedAt,calendar.adoptedAt,w.tick)||!int(value.coldSnaps)||!int(value.eclipses)
    ||value.coldSnaps+value.eclipses+calendar.heatwaves>calendar.opportunities)return false;
  const checks:[string,string,string,number,number,number][]=[
    ['coldSnaps','lastColdSnapStart','coldSnap',MISC_COLD_COOLDOWN,1.5*TICKS_PER_DAY,3.5*TICKS_PER_DAY],
    ['eclipses','lastEclipseStart','eclipse',MISC_ECLIPSE_COOLDOWN,.75*TICKS_PER_DAY,1.25*TICKS_PER_DAY],
  ];
  for(const [countKey,lastKey,activeKey,cooldown,minDuration,maxDuration] of checks){
    const count=Number(value[countKey]),last=value[lastKey],active=value[activeKey];
    if(count===0){if(last!==undefined||active!==undefined)return false;continue;}
    if(!int(last,value.adoptedAt,w.tick)
      ||!(last===MISC_INTRO_TICK&&calendar.adoptedAt<MISC_INTRO_TICK||last>=MISC_FIRST_CHECK&&last%MISC_CHECK_INTERVAL===0)
      ||last-value.adoptedAt<(count-1)*cooldown)return false;
    if(active!==undefined){
      if(!object(active)||!keys(active,['start','end'])||active.start!==last||!int(active.end,w.tick+1)
        ||active.end-last<minDuration||active.end-last>=maxDuration)return false;
    }else if(w.tick-last<minDuration)return false;
  }
  return !(value.coldSnap!==undefined&&calendar.active!==undefined);
}
