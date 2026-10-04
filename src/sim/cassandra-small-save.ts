import { SMALL_ACTIVE_TICKS,SMALL_CHECK_INTERVAL,SMALL_CYCLE_START,SMALL_CYCLE_TICKS,
  SMALL_INTRO_TICK,SMALL_REFIRE_TICKS,smallCycleAt,smallNextCheck } from './cassandra-small.ts';
import type { World } from './types.ts';

const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const integer=(value:unknown,min=0,max=Number.MAX_SAFE_INTEGER):value is number=>Number.isSafeInteger(value)&&Number(value)>=min&&Number(value)<=max;
const keys=(value:Record<string,unknown>,allowed:readonly string[])=>Object.keys(value).every(key=>allowed.includes(key));

function validIncidentTick(tick:number,adoptedAt:number):boolean {
  if(tick<=adoptedAt)return false;
  if(tick===SMALL_INTRO_TICK)return adoptedAt<SMALL_INTRO_TICK;
  const cycle=smallCycleAt(tick);
  if(cycle<0||tick===SMALL_CYCLE_START||cycle<=smallCycleAt(adoptedAt)||tick%SMALL_CHECK_INTERVAL!==0)return false;
  return tick<SMALL_CYCLE_START+cycle*SMALL_CYCLE_TICKS+SMALL_ACTIVE_TICKS;
}

/** Validate the source before neutral 182→183 migration too. No hidden future
 * state, pending past date or impossible count can survive a save/snapshot. */
export function validSmallIncidents(value:unknown,version:number,world:Pick<World,'tick'|'gameProfile'>):boolean {
  if(value===undefined)return true;
  if(version<183||!world.gameProfile||!object(value)||
    !keys(value,['profile','adoptedAt','rng','nextCheck','cycle','pending','introDone','opportunities','incidents','lastIncidentTick'])||
    value.profile!=='cassandra-small-v1'||!integer(value.adoptedAt,0,world.tick)||!integer(value.rng,1,0xffffffff)||
    !integer(value.nextCheck,SMALL_CYCLE_START)||value.nextCheck!==smallNextCheck(world.tick)||
    !integer(value.cycle,-1)||value.cycle!==smallCycleAt(world.tick)||
    !Array.isArray(value.pending)||value.pending.length>1||
    typeof value.introDone!=='boolean'||value.introDone!==(world.tick>=SMALL_INTRO_TICK)||
    !integer(value.opportunities)||!integer(value.incidents)||value.incidents>value.opportunities)return false;
  const cycle=value.cycle,opened=cycle-smallCycleAt(value.adoptedAt),
    intro=value.introDone&&value.adoptedAt<SMALL_INTRO_TICK?1:0;
  if(value.opportunities+value.pending.length>opened+intro)return false;
  if(value.pending.length){
    const time=value.pending[0],start=SMALL_CYCLE_START+cycle*SMALL_CYCLE_TICKS;
    if(cycle<0||!integer(time,Math.max(start,world.tick+1),start+SMALL_ACTIVE_TICKS-SMALL_CHECK_INTERVAL)||
      !validIncidentTick(time,value.adoptedAt))return false;
  }
  if(value.lastIncidentTick!==undefined){
    if(!integer(value.lastIncidentTick,0,world.tick)||value.incidents===0||
      !validIncidentTick(value.lastIncidentTick,value.adoptedAt))return false;
    const earliest=value.adoptedAt<SMALL_INTRO_TICK?SMALL_INTRO_TICK:
      SMALL_CYCLE_START+(smallCycleAt(value.adoptedAt)+1)*SMALL_CYCLE_TICKS;
    if(value.lastIncidentTick<earliest+(value.incidents-1)*SMALL_REFIRE_TICKS)return false;
  } else if(value.incidents!==0)return false;
  return true;
}

export function validateSmallIncidents(world:World,version=world.schemaVersion):string[] {
  return validSmallIncidents(world.smallIncidents,version,world)?[]:['Invalid Cassandra small-threat calendar.'];
}
