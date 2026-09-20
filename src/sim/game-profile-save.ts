import type { World } from './types.ts';

const record=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
/** Do not infer current choices from an old scenario's name or possessions. */
export function validGameProfile(value:unknown,version:number,scenario:unknown):boolean {
  if(value===undefined)return !record(scenario)||scenario.id!=='crashlanded';
  if(version<82||!record(value)||!record(scenario)||scenario.id!=='crashlanded')return false;
  return Object.keys(value).length===4&&Object.keys(value).every(k=>['revision','storyteller','difficulty','saveMode'].includes(k))&&
    value.revision===1&&value.storyteller==='cassandra-partial'&&value.difficulty==='adventure-story'&&value.saveMode==='reloadable';
}
export function validateGameProfile(world:World):string[] {
  if(!world.gameProfile)return [];
  return world.arrivals!==undefined||world.heatwaves!==undefined||world.raids?.profile!=='cassandra-raids-v1'?['Core creation profile must retain its own incident calendar.']:[];
}
