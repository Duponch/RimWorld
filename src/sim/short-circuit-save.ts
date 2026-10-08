import {MISC_CHECK_INTERVAL,MISC_FIRST_CHECK,MISC_INTRO_TICK,type CassandraMiscCalendar} from './cassandra-misc.ts';
import {TICKS_PER_DAY,type World} from './types.ts';

type Context=Pick<World,'tick'>&Partial<Pick<World,'width'|'height'|'nextId'>>;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const keys=(v:Record<string,unknown>,required:string[],optional:string[]=[])=>required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k));

/** Last contact is historical data, never an owner of its source or damage. */
export function validShortCircuits(value:unknown,version:number,w:Context,calendar:Pick<CassandraMiscCalendar,'adoptedAt'|'opportunities'|'heatwaves'|'weather'>):boolean {
  if(value===undefined)return true;
  if(version<201||!object(value)||!keys(value,['adoptedAt','count'],['lastStart','last'])
    ||!int(value.adoptedAt,calendar.adoptedAt,w.tick)||!int(value.count)
    ||value.count+calendar.heatwaves+(calendar.weather?.coldSnaps??0)+(calendar.weather?.eclipses??0)>calendar.opportunities)return false;
  if(value.count===0)return value.last===undefined&&value.lastStart===undefined;
  const last=value.last,start=value.lastStart;
  const first=value.adoptedAt<MISC_INTRO_TICK&&calendar.adoptedAt<MISC_INTRO_TICK?MISC_INTRO_TICK
    :Math.max(MISC_FIRST_CHECK,(Math.floor(value.adoptedAt/MISC_CHECK_INTERVAL)+1)*MISC_CHECK_INTERVAL);
  if(!int(start,value.adoptedAt,w.tick)
    ||!(start===MISC_INTRO_TICK&&calendar.adoptedAt<MISC_INTRO_TICK||start>=MISC_FIRST_CHECK&&start%MISC_CHECK_INTERVAL===0)
    ||start<first+(value.count-1)*8*TICKS_PER_DAY
    ||!object(last)||!keys(last,['at','conduitId','center','energyWd','flameRadius','outcome'],['bombRadius','ignited'])
    ||last.at!==start||!int(w.nextId,2)||!int(last.conduitId,1,w.nextId-1)
    ||!int(w.width,1)||!int(w.height,1)||!object(last.center)||!keys(last.center,['x','z'])
    ||!int(last.center.x,0,w.width-1)||!int(last.center.z,0,w.height-1))return false;
  if(last.outcome==='fire')return last.energyWd===0&&last.flameRadius===0&&last.bombRadius===undefined&&typeof last.ignited==='boolean';
  if(last.outcome!=='discharge'||last.ignited!==undefined||typeof last.energyWd!=='number'||!Number.isFinite(last.energyWd)
    ||last.energyWd<=20||last.energyWd>w.width*w.height*600)return false;
  const halfQuanta=Math.round(last.energyWd*240000);
  if(!Number.isSafeInteger(halfQuanta)||last.energyWd!==halfQuanta/240000)return false;
  const radius=Math.max(1.5,Math.min(14.9,Math.sqrt(last.energyWd)*.05));
  return last.flameRadius===radius&&(radius>3.5?last.bombRadius===radius*.3:last.bombRadius===undefined);
}
