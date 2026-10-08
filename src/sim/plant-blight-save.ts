import { MISC_CHECK_INTERVAL,MISC_FIRST_CHECK,MISC_INTRO_TICK,type CassandraMiscCalendar } from './cassandra-misc.ts';
import { TICKS_PER_DAY,type World } from './types.ts';
import type { CropBlightState } from './plant-blight.ts';

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const exact=(v:Record<string,unknown>,required:readonly string[],optional:readonly string[]=[])=>required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k));

function validState(value:unknown,id:number,tick:number):value is CropBlightState {
  return record(value)&&exact(value,['since','severity','lastHarmTick','nextCheck','rng'])
    &&integer(value.since,0,tick)&&typeof value.severity==='number'&&Number.isFinite(value.severity)&&value.severity>=.2&&value.severity<=1
    &&integer(value.lastHarmTick,value.since,tick)&&integer(value.nextCheck,tick+1,tick+200)&&value.nextCheck%200===(id%200+1)%200
    &&integer(value.rng,1,0xffffffff);
}

/** Shared numeric boundary for serialized resources, upserts and growth-only
 * reconstructions. Unknown values never become a plant through coercion. */
export function validCropBlight(plant:unknown,version:number,world:Pick<World,'tick'>):boolean {
  if(!record(plant))return false;
  if(plant.blight===undefined)return !Object.hasOwn(plant,'blight')||version>=205;
  return version>=205&&typeof plant.kind==='string'&&['rice','potato','corn','cotton','healroot'].includes(plant.kind)&&plant.species===undefined
    &&integer(plant.id,1)&&typeof plant.growth==='number'&&Number.isFinite(plant.growth)&&plant.growth>=.0001&&plant.growth<=1
    &&integer(plant.growthTick,0,world.tick)&&validState(plant.blight,plant.id,world.tick);
}

/** A successful incident consumes one existing Misc opportunity. Adoption is
 * prospective and the 30-day cooldown constrains the possible history. */
export function validCropBlightCalendar(value:unknown,version:number,world:Pick<World,'tick'|'gameProfile'>,calendar:Pick<CassandraMiscCalendar,'adoptedAt'|'opportunities'>):boolean {
  if(value===undefined)return true;
  if(version<205||!world.gameProfile||!record(value)||!exact(value,['adoptedAt','count'],['lastStart'])
    ||!integer(calendar.adoptedAt,0,world.tick)||!integer(calendar.opportunities)
    ||!integer(value.adoptedAt,calendar.adoptedAt,world.tick)||!integer(value.count,0,calendar.opportunities))return false;
  if(value.count===0)return value.lastStart===undefined;
  const first=value.adoptedAt<MISC_INTRO_TICK&&calendar.adoptedAt<MISC_INTRO_TICK?MISC_INTRO_TICK
    :Math.max(MISC_FIRST_CHECK,(Math.floor(value.adoptedAt/MISC_CHECK_INTERVAL)+1)*MISC_CHECK_INTERVAL);
  const earliest=first+(value.count-1)*30*TICKS_PER_DAY;
  return integer(earliest)&&integer(value.lastStart,first,world.tick)&&value.lastStart>=earliest
    &&(value.lastStart===MISC_INTRO_TICK&&value.adoptedAt<MISC_INTRO_TICK&&calendar.adoptedAt<MISC_INTRO_TICK
      ||value.lastStart>=MISC_FIRST_CHECK&&value.lastStart%MISC_CHECK_INTERVAL===0);
}
