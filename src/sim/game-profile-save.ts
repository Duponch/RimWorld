import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import type { World } from './types.ts';

const record=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
/** Do not infer current choices from an old scenario's name or possessions. */
export function validGameProfile(value:unknown,version:number,scenario:unknown,expedition=false,nonStartingSettlement=false):boolean {
  if(value===undefined)return !record(scenario)||scenario.id!=='crashlanded';
  // The campaign difficulty is shared. A true later geographic settlement has
  // no replayed arrival scenario; its actual birth/registry supplies this fact.
  const later=version>=259&&nonStartingSettlement&&scenario===undefined;
  if(version<82||!record(value)||!(expedition&&version>=240)&&!later&&(!record(scenario)||scenario.id!=='crashlanded'))return false;
  return Object.keys(value).length===4&&Object.keys(value).every(k=>['revision','storyteller','difficulty','saveMode'].includes(k))&&
    value.revision===1&&value.storyteller==='cassandra-partial'&&value.difficulty==='adventure-story'&&value.saveMode==='reloadable';
}
export function validateGameProfile(world:World,temporaryTarget263=false):string[] {
  if(temporaryTarget263&&isSchema263OrLater(Number(world.schemaVersion)))return [];
  if(!world.gameProfile||world.expeditionSite&&world.schemaVersion>=240)return [];
  return world.arrivals!==undefined||world.heatwaves!==undefined||world.raids?.profile!=='cassandra-raids-v1'?['Core creation profile must retain its own incident calendar.']:[];
}
