import { MISC_CHECK_INTERVAL,MISC_FIRST_CHECK,MISC_INTRO_TICK } from './cassandra-misc.ts';
import { validMiscIncidents } from './cassandra-misc-save.ts';
import { FLASHSTORM_COOLDOWN } from './flashstorm.ts';
import type { World } from './types.ts';

const object=(value:unknown):value is Record<string,unknown>=>
  value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=(value:unknown,min=0,max=Number.MAX_SAFE_INTEGER):value is number=>
  typeof value==='number'&&Number.isSafeInteger(value)&&value>=min&&value<=max;
const exactKeys=(value:Record<string,unknown>,required:readonly string[],optional:readonly string[]=[])=>
  required.every(key=>Object.hasOwn(value,key))&&Object.keys(value).every(key=>required.includes(key)||optional.includes(key));
const opportunity=(tick:number,adoptedAt:number)=>
  tick===MISC_INTRO_TICK&&adoptedAt<MISC_INTRO_TICK||
  tick>=MISC_FIRST_CHECK&&tick%MISC_CHECK_INTERVAL===0&&tick>adoptedAt;

/** Strict serialized and transported shape. No coercion, unknown properties,
 * retrospective start, or inferred strike is accepted. */
export function validFlashstorm(value:unknown,version:number,
  world:Pick<World,'tick'|'width'|'height'|'gameProfile'|'weather'|'miscIncidents'|'heatwaves'>):boolean {
  if(value===undefined)return true;
  if(version<173||!world.gameProfile||!world.miscIncidents||
    !validMiscIncidents(world.miscIncidents,version,world)||!world.weather||
    !integer(world.weather.lightningCount)||
    world.width<=16||world.height<=16||!object(value)||
    !exactKeys(value,['revision','rng','storms','totalStrikes','lastStart','lastEnd'],['active'])||
    value.revision!==1||!integer(value.rng,1,0xffffffff)||!integer(value.storms,1)||
    !integer(value.totalStrikes)||!integer(value.lastStart,world.miscIncidents.adoptedAt,world.tick)||
    !integer(value.lastEnd)||!opportunity(value.lastStart,world.miscIncidents.adoptedAt)||
    value.lastEnd-value.lastStart<451||value.lastEnd-value.lastStart>601||
    value.storms>world.miscIncidents.opportunities-world.miscIncidents.heatwaves||
    value.totalStrikes>Math.min(Number.MAX_SAFE_INTEGER,value.storms*20)||
    value.totalStrikes>world.weather.lightningCount||
    value.lastStart<Math.min(Number.MAX_SAFE_INTEGER,
      (world.miscIncidents.adoptedAt<MISC_INTRO_TICK?MISC_INTRO_TICK:
        Math.max(MISC_FIRST_CHECK,(Math.floor(world.miscIncidents.adoptedAt/MISC_CHECK_INTERVAL)+1)*MISC_CHECK_INTERVAL))+
      (value.storms-1)*FLASHSTORM_COOLDOWN))return false;
  if(value.active===undefined)return world.tick>=value.lastEnd;
  const active=value.active;
  if(!object(active)||!exactKeys(active,['start','end','endCore','center','radius','lastCoreTick','nextStrikeCore','strikes'])||
    !integer(active.start)||active.start!==value.lastStart||!integer(active.end)||active.end!==value.lastEnd||
    !integer(active.endCore,active.start*10+4500,active.start*10+6000)||
    active.end!==Math.floor(active.endCore/10)+1||world.tick>=active.end||
    !integer(active.radius,45,60)||!object(active.center)||!exactKeys(active.center,['x','z'])||
    !integer(active.center.x,8,world.width-9)||!integer(active.center.z,8,world.height-9)||
    !integer(active.lastCoreTick)||active.lastCoreTick!==world.tick*10||
    !integer(active.nextStrikeCore,active.start*10,active.endCore+800)||
    !integer(active.strikes,0,20)||active.strikes>value.totalStrikes||
    value.totalStrikes-active.strikes>Math.min(Number.MAX_SAFE_INTEGER,(value.storms-1)*20)||
    active.strikes>Math.max(0,1+Math.floor((active.lastCoreTick-active.start*10-1)/321))||
    active.strikes===0&&active.nextStrikeCore!==active.start*10||
    active.strikes>0&&(active.nextStrikeCore<active.start*10+321||active.nextStrikeCore>active.lastCoreTick+800))return false;
  return true;
}

export function validateFlashstorm(world:World,version=world.schemaVersion):string[] {
  return validFlashstorm(world.flashstorm,version,world)?[]:['Invalid flashstorm state.'];
}
