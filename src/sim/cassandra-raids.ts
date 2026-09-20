import { raidRandom,type RaidCalendar } from './raid-state.ts';
import { TICKS_PER_DAY,type World } from './types.ts';

export interface CassandraRaidAgenda {rng:number;cycle:number;pending:number[]}
export const INTRO_RAID_TICK=Math.round(TICKS_PER_DAY*5.4);
export const CASSANDRA_CYCLE_START=TICKS_PER_DAY*11;
export const CASSANDRA_ACTIVE_TICKS=Math.round(TICKS_PER_DAY*4.6);
export const CASSANDRA_CYCLE_TICKS=Math.round(TICKS_PER_DAY*10.6);
export const CASSANDRA_MIN_SPACING=Math.round(TICKS_PER_DAY*1.9);
const INTERVAL=100;

/** The source schedules opportunities on 1,000-Core-tick intervals. Keep its
 * active/rest windows and minimum spacing; our private PRNG is not Core's RNG.
 * Raid composition and selection beyond day 20 remain explicit adaptations. */
function prepareCycle(agenda:CassandraRaidAgenda):void {
  const start=CASSANDRA_CYCLE_START+agenda.cycle*CASSANDRA_CYCLE_TICKS;
  const count=raidRandom(agenda)<.5?1:2;
  for(let attempt=0;attempt<256;attempt++) {
    const times=Array.from({length:count},()=>Math.floor(raidRandom(agenda)*(CASSANDRA_ACTIVE_TICKS/INTERVAL))*INTERVAL).sort((a,b)=>a-b);
    if(times.length===2)times[1]=Math.max(times[1]!,times[0]!+CASSANDRA_MIN_SPACING);
    if(times.at(-1)!>CASSANDRA_ACTIVE_TICKS)continue;
    agenda.pending=times.map(t=>start+t);return;
  }
  throw new Error('Cannot schedule Cassandra raid opportunities.');
}
export function enableCassandraRaids(world:World):void {
  if(world.raids)throw new Error('Cannot replace an existing raid calendar.');
  world.raids={profile:'cassandra-raids-v1',rng:((world.seed^0x7a1d068)>>>0)||1,nextCheck:INTRO_RAID_TICK,serial:0,completed:0,departed:[],
    cassandra:{rng:((world.seed^0xc455a82)>>>0)||1,cycle:-1,pending:[INTRO_RAID_TICK]}};
}
/** A failed or occupied opportunity is consumed, never postponed into an
 * artificial guaranteed raid. Advancing a group cannot move the next cycle. */
export function consumeCassandraOpportunity(world:World,state:RaidCalendar):boolean {
  const agenda=state.cassandra;
  if(!agenda||world.tick<agenda.pending[0]!)return false;
  const due=world.tick===agenda.pending[0];
  while(agenda.pending[0]!<=world.tick) {
    agenda.pending.shift();
    if(!agenda.pending.length){agenda.cycle++;prepareCycle(agenda);}
  }
  if(!state.active)state.nextCheck=agenda.pending[0]!;
  return due;
}
const integer=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
export function validCassandraAgenda(value:unknown,tick:number):boolean {
  if(typeof value!=='object'||value===null||Array.isArray(value))return false;
  const s=value as Record<string,unknown>;
  if(Object.keys(s).length!==3||!Object.keys(s).every(k=>['rng','cycle','pending'].includes(k))||!integer(s.rng,1,0xffffffff)||!integer(s.cycle,-1)||!Array.isArray(s.pending)||!s.pending.length||s.pending.length>2)return false;
  if(s.cycle===-1)return s.pending.length===1&&s.pending[0]===INTRO_RAID_TICK&&tick<INTRO_RAID_TICK;
  const start=CASSANDRA_CYCLE_START+s.cycle*CASSANDRA_CYCLE_TICKS,end=start+CASSANDRA_ACTIVE_TICKS;
  if(!Number.isSafeInteger(end)||start>tick+CASSANDRA_CYCLE_TICKS)return false;
  const pending=s.pending;
  return pending.every((time,i)=>integer(time,Math.max(start,tick+1),end)&&time%INTERVAL===0&&(i===0||time-Number(pending[i-1])>=CASSANDRA_MIN_SPACING));
}
