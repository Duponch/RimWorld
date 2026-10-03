import { climateTick,seasonTemperature,siteClimateDefinition } from './site-climate.ts';
import { eligibleFlashstorm,resolveSelectedFlashstorm } from './flashstorm.ts';
import { resolveSelectedPodRescue } from './pod-rescue.ts';
import { TICKS_PER_DAY,type World } from './types.ts';

/** A deliberately fixed local envelope for the Core Misc category. Core
 * filters and storyteller population intent change the effective weights;
 * unsupported incidents keep their tickets rather than becoming heat waves. */
export const MISC_FIRST_CHECK=5*TICKS_PER_DAY+100;
export const MISC_INTRO_TICK=Math.round(4.4*TICKS_PER_DAY);
export const MISC_CHECK_INTERVAL=100;
export const MISC_CATEGORY_CHANCE=MISC_CHECK_INTERVAL/(4.8*TICKS_PER_DAY);
export const MISC_RAW_WEIGHT=16.9;
export const MISC_HEAT_WEIGHT=1;
export const MISC_FLASHSTORM_WEIGHT=.4;
export const MISC_POD_WEIGHT=1.5;
export const MISC_HEAT_COOLDOWN=30*TICKS_PER_DAY;

export interface CassandraMiscCalendar {
  profile:'cassandra-misc-v1';
  adoptedAt:number;
  rng:number;
  nextCheck:number;
  introDone:boolean;
  checks:number;
  opportunities:number;
  heatwaves:number;
  lastHeatwaveStart?:number;
  active?:{start:number;end:number};
}

function random(state:CassandraMiscCalendar):number {
  let value=state.rng;
  value^=value<<13;value^=value>>>17;value^=value<<5;
  state.rng=value>>>0;
  return state.rng/0x100000000;
}
function emit(world:World,message:string):void {
  world.events.push({tick:world.tick,type:'need',message});
  if(world.events.length>80)world.events.splice(0,world.events.length-80);
}

/** A continuation starts from the next check, with no retrospective draws. */
export function adoptMiscIncidents(world:World):void {
  if(!world.gameProfile||world.miscIncidents)return;
  world.miscIncidents={profile:'cassandra-misc-v1',adoptedAt:world.tick,
    rng:((world.seed^0x4c5ca180)>>>0)||1,
    nextCheck:Math.max(MISC_FIRST_CHECK,(Math.floor(world.tick/MISC_CHECK_INTERVAL)+1)*MISC_CHECK_INTERVAL),
    introDone:world.tick>=MISC_INTRO_TICK,checks:0,opportunities:0,heatwaves:0};
}

/** The daily temperature swing is not a seasonal eligibility signal. */
export function eligibleMiscHeatwave(world:World,state:CassandraMiscCalendar=world.miscIncidents!):boolean {
  if(!world.gameProfile||!world.climate||!state||state.active||world.heatwaves?.active||
    state.lastHeatwaveStart!==undefined&&world.tick-state.lastHeatwaveStart<MISC_HEAT_COOLDOWN)return false;
  const site=siteClimateDefinition(world);
  return seasonTemperature(site.latitude,site.meanTemperature,climateTick(world))>=20;
}

/** Only a selected heat ticket reaches this point. An ineligible ticket is
 * consumed; it cannot create a later guaranteed heat wave. */
export function resolveSelectedHeatwave(world:World,state:CassandraMiscCalendar=world.miscIncidents!):boolean {
  if(!eligibleMiscHeatwave(world,state))return false;
  const start=world.tick;
  const end=start+Math.floor((1.5+2*random(state))*TICKS_PER_DAY);
  state.active={start,end};state.lastHeatwaveStart=start;state.heatwaves++;
  emit(world,'Canicule : préparez une pièce fermée et refroidie, du bois et des vêtements adaptés. Surveillez les coups de chaleur.');
  return true;
}

function consumeOpportunity(world:World,state:CassandraMiscCalendar):void {
  state.opportunities++;
  const ticket=random(state)*MISC_RAW_WEIGHT;
  if(ticket<MISC_HEAT_WEIGHT)resolveSelectedHeatwave(world,state);
  else if(ticket<MISC_HEAT_WEIGHT+MISC_FLASHSTORM_WEIGHT&&eligibleFlashstorm(world)){
    resolveSelectedFlashstorm(world,Math.floor(random(state)*0x100000000)||1);
  }
  else if(ticket>=MISC_HEAT_WEIGHT+MISC_FLASHSTORM_WEIGHT&&ticket<MISC_HEAT_WEIGHT+MISC_FLASHSTORM_WEIGHT+MISC_POD_WEIGHT){
    resolveSelectedPodRescue(world,Math.floor(random(state)*0x100000000)||1);
  }
}

/** End is processed before any draw at the same tick. The introductory
 * opportunity exists only for calendars adopted strictly before its tick. */
export function advanceMiscIncidents(world:World):void {
  const state=world.miscIncidents;
  if(!state||!world.gameProfile)return;
  if(state.active&&world.tick>=state.active.end){
    delete state.active;
    emit(world,'La canicule se termine. Les pièces retrouvent progressivement leur température habituelle.');
  }
  if(!state.introDone&&world.tick>=MISC_INTRO_TICK){
    state.introDone=true;
    if(world.tick===MISC_INTRO_TICK)consumeOpportunity(world,state);
  }
  if(world.tick<state.nextCheck)return;
  // A skipped time span never replays old rolls at the current tick.
  state.nextCheck=Math.max(MISC_FIRST_CHECK,(Math.floor(world.tick/MISC_CHECK_INTERVAL)+1)*MISC_CHECK_INTERVAL);
  if(world.tick%MISC_CHECK_INTERVAL!==0)return;
  state.checks++;
  if(random(state)<MISC_CATEGORY_CHANCE)consumeOpportunity(world,state);
}
