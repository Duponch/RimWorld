import { FLU_CHECK_INTERVAL,FLU_FIRST_CHECK } from './flu-incidents.ts';
import type { World } from './types.ts';

const object=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const integer=(value:unknown,min:number,max=Number.MAX_SAFE_INTEGER):value is number=>
  Number.isSafeInteger(value)&&Number(value)>=min&&Number(value)<=max;

/** Earlier schemas cannot smuggle in future incidents; every V127
 * Crashlanded profile carries its own strictly prospective disease clock. */
export function validFluIncidents(world:World,version:number):boolean {
  const raw:unknown=world.fluIncidents;
  if(version<127||!world.gameProfile)return raw===undefined;
  if(!object(raw)||Object.keys(raw).length!==7||!Object.keys(raw).every(key=>
    ['profile','rng','nextCheck','checks','fluDraws','episodes','cases'].includes(key)))return false;
  const next=Math.max(FLU_FIRST_CHECK,(Math.floor(world.tick/FLU_CHECK_INTERVAL)+1)*FLU_CHECK_INTERVAL);
  return raw.profile==='cassandra-flu-v1'&&integer(raw.rng,1,0xffffffff)
    &&integer(raw.nextCheck,next,next)&&integer(raw.checks,0,Math.max(0,Math.floor((world.tick-FLU_FIRST_CHECK)/FLU_CHECK_INTERVAL)+1))
    &&integer(raw.fluDraws,0,Number(raw.checks))&&integer(raw.episodes,0,Number(raw.fluDraws))
    &&integer(raw.cases,Number(raw.episodes));
}
